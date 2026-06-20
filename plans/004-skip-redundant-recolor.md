# Plan 004: Skip redundant per-tick instance recolor when the season palette is unchanged

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the result before moving on. If a STOP condition occurs, stop and
> report. When done, update the 004 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- components/VoxelForest.tsx components/CityGrid.tsx lib/seasons.ts`
> If any changed, compare against the "Current state" excerpts before proceeding;
> on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (for `pnpm typecheck`)
- **Category**: perf
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

During the cinematic reveal, `visibleWeeks` increments every 40–60 ms. Both 3D
renderers run a `useEffect` keyed on `revealedCols` that recomputes the season
palette and rewrites the color of **every** instance (all terrain/base cells plus
all tree/building voxels — up to a couple thousand), then flags
`instanceColor.needsUpdate = true`, forcing a full GPU buffer re-upload — **on
every tick**.

But the palette only *changes* on part of the reveal. `getSeasonPalette` lerps
between keyframes, and several segments are flat (identical palette): weeks 0–6,
14–18, **22–34 (a 12-week summer plateau)**, 38–46, 50–52. Across those weeks the
recolor is pure waste. This plan skips the recolor when the newly computed palette
equals the one already applied — a small, safe change that eliminates the
redundant uploads (≈half the reveal, including the long summer hold) while leaving
the genuine season transitions untouched.

This is a **modest** optimization, not a dramatic one — be honest about that in the
PR description. It removes wasted work; it will not visibly change the animation.

## Current state

Both renderers have a near-identical recolor effect (this duplication is addressed
separately by plan 005 — do **not** refactor here, just guard each effect):

`components/VoxelForest.tsx:111-143`:
```ts
// Update COLORS based on season (revealedCols → week → palette)
useEffect(() => {
  const season = getSeasonPalette(revealedCols);
  if (terrainRef.current && sortedCells.length > 0) {
    for (let i = 0; i < sortedCells.length; i++) { /* setColorAt per cell */ }
    if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
  }
  if (treeRef.current && allTreeCubes.length > 0) {
    for (let i = 0; i < allTreeCubes.length; i++) { /* setColorAt per cube */ }
    if (treeRef.current.instanceColor) treeRef.current.instanceColor.needsUpdate = true;
  }
}, [revealedCols, sortedCells, allTreeCubes, color]);
```

`components/CityGrid.tsx:133-171` — same shape with `getCitySeasonPalette` and
`baseRef`/`featureRef`.

`lib/seasons.ts`:
- `getSeasonPalette(week)` (line 153-172) and `getCitySeasonPalette(week)` (259-274)
  both clamp `week` to `[0,52]`, find the bracketing keyframes, and return
  `from.palette` directly when `from.week === to.week`, else `lerpPalette(from,to,t)`.
- The flat (palette-unchanged) week ranges follow from `SEASON_KEYS` (line 117-128):
  `[0,6]`, `[14,18]`, `[22,34]`, `[38,46]`, `[50,52]` produce a constant palette;
  the gaps between are continuous lerps (palette differs each integer week).

**Why a value compare and not a week compare:** the simplest correct guard is to
remember the last `revealedCols` you actually recolored at and skip when the
*palette object is deep-equal* to the last applied one. Comparing weeks directly is
also valid but requires re-deriving the flat ranges; deep-equality on the returned
palette is self-maintaining if the keyframes ever change.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Tests     | `pnpm test`      | all pass |
| Lint      | `pnpm lint`      | exit 0 |

## Scope

**In scope**:
- `components/VoxelForest.tsx` (guard the recolor effect)
- `components/CityGrid.tsx` (guard the recolor effect)
- Optionally `lib/seasons.ts` **only** to add a small exported pure helper
  `palettesEqual(a, b)` if you prefer a shared comparison (see Step 1). Adding an
  exported helper is allowed; changing `getSeasonPalette`/`getCitySeasonPalette`
  behavior is NOT.

**Out of scope** (do NOT touch):
- The matrix-setting effects, the progressive-reveal `count` effect, pointer
  handlers, or JSX in either renderer.
- `components/ForestScene.tsx` (its `sky` is already memoized correctly).
- Do NOT extract shared logic between the two renderers — that's plan 005.

## Git workflow

- Branch: `advisor/004-skip-redundant-recolor`.
- Conventional commits, e.g. `perf: skip instance recolor when season palette is unchanged`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Decide the comparison

Option A (recommended, self-maintaining): add a pure helper to `lib/seasons.ts`:
```ts
export function rgbArraysEqual(a: number[], b: number[]): boolean { /* length + per-element === */ }
```
and compare the fields you actually use, OR a generic deep compare of the palette
object. Keep it allocation-free and exported so a test can cover it.

Option B (no seasons.ts change): inside each effect, keep a `useRef<number | null>`
of the last week whose palette you applied, plus a module-level set of
"flat-range" booleans. More code, more drift risk. Prefer A.

### Step 2: Guard the recolor in `VoxelForest.tsx`

Add a `const lastAppliedRef = useRef<SeasonPalette | null>(null);` (import the
`SeasonPalette` type from `lib/seasons.ts` — it is already exported). At the top of
the recolor effect, after computing `season`, return early when
`lastAppliedRef.current` is non-null and deep-equals `season`; otherwise do the
existing recolor and set `lastAppliedRef.current = season`.

Important: the effect must still run its **first** application (when
`lastAppliedRef.current` is null) and whenever `sortedCells`/`allTreeCubes` change
(year switch rebuilds geometry — a new mesh needs its colors set even if the
palette value is unchanged). So reset `lastAppliedRef.current = null` in a tiny
effect keyed on `[sortedCells, allTreeCubes]`, OR include that reset inline. Verify
the year-switch case manually (Step 5).

### Step 3: Guard the recolor in `CityGrid.tsx`

Mirror Step 2 using `getCitySeasonPalette` / the `CitySeason` type. Note
`CitySeason` is **not currently exported** from `lib/seasons.ts` (only
`SeasonPalette` is, line 151). If you compare via a typed ref, add
`export type { CitySeason };` next to the existing `export type { SeasonPalette };`.
That is the only `seasons.ts` change permitted beyond the optional helper.

### Step 4: Static checks

**Verify**:
- `pnpm typecheck` → exit 0.
- `pnpm lint` → exit 0.
- `pnpm test` → all pass (existing tests; add the helper test in Test plan).

### Step 5: Manual behavior check (no regression)

The renderers have no DOM test harness, so verify by reasoning + a dev run if
available:
- Reveal still recolors during transitions: the guard only skips when the palette
  is byte-for-byte equal to the last applied one.
- **Year switch**: when `selectedYear` changes, `cells` change → `sortedCells`/
  `allTreeCubes` change → `lastAppliedRef` reset → colors reapply on the new mesh.
  Confirm your reset logic covers this (if you skipped the reset, a year switch
  into the same season week could leave new instances uncolored — STOP and fix).
- If a dev server is available (`pnpm install && pnpm dev`, needs `GITHUB_TOKEN`),
  load a profile, watch the reveal, switch years, and confirm colors look correct
  in Forest and City. If no token/dev server, state in the PR that the check was
  static-only.

## Test plan

- If you added `rgbArraysEqual`/`palettesEqual` to `lib/seasons.ts`, add a small
  `lib/__tests__/seasons.test.ts` (model after `transform.test.ts`) asserting:
  equal arrays → true; differing length/element → false; and that
  `getSeasonPalette(24)` deep-equals `getSeasonPalette(30)` (both inside the 22–34
  summer plateau) while `getSeasonPalette(8)` differs from `getSeasonPalette(12)`
  (a transition). This directly proves the guard will skip on the plateau and fire
  on transitions.
- The renderer guard itself has no unit test (no R3F test harness in repo); rely on
  typecheck + the seasons test + the manual check.

## Done criteria

ALL must hold:

- [ ] Both recolor effects skip work when the computed palette deep-equals the last
      applied palette
- [ ] A year switch still reapplies colors to the rebuilt mesh (reset path exists)
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] If a seasons helper was added, `lib/__tests__/seasons.test.ts` exists and
      passes, including the plateau-equal / transition-differs assertions
- [ ] Only in-scope files modified (`git status`)
- [ ] `plans/README.md` 004 row updated

## STOP conditions

- After the guard, a year switch leaves new instances with stale/black colors →
  your reset path is wrong; STOP and fix the reset, do not remove the guard.
- Deep-equality on the palette is awkward to express type-safely after two
  attempts → fall back to comparing the specific RGB fields used in the loops, or
  to Option B (week-range), and note the choice.
- You find yourself wanting to merge the two renderers to avoid duplicating the
  guard → that's plan 005; keep them separate here.

## Maintenance notes

- Plan 005 extracts the shared instancing logic; whoever does it **must carry this
  guard into the shared abstraction** so it isn't lost.
- If `SEASON_KEYS` later becomes fully continuous (no flat segments), this guard
  becomes a near-no-op but stays correct — no harm.
- Reviewer: scrutinize the year-switch reset path; that's the only way this change
  could introduce a visual bug.
