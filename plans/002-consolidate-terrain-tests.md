# Plan 002: Consolidate the two divergent `terrain.test.ts` files

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If a
> STOP condition occurs, stop and report. When done, update the 002 row in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- lib/terrain.test.ts lib/__tests__/terrain.test.ts lib/__tests__/transform.test.ts`
> If any of these changed, compare against the "Current state" excerpts before
> proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 001 (for `pnpm typecheck`)
- **Category**: tests / tech-debt
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

`generateTerrain` is tested by **two different files** that have drifted apart:
`lib/terrain.test.ts` and `lib/__tests__/terrain.test.ts`. They use different test
harnesses (one builds days with a `makeDays(cols, rows)` signature, the other with
`makeDays(heights[][])`), different fixture dates (2026 vs 2025), and assert
different things. This is confusing (which is the source of truth?), doubles the
maintenance surface, and signals an unsettled convention: the *other* lib test,
`transform.test.ts`, lives only in `lib/__tests__/`. Picking one location and one
file removes the ambiguity and makes plan 003 (new tests) land in an obvious place.

## Current state

Two files test the same function:

- `lib/terrain.test.ts` — `describe("generateTerrain")` with `makeDays(cols, rows=7)`,
  dates `2026-01-..`. Cases: deterministic for same username; different noise for
  different usernames (asserts >25% of cells differ); never-negative heights;
  preserves row/col/date mapping; classifies water for low heights.
- `lib/__tests__/terrain.test.ts` — `describe("generateTerrain")` with
  `makeDays(heights: number[][])`, dates `2025-01-..`. Cases: returns `TerrainCell[]`
  with `terrainHeight`/`terrainType`; classifies low as water; classifies high as
  land; deterministic for same username; different output for different usernames.
- `lib/__tests__/transform.test.ts` — the established sibling test, lives in
  `__tests__/`. **This is the location convention to follow.**

Convention to match (from `lib/__tests__/transform.test.ts:1-2`):
```ts
import { describe, it, expect } from "vitest";
import { transformContributions } from "../transform";
```
Note the **relative** import (`../transform`) from inside `__tests__/`.

`vitest.config.ts` has `environment: "node"` by default and a `@` → repo-root
alias; these are pure-logic tests so node env is correct.

## Commands you will need

| Purpose   | Command                                  | Expected on success |
|-----------|------------------------------------------|---------------------|
| Install   | `pnpm install`                           | exit 0 |
| Tests     | `pnpm test`                              | all pass |
| One file  | `pnpm test -- lib/__tests__/terrain.test.ts` | that file passes |
| Typecheck | `pnpm typecheck`                         | exit 0 |

## Scope

**In scope**:
- `lib/__tests__/terrain.test.ts` (this becomes the single canonical file — merge into it)
- `lib/terrain.test.ts` (delete after merging its unique cases)

**Out of scope** (do NOT touch):
- `lib/terrain.ts` — the implementation. This plan only reorganizes tests; it must
  not change behavior. If a merged test *fails* against current behavior, that's a
  STOP condition, not a license to edit the implementation.
- `lib/__tests__/transform.test.ts`.

## Git workflow

- Branch: `advisor/002-consolidate-terrain-tests`.
- Conventional commits, e.g. `test: consolidate duplicate terrain tests into __tests__`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Choose the canonical file and confirm both currently pass

Canonical location: `lib/__tests__/terrain.test.ts` (matches `transform.test.ts`).

Run both first to confirm green baseline:
`pnpm install && pnpm test` → all pass (includes both terrain files).

### Step 2: Merge unique cases into the canonical file

Into `lib/__tests__/terrain.test.ts`, add the cases that exist **only** in
`lib/terrain.test.ts` and aren't already covered:
- "never produces negative terrain heights"
- "preserves original row, col, and date mapping"
- the ">25% of cells differ for different usernames" assertion (stronger than the
  canonical file's plain `not.toEqual`) — keep whichever is stricter; do not keep both.

Use the canonical file's `makeDays(heights: number[][])` harness for new cases
(convert the `makeDays(cols, rows)` fixtures accordingly). Keep imports relative
(`../terrain`, `../types`) to match the sibling file.

**Verify**: `pnpm test -- lib/__tests__/terrain.test.ts` → all pass, and the file
now contains the merged cases (deterministic, different-username, negative-height,
row/col/date-preservation, water classification, land classification).

### Step 3: Delete the duplicate

Delete `lib/terrain.test.ts`.

**Verify**:
- `ls lib/terrain.test.ts` → "No such file".
- `pnpm test` → all pass; total test count dropped by the duplicate's cases but no
  unique coverage was lost (cross-check Step 2's list).
- `pnpm typecheck` → exit 0.

## Test plan

No new behavior is tested — this is a reorg. The canonical
`lib/__tests__/terrain.test.ts` must, after this plan, cover at minimum:
determinism for same username, divergence for different usernames, non-negative
heights, row/col/date preservation, water classification (low), land
classification (high). Model structure after `lib/__tests__/transform.test.ts`.

## Done criteria

ALL must hold:

- [ ] `lib/terrain.test.ts` no longer exists
- [ ] `lib/__tests__/terrain.test.ts` is the only `generateTerrain` test file and
      covers every case listed in "Test plan"
- [ ] `pnpm test` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `lib/terrain.ts` is unchanged (`git diff 2c5f55a -- lib/terrain.ts` is empty)
- [ ] `plans/README.md` 002 row updated

## STOP conditions

- A merged test fails against current `generateTerrain` behavior → STOP and
  report; do not modify `lib/terrain.ts` to make it pass.
- The two files' contents don't match the "Current state" description (drift).
- After deletion, total unique coverage is lower than the union of both files
  (you dropped a case) — restore it.

## Maintenance notes

- New `lib/` tests go in `lib/__tests__/` from now on. If you later move
  `lib/terrain.test.ts`-style files, this is the convention.
- Reviewer: confirm no implementation file changed and that the stricter
  different-username assertion was the one kept.
