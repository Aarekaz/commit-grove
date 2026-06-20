# Plan 005: Extract shared instanced-voxel logic from `VoxelForest` + `CityGrid`

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the result before moving on. If a STOP condition occurs, stop and
> report. When done, update the 005 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- components/VoxelForest.tsx components/CityGrid.tsx components/ForestScene.tsx`
> If any changed (note: plan 004 intentionally changes the recolor effects in
> both renderers), read the **live** files fully before starting — the excerpts
> below are from `2c5f55a` and 004 may already be applied. On any structural
> mismatch beyond 004's guard, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: 004 (so the recolor guard is carried into the shared code, not lost)
- **Category**: tech-debt
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

`VoxelForest.tsx` and `CityGrid.tsx` are ~80% the same machinery with different
geometry generators. Both: memoize `sortedCells`, memoize a flat `cubes` array,
hold a shared `dummy`/`color`, set instance matrices once via two effects, recolor
on reveal, recompute the visible `count` via an identical loop, and wire identical
`onPointerMove`/`onPointerLeave` handlers plus identical `<instancedMesh>` JSX.
Every behavioral fix (the recolor guard in plan 004, the reveal-`count` logic, a
hover tweak) must be made **twice** and will drift. Extracting the shared parts
into one reusable piece removes ~150 lines of duplicated, drift-prone logic and
gives future renderers (e.g. a new view mode) a single foundation.

This is a structural refactor with **no behavior change**. The risk is real
(3D rendering, no automated render tests), so the bar is: identical visual output
before and after.

## Current state

Two files, same skeleton. The duplicated concerns (lines from `2c5f55a`; 004 may
have modified the recolor effect):

| Concern | VoxelForest.tsx | CityGrid.tsx |
|---|---|---|
| `sortedCells` memo | 69-71 | 102 |
| flat cube array memo | 73-78 (`allTreeCubes`) | 103 (`allFeatures`) |
| `dummy`, `color` memo | 66-67 | 99-100 |
| set base/terrain matrices once | 81-95 | 106-117 |
| set feature/tree matrices once | 98-109 | 120-131 |
| recolor on reveal | 111-143 | 133-171 |
| progressive-reveal `count` | 145-163 | 173-189 |
| `handlePointerMove`/`Leave` | 165-178 | 191-202 |
| two `<instancedMesh>` JSX | 182-195 | 206-219 |

What **differs** and must stay per-renderer:
- The cube generators: `generateTreeCubes` (VoxelForest) vs
  `generateCityCubes`/`generateParkCubes`/`generateBuildingCubes` (CityGrid).
- The palette source: `getSeasonPalette` vs `getCitySeasonPalette`.
- The per-instance color rule (the `switch`/branching inside the recolor loop).
- Terrain base positioning: VoxelForest uses `CELL_SIZE`; CityGrid uses
  `CELL_SIZE + GAP` and a fixed base height of `0.1` at `y = -0.05`.
- The cube vertex types (`VoxelCube` vs `CityVoxel`) — both share
  `{x,y,z,w,h,d,col}`; CityGrid adds `tag`/`colorIdx`, VoxelForest adds
  `level`/`isTrunk`.

`components/ForestScene.tsx:119-126` renders `<VoxelForest>` or `<CityGrid>` based
on `mode`. The public props of both are identical:
`{ cells: TerrainCell[]; revealedCols: number; onHover?: (cell: TerrainCell|null)=>void }`.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests     | `pnpm test`      | all pass |
| Lint      | `pnpm lint`      | exit 0 |
| Dev run   | `pnpm dev`       | app boots (needs `GITHUB_TOKEN`) |

## Suggested executor toolkit

- If available, invoke the `react-best-practices` / `vercel-react-best-practices`
  skill when designing the shared hook/component (memoization, ref stability).
- Reference: `node_modules/next/dist/docs/` per `AGENTS.md`, and React Three Fiber
  `instancedMesh` usage already demonstrated in the two files — mirror it exactly.

## Scope

**In scope**:
- Create `components/InstancedVoxelLayer.tsx` (or `components/useInstancedVoxels.ts`
  — choose one shape, see Step 1).
- `components/VoxelForest.tsx` (refactor to use the shared piece)
- `components/CityGrid.tsx` (refactor to use the shared piece)

**Out of scope** (do NOT touch):
- `components/ForestScene.tsx` — the call sites stay the same; props must not change.
- `lib/seasons.ts`, `lib/sceneLayout.ts`, `lib/terrain.ts` — the data/layout
  contracts are fixed.
- Visual output — colors, positions, sizes, reveal timing, hover behavior must be
  pixel-identical. This is a pure refactor.

## Git workflow

- Branch: `advisor/005-extract-instanced-voxel-layer`.
- Commit per logical unit, conventional commits, e.g.
  `refactor: extract shared instanced-voxel layer`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Choose the abstraction shape

Recommended: a generic component `<InstancedVoxelLayer>` that owns the shared
machinery and takes the per-renderer parts as props/callbacks:

```tsx
type VoxelBase = { x:number; y:number; z:number; w:number; h:number; d:number; col:number };

type InstancedVoxelLayerProps<TCube extends VoxelBase> = {
  cells: TerrainCell[];
  revealedCols: number;
  buildCubes: (cell: TerrainCell) => TCube[];           // per-renderer generator
  terrainColorOf: (cell: TerrainCell) => RGB;           // base/terrain color rule
  cubeColorOf: (cube: TCube) => RGB;                    // feature color rule
  terrainMatrixOf: (cell: TerrainCell, dummy: THREE.Object3D) => void; // position/scale base
  onHover?: (cell: TerrainCell | null) => void;
};
```

The shared component owns: `sortedCells`, the flat cubes memo (`cells.flatMap(buildCubes).sort(byCol)`),
`dummy`/`color`, the two "set matrices once" effects, the recolor effect
**including plan 004's palette-equality guard**, the progressive-`count` effect,
the pointer handlers, and the two `<instancedMesh>` elements.

Alternative shape: a `useInstancedVoxels(...)` hook returning refs + handlers, with
each renderer keeping its own JSX. Pick whichever yields less per-renderer code;
the component shape is usually cleaner here. Generics must keep `pnpm typecheck`
green — if the generic types fight you, it's acceptable to use a shared
`VoxelBase` plus a `colorOf(cube): RGB` closure that each renderer supplies
already bound to its palette.

### Step 2: Build the shared piece

Create the file. Move the shared logic verbatim from `VoxelForest.tsx` (it's the
simpler of the two). Carry over plan 004's recolor guard. Keep `frustumCulled={false}`
and the exact `args={[undefined, undefined, count]}` instance counts.

**Verify**: `pnpm typecheck` → exit 0 (file compiles in isolation; not yet wired).

### Step 3: Refactor `VoxelForest.tsx` onto it

`VoxelForest` becomes a thin wrapper: it keeps `generateTreeCubes` and supplies
`buildCubes`, the tree/terrain color rules (from `getSeasonPalette(revealedCols)`),
and the terrain matrix function (`CELL_SIZE`, water `WATER_Y`/height logic at
lines 84-89). The public props stay identical.

**Verify**: `pnpm typecheck` + `pnpm lint` → exit 0.

### Step 4: Refactor `CityGrid.tsx` onto it

`CityGrid` keeps `generateCityCubes`/`generateParkCubes`/`generateBuildingCubes`
and supplies its color `switch` (lines 156-165) and its base matrix function
(`CELL_SIZE+GAP`, base height `0.1` at `y=-0.05`, lines 110-111) plus its base
color rule (lines 141-145). Palette source `getCitySeasonPalette`.

**Verify**: `pnpm typecheck` + `pnpm lint` → exit 0.

### Step 5: Visual parity check

There is no render-test harness, so verify equivalence by running the app:
- `pnpm install && pnpm dev` (needs `GITHUB_TOKEN`). Load a profile.
- Watch the full reveal in **Forest** and **City**; switch **years**; hover cells
  for tooltips. Confirm: identical colors per season, identical building/tree
  shapes, reveal grows left-to-right as before, hover still reports the right cell.
- Compare against `git stash` (pre-refactor) if unsure — same input, same output.
- If no `GITHUB_TOKEN`/dev server is available, STOP and report that visual parity
  could not be verified — do not claim done on a 3D refactor without seeing it.

## Test plan

No unit tests are added (no R3F test harness exists, and adding one is out of
scope). Verification is: `pnpm typecheck` + `pnpm lint` green, plus the Step 5
visual parity check. If you want a safety net, a `lib`-level test of any *pure*
helper you extracted (e.g. a `byCol` sort or a cube-count function) is welcome in
`lib/__tests__/`, modeled on `transform.test.ts`.

## Done criteria

ALL must hold:

- [ ] One shared module (`InstancedVoxelLayer.tsx` or `useInstancedVoxels.ts`) owns
      the matrix/recolor/count/pointer machinery
- [ ] `VoxelForest.tsx` and `CityGrid.tsx` no longer each contain their own copy of
      that machinery (the duplicated effects/handlers are gone)
- [ ] Plan 004's recolor guard is present in the shared code
- [ ] Public props of `VoxelForest`/`CityGrid` unchanged; `ForestScene.tsx`
      untouched
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] Visual parity confirmed in Forest + City (or explicitly reported as
      unverifiable due to missing token — then status stays IN PROGRESS, not DONE)
- [ ] Only in-scope files modified
- [ ] `plans/README.md` 005 row updated

## STOP conditions

- Generic typing of the shared component can't be made `typecheck`-clean after two
  attempts → fall back to a non-generic `VoxelBase`-based design with per-renderer
  color closures, or report.
- Any visual difference appears in Step 5 (wrong colors, missing layers, broken
  reveal, dead hover) → STOP; the refactor changed behavior. Diff against the
  stashed original.
- You cannot run the app to verify visuals → STOP and report; do not mark DONE.

## Maintenance notes

- New 3D view modes should build on `InstancedVoxelLayer` rather than copying a
  renderer.
- Reviewer: this is the high-risk plan in the set. Scrutinize that the recolor
  guard survived, the City base-height/gap offsets are preserved exactly, and the
  hover `instanceId → cell` mapping still indexes `sortedCells` correctly.
- Deferred: unit-testing the 3D layer would need an R3F test setup; out of scope
  here, worth a future plan if the renderers keep growing.
