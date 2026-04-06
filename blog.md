# I built a 3D forest generator with AI in a weekend. Here's what that was actually like.

*Option 1: AI as a collaborative creative partner*

---

## What I made and why

I had this idea from a video I saw: what if your GitHub contribution graph, that green grid of squares, wasn't flat? What if every commit planted a seed, and your year of coding grew into a 3D forest you could orbit around and explore?

So I built it. CommitGrove. You type in a GitHub username and it pulls your contribution history, shows the classic 2D heatmap, then lets you toggle into a 3D voxel forest or a procedurally generated city. There's terrain with hills shaped by your commit density, lakes where you didn't code, seasonal colors that shift from winter snow to autumn orange as the timeline scrubs through the year. A cinematic intro where the whole world builds itself block by block like a lego animation.

Sixty commits in three days. I built it with Claude (Anthropic's AI assistant) in one continuous conversation. Not as a gimmick for this assignment, but because I genuinely wanted to see how far I could push a creative project when the AI handles most of the typing and I handle most of the thinking.

This blog is about that collaboration. What worked, what was weird, and what it made me think about trust.

---

## How the conversation went

### It started by interviewing me

I pasted in a rough product doc, expecting Claude to start generating code. Instead it asked me questions. One at a time. Seven total.

"Your PRD mentions both a standalone React Native app and an embeddable web demo. These are very different engineering efforts. For the first build, which do you actually want?"

"The original video shows voxel-style cubes extruding upward. But there's a spectrum of how forest-like vs geometric you could go..."

"Your PRD mentions GitHub OAuth or username for data import. This matters architecturally..."

Each question had 2-4 options with trade-offs spelled out. After all seven, it summarized my answers into a decision table, asked me to confirm, and only then wrote a design spec. The whole thing felt like talking to a senior engineer, not a chatbot. It was the part of the experience I expected least and valued most.

What I didn't expect: those questions made ME clarify my own thinking. I came in with a vague "3D forest app" idea. By question 7 I had a specific technical vision. Honestly the brainstorming did more for the project than any code Claude wrote later.

### Then it built the whole thing in parallel

Claude broke the project into 14 tasks, wrote an implementation plan with exact file paths, then dispatched separate AI sub-agents to work on independent tasks simultaneously. Types and colors ran in parallel with the data transform layer. The GitHub API client ran in parallel with the landing page. The 3D forest renderer ran solo because it was the hard one.

Fourteen tasks, done in about two hours. Clean code, typed data models, passing tests, atomic commits. The quality was honestly better than what I'd write at 2am on a deadline.

### Then I started testing and everything got messy

This is the part I want to talk about most, because this is where the "creative collaboration" actually happened.

The first time I saw the 3D forest, it was just colored columns sticking out of a grid. Rectangles. I sent a screenshot and typed "I want real trees lol." Claude rewrote the whole renderer to produce layered pyramid trees with trunks and canopies. One message, fully rebuilt component.

Then I had a half-baked idea: what if the second mode was a city instead of terrain? Parks for light commit days, skyscrapers for heavy ones. Claude built the entire thing. Buildings with window bands and rooftop antennas, green spaces, all of it. From a half-sentence prompt.

But then came the color situation, and this is where I started noticing something.

I said "city with green." Got green buildings. Then I said "now I need the city to be a city," meaning gray and steel. Got gray buildings. Then I said "no I meant green buildings, I meant the parks and such." Got parks. Then "nah, buildings green too." Green buildings again.

Claude never once said "hey, you've changed your mind four times, do you want to step back and figure out what you actually want?" It just did whatever I said, instantly, every time. A human collaborator would have pushed back by round two. The AI was a yes-machine for creative direction, and when I was being indecisive, it amplified my indecision instead of catching it.

I kept asking for "10x better" and "make it unique," which are objectively terrible prompts. But Claude responded to them well, proposing specific things: procedural terrain generation where commit data shapes actual hills, simplex noise seeded by username for uniqueness, water in the valleys where you didn't code. It designed a full pipeline (Gaussian blur passes, noise overlay, water level classification) and asked for my sign-off before building it.

The best features in the final product were Claude's proposals, not mine. The cinematic intro where the forest builds itself? Claude pitched that. Seasonal colors? Claude's idea. I just said "yes do" and watched it happen.

---

## The good, the bad, the interesting

### What impressed me

When I asked "what's the single most unique thing you can add here?", Claude pitched a whole experience:

"A cinematic intro sequence. Right now: you click Forest and you see a static terrain. Functional, forgettable. What if instead: you enter a username and hit Grow my forest. Screen fades to the empty terrain, just flat ground and water. Then your forest builds itself, trees sprout week by week, left to right..."

Then it followed up with the engineering plan: new state management, auto-play at 4x speed, month name overlay, skip button. Creative pitch to working code in under an hour. I don't know what else to call that.

I also sent 24 screenshots over the course of the conversation. Broken labels, off-center cameras, glitchy animations, ugly components. I'd just screenshot the problem and type something like "dec jan is broken." Claude would look at the image, diagnose the issue ("when the year starts mid-week, both month labels appear in adjacent columns with no gap"), and fix it. No formal bug report needed. That feedback loop, screenshot then fix then refresh, was the fastest development cycle I've ever experienced.

### What worried me

After Claude built the cinematic intro, the animation was glitching badly. Blocks would appear scrambled, then snap into place at the end. I described it as "the generation is sooo bad, most of the time it glitches and then after its at the end, it fully generated."

Claude figured out the problem: it was re-creating WebGL buffers 17 times per second during playback. Every 60ms, the cell array changed length, the mesh re-mounted, the GPU buffer got destroyed and rebuilt. The fix was straightforward (pre-allocate all instances, reveal progressively with mesh.count).

But here's what bothered me: Claude wrote that bug in the first place. The initial architecture was naive. The AI built something that worked on paper but fell apart under real rendering conditions, and it took me visually testing it to catch the problem. It couldn't anticipate the performance consequences of its own design.

### What I keep thinking about

The timeline ruler went through four complete redesigns. Vertical ruler. Premium glass panel. Horizontal control bar. Compass-style scrolling dial. Each version was technically correct and visually forgettable. At one point I sent a screenshot and wrote: "WTF think of a novel way to do this ruler, it looks so bad, its not neat at all."

Claude never once looked at its own output and thought "this is ugly." It built exactly what I described, and when I didn't describe anything specific, it produced something generic. The final compass ruler, the one that actually looks cool, only happened because I sent reference images of game HUD compasses and said "like this." My creative direction, its execution.

The AI has no taste. It knows what things are. It doesn't know what things should feel like.

---

## What I actually think about all this

I went into this expecting AI to be faster typing. I came out thinking about it differently.

The brainstorming phase, where Claude asked me seven questions before writing anything, was more useful than all the code it generated. It forced me to articulate decisions I hadn't consciously made yet. That's not code generation. That's something closer to creative coaching.

The engineering is trustworthy. Architecture choices, data modeling, rendering strategies, these were all solid. I never had to second-guess the technical decisions. The code reads well. I'd be comfortable handing this codebase to someone else.

The design is not trustworthy. Every single time something looked wrong, I had to catch it. The AI never flagged its own ugly output. It never said "this doesn't look great, want me to try something else?" It waited for me to notice. If I hadn't been testing constantly and sending screenshots, the final product would have been technically solid and visually bland.

The weirdest part is how it changed what I was willing to attempt. I would never have tried to build procedural terrain generation, seasonal color interpolation, and cinematic intro animations in a weekend project on my own. Those feel like week-long features. But when building something takes 15 minutes instead of 3 hours, you stop cutting ideas. You say "sure, try it" to things that feel ambitious. The AI made me more creative by making creativity cheap.

And the yes-machine thing keeps nagging at me. A collaborator who never pushes back isn't really collaborating. They're executing. There were moments where I needed someone to say "you've been going back and forth on this, let's decide" and instead I got instant compliance. That's useful, but it's not partnership. It's a very fast, very capable employee who will do whatever you say, even when what you're saying doesn't make sense yet.

Sixty commits in three days. A project I'm genuinely proud of. Built by a person who knew what he wanted and an AI that could build it faster than he could describe it.

I don't think I could have built this alone in a weekend. I also don't think Claude could have built anything worth looking at without me screaming at screenshots and sending reference images. Make of that what you will.
