# CommitGrove Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app that transforms GitHub contribution history into an interactive 2D heatmap that toggles into 3D voxel forest and terrain views.

**Architecture:** Next.js App Router with SSR data fetching. GitHub GraphQL API proxied server-side. React Three Fiber for 3D rendering with instanced meshes. Framer Motion for 2D↔3D transitions. Three view modes managed by simple React state.

**Tech Stack:** Next.js, React Three Fiber, @react-three/drei, Three.js, Tailwind CSS, Framer Motion, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-29-commit-grove-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `lib/types.ts` | Shared TypeScript types (ContributionDay, ContributionYear, ContributionData, ViewMode) |
| `lib/transform.ts` | Raw GitHub API response → normalized ContributionData (grid coords, heights, smoothing) |
| `lib/github.ts` | Server-side GitHub GraphQL API fetching, caching |
| `lib/colors.ts` | GitHub green palette constants and color utility functions |
| `app/layout.tsx` | Root layout (fonts, metadata, theme, light cream background) |
| `app/page.tsx` | Landing page (tagline + username input) |
| `app/[username]/page.tsx` | SSR data fetch + visualization shell |
| `app/[username]/loading.tsx` | Loading skeleton |
| `components/UsernameForm.tsx` | Input + submit, navigates to /[username] |
| `components/ContributionHeatmap.tsx` | 2D CSS grid heatmap with hover tooltips |
| `components/ForestScene.tsx` | R3F Canvas + camera + lights + OrbitControls |
| `components/VoxelForest.tsx` | Scattered instanced voxel blocks with grow animation |
| `components/TerrainHills.tsx` | Smooth terrain instanced blocks |
| `components/ViewToggle.tsx` | Grid / Forest / Terrain segmented pill + year selector |
| `components/DayTooltip.tsx` | Hover tooltip for date + commit count |

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
cd /Users/aarekaz/Development/commit-grove
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-pnpm --eslint --no-turbopack
```

When prompted about overwriting, allow it. This scaffolds the project with App Router, Tailwind, TypeScript, pnpm.

- [ ] **Step 2: Install 3D and animation dependencies**

Run:
```bash
cd /Users/aarekaz/Development/commit-grove
pnpm add three @react-three/fiber @react-three/drei framer-motion
pnpm add -D @types/three
```

- [ ] **Step 3: Create .env.local with GitHub token placeholder**

Create `.env.local`:
```
GITHUB_TOKEN=your_github_personal_access_token_here
```

Verify `.env.local` is in `.gitignore` (create-next-app includes it by default).

- [ ] **Step 4: Clean up scaffolded files**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CommitGrove — Watch your code grow into a living forest",
  description:
    "Transform your GitHub contribution history into a beautiful 3D forest visualization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#f6f8fa] text-gray-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
```

Replace `app/page.tsx` with a temporary placeholder:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold">CommitGrove</h1>
    </main>
  );
}
```

- [ ] **Step 5: Verify dev server starts**

Run:
```bash
cd /Users/aarekaz/Development/commit-grove && pnpm dev
```
Expected: Dev server starts on `localhost:3000`, shows "CommitGrove" text on cream background.

- [ ] **Step 6: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add -A
git commit -m "feat: scaffold Next.js project with 3D and animation deps"
```

---

## Task 2: Types & Color Constants

**Files:**
- Create: `lib/types.ts`, `lib/colors.ts`

- [ ] **Step 1: Create shared types**

Create `lib/types.ts`:

```typescript
export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
  row: number;
  col: number;
  height: number;
};

export type ContributionYear = {
  year: number;
  total: number;
  weeks: ContributionDay[][];
};

export type ContributionData = {
  username: string;
  years: ContributionYear[];
};

export type ViewMode = "grid" | "forest" | "terrain";
```

- [ ] **Step 2: Create color constants**

Create `lib/colors.ts`:

```typescript
import type { ContributionLevel } from "./types";

export const LEVEL_COLORS: Record<ContributionLevel, string> = {
  0: "#ebedf0",
  1: "#9be9a8",
  2: "#40c463",
  3: "#30a14e",
  4: "#216e39",
};

export const LEVEL_COLORS_RGB: Record<ContributionLevel, [number, number, number]> = {
  0: [0.922, 0.929, 0.941],
  1: [0.608, 0.914, 0.659],
  2: [0.251, 0.769, 0.388],
  3: [0.188, 0.631, 0.306],
  4: [0.129, 0.431, 0.224],
};

export const TERRAIN_COLORS_RGB: [number, number, number][] = [
  [0.922, 0.929, 0.941], // height 0 — empty
  [0.608, 0.914, 0.659], // low
  [0.251, 0.769, 0.388], // medium-low
  [0.188, 0.631, 0.306], // medium-high
  [0.129, 0.431, 0.224], // high
];
```

- [ ] **Step 3: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/types.ts lib/colors.ts
git commit -m "feat: add shared types and color constants"
```

---

## Task 3: Data Transform Layer

**Files:**
- Create: `lib/transform.ts`, `lib/__tests__/transform.test.ts`

- [ ] **Step 1: Write failing tests for transformContributions**

Create `lib/__tests__/transform.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { transformContributions, smoothHeights } from "../transform";

const mockApiResponse = {
  contributionCalendar: {
    totalContributions: 150,
    weeks: [
      {
        contributionDays: [
          { date: "2025-01-05", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-06", contributionCount: 3, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-07", contributionCount: 7, contributionLevel: "SECOND_QUARTILE" },
          { date: "2025-01-08", contributionCount: 12, contributionLevel: "THIRD_QUARTILE" },
          { date: "2025-01-09", contributionCount: 20, contributionLevel: "FOURTH_QUARTILE" },
          { date: "2025-01-10", contributionCount: 1, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-11", contributionCount: 0, contributionLevel: "NONE" },
        ],
      },
      {
        contributionDays: [
          { date: "2025-01-12", contributionCount: 5, contributionLevel: "SECOND_QUARTILE" },
          { date: "2025-01-13", contributionCount: 10, contributionLevel: "THIRD_QUARTILE" },
          { date: "2025-01-14", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-15", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-16", contributionCount: 2, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-17", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-18", contributionCount: 0, contributionLevel: "NONE" },
        ],
      },
    ],
  },
};

describe("transformContributions", () => {
  it("normalizes API response into ContributionYear", () => {
    const result = transformContributions(mockApiResponse, 2025);
    expect(result.year).toBe(2025);
    expect(result.total).toBe(150);
    expect(result.weeks).toHaveLength(2);
  });

  it("assigns correct row and col to each day", () => {
    const result = transformContributions(mockApiResponse, 2025);
    const firstDay = result.weeks[0][0];
    expect(firstDay.row).toBe(0);
    expect(firstDay.col).toBe(0);

    const lastDayWeek1 = result.weeks[0][6];
    expect(lastDayWeek1.row).toBe(6);
    expect(lastDayWeek1.col).toBe(0);

    const firstDayWeek2 = result.weeks[1][0];
    expect(firstDayWeek2.row).toBe(0);
    expect(firstDayWeek2.col).toBe(1);
  });

  it("maps contribution levels to numeric levels", () => {
    const result = transformContributions(mockApiResponse, 2025);
    expect(result.weeks[0][0].level).toBe(0); // NONE
    expect(result.weeks[0][1].level).toBe(1); // FIRST_QUARTILE
    expect(result.weeks[0][2].level).toBe(2); // SECOND_QUARTILE
    expect(result.weeks[0][3].level).toBe(3); // THIRD_QUARTILE
    expect(result.weeks[0][4].level).toBe(4); // FOURTH_QUARTILE
  });

  it("normalizes height relative to max commit count", () => {
    const result = transformContributions(mockApiResponse, 2025);
    // Max is 20 commits
    expect(result.weeks[0][4].height).toBe(1.0); // 20/20
    expect(result.weeks[0][0].height).toBe(0);   // 0/20
    expect(result.weeks[0][1].height).toBeCloseTo(0.15); // 3/20
  });
});

describe("smoothHeights", () => {
  it("averages heights with neighbors for terrain mode", () => {
    const days = [
      { date: "d", count: 0, level: 0 as const, row: 0, col: 0, height: 0 },
      { date: "d", count: 0, level: 0 as const, row: 1, col: 0, height: 0 },
      { date: "d", count: 0, level: 0 as const, row: 0, col: 1, height: 0 },
      { date: "d", count: 10, level: 4 as const, row: 1, col: 1, height: 1 },
    ];
    const smoothed = smoothHeights(days, 7, 2);
    // The center cell (1,1) with height 1 should be lower after smoothing
    const centerSmoothed = smoothed.find((d) => d.row === 1 && d.col === 1);
    expect(centerSmoothed!.height).toBeLessThan(1);
    expect(centerSmoothed!.height).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Install vitest and run tests to verify they fail**

Run:
```bash
cd /Users/aarekaz/Development/commit-grove
pnpm add -D vitest
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`

Run:
```bash
pnpm test
```
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement transform.ts**

Create `lib/transform.ts`:

```typescript
import type { ContributionDay, ContributionLevel, ContributionYear } from "./types";

const LEVEL_MAP: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GitHubContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

type GitHubCalendarResponse = {
  contributionCalendar: {
    totalContributions: number;
    weeks: { contributionDays: GitHubContributionDay[] }[];
  };
};

export function transformContributions(
  response: GitHubCalendarResponse,
  year: number
): ContributionYear {
  const { contributionCalendar } = response;
  const allDays: ContributionDay[] = [];

  let maxCount = 0;
  for (const week of contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      if (day.contributionCount > maxCount) {
        maxCount = day.contributionCount;
      }
    }
  }

  const weeks: ContributionDay[][] = contributionCalendar.weeks.map(
    (week, colIndex) =>
      week.contributionDays.map((day, rowIndex) => {
        const normalized: ContributionDay = {
          date: day.date,
          count: day.contributionCount,
          level: LEVEL_MAP[day.contributionLevel] ?? 0,
          row: rowIndex,
          col: colIndex,
          height: maxCount > 0 ? day.contributionCount / maxCount : 0,
        };
        allDays.push(normalized);
        return normalized;
      })
  );

  return {
    year,
    total: contributionCalendar.totalContributions,
    weeks,
  };
}

export function smoothHeights(
  days: ContributionDay[],
  rows: number,
  cols: number
): ContributionDay[] {
  const grid = new Map<string, ContributionDay>();
  for (const day of days) {
    grid.set(`${day.row},${day.col}`, day);
  }

  return days.map((day) => {
    const neighbors: number[] = [day.height];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const neighbor = grid.get(`${day.row + dr},${day.col + dc}`);
        if (neighbor) neighbors.push(neighbor.height);
      }
    }
    const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    return { ...day, height: avg };
  });
}

export function flattenYearDays(year: ContributionYear): ContributionDay[] {
  return year.weeks.flat();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/transform.ts lib/__tests__/transform.test.ts package.json pnpm-lock.yaml
git commit -m "feat: add contribution data transform with tests"
```

---

## Task 4: GitHub API Client

**Files:**
- Create: `lib/github.ts`

- [ ] **Step 1: Implement GitHub GraphQL client**

Create `lib/github.ts`:

```typescript
import { transformContributions } from "./transform";
import type { ContributionData, ContributionYear } from "./types";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

const CONTRIBUTION_QUERY = `
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
`;

async function fetchYearContributions(
  username: string,
  year: number,
  token: string
): Promise<ContributionYear | null> {
  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  const res = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTION_QUERY,
      variables: { username, from, to },
    }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const json = await res.json();
  const collection = json.data?.user?.contributionsCollection;
  if (!collection) return null;

  return transformContributions(collection, year);
}

export async function fetchContributions(
  username: string,
  yearsBack: number = 1
): Promise<ContributionData | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN environment variable is required");

  const currentYear = new Date().getFullYear();
  const startYear = currentYear - yearsBack + 1;

  const yearPromises: Promise<ContributionYear | null>[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    yearPromises.push(fetchYearContributions(username, y, token));
  }

  const results = await Promise.all(yearPromises);
  const years = results.filter((y): y is ContributionYear => y !== null);

  if (years.length === 0) return null;

  return {
    username,
    years: years.sort((a, b) => b.year - a.year),
  };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/github.ts
git commit -m "feat: add GitHub GraphQL API client for contribution data"
```

---

## Task 5: Landing Page

**Files:**
- Create: `components/UsernameForm.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create UsernameForm component**

Create `components/UsernameForm.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function UsernameForm() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      router.push(`/${trimmed}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <div className="relative">
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
        </svg>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your GitHub username"
          className="w-full rounded-xl border border-gray-200 bg-white py-4 pl-12 pr-4 text-lg shadow-sm outline-none transition-shadow focus:border-green-400 focus:ring-2 focus:ring-green-100"
          autoFocus
        />
      </div>
      <button
        type="submit"
        disabled={!username.trim()}
        className="rounded-xl bg-gray-900 py-3.5 text-lg font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Grow my forest
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Build the landing page**

Replace `app/page.tsx`:

```tsx
import { UsernameForm } from "@/components/UsernameForm";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            What if every commit planted a seed?
          </h1>
          <p className="text-lg text-gray-500">
            Watch your code grow into a living forest.
          </p>
        </div>
        <UsernameForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Verify in browser**

Run `pnpm dev`, visit `localhost:3000`.
Expected: Centered page with tagline, subtitle, GitHub icon input, and "Grow my forest" button on cream background.

- [ ] **Step 4: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add app/page.tsx components/UsernameForm.tsx
git commit -m "feat: add landing page with username form"
```

---

## Task 6: Visualization Page Shell + SSR Data Fetching

**Files:**
- Create: `app/[username]/page.tsx`, `app/[username]/loading.tsx`

- [ ] **Step 1: Create loading skeleton**

Create `app/[username]/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <p className="text-sm text-gray-500">Growing your forest...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the visualization page with SSR data fetch**

Create `app/[username]/page.tsx`:

```tsx
import { fetchContributions } from "@/lib/github";
import { notFound } from "next/navigation";
import { VisualizationShell } from "@/components/VisualizationShell";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return {
    title: `${username}'s forest — CommitGrove`,
    description: `Watch ${username}'s GitHub contributions grow into a living forest.`,
  };
}

export default async function UserPage({ params }: Props) {
  const { username } = await params;
  const data = await fetchContributions(username, 1);

  if (!data) {
    notFound();
  }

  return <VisualizationShell data={data} />;
}
```

- [ ] **Step 3: Create VisualizationShell (temporary, renders data summary)**

Create `components/VisualizationShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Placeholder — will be replaced by heatmap + 3D scene */}
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{data.username}&apos;s forest</h2>
          <p className="mt-2 text-gray-500">
            {data.years.length} year(s) · {data.years.reduce((sum, y) => sum + y.total, 0)} total contributions
          </p>
          <p className="mt-1 text-sm text-gray-400">Mode: {mode} · Year: {selectedYear}</p>
        </div>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Create not-found page**

Create `app/[username]/not-found.tsx`:

```tsx
import { UsernameForm } from "@/components/UsernameForm";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="flex max-w-lg flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold">User not found</h1>
          <p className="text-gray-500">
            That GitHub username doesn&apos;t exist or has no public contributions.
          </p>
        </div>
        <UsernameForm />
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Verify with a real GitHub username**

Run `pnpm dev`, visit `localhost:3000`. Enter a valid username (e.g. "torvalds"). Expected: redirects to `/torvalds`, shows contribution summary. Enter an invalid username → shows not-found page.

Note: Requires `GITHUB_TOKEN` in `.env.local`. Generate one at https://github.com/settings/tokens with no special scopes (public data only).

- [ ] **Step 6: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add app/[username]/ components/VisualizationShell.tsx
git commit -m "feat: add visualization page with SSR data fetching"
```

---

## Task 7: 2D Contribution Heatmap

**Files:**
- Create: `components/ContributionHeatmap.tsx`, `components/DayTooltip.tsx`
- Modify: `components/VisualizationShell.tsx`

- [ ] **Step 1: Create DayTooltip component**

Create `components/DayTooltip.tsx`:

```tsx
import type { ContributionDay } from "@/lib/types";

type Props = {
  day: ContributionDay;
  position: { x: number; y: number };
};

export function DayTooltip({ day, position }: Props) {
  const dateStr = new Date(day.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: position.x, top: position.y - 40 }}
    >
      <span className="font-medium">{dateStr}</span>
      <span className="ml-1.5 text-gray-300">
        {day.count} {day.count === 1 ? "commit" : "commits"}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Create ContributionHeatmap component**

Create `components/ContributionHeatmap.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import type { ContributionDay, ContributionYear } from "@/lib/types";
import { LEVEL_COLORS } from "@/lib/colors";
import { DayTooltip } from "./DayTooltip";

type Props = {
  years: ContributionYear[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthLabels(weeks: ContributionDay[][]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks.length; col++) {
    const firstDay = weeks[col]?.[0];
    if (!firstDay) continue;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTHS[month], col });
      lastMonth = month;
    }
  }
  return labels;
}

function YearGrid({ year }: { year: ContributionYear }) {
  const [tooltip, setTooltip] = useState<{
    day: ContributionDay;
    position: { x: number; y: number };
  } | null>(null);

  const handleMouseEnter = useCallback(
    (day: ContributionDay, e: React.MouseEvent) => {
      setTooltip({ day, position: { x: e.clientX, y: e.clientY } });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const monthLabels = getMonthLabels(year.weeks);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-400">
          {year.year}
        </span>
        <div className="flex flex-col gap-0.5">
          {/* Month labels */}
          <div className="flex gap-[3px]">
            {Array.from({ length: year.weeks.length }).map((_, col) => {
              const label = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="h-3 w-[11px] text-[9px] leading-none text-gray-400">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>
          {/* Grid */}
          <div className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="flex gap-[3px]">
                {year.weeks.map((week, col) => {
                  const day = week[row];
                  if (!day) return <div key={col} className="h-[11px] w-[11px]" />;
                  return (
                    <div
                      key={col}
                      className="h-[11px] w-[11px] rounded-sm"
                      style={{ backgroundColor: LEVEL_COLORS[day.level] }}
                      onMouseEnter={(e) => handleMouseEnter(day, e)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {tooltip && <DayTooltip day={tooltip.day} position={tooltip.position} />}
    </div>
  );
}

export function ContributionHeatmap({ years }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div className="flex flex-col gap-6">
        {years.map((year) => (
          <YearGrid key={year.year} year={year} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire heatmap into VisualizationShell**

Replace `components/VisualizationShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";
import { ContributionHeatmap } from "./ContributionHeatmap";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 2D Heatmap */}
      {mode === "grid" && <ContributionHeatmap years={data.years} />}

      {/* 3D Scene placeholder */}
      {mode !== "grid" && (
        <div className="flex h-full items-center justify-center text-gray-400">
          3D view coming soon (mode: {mode}, year: {selectedYear})
        </div>
      )}

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify in browser**

Visit `/torvalds` (or any valid user). Expected: 2D green heatmap grid renders with year labels, month labels, hover tooltips showing date and count.

- [ ] **Step 5: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/ContributionHeatmap.tsx components/DayTooltip.tsx components/VisualizationShell.tsx
git commit -m "feat: add 2D contribution heatmap with tooltips"
```

---

## Task 8: View Toggle

**Files:**
- Create: `components/ViewToggle.tsx`
- Modify: `components/VisualizationShell.tsx`

- [ ] **Step 1: Create ViewToggle component**

Create `components/ViewToggle.tsx`:

```tsx
"use client";

import type { ViewMode } from "@/lib/types";

type Props = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

const MODES: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "forest", label: "Forest" },
  { value: "terrain", label: "Terrain" },
];

export function ViewToggle({
  mode,
  onModeChange,
  years,
  selectedYear,
  onYearChange,
}: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === m.value
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Year selector (visible in 3D modes) */}
      {mode !== "grid" && years.length > 1 && (
        <div className="flex rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedYear === year
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire ViewToggle into VisualizationShell**

Replace `components/VisualizationShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ViewToggle } from "./ViewToggle";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  const yearNumbers = data.years.map((y) => y.year);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 2D Heatmap */}
      {mode === "grid" && <ContributionHeatmap years={data.years} />}

      {/* 3D Scene placeholder */}
      {mode !== "grid" && (
        <div className="flex h-full items-center justify-center text-gray-400">
          3D {mode} view — year {selectedYear}
        </div>
      )}

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>

      {/* View toggle */}
      <ViewToggle
        mode={mode}
        onModeChange={setMode}
        years={yearNumbers}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Visit a user page. Expected: Bottom-center pill toggle with Grid/Forest/Terrain. Clicking Forest or Terrain shows placeholder text + year selector (if multiple years). Grid shows the heatmap.

- [ ] **Step 4: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/ViewToggle.tsx components/VisualizationShell.tsx
git commit -m "feat: add view mode toggle with year selector"
```

---

## Task 9: 3D Forest Scene — VoxelForest

**Files:**
- Create: `components/ForestScene.tsx`, `components/VoxelForest.tsx`
- Modify: `components/VisualizationShell.tsx`

- [ ] **Step 1: Create ForestScene (R3F Canvas wrapper)**

Create `components/ForestScene.tsx`:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ContributionDay, ViewMode } from "@/lib/types";
import { VoxelForest } from "./VoxelForest";

type Props = {
  days: ContributionDay[];
  mode: ViewMode;
  numCols: number;
};

export function ForestScene({ days, mode, numCols }: Props) {
  const numRows = 7;
  const centerX = (numCols * 1.1) / 2;
  const centerZ = (numRows * 1.1) / 2;

  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{
          zoom: 40,
          position: [20, 20, 20],
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "#f6f8fa" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />

        <group position={[-centerX, 0, -centerZ]}>
          {mode === "forest" && <VoxelForest days={days} />}
        </group>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minZoom={10}
          maxZoom={100}
          target={[0, 2, 0]}
        />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 2: Create VoxelForest with instanced rendering**

Create `components/VoxelForest.tsx`:

```tsx
"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { LEVEL_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
};

const MAX_HEIGHT = 8;
const CELL_SIZE = 1;
const GAP = 0.1;
const GROW_DURATION = 0.6;

export function VoxelForest({ days }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const activeDays = useMemo(() => days.filter((d) => d.height > 0), [days]);
  const allDays = useMemo(() => days, [days]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Set up base grid (flat tiles for all cells)
  useEffect(() => {
    if (!baseRef.current) return;
    const baseColor = new THREE.Color(0.92, 0.93, 0.94);
    for (let i = 0; i < allDays.length; i++) {
      const day = allDays[i];
      dummy.position.set(
        day.col * (CELL_SIZE + GAP),
        -0.05,
        day.row * (CELL_SIZE + GAP)
      );
      dummy.scale.set(CELL_SIZE, 0.1, CELL_SIZE);
      dummy.updateMatrix();
      baseRef.current.setMatrixAt(i, dummy.matrix);
      baseRef.current.setColorAt(i, baseColor);
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [allDays, dummy]);

  // Set colors for active blocks
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < activeDays.length; i++) {
      const day = activeDays[i];
      const rgb = LEVEL_COLORS_RGB[day.level];
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [activeDays, color]);

  // Reset animation timer when days change
  useEffect(() => {
    startTime.current = Date.now();
  }, [activeDays]);

  // Animate: grow blocks upward + gentle sway
  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < activeDays.length; i++) {
      const day = activeDays[i];
      const targetHeight = day.height * MAX_HEIGHT;

      // Staggered grow delay based on position
      const delay = (day.col * 0.01) + (day.row * 0.005);
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const easedProgress = 1 - Math.pow(1 - growProgress, 3); // easeOutCubic
      const currentHeight = targetHeight * easedProgress;

      // Gentle sway
      const sway = Math.sin(elapsed * 1.5 + day.col * 0.3 + day.row * 0.5) * 0.02;

      dummy.position.set(
        day.col * (CELL_SIZE + GAP),
        currentHeight / 2,
        day.row * (CELL_SIZE + GAP)
      );
      dummy.scale.set(CELL_SIZE, Math.max(0.01, currentHeight), CELL_SIZE);
      dummy.rotation.set(0, 0, sway);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Base grid */}
      <instancedMesh ref={baseRef} args={[undefined, undefined, allDays.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Active voxel blocks */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, activeDays.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  );
}
```

- [ ] **Step 3: Wire ForestScene into VisualizationShell**

Modify `components/VisualizationShell.tsx` — replace the 3D placeholder block:

Replace:
```tsx
      {/* 3D Scene placeholder */}
      {mode !== "grid" && (
        <div className="flex h-full items-center justify-center text-gray-400">
          3D {mode} view — year {selectedYear}
        </div>
      )}
```

With:
```tsx
      {/* 3D Scene */}
      {mode !== "grid" && selectedYearData && (
        <ForestScene
          days={flattenYearDays(selectedYearData)}
          mode={mode}
          numCols={selectedYearData.weeks.length}
        />
      )}
```

Add imports at the top:
```tsx
import { ForestScene } from "./ForestScene";
import { flattenYearDays } from "@/lib/transform";
```

Add `selectedYearData` computation after existing state:
```tsx
  const selectedYearData = data.years.find((y) => y.year === selectedYear);
```

- [ ] **Step 4: Verify in browser**

Visit a user page, click "Forest". Expected: 3D isometric view with green voxel blocks growing upward in a wave animation. Blocks sway gently. OrbitControls allow rotation/zoom. Light cream background.

- [ ] **Step 5: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/ForestScene.tsx components/VoxelForest.tsx components/VisualizationShell.tsx
git commit -m "feat: add 3D voxel forest with instanced rendering and grow animation"
```

---

## Task 10: 3D Terrain Hills

**Files:**
- Create: `components/TerrainHills.tsx`
- Modify: `components/ForestScene.tsx`

- [ ] **Step 1: Create TerrainHills component**

Create `components/TerrainHills.tsx`:

```tsx
"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { TERRAIN_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
  smoothedDays: ContributionDay[];
};

const MAX_HEIGHT = 8;
const CELL_SIZE = 1;
const GROW_DURATION = 0.6;

export function TerrainHills({ days, smoothedDays }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Set colors based on smoothed height
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < smoothedDays.length; i++) {
      const day = smoothedDays[i];
      // Map height to color gradient
      const colorIndex = Math.min(4, Math.floor(day.height * 4.99));
      const rgb = TERRAIN_COLORS_RGB[colorIndex];
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [smoothedDays, color]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [smoothedDays]);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < smoothedDays.length; i++) {
      const day = smoothedDays[i];
      const targetHeight = Math.max(0.15, day.height * MAX_HEIGHT);

      const delay = (day.col * 0.01) + (day.row * 0.005);
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const easedProgress = 1 - Math.pow(1 - growProgress, 3);
      const currentHeight = targetHeight * easedProgress;

      dummy.position.set(
        day.col * CELL_SIZE,
        currentHeight / 2,
        day.row * CELL_SIZE
      );
      dummy.scale.set(CELL_SIZE, Math.max(0.15, currentHeight), CELL_SIZE);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, smoothedDays.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
```

- [ ] **Step 2: Wire TerrainHills into ForestScene**

Replace `components/ForestScene.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ContributionDay, ViewMode } from "@/lib/types";
import { smoothHeights } from "@/lib/transform";
import { VoxelForest } from "./VoxelForest";
import { TerrainHills } from "./TerrainHills";

type Props = {
  days: ContributionDay[];
  mode: ViewMode;
  numCols: number;
};

export function ForestScene({ days, mode, numCols }: Props) {
  const numRows = 7;
  const centerX = (numCols * 1.1) / 2;
  const centerZ = (numRows * 1.1) / 2;

  const smoothedDays = useMemo(
    () => smoothHeights(days, numRows, numCols),
    [days, numCols]
  );

  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{
          zoom: 40,
          position: [20, 20, 20],
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "#f6f8fa" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />

        <group position={[-centerX, 0, -centerZ]}>
          {mode === "forest" && <VoxelForest days={days} />}
          {mode === "terrain" && (
            <TerrainHills days={days} smoothedDays={smoothedDays} />
          )}
        </group>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minZoom={10}
          maxZoom={100}
          target={[0, 2, 0]}
        />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Visit a user page, toggle to "Terrain". Expected: Smooth rolling green hills with height-based color gradient. No gaps between cells. Blocks grow with wave animation. Toggle between Forest and Terrain to compare.

- [ ] **Step 4: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/TerrainHills.tsx components/ForestScene.tsx
git commit -m "feat: add terrain hills 3D mode with smoothed heights"
```

---

## Task 11: 2D ↔ 3D Transitions with Framer Motion

**Files:**
- Modify: `components/VisualizationShell.tsx`

- [ ] **Step 1: Add animated transitions between views**

Replace `components/VisualizationShell.tsx`:

```tsx
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ContributionData, ViewMode } from "@/lib/types";
import { flattenYearDays } from "@/lib/transform";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ForestScene } from "./ForestScene";
import { ViewToggle } from "./ViewToggle";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  const yearNumbers = data.years.map((y) => y.year);
  const selectedYearData = data.years.find((y) => y.year === selectedYear);

  const is3D = mode === "forest" || mode === "terrain";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f6f8fa]">
      <AnimatePresence mode="sync">
        {/* 2D Heatmap */}
        {!is3D && (
          <motion.div
            key="grid"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ContributionHeatmap years={data.years} />
          </motion.div>
        )}

        {/* 3D Scene */}
        {is3D && selectedYearData && (
          <motion.div
            key="3d"
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ForestScene
              days={flattenYearDays(selectedYearData)}
              mode={mode}
              numCols={selectedYearData.weeks.length}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>

      {/* View toggle */}
      <ViewToggle
        mode={mode}
        onModeChange={setMode}
        years={yearNumbers}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify transitions in browser**

Click between Grid → Forest → Terrain → Grid. Expected: Smooth crossfade with subtle scale (300ms). Grid scales down and fades, 3D scales up and fades in. Forest↔Terrain transitions remount the 3D scene (grow animation replays for each mode).

- [ ] **Step 3: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/VisualizationShell.tsx
git commit -m "feat: add Framer Motion transitions between 2D and 3D views"
```

---

## Task 12: Multi-Year Support

**Files:**
- Modify: `app/[username]/page.tsx`

- [ ] **Step 1: Fetch multiple years of data**

In `app/[username]/page.tsx`, change the fetch call from 1 year to more:

Replace:
```tsx
  const data = await fetchContributions(username, 1);
```

With:
```tsx
  const data = await fetchContributions(username, 5);
```

This fetches the last 5 years. The 2D heatmap shows all years stacked. The 3D view renders the selected year via the year selector in ViewToggle.

- [ ] **Step 2: Verify in browser**

Visit a user with 5+ years of activity. Expected: 2D grid shows 5 stacked year rows. 3D mode shows year selector pills. Switching years re-renders the 3D scene with that year's data.

- [ ] **Step 3: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add app/[username]/page.tsx
git commit -m "feat: fetch 5 years of contribution data"
```

---

## Task 13: Polish & Error States

**Files:**
- Modify: `app/globals.css`, `components/ContributionHeatmap.tsx`

- [ ] **Step 1: Clean up global CSS**

Ensure `app/globals.css` has only the Tailwind directives and a clean base:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html,
body {
  height: 100%;
}

* {
  box-sizing: border-box;
}
```

- [ ] **Step 2: Add empty state to heatmap**

In `components/ContributionHeatmap.tsx`, add an empty state check at the top of the `ContributionHeatmap` component:

Add before the return:
```tsx
  if (years.length === 0 || years.every((y) => y.total === 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-lg text-gray-400">
          No contributions yet — start planting seeds! 🌱
        </p>
      </div>
    );
  }
```

- [ ] **Step 3: Verify error states**

Test with a username that has no contributions. Expected: Shows friendly empty message.
Test with invalid username. Expected: 404 not-found page with retry form.

- [ ] **Step 4: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add app/globals.css components/ContributionHeatmap.tsx
git commit -m "feat: add empty state and polish global styles"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test
```
Expected: All tests pass.

- [ ] **Step 2: Run production build**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm build
```
Expected: Build succeeds with no errors.

- [ ] **Step 3: Full manual test**

1. Visit `/` — Landing page with tagline and input
2. Enter valid username → Redirects to `/{username}`
3. 2D grid renders with green cells, hover tooltips work
4. Click "Forest" → Smooth fade transition, voxels grow upward
5. Rotate/zoom with mouse → OrbitControls work
6. Click "Terrain" → Hills morph into smooth terrain
7. Year selector switches between years
8. Click "Grid" → Fades back to 2D heatmap
9. "Try another" link → Returns to landing page
10. Invalid username → Not-found page with retry form

- [ ] **Step 4: Commit any final fixes and tag**

```bash
cd /Users/aarekaz/Development/commit-grove
git add -A
git commit -m "chore: final polish and verification"
```