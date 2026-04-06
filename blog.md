# I built a 3D forest generator with AI in a weekend. Here's what that was actually like.

*Option 1: AI as a collaborative creative partner*

---

## What I made and why

I had this idea from a video I saw: what if your GitHub contribution graph, that green grid of squares, wasn't flat? What if every commit planted a seed, and your year of coding grew into a 3D forest you could orbit around and explore?

So I built it. CommitGrove. You type in a GitHub username and it pulls your contribution history, shows the classic 2D heatmap, then lets you toggle into a 3D voxel forest or a procedurally generated city. There's terrain with hills shaped by your commit density, lakes where you didn't code, seasonal colors that shift from winter snow to autumn orange as the timeline scrubs through the year. A cinematic intro where the whole world builds itself block by block.

Sixty commits in three days. I built it with Claude (Anthropic's AI assistant) in one continuous conversation. Not as a gimmick for this assignment, but because I genuinely wanted to see how far I could push a creative project when the AI handles most of the typing and I handle most of the thinking.

This blog is about that collaboration. What worked, what was weird, and what it made me think about trust.

---

## The prompts I designed (and the ones I didn't)

### The initial prompt

I started by pasting in a rough product requirement document. It wasn't polished; it was more of a brain dump:

> make a new folder for this but: Tagline: "What if every GitHub commit planted a seed? Watch your code grow into a living forest." One-sentence description: A beautiful, interactive mobile visualization that turns your real GitHub contribution history into an evolving 3D forest of trees/cubes on a phone screen, toggling between the classic 2D contribution heatmap and a lush, isometric 3D terrain...

I included reference images from a video I'd seen, an (overly) long list of features, and technical preferences. The PRD mentioned React Native, PWA, WebGPU, OAuth, screenshot export, animated GIFs, and about fifteen other things. Way too much for an MVP.

### What I expected vs what happened

I expected Claude to start generating code. Instead, it started interviewing me.

### The seven questions

Claude asked me seven clarifying questions, one at a time, each with 2-4 options and a recommendation. Here they are in full, because I think this was the most interesting part of the whole collaboration:

**Question 1** (platform):
> "Your PRD mentions both a 'standalone React Native app' and an 'embeddable web demo (PWA).' These are very different engineering efforts. For the first build, which do you actually want?
> - A) Web-first (Next.js + Three.js/R3F) — Runs in any browser, easy to share via URL...
> - B) React Native app (Expo + Three.js) — True native mobile app...
> - C) Web-first with a React Native wrapper later
>
> My recommendation is A — it matches your existing stack, gives you instant shareability, and Three.js/React Three Fiber is a far more mature 3D ecosystem than anything in React Native land."

My response: `Lets just do web first no appp`

**Question 3** (data fetching):
> "Your PRD mentions 'GitHub OAuth or username' for data import. This matters architecturally:
> - A) Public API only (no auth)
> - B) GitHub OAuth (full flow)
> - C) Username-only with a lightweight proxy — User types their username, we hit a Next.js API route server-side...
>
> My recommendation is C — it gives you the 'type username, see forest' magic moment with zero friction."

My response: `c`

**Question 4** (visual style): Claude tried to show me mockups through a visual companion server, but it crashed. We fell back to text descriptions of three options: pure voxel bars, voxel trees, and low-poly forest.

My response: `I like B but also remember it needs to a 3d one. For example in the video it first shows up like this` — and I pasted in three reference screenshots from the video.

**Question 7** (sharing):
> "Your PRD lists shareable export as high priority. For MVP, how important is this?
> - A) URL sharing only — commitgrove.com/username generates the visualization. Anyone can visit. Zero export complexity.
> - B) URL + screenshot export
> - C) URL + animated GIF/video"

My response: `A`

After all seven questions, Claude summarized the decisions into a table and asked me to confirm. Only then did it write a design spec, walking me through six design sections (project structure, data flow, 2D view, 3D rendering, transitions, routing) and pausing after each one for my approval.

What I didn't expect: those questions made ME clarify my own thinking. I came in with a bloated PRD that had React Native and OAuth and video export. By question 7, I had a focused web app with username-only input and URL sharing. The brainstorming did more for the project than any code Claude wrote later.

---

## How the AI built it

Claude broke the approved design into 14 tasks, wrote a full implementation plan, then dispatched separate AI sub-agents for each task. Independent tasks ran in parallel: types and colors alongside the data transform layer, the GitHub API client alongside the landing page. The 3D forest renderer ran solo because it was complex.

Fourteen tasks, about two hours total. The output was better than what I'd write at 2am on a deadline, which is when most of my side projects get built.

Then I started testing. And this is where the actual creative collaboration began.

---

## The creative iteration: raw prompts and responses

### "I want real trees lol"

The first time I loaded the 3D forest, it was colored rectangles sticking out of a grid. Not trees. Columns.

My exact prompt (with screenshot attached):
> `okay nice. QUestion, its not a tree?`

Claude's response:
> "You're right — the current 'forest' mode renders voxel columns/bars (extruded cubes), not actual tree shapes. During brainstorming you picked option B (Voxel Trees) — blocky tree silhouettes with layered canopies and brown trunks. But the implementation just did simple extruded columns per cell. To make them look like actual voxel trees, each cell would need to render a small tree shape:
> ```
>     ██          ← top canopy (narrow)
>    ████         ← middle canopy (wider)  
>   ██████        ← bottom canopy (widest)
>     ██          ← brown trunk
> ```"

My follow up: `I want real tress lol` (with another screenshot)

Claude rewrote the entire VoxelForest component. One message, fully rebuilt renderer with layered pyramid trees.

### "Now instead of terrain maybe we make it like a city?"

My prompt: `Now instead of terren maybe we make it like a city? Dynamic city gird?`

Claude's response: "Love that idea — Forest vs. City as the two 3D modes. Nature vs. urban, both driven by the same commit data. Let me implement it."

It built a full CityGrid component: buildings with varying heights, window bands, rooftop antennas, green spaces. From a half-sentence prompt.

### The color saga (where the AI was too obedient)

This exchange shows the AI's biggest weakness as a creative partner. Here's the actual sequence of my prompts and what happened:

1. `city with green` → Claude made all buildings green
2. `Now I need the city to be a city` → Claude switched to steel blue/gray
3. `no no I mean green builiding, I ment tha parks and such, so for examples if there is multiple layers of the grid where I have commit, we can turn it into a park?` → Claude added parks with green ground tiles and small trees
4. `nah, builgs green too` → Claude made buildings green again

Four contradictory instructions. Claude executed each one instantly, no questions asked. It never said "you've changed direction three times, want to step back and decide?" A human collaborator would have pushed back by round two. The AI amplified my indecision instead of catching it.

### "Make it 10x better"

My prompt: `Nice. But I think this can be 10x better. I think we can make it unique, we can make generations unique, maybe have like a 3d terrain jilly type of thing, etc etc. Maybe for the city, the grid generates with lakes/parks. I think right now its very basic, I want it to be unique.`

This is an objectively terrible prompt. Vague, hand-wavy, no specifics. But Claude responded well:

> "You're right — right now it's data-on-a-grid. To make it truly unique, we need to go from 'visualization' to 'world generation.'"

Then it ran another brainstorming cycle. Five more clarifying questions. Should terrain be data-shaped or procedural? Should empty zones be water, desert, or snow? Should the city be flat or hilly? What goes in tooltips? How should heights generate? Each question with options and recommendations, same format as the first brainstorm.

I chose data-shaped terrain, water for empty zones, flat city with urban planning, date+count tooltips. Claude designed a terrain generation pipeline: Gaussian blur passes to smooth the data into rolling hills, simplex noise seeded by username for natural roughness, water level classification for lakes. Wrote a full design spec, got my approval, then built it.

### "What's the single most unique thing you can add here?"

My prompt: `Okay we haev the MVP up. I think its time to compeltely reimage and remake the UI/UX. I mean Its good, but I feel that everything is sooo basic. How can we make itt unique? Whats the single most unique thing you can add here?`

Claude's response:

> "Here's what I think would make CommitGrove unforgettable:
>
> A cinematic intro sequence.
>
> Right now: you click Forest → you see a static terrain. Functional, forgettable.
>
> What if instead: You enter a username and hit 'Grow my forest.' Screen fades to the empty terrain — just flat ground and water. Time begins. Week 1 appears. A single seedling sprouts. Weeks accelerate. Trees grow, terrain rises, the forest fills in left to right across the grid. Camera slowly pulls back as the world builds itself...
>
> Your coding history, replayed as world creation. Like watching a Minecraft world generate in real-time, but it's YOUR data."

I typed `yes do` and it was built within the hour.

Later I asked the same question again: `Whats the one unique thing that you can add here that can 10x the whole application? If it was up to you, what would you add?`

Claude's pitch:

> "Seasons. As the timeline scrubs from January to December, the entire world shifts through seasons: Winter (Jan-Feb) — Pale blue-white terrain, bare gray trees, frozen lake. Spring (Mar-May) — Light green terrain, pink cherry blossom canopies. Summer (Jun-Aug) — Rich deep green everything. Autumn (Sep-Nov) — Orange and amber terrain, red/gold canopies...
>
> The cinematic intro becomes a nature documentary. Your coding year literally goes through seasons."

Both of these features, the cinematic intro and seasonal colors, were Claude's proposals. I just said yes. They're now the two things that make CommitGrove feel different from a generic GitHub visualization.

### The bugs, the glitches, the "WTF"

Not everything went smoothly. Some exchanges show where the AI fell short:

I sent a screenshot of broken month labels: `dec jan is broken`

Claude diagnosed it from the image ("when the year starts mid-week, both month labels appear in adjacent columns with no gap") and fixed it in one pass. Quick, accurate, no back-and-forth needed.

The animation was a different story. My prompt: `the geenrateion is sooo bad, most of the time it glithces and then after its at the end, it fully generated. It needs to be progressive.`

Claude found the root cause: "Every 60ms, `visibleCells` changes length → InstancedMesh remounts → glitch. The fix: pre-allocate all instances, reveal progressively by column."

It was re-creating WebGL GPU buffers 17 times per second during playback. The fix worked, but the bug shouldn't have existed in the first place. Claude wrote the naive architecture that caused the problem, and it took me visually testing the app to surface it.

Then there was the timeline ruler. This went through four iterations. My frustration escalated:

First: `I think this can be in a side, like a ruler like a timeline?`

Second: `Yeah, this UI can be improved like 10x. This component basically very basic`

Third: `should it be horizontal? WTF think of a novel way for do this ruler, it looks go bad, its not net at all. The lines are abd, the UI transtions are abd and sooo confusing`

Fourth: `I want the ruler timeline to be complete redesigned. I want it to be like a compass maybe? like compass in a game's mini map at the top, and I should be able to scroll through it` (with a reference image of a game HUD compass)

Four attempts. Each one technically correct. Each one visually forgettable. The compass ruler that finally shipped only happened because I provided a specific reference image. Claude never looked at its own output and said "this is ugly, let me try something else." That judgment call was always mine.

---

## What I actually think about all this

I went into this expecting AI to be faster typing. I came out thinking about it differently.

The brainstorming phase was more useful than all the code Claude generated. It asked questions that made me confront decisions I was avoiding. It narrowed a bloated PRD into a focused product. That's not code generation. That's closer to creative coaching.

The engineering is trustworthy. Architecture choices, data modeling, rendering strategies, all solid. I never had to second-guess the technical decisions. The code reads well. I'd hand this codebase to someone else without worrying.

The design is not trustworthy. Every time something looked wrong, I had to catch it. The AI never flagged its own output as ugly. It never said "this doesn't look great, want me to try something else?" If I hadn't been testing constantly and sending screenshots, the final product would have been technically solid and visually bland.

The weirdest part is how it changed what I was willing to attempt. I would never have tried procedural terrain generation, seasonal color interpolation, and cinematic intro animations in a weekend project on my own. Those feel like week-long features. But when building something takes 15 minutes instead of 3 hours, you stop cutting ideas. You say "sure, try it" to things that feel ambitious.

And the yes-machine thing keeps nagging at me. A collaborator who never pushes back isn't really collaborating. They're executing. There were moments where I needed someone to say "you've been going back and forth on this, let's decide" and instead I got instant compliance. That's useful, but it's not partnership.

Sixty commits in three days. A project I'm genuinely proud of. Built by a person who knew what he wanted and an AI that could build it faster than he could describe it. I don't think I could have built this alone in a weekend. I also don't think Claude could have built anything worth looking at without me screaming at screenshots and sending reference images. Make of that what you will.
