# Plan 007: Per-user dynamic Open Graph image for `/[username]`

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the result before moving on. If a STOP condition occurs, stop and
> report. When done, update the 007 row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 2c5f55a..HEAD -- app/opengraph-image.tsx app/[username]/page.tsx lib/github.ts`
> If any changed, read the live files before proceeding; on a structural mismatch
> with the excerpts below, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 001 (for `pnpm typecheck`)
- **Category**: direction
- **Planned at**: commit `2c5f55a`, 2026-06-18

## Why this matters

The whole point of CommitGrove is "look at *my* forest" — it's built to be shared.
But sharing a user link doesn't show their forest. `app/[username]/page.tsx`
already declares `twitter: { card: "summary_large_image" }` and an `openGraph`
block (lines 14-27), yet there is **no per-user OG image** — only a generic
site-wide card at `app/opengraph-image.tsx`. So a tweet of `/torvalds` previews
"Watch your code grow," not torvalds's stats. A dynamic per-user card (their
username + total contributions + a forest/grid motif) turns every share into an
advertisement for that specific user's world. The infrastructure is already
present and working (`next/og`, bundled Inter fonts, an `ImageResponse` exemplar),
so this is mostly composition, not new plumbing.

This is a **build plan with a small design surface** — the exact card layout is
yours to make tasteful, anchored on the existing exemplar's visual language.

## Current state

- Existing exemplar — `app/opengraph-image.tsx` (a complete, working static card).
  Key conventions to copy exactly:
  ```ts
  import { ImageResponse } from "next/og";
  import { readFileSync } from "node:fs";
  import { join } from "node:path";

  export const runtime = "nodejs";
  export const contentType = "image/png";
  export const size = { width: 1200, height: 630 };
  export const alt = "CommitGrove — ...";

  export default async function LandingOGImage() {
    const regular  = readFileSync(join(process.cwd(), "app/_fonts/Inter-Regular.woff"));
    const semibold = readFileSync(join(process.cwd(), "app/_fonts/Inter-SemiBold.woff"));
    return new ImageResponse(( <div style={{ ... }}> ... </div> ), {
      ...size,
      fonts: [
        { name: "Inter", data: regular,  weight: 400, style: "normal" },
        { name: "Inter", data: semibold, weight: 600, style: "normal" },
      ],
    });
  }
  ```
  Visual language: near-black `#030712` background, green accent `#22c55e`/`#4ade80`,
  a radial green glow, a pill label, large headline, "CommitGrove" footer. **Every
  flex container sets `display: "flex"` explicitly** (Satori requirement — see the
  exemplar; missing it is the #1 cause of `ImageResponse` errors).
- The route is `app/[username]/` (dynamic segment `username`). Per Next.js file
  conventions, an `app/[username]/opengraph-image.tsx` with a default export
  becomes that route's OG image and receives `{ params }` like the page does.
- Data source — `lib/github.ts`:
  `fetchContributions(username, yearsBack=1): Promise<FetchResult>` where success is
  `{ ok:true, data:{ username, years: ContributionYear[] } }` and each
  `ContributionYear` has `total: number` (lines 94-133, type at `lib/types.ts`).
  The fetch sets `next: { revalidate: 3600 }`, so a call from the OG route is cached
  and largely deduplicated against the page's own fetch within the hour.
- `app/[username]/page.tsx:9-27` already sets `generateMetadata` with the
  `summary_large_image` twitter card — so once this image file exists, the metadata
  will reference it automatically (Next wires file-based OG images into metadata).

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0 |
| Typecheck | `pnpm typecheck` | exit 0 |
| Lint      | `pnpm lint`      | exit 0 |
| Build     | `pnpm build`     | exit 0 (compiles the OG route) |
| Dev run   | `pnpm dev`       | image route renders (needs `GITHUB_TOKEN`) |

## Suggested executor toolkit

- **Read the Next.js docs for `opengraph-image` and the `next/og` `ImageResponse`
  API before writing** — per `AGENTS.md`, this repo runs a Next.js whose APIs may
  differ from memory; do not guess the file-convention signature or the params
  shape. The authoritative source is `node_modules/next/dist/docs/` and the working
  exemplar `app/opengraph-image.tsx`. If a `nextjs` skill is available, use it.

## Scope

**In scope**:
- `app/[username]/opengraph-image.tsx` (create)

**Out of scope** (do NOT touch in this plan):
- `app/[username]/page.tsx` — its `generateMetadata` already declares the twitter
  card; file-based OG wiring is automatic. Only revisit if Step 4 shows the meta
  tag isn't emitted (then it's a STOP/report, not a silent edit).
- `app/opengraph-image.tsx` — the generic landing card stays as-is.
- The 3D renderers — do NOT try to render real Three.js into the OG image (Satori
  can't run WebGL). Use a 2D motif (see Step 2).

## Git workflow

- Branch: `advisor/007-per-user-og-image`.
- Conventional commits, e.g. `feat: per-user open graph image`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create the route file, mirroring the exemplar

Create `app/[username]/opengraph-image.tsx`. Copy the exemplar's exports
(`runtime`, `contentType`, `size`, `alt`) and the font-loading + `ImageResponse`
return shape verbatim. Make the default export accept the dynamic param using the
**same signature the page uses** (`app/[username]/page.tsx` uses
`{ params }: { params: Promise<{ username: string }> }` and `await params`) — match
that exact pattern; confirm against the Next docs you read in "toolkit".

### Step 2: Fetch the user's data and design the card

Inside the default export:
- `const { username } = await params;`
- `const result = await fetchContributions(username, 1);`
- Derive a display stat: total contributions for the most recent year, e.g.
  `const total = result.ok ? (result.data.years[0]?.total ?? 0) : null;`
- Compose the card in the exemplar's visual language (`#030712` bg, green accents,
  Inter fonts, radial glow). Include: the **username** (large), a **stat line**
  (e.g. `1,234 contributions this year` — format with `toLocaleString()`), and a
  small forest/grid **motif** built from plain `<div>`s (NOT Three.js). A simple,
  effective motif: a row of vertical bars or a small contribution-grid of colored
  squares (greens scaled by level) laid out with flexbox. Keep every flex
  container's `display: "flex"` explicit.
- Handle the not-found / error case gracefully: if `!result.ok`, render a clean
  fallback card (username + "CommitGrove") rather than throwing — an OG route that
  throws yields a broken preview.

### Step 3: Static checks + build

**Verify**:
- `pnpm typecheck` → exit 0.
- `pnpm lint` → exit 0.
- `pnpm build` → exit 0. The build must compile the new dynamic OG route without
  Satori errors (the usual failure is a non-flex container — every parent of
  multiple children needs `display:"flex"`).

### Step 4: Render check

With `GITHUB_TOKEN` + dev server (`pnpm install && pnpm dev`):
- Visit `http://localhost:3000/[username]/opengraph-image` (replace with a real
  user, e.g. `/torvalds/opengraph-image`) → a 1200×630 PNG renders showing that
  user's name + stat + motif.
- View source on `http://localhost:3000/torvalds` and confirm an
  `og:image` / `twitter:image` meta tag points at the per-user image (Next emits
  this automatically from the file). If it does **not**, STOP and report — the
  metadata may need an explicit reference and that's `page.tsx` (out of scope here).
- Optionally validate the card visually with a preview tool, but local render is
  sufficient.

If no token/dev server is available: `pnpm build` succeeding is the minimum gate;
mark the render check as unverified in the PR and keep status IN PROGRESS rather
than DONE.

## Test plan

OG image routes aren't unit-tested in this repo (none exist for the landing card
either). Verification is `pnpm build` (compiles + Satori-validates) plus the Step 4
render check. No new automated tests.

## Done criteria

ALL must hold:

- [ ] `app/[username]/opengraph-image.tsx` exists and exports the file-convention
      shape (`runtime`/`contentType`/`size`/`alt` + default async component)
- [ ] It fetches the user via `fetchContributions` and shows username + a
      contribution stat + a 2D motif, with a non-throwing fallback for errors
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build` all exit 0
- [ ] Render check passed: `/[user]/opengraph-image` returns a correct PNG and the
      page's `og:image`/`twitter:image` points at it (or explicitly reported
      unverified with status IN PROGRESS)
- [ ] Only `app/[username]/opengraph-image.tsx` added
- [ ] `plans/README.md` 007 row updated

## STOP conditions

- `pnpm build` fails with a Satori/`ImageResponse` error you can't resolve by
  adding `display:"flex"` to containers after two attempts → report the exact error.
- The Next file-convention signature for `opengraph-image` in this repo's Next
  version differs from the page's `params` pattern in a way the docs don't clarify
  → STOP and report; do not guess.
- The page's metadata does not pick up the file-based image automatically → report;
  fixing it touches out-of-scope `page.tsx`.
- Fetching in the OG route noticeably doubles GitHub API load or trips rate limits
  in testing → report; a follow-up could share a cached data layer between page and
  image.

## Maintenance notes

- This adds a second `fetchContributions` call per shared link (page + image). It's
  cached (`revalidate: 3600`) so impact is low, but if rate-limiting becomes a
  concern, factor the fetch into a shared cached function both consume.
- The motif is intentionally 2D (Satori has no WebGL). If a richer preview is ever
  wanted, pre-render a static motif image rather than attempting Three.js here.
- Reviewer: confirm the error/not-found path renders a card instead of throwing,
  and that no real token leaks into the image or logs.
