# CommitGrove — Design Spec

**Tagline:** "What if every GitHub commit planted a seed? Watch your code grow into a living forest."

**Date:** 2026-03-29
**Status:** Approved

---

## Overview

CommitGrove is a web-based visualization that transforms a GitHub user's contribution history into an interactive 3D forest. Users enter a GitHub username and see their contribution data rendered as a classic 2D heatmap that toggles into two 3D modes: scattered voxel blocks (forest) and smooth terrain hills. Full-screen immersive. URL-shareable via `commitgrove.com/{username}`.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | Web-first (Next.js + Vercel) | Instant shareability, matches existing stack, no app store friction |
| 3D Engine | React Three Fiber (R3F) + Three.js | React mental model, instanced rendering, mature ecosystem, drei helpers |
| Data Fetching | Username-only, server-side proxy | Zero-friction onboarding, no OAuth, server token for rate limits |
| Visual Style | Voxel blocks (Minecraft-like) | Faithful to original video aesthetic, clean geometric look |
| 3D Modes | Scattered blocks + smooth terrain | Both achievable from same data, doubles visual impact |
| Presentation | Full-screen immersive | Lets visualization speak for itself, native feel on mobile |
| Sharing | URL-based (`/username`) | Maximum virality, zero export complexity for MVP |
| Background | Light cream (#f6f8fa) | Matches original video reference |

## Tech Stack

- **Next.js** — Framework (App Router, SSR)
- **React Three Fiber** — 3D rendering
- **@react-three/drei** — OrbitControls, lighting helpers
- **Three.js** — WebGL core
- **Tailwind CSS** — Styling
- **Framer Motion** — 2D↔3D transition animations
- **Vercel** — Deployment

No database, no auth, no external state management.

## Project Structure

```
commit-grove/
├── app/
│   ├── layout.tsx                  → Root layout (fonts, metadata, theme)
│   ├── page.tsx                    → Landing page (username input form)
│   └── [username]/
│       ├── page.tsx                → SSR: fetch GitHub data, render visualization
│       └── loading.tsx             → Skeleton while data loads
├── components/
│   ├── UsernameForm.tsx            → Input + submit, navigates to /[username]
│   ├── ContributionHeatmap.tsx     → 2D grid (CSS grid of colored cells)
│   ├── ForestScene.tsx             → R3F Canvas wrapper + camera + lights
│   ├── VoxelForest.tsx             → Scattered voxel blocks (instanced meshes)
│   ├── TerrainHills.tsx            → Smooth terrain elevation (instanced meshes)
│   ├── ViewToggle.tsx              → Grid / Forest / Terrain mode switcher
│   └── DayTooltip.tsx              → Hover tooltip showing date + commit count
├── lib/
│   ├── github.ts                   → Server-side GitHub contribution fetching
│   └── transform.ts               → Raw API data → normalized grid + height map
├── public/
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Data Flow

```
User enters username → GET /[username] (Next.js SSR)
    → lib/github.ts fetches contribution data via GitHub GraphQL API
    → lib/transform.ts normalizes into ContributionData
    → Props passed to ContributionHeatmap + ForestScene
    → User toggles between 2D grid / 3D forest / 3D terrain
```

### GitHub API Strategy

Uses GitHub's GraphQL API with `contributionsCollection` query:

```graphql
query($username: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $username) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
    }
  }
}
```

- Server-side only using `GITHUB_TOKEN` env var (5000 req/hr)
- One query per year (API limits `contributionsCollection` to 1 year range)
- Default: fetch last 1 year. 2D heatmap shows all available years stacked vertically.
- 3D view renders the currently selected year (year picker control alongside ViewToggle).
- Cached with `revalidate: 3600` (hourly refresh)

### Normalized Data Shape

```typescript
type ContributionDay = {
  date: string          // "2024-03-15"
  count: number         // raw commit count
  level: 0 | 1 | 2 | 3 | 4  // GitHub's quartile levels
  row: number           // 0-6 (day of week)
  col: number           // 0-51 (week of year)
  height: number        // normalized 0-1 for 3D extrusion
}

type ContributionYear = {
  year: number
  total: number
  weeks: ContributionDay[][]  // 52 weeks × 7 days
}

type ContributionData = {
  username: string
  years: ContributionYear[]
  allDays: ContributionDay[]  // flattened for 3D rendering
}
```

The `height` field normalizes `count` relative to the user's max commit day (busiest day = 1.0, empty = 0). Every user's forest looks proportionally interesting.

## Component Design

### ContributionHeatmap.tsx (2D View)

- CSS grid: 52 columns × 7 rows per year
- Multiple years stack vertically
- Cell size adapts to viewport
- GitHub's exact green palette:
  - Level 0: `#ebedf0`, Level 1: `#9be9a8`, Level 2: `#40c463`, Level 3: `#30a14e`, Level 4: `#216e39`
- Hover → DayTooltip (date + count)
- Year labels left, month labels top
- Background: light cream `#f6f8fa`

### ForestScene.tsx (3D Container)

- R3F `<Canvas>` with orthographic camera (isometric angle ~35°)
- Soft ambient light + directional light for depth/shadows
- `OrbitControls` — rotate, zoom, pan
- Light cream background matching 2D view
- Renders either `VoxelForest` or `TerrainHills` based on mode

### VoxelForest.tsx (Scattered Blocks — Image 2)

- `THREE.InstancedMesh` with single box geometry — one draw call for entire forest
- Height = `day.height * MAX_HEIGHT` (~8 units)
- Color = GitHub green palette mapped to `level`
- Empty days (level 0) = flat light gray tile on base grid
- Entry animation: blocks grow upward with staggered wave delay (600ms)
- Idle animation: gentle ±1° Y-axis sway (sin wave offset by position)

### TerrainHills.tsx (Smooth Terrain — Image 3)

- Same `InstancedMesh` approach, cubes packed edge-to-edge (no gaps)
- Height values smoothed via neighbor averaging (blur pass in transform.ts)
- Color gradient by height: lightest green → darkest green at peaks
- Creates topographic rolling-hills effect

### Performance

~3,650 cells for 10 years of data. With instanced rendering, this is 1 draw call per mode. Well within budget even on mobile. No performance concerns.

## View Transitions

### State

```typescript
type ViewMode = 'grid' | 'forest' | 'terrain'
const [mode, setMode] = useState<ViewMode>('grid')
```

Simple React state, passed as props. No external state library.

### ViewToggle.tsx

Segmented pill control: `[ Grid | Forest | Terrain ]`
Floating position (bottom-center or top-right). Semi-transparent backdrop with blur.

In Forest/Terrain modes, a year selector appears alongside the toggle (dropdown or horizontal pill row). 2D Grid mode shows all years stacked. 3D modes render one year at a time (52×7 grid = one terrain).

### Grid → Forest/Terrain

2D heatmap and 3D canvas are siblings stacked via absolute positioning. Both always mounted (R3F canvas stays alive to avoid re-initialization).

1. Heatmap fades out + scales down slightly (300ms, ease-out) via Framer Motion
2. R3F canvas fades in + scales up slightly (300ms, ease-out)
3. Voxel blocks animate from height 0 → target with staggered wave delay (600ms)

### Forest ↔ Terrain

Continuous morph within the same R3F scene (no fade):

1. Blocks interpolate height from scattered → smoothed values (400ms, lerp)
2. Colors shift from per-cell levels to height-based gradient
3. Smooth, satisfying transformation

## Pages & Routing

### Landing Page (`app/page.tsx`)

- Full-screen centered layout
- Tagline: "What if every GitHub commit planted a seed?"
- Subtitle: "Watch your code grow into a living forest."
- Large centered input with GitHub icon, placeholder: "Enter your GitHub username"
- Submit navigates to `/{username}`
- Light cream background, clean typography
- No navbar, no footer

### Visualization Page (`app/[username]/page.tsx`)

- SSR fetches contribution data
- Full-screen immersive visualization
- Starts in 2D grid mode
- ViewToggle floats on top
- Username badge in corner ("aarekaz's forest") with link back to `/`

### URL Structure

```
commitgrove.com/              → Landing page
commitgrove.com/aarekaz       → Aarekaz's forest
commitgrove.com/torvalds      → Linus's forest
```

## Error Handling

- **Invalid username:** "User not found" message with inline input form to retry
- **GitHub rate limit:** Cached results serve stale data; error only if no cache exists
- **No contributions:** Empty grid with message: "No contributions yet — start planting seeds!"

## Out of Scope (MVP)

- GitHub OAuth / private repo data
- Screenshot / video export
- Phone mockup wrapper
- Team mode / multi-user overlay
- Custom themes (cherry blossom, cyber-neon)
- Timeline scrubber / year-by-year growth animation
- PR weighting
- Wallpaper generator
- Streaks & achievements
- Simulated/aesthetic data toggle

These are all Phase 2 candidates documented in the original PRD.