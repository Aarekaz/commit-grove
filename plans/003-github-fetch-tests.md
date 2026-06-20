# Plan 003: Add tests for `lib/github.ts` (fetch + error classification)

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. If a STOP condition occurs,
> stop and report. When done, update the 003 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- lib/github.ts`
> If it changed, compare against the "Current state" excerpt before proceeding;
> on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (for `pnpm typecheck`); ideally after 002 (test convention settled)
- **Category**: tests
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

`lib/github.ts` is the app's critical path — it fetches contribution data and maps
GitHub's HTTP responses to typed error reasons that drive the entire error UI. It
has **zero tests**. The logic is exactly the kind that breaks silently: HTTP
status → reason mapping (401/403-with-ratelimit/403-without/5xx), the
`Promise.all` multi-year aggregation (succeed if *any* year succeeds), and the
`REASON_PRIORITY` "surface the worst reason when all fail" sort. A regression here
shows users the wrong error (or a crash) with no test to catch it. This plan adds
characterization tests by mocking `fetch`, with no change to the implementation.

## Current state

`lib/github.ts` exports two functions and types. The key behaviors to test:

- `fetchContributions(username, yearsBack=1)` (lib/github.ts:94-133):
  - Reads `process.env.GITHUB_TOKEN`; **missing token → `{ ok:false, reason:"misconfigured" }`** (line 98-99) *before any fetch*.
  - Builds one request per year from `currentYear - yearsBack + 1` to `currentYear`
    (uses `new Date().getFullYear()` — see STOP/Notes about mocking time).
  - Returns `{ ok:true, data:{ username, years } }` if ≥1 year succeeds; years are
    sorted newest-first (`b.year - a.year`, line 119).
  - If all years fail, returns the highest-priority reason via `REASON_PRIORITY`
    (line 43-50): `misconfigured(6) > rate_limited(5) > unauthorized(4) > server(3) > network(2) > not_found(1)`.
- `fetchYearContributions(username, year, token)` (lib/github.ts:52-92) — not
  exported. Test it **through** `fetchContributions`. Status mapping:
  - network throw (fetch rejects) → `network` (line 74-75)
  - `401` → `unauthorized` (line 78)
  - `403` with header `x-ratelimit-remaining: "0"` → `rate_limited`; otherwise `unauthorized` (line 79-83)
  - `>= 500` or any non-ok → `server` (line 84-85)
  - ok but `json.data.user.contributionsCollection` missing → `not_found` (line 88-89)
  - ok with a collection → success, passed to `transformContributions(collection, year)`

The request is `fetch(GITHUB_GRAPHQL_URL, { method:"POST", headers:{ Authorization:`bearer ${token}` ... }, body: JSON.stringify({ query, variables:{ username, from, to } }), next:{ revalidate:3600 } })`.

**Convention to match** — `lib/__tests__/transform.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { transformContributions } from "../transform";
```
Node test environment (`vitest.config.ts` → `environment: "node"`). Vitest's
mocking API is available as `import { vi } from "vitest"`.

A valid success response body shape (so `transformContributions` doesn't throw) —
mirror `transform.test.ts`'s `mockApiResponse`, wrapped as the GraphQL envelope:
```ts
{ data: { user: { contributionsCollection: {
  contributionCalendar: { totalContributions: N, weeks: [ { contributionDays: [ { date, contributionCount, contributionLevel } ... ] } ] }
} } } }
```

## Commands you will need

| Purpose   | Command                                   | Expected on success |
|-----------|-------------------------------------------|---------------------|
| Install   | `pnpm install`                            | exit 0 |
| New tests | `pnpm test -- lib/__tests__/github.test.ts` | all new tests pass |
| All tests | `pnpm test`                               | all pass |
| Typecheck | `pnpm typecheck`                          | exit 0 |

## Scope

**In scope**:
- `lib/__tests__/github.test.ts` (create)

**Out of scope** (do NOT touch):
- `lib/github.ts` — **no implementation changes**. The goal is to characterize
  existing behavior. If a test reveals a genuine bug, write the test as `.skip`
  with a comment and report it; do not fix the implementation in this plan.
- `lib/transform.ts`.

## Git workflow

- Branch: `advisor/003-github-fetch-tests`.
- Conventional commits, e.g. `test: cover github.ts fetch and error classification`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Scaffold the test file with `fetch` and env mocking

Create `lib/__tests__/github.test.ts`. Mock the global `fetch` with `vi.fn()` and
set/restore `process.env.GITHUB_TOKEN` around tests. Pattern:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchContributions } from "../github";

const ORIGINAL_TOKEN = process.env.GITHUB_TOKEN;

function mockFetchOnce(init: { status?: number; headers?: Record<string,string>; json?: unknown; reject?: boolean }) {
  // build a Response-like object; honor init.reject to simulate a network throw
}

beforeEach(() => { process.env.GITHUB_TOKEN = "test-token"; });
afterEach(() => { process.env.GITHUB_TOKEN = ORIGINAL_TOKEN; vi.restoreAllMocks(); });
```

Use `vi.stubGlobal("fetch", fn)` (or assign `globalThis.fetch`) per test. For the
status mapping, the Response mock needs `.status`, `.ok`, `.headers.get(name)`,
and `.json()`.

**Verify**: `pnpm test -- lib/__tests__/github.test.ts` runs (even with one trivial
test) → passes.

### Step 2: Test the no-token short-circuit

With `process.env.GITHUB_TOKEN` deleted, `fetchContributions("x", 1)` resolves to
`{ ok:false, reason:"misconfigured" }` and **`fetch` is never called**
(assert `fetch` mock not called).

**Verify**: that test passes.

### Step 3: Test each status → reason mapping (single year, `yearsBack:1`)

One test per branch, mocking the single fetch:
- network throw → `network`
- 401 → `unauthorized`
- 403 + `x-ratelimit-remaining: "0"` → `rate_limited`
- 403 + `x-ratelimit-remaining: "57"` → `unauthorized`
- 500 → `server`
- 200 with missing `data.user.contributionsCollection` → `not_found`
- 200 with a valid collection → `{ ok:true }`, `data.username` echoed, one year present

**Verify**: all pass.

### Step 4: Test multi-year aggregation and priority

- `yearsBack: 3`, all three fetches succeed → `ok:true`, `data.years.length === 3`,
  sorted newest-first (`years[0].year > years[1].year`).
- `yearsBack: 2`, one year 200-success + one year 500 → `ok:true` with **one** year
  (partial success wins).
- `yearsBack: 2`, one 403-ratelimited + one 500 → `ok:false`, `reason:"rate_limited"`
  (priority 5 > server's 3).

For multi-year, the fetch mock must return different responses per call (e.g. a
queue the mock shifts from, or `mockResolvedValueOnce` chains).

**Verify**: all pass.

### Step 5: Full suite + types

**Verify**:
- `pnpm test` → all pass (new file included).
- `pnpm typecheck` → exit 0.

## Test plan

New file `lib/__tests__/github.test.ts`, modeled structurally on
`lib/__tests__/transform.test.ts`. Cases enumerated in Steps 2–4 (≥11 tests):
no-token short-circuit, six status mappings, valid-success shape, and three
aggregation/priority cases.

## Done criteria

ALL must hold:

- [ ] `lib/__tests__/github.test.ts` exists with the cases from Steps 2–4
- [ ] `pnpm test -- lib/__tests__/github.test.ts` passes; ≥11 tests
- [ ] `pnpm test` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `lib/github.ts` is unchanged (`git diff 2c5f55a -- lib/github.ts` empty)
- [ ] `plans/README.md` 003 row updated

## STOP conditions

- A test can only pass by changing `lib/github.ts` → STOP; mark the test `.skip`
  with a `// BUG: ...` comment and report the discrepancy (it's a separate finding).
- Mocking `fetch` proves impossible with `vi.stubGlobal` in this Vitest/Node
  setup after two attempts → report; do not add a new dependency (e.g. msw)
  without asking.
- The year math makes a test time-dependent and flaky (it depends on the real
  current year) → prefer `mockResolvedValueOnce` chains that don't assert on
  specific year numbers, OR stub the clock with `vi.setSystemTime`; if neither
  works cleanly, report.

## Maintenance notes

- These are characterization tests: they lock in *current* behavior. If the error
  taxonomy in `FetchErrorReason` or `REASON_PRIORITY` changes, update them
  deliberately alongside the implementation.
- Reviewer: confirm zero implementation changes and that no real token appears in
  any fixture (use `"test-token"`).
