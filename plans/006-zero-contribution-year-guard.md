# Plan 006: Handle a year with zero past contributions (currently a blank, stuck screen)

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the result before moving on. If a STOP condition occurs, stop and
> report. When done, update the 006 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- components/VisualizationShell.tsx`
> If it changed, read the live file before proceeding; on a structural mismatch
> with the excerpts below, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (for `pnpm typecheck`)
- **Category**: bug
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

When the selected year has **no past contribution days** — a brand-new GitHub
account, or the current year viewed on/near Jan 1 — the app shows a blank screen
that never resolves. The cinematic intro never finishes, so the controls (which
would let the user navigate to a different year) never appear. The user is stuck
with nothing to look at and no way forward. The default selected year is
`data.years[0]` (the most recent / current year), so this is reachable in normal
use, not a contrived edge case.

## Current state

In `components/VisualizationShell.tsx`:

- Terrain is computed only from past days (lines 50-58):
  ```ts
  const today = new Date().toISOString().slice(0, 10);
  const fullTerrain = useMemo(() => {
    if (!selectedYearData) return [];
    const allDays = flattenYearDays(selectedYearData);
    const pastDays = allDays.filter((d) => d.date <= today);
    if (pastDays.length === 0) return [];          // ← empty terrain when no past days
    const numCols = Math.max(...pastDays.map((d) => d.col)) + 1;
    return generateTerrain(pastDays, 7, numCols, data.username);
  }, [selectedYearData, data.username, today]);
  const totalCols = fullTerrain.length > 0 ? Math.max(...fullTerrain.map((c) => c.col)) + 1 : 0;
  ```
- The cinematic effect early-returns when there's nothing to reveal (lines 68-70):
  ```ts
  useEffect(() => {
    if (introPhase !== "cinematic") return;
    if (totalCols === 0) return;                   // ← never transitions to "ready"
    ...
  }, [introPhase, totalCols, prefersReducedMotion]);
  ```
  Because `introPhase` stays `"cinematic"`, `showControls = introPhase === "ready"`
  (line 217) stays false, so the home link, `ViewToggle`, `TimelineRuler`, and
  `StatsOverlay` (lines 329-394) never render. The 3D scene also doesn't render
  (`fullTerrain.length > 0` guard, line 295), and `CinematicOverlay` shows with
  `maxWeeks={0}`. Net: blank, stuck.

Note `data.years` always has ≥1 entry (`lib/github.ts` only returns `ok:true` when
at least one year succeeded), and the *other* years usually have data — the user
just can't reach them because controls never appear.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint      | `pnpm lint`      | exit 0 |
| Tests     | `pnpm test`      | all pass |
| Dev run   | `pnpm dev`       | app boots (needs `GITHUB_TOKEN`) |

## Scope

**In scope**:
- `components/VisualizationShell.tsx`

**Out of scope** (do NOT touch):
- `lib/github.ts`, `lib/terrain.ts` — the empty-terrain return is correct; the bug
  is the UI getting stuck, not the data.
- `components/CinematicOverlay.tsx` — don't rework the overlay; the fix is in the
  shell's phase logic.

## Git workflow

- Branch: `advisor/006-zero-contribution-year-guard`.
- Conventional commits, e.g. `fix: don't get stuck on a year with no past contributions`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Skip the cinematic phase when there's nothing to reveal

In the cinematic effect (lines 68-100), when `introPhase === "cinematic"` and
`totalCols === 0`, instead of a bare `return`, transition straight to `"ready"` so
the controls render. Use a microtask to avoid setting state mid-render, matching
the existing reduced-motion pattern at lines 75-81:

```ts
if (totalCols === 0) {
  queueMicrotask(() => setIntroPhase("ready"));
  return;
}
```

Keep this **before** the `prefersReducedMotion` branch so an empty year resolves
regardless of motion preference. Ensure `totalCols` stays in the dependency array
(it already is, line 100) so this re-runs if the user later lands on an empty year.

### Step 2: Show an empty-state message in `"ready"` when terrain is empty

With controls now visible, the center is still blank (no 3D scene, no grid for an
empty year). Add a small, centered empty-state inside the `showControls` region so
the user understands and can navigate. Keep it minimal and on-brand (the app uses
Tailwind, light theme `bg-[#f6f8fa]`). Example, rendered when
`showControls && totalCols === 0`:

```tsx
{showControls && totalCols === 0 && (
  <div className="absolute inset-0 z-[1] flex items-center justify-center">
    <p className="text-sm text-gray-500">
      No contributions to show for {selectedYear}. Try another year.
    </p>
  </div>
)}
```

The `TimelineRuler` already hides itself when `maxWeeks === 0` (it's gated by
`is3D && maxWeeks > 0`, line 372), but the **year nav** lives inside the ruler — so
for an empty *current* year the user needs another way back to a populated year.
Confirm during Step 4 whether year nav is reachable; if the ruler is hidden, the
`ViewToggle` and home link still render, and switching to a non-empty year via the
ruler isn't possible. If that traps the user, surface year nav in the empty state
(render the same `onYearChange` arrows, or a "go to <most recent non-empty year>"
link). Decide based on the Step 4 check; prefer the smallest fix that leaves the
user able to navigate.

### Step 3: Static checks

**Verify**: `pnpm typecheck`, `pnpm lint`, `pnpm test` → all exit 0.

### Step 4: Manual check

If `GITHUB_TOKEN` + dev server are available:
- Reproduce the original bug first (`git stash` your change) by visiting a user
  whose most-recent year has no past days. If you can't easily find one, simulate
  by temporarily narrowing the date filter — but **revert any such probe** before
  finishing.
- With the fix: the page reaches `"ready"`, shows the empty-state message and the
  controls, and the user can navigate to a populated year and see it build.

If no token/dev server: verify by reasoning against the code and state in the PR
that the check was static-only.

## Test plan

`VisualizationShell` is a client component with timers and dynamic 3D imports;
there is no component-test harness for it in the repo and adding one is out of
scope. Rely on typecheck/lint + the manual check. (If a future plan adds a DOM test
harness for the shell, an empty-`data.years[0]` case asserting controls appear is
the regression test to write — note this in the PR.)

## Done criteria

ALL must hold:

- [ ] An empty selected year transitions to `"ready"` (controls render) instead of
      staying in `"cinematic"`
- [ ] An empty year shows a "no contributions for <year>" message and the user can
      navigate to another year
- [ ] A normal (non-empty) year is unaffected — cinematic reveal still plays
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all exit 0
- [ ] Only `components/VisualizationShell.tsx` modified
- [ ] `plans/README.md` 006 row updated

## STOP conditions

- The microtask transition causes a render loop or a React "setState during render"
  warning → STOP; the existing reduced-motion code at lines 75-81 uses the same
  pattern safely, so a loop means something else is wrong — report it.
- You cannot determine whether year nav is reachable in the empty state without
  running the app, and no dev server is available → implement Step 2's message
  *and* render year-nav arrows in the empty state (the safe superset), then report
  that it's unverified.

## Maintenance notes

- This interacts with the cinematic phase machine. If that machine is refactored
  (e.g. into a reducer), preserve the "empty → ready" transition.
- Reviewer: confirm a normal year still plays the full reveal (the guard must only
  fire when `totalCols === 0`).
