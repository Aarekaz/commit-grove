# commit-grove

Turn a GitHub contribution graph into a 3D forest or city, grown week by week from your commit history.

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

You'll need a `GITHUB_TOKEN` in `.env.local` with `read:user` scope.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm test` — run vitest (unit + DOM tests)
- `pnpm analyze` — build with Turbopack's native analyzer; output lands in `.next/diagnostics/analyze/`

## Bundle architecture

Three.js + `@react-three/fiber` + `@react-three/drei` add up to a large client bundle. The 3D scene is code-split via `next/dynamic` with `ssr: false` so landing-page and Grid-mode visitors never download it.

Current split (post-analyze):

| Visitor path | Client JS loaded | Notes |
|---|---|---|
| Landing page (`/`) | ~630 KB | No three.js in the waterfall |
| Grid mode (`/[username]`) | ~630 KB | Same — Grid is DOM-only |
| Forest or City mode | ~1.5 MB | 3D chunk (~880 KB) pulled in on demand |

Hovering or focusing the Forest/City buttons in the `ViewToggle` preloads the 3D chunk speculatively, so the click-to-render path is near-instant on broadband.

## Tech

- Next.js 16 (Turbopack)
- React 19
- Three.js via `@react-three/fiber` + `@react-three/drei`
- Framer Motion for the cinematic reveal and overlays
- Tailwind v4

## Deploy

Any Node platform. Production verified on Vercel.
