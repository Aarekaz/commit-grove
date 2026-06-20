# Plan 001: Establish a verification baseline (`typecheck` script + `.env.example`)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the next
> step. If anything in the "STOP conditions" section occurs, stop and report —
> do not improvise. When done, update the status row for this plan in
> `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- package.json README.md`
> If `package.json` changed since this plan was written, compare the "Current
> state" excerpt below against the live file before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

This is a strict-TypeScript Next.js project, but `package.json` has no script to
run the TypeScript compiler. `tsc --noEmit` is the primary correctness gate for a
TS codebase — without a named script, no one (and no CI, and no executor of the
other plans in this directory) has a one-command way to know the types are sound.
Separately, the README requires a `GITHUB_TOKEN` to run the app at all, but there
is no `.env.example` to copy, so first-run setup is guesswork and the failure mode
(`misconfigured`) is one the code explicitly handles. Both are tiny, zero-risk
additions that every later plan depends on for its "Done criteria".

## Current state

- `package.json` — scripts block today (note: NO `typecheck`):
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "analyze": "next build --experimental-analyze",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  ```
  `typescript` is already a devDependency (`"typescript": "^5"`), so `tsc` is
  available via `pnpm exec tsc` once `pnpm install` has run.
- The token is read at `lib/github.ts:98` — `const token = process.env.GITHUB_TOKEN;`
  and a missing token returns `{ ok: false, reason: "misconfigured" }`.
- `README.md` already documents the requirement: *"You'll need a `GITHUB_TOKEN`
  in `.env.local` with `read:user` scope."*
- `.gitignore` ignores `.env*` (so `.env.example` must be force-added — see Step 2).
- There is **no** `.env.example` in the repo root (confirmed).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0; `node_modules/` appears |
| Typecheck | `pnpm typecheck`         | exit 0, no errors (after Step 1) |
| Lint      | `pnpm lint`              | exit 0 |
| Tests     | `pnpm test`              | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `package.json` (add one script)
- `.env.example` (create)
- `README.md` (one-line mention of `.env.example`, optional but recommended)

**Out of scope** (do NOT touch):
- `.env.local` — never read, print, commit, or modify a real env file. If one
  exists, do not open it.
- Any source file under `lib/`, `components/`, `app/`.
- CI config — none exists; do not add one in this plan.

## Git workflow

- Branch: `advisor/001-verification-baseline` (the repo's working branch at plan
  time was `refinement-0mykv`; create a fresh branch off it).
- Commit style: conventional commits (repo history uses `chore:`, `docs:`,
  `feat:`, `polish:`). Example from `git log`: `chore: add .nvmrc pinning Node version`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a `typecheck` script

In `package.json`, add one line to the `scripts` block:

```json
"typecheck": "tsc --noEmit",
```

Place it next to `lint` (order doesn't matter functionally).

**Verify**:
- `pnpm install` → exit 0 (required first; the worktree has no `node_modules`).
- `pnpm typecheck` → exit 0, no type errors. If the codebase has *pre-existing*
  type errors unrelated to your change, see STOP conditions.

### Step 2: Create `.env.example`

Create `.env.example` in the repo root with exactly this content (a placeholder,
never a real token):

```
# GitHub personal access token with `read:user` scope.
# Create one at https://github.com/settings/tokens
# Copy this file to .env.local and fill in your token.
GITHUB_TOKEN=
```

Because `.gitignore` ignores `.env*`, stage it explicitly:
`git add -f .env.example`

**Verify**:
- `git status --short` shows `.env.example` staged (an `A` row).
- `cat .env.example` → matches the content above; the value after `GITHUB_TOKEN=`
  is empty (no secret).

### Step 3 (recommended): Point the README at it

In `README.md`, under "Getting Started", change the line that says you need a
`GITHUB_TOKEN` so it tells the reader to copy the example, e.g. add:
`Copy \`.env.example\` to \`.env.local\` and add your token.`

**Verify**: `pnpm lint` → exit 0 (README changes won't affect lint, but run it to
confirm nothing else regressed).

## Test plan

No new automated tests — this is config/docs. Verification is the commands above.

## Done criteria

ALL must hold:

- [ ] `pnpm install` exits 0
- [ ] `pnpm typecheck` exists as a script and exits 0
- [ ] `.env.example` exists at repo root, is tracked by git, and contains an
      **empty** `GITHUB_TOKEN=` (no secret value)
- [ ] `pnpm test` exits 0 (unchanged from before)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm typecheck` reports type errors that exist **before** your change (run
  `git stash` and re-run to confirm they're pre-existing). Report them — they are
  a separate finding, not yours to fix in this plan.
- `pnpm install` fails (e.g. lockfile/registry issue) — report the error; do not
  switch package managers or delete the lockfile.
- The `package.json` scripts block doesn't match the "Current state" excerpt.

## Maintenance notes

- Once `pnpm typecheck` exists, every other plan in this directory uses it as a
  Done-criteria gate. If CI is added later, wire `typecheck`, `lint`, and `test`
  into it.
- Reviewer: confirm `.env.example` carries no real credential and that
  `.env.local` was never touched.
