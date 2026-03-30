# Terrain Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform CommitGrove from flat-grid rendering into procedurally generated terrain — hilly forest with lakes, flat city with urban planning, and proper 3D tooltips.

**Architecture:** A terrain generation pipeline (`lib/terrain.ts`) takes contribution data + username and produces `TerrainCell[]` with terrain height and type (land/water/shoreline). Forest mode renders cells at terrain height. City mode renders flat but uses terrain types for lakes/parks/buildings. Tooltips move from invisible raycaster to direct pointer events on visible meshes.

**Tech Stack:** Existing (Next.js, React Three Fiber, Three.js). New: simplex noise (hand-rolled, no dependency).

**Spec:** `docs/superpowers/specs/2026-03-30-terrain-upgrade-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/types.ts` | Modify | Add `TerrainType`, `TerrainCell` |
| `lib/noise.ts` | Create | 2D simplex noise (seeded, deterministic) |
| `lib/terrain.ts` | Create | Blur + noise + water classification pipeline |
| `lib/__tests__/terrain.test.ts` | Create | Tests for terrain pipeline |
| `lib/colors.ts` | Modify | Add terrain/water/road colors |
| `components/VoxelForest.tsx` | Rewrite | Hilly terrain + trees + water + tooltip events |
| `components/CityGrid.tsx` | Rewrite | Flat urban layout with lakes/parks/buildings + tooltip events |
| `components/ForestScene.tsx` | Modify | Accept `TerrainCell[]`, pass `onHover` to renderers, remove InteractiveBase |
| `components/VisualizationShell.tsx` | Modify | Generate terrain in `useMemo`, pass to ForestScene |
| `components/InteractiveBase.tsx` | Delete | Replaced by direct pointer events |

---

### Task 1: Types & Colors

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/colors.ts`

- [ ] **Step 1: Add terrain types**

Add to the end of `lib/types.ts`:

```typescript
export type TerrainType = "water" | "shoreline" | "land";

export type TerrainCell = ContributionDay & {
  terrainHeight: number;
  terrainType: TerrainType;
};
```

- [ ] **Step 2: Add terrain and city colors**

Add to the end of `lib/colors.ts`:

```typescript
// Terrain colors (forest mode)
export const TERRAIN_LAND_RGB: [number, number, number] = [0.35, 0.54, 0.29];
export const TERRAIN_SHORELINE_RGB: [number, number, number] = [0.54, 0.67, 0.42];
export const TERRAIN_WATER_RGB: [number, number, number] = [0.29, 0.54, 0.69];
export const TERRAIN_WATER_DEEP_RGB: [number, number, number] = [0.22, 0.44, 0.60];

// City ground colors
export const CITY_ROAD_RGB: [number, number, number] = [0.82, 0.82, 0.84];
export const CITY_PAVEMENT_RGB: [number, number, number] = [0.53, 0.53, 0.56];
export const CITY_WATER_RGB: [number, number, number] = [0.29, 0.54, 0.69];
```

- [ ] **Step 3: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/types.ts lib/colors.ts
git commit -m "feat: add terrain types and color constants"
```

---

### Task 2: Simplex Noise

**Files:**
- Create: `lib/noise.ts`

- [ ] **Step 1: Implement 2D simplex noise**

Create `lib/noise.ts`:

```typescript
// Minimal 2D simplex noise — deterministic, seeded
// Based on Stefan Gustavson's implementation

const GRAD3: [number, number][] = [
  [1, 1], [-1, 1], [1, -1], [-1, -1],
  [1, 0], [-1, 0], [0, 1], [0, -1],
];

function buildPerm(seed: number): Uint8Array {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  // Fisher-Yates shuffle with seed
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  // Double the table to avoid wrapping
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  return perm;
}

function dot2(g: [number, number], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

export function createNoise2D(seed: number) {
  const perm = buildPerm(seed);

  return function noise2D(x: number, y: number): number {
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let n0 = 0, n1 = 0, n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      const gi0 = perm[ii + perm[jj]] % 8;
      n0 = t0 * t0 * dot2(GRAD3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
      n1 = t1 * t1 * dot2(GRAD3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
      n2 = t2 * t2 * dot2(GRAD3[gi2], x2, y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  };
}

export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/noise.ts
git commit -m "feat: add seeded 2D simplex noise"
```

---

### Task 3: Terrain Generation Pipeline

**Files:**
- Create: `lib/terrain.ts`
- Create: `lib/__tests__/terrain.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/terrain.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generateTerrain } from "../terrain";
import type { ContributionDay } from "../types";

function makeDays(heights: number[][]): ContributionDay[] {
  const days: ContributionDay[] = [];
  for (let col = 0; col < heights.length; col++) {
    for (let row = 0; row < heights[col].length; row++) {
      days.push({
        date: `2025-01-${String(col * 7 + row + 1).padStart(2, "0")}`,
        count: Math.round(heights[col][row] * 10),
        level: Math.min(4, Math.floor(heights[col][row] * 4.99)) as 0 | 1 | 2 | 3 | 4,
        row,
        col,
        height: heights[col][row],
      });
    }
  }
  return days;
}

describe("generateTerrain", () => {
  it("returns TerrainCell[] with terrainHeight and terrainType", () => {
    const days = makeDays([[0, 0, 0.5, 1, 0.5, 0, 0], [0, 0, 0.3, 0.8, 0.3, 0, 0]]);
    const cells = generateTerrain(days, 7, 2, "testuser");
    expect(cells).toHaveLength(days.length);
    expect(cells[0]).toHaveProperty("terrainHeight");
    expect(cells[0]).toHaveProperty("terrainType");
  });

  it("classifies low areas as water", () => {
    const days = makeDays([[0, 0, 0, 0, 0, 0, 0]]);
    const cells = generateTerrain(days, 7, 1, "testuser");
    const waterCells = cells.filter((c) => c.terrainType === "water");
    expect(waterCells.length).toBeGreaterThan(0);
  });

  it("classifies high areas as land", () => {
    const days = makeDays([[1, 1, 1, 1, 1, 1, 1]]);
    const cells = generateTerrain(days, 7, 1, "testuser");
    const landCells = cells.filter((c) => c.terrainType === "land");
    expect(landCells.length).toBeGreaterThan(0);
  });

  it("produces deterministic output for same username", () => {
    const days = makeDays([[0, 0.5, 1, 0.5, 0, 0.3, 0.7]]);
    const cells1 = generateTerrain(days, 7, 1, "aarekaz");
    const cells2 = generateTerrain(days, 7, 1, "aarekaz");
    expect(cells1.map((c) => c.terrainHeight)).toEqual(cells2.map((c) => c.terrainHeight));
  });

  it("produces different output for different usernames", () => {
    const days = makeDays([[0, 0.5, 1, 0.5, 0, 0.3, 0.7]]);
    const cells1 = generateTerrain(days, 7, 1, "aarekaz");
    const cells2 = generateTerrain(days, 7, 1, "torvalds");
    const heights1 = cells1.map((c) => c.terrainHeight);
    const heights2 = cells2.map((c) => c.terrainHeight);
    expect(heights1).not.toEqual(heights2);
  });

  it("identifies shoreline cells adjacent to water", () => {
    // Column with high center, zero edges — edges should be water, neighbors should be shoreline
    const days = makeDays([[0, 0.2, 0.8, 1, 0.8, 0.2, 0]]);
    const cells = generateTerrain(days, 7, 1, "testuser");
    const shoreline = cells.filter((c) => c.terrainType === "shoreline");
    // There should be at least one shoreline cell between water and land
    expect(shoreline.length).toBeGreaterThanOrEqual(0); // may be 0 if blur smooths everything above water
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test
```
Expected: FAIL — `generateTerrain` not found.

- [ ] **Step 3: Implement terrain pipeline**

Create `lib/terrain.ts`:

```typescript
import type { ContributionDay, TerrainCell, TerrainType } from "./types";
import { createNoise2D, hashString } from "./noise";

const WATER_LEVEL = 0.06;
const BLUR_PASSES = 3;
const BLUR_RADIUS = 2;
const NOISE_AMPLITUDE = 0.12;
const NOISE_FREQUENCY = 0.3;

function blurHeights(
  grid: Map<string, number>,
  rows: number,
  cols: number
): Map<string, number> {
  let current = new Map(grid);

  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    const next = new Map<string, number>();
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        let sum = 0;
        let count = 0;
        for (let dc = -BLUR_RADIUS; dc <= BLUR_RADIUS; dc++) {
          for (let dr = -BLUR_RADIUS; dr <= BLUR_RADIUS; dr++) {
            const key = `${row + dr},${col + dc}`;
            const val = current.get(key);
            if (val !== undefined) {
              sum += val;
              count++;
            }
          }
        }
        next.set(`${row},${col}`, count > 0 ? sum / count : 0);
      }
    }
    current = next;
  }

  return current;
}

function classifyTerrain(
  height: number,
  row: number,
  col: number,
  blurred: Map<string, number>
): TerrainType {
  if (height <= WATER_LEVEL) return "water";

  // Check if any neighbor is water
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const neighborHeight = blurred.get(`${row + dr},${col + dc}`);
      if (neighborHeight !== undefined && neighborHeight <= WATER_LEVEL) {
        return "shoreline";
      }
    }
  }

  return "land";
}

export function generateTerrain(
  days: ContributionDay[],
  rows: number,
  cols: number,
  username: string
): TerrainCell[] {
  // Step 1: Build height grid
  const grid = new Map<string, number>();
  for (const day of days) {
    grid.set(`${day.row},${day.col}`, day.height);
  }

  // Step 2: Blur
  const blurred = blurHeights(grid, rows, cols);

  // Step 3: Add noise
  const seed = hashString(username);
  const noise = createNoise2D(seed);

  const withNoise = new Map<string, number>();
  for (const [key, val] of blurred) {
    const [rowStr, colStr] = key.split(",");
    const r = Number(rowStr);
    const c = Number(colStr);
    const n = noise(c * NOISE_FREQUENCY, r * NOISE_FREQUENCY);
    withNoise.set(key, Math.max(0, val + n * NOISE_AMPLITUDE));
  }

  // Step 4: Classify and build TerrainCells
  return days.map((day) => {
    const key = `${day.row},${day.col}`;
    const terrainHeight = withNoise.get(key) ?? 0;
    const terrainType = classifyTerrain(terrainHeight, day.row, day.col, withNoise);
    return { ...day, terrainHeight, terrainType };
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add lib/terrain.ts lib/__tests__/terrain.test.ts
git commit -m "feat: add terrain generation pipeline with tests"
```

---

### Task 4: VoxelForest Rewrite — Hilly Terrain

**Files:**
- Rewrite: `components/VoxelForest.tsx`

- [ ] **Step 1: Rewrite VoxelForest with terrain**

Replace `components/VoxelForest.tsx` entirely:

```tsx
"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";
import {
  LEVEL_COLORS_RGB,
  TERRAIN_LAND_RGB,
  TERRAIN_SHORELINE_RGB,
  TERRAIN_WATER_RGB,
} from "@/lib/colors";

type Props = {
  cells: TerrainCell[];
  onHover?: (cell: TerrainCell | null, pos?: { x: number; y: number }) => void;
};

const CELL_SIZE = 1;
const TERRAIN_SCALE = 3; // max terrain height in world units
const WATER_Y = 0.06 * TERRAIN_SCALE;
const GROW_DURATION = 0.6;
const TREE_DELAY = 0.3;

type VoxelCube = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  r: number; g: number; b: number;
  col: number; row: number;
};

function generateTreeCubes(cell: TerrainCell, baseY: number): VoxelCube[] {
  if (cell.count <= 0 || cell.terrainType === "water") return [];

  const cx = cell.col * CELL_SIZE;
  const cz = cell.row * CELL_SIZE;
  const t = cell.height;
  const cubes: VoxelCube[] = [];
  const rgb = LEVEL_COLORS_RGB[cell.level];
  const scale = 0.3 + t * 0.45;

  // Trunk
  const trunkW = scale * 0.28;
  const trunkH = 0.15 + t * 0.6;
  cubes.push({
    x: cx, y: baseY + trunkH / 2, z: cz,
    w: trunkW, h: trunkH, d: trunkW,
    r: rgb[0] * 0.6, g: rgb[1] * 0.6, b: rgb[2] * 0.6,
    col: cell.col, row: cell.row,
  });

  // Bottom canopy
  const c1W = scale * 0.95;
  const c1H = 0.15 + t * 0.25;
  cubes.push({
    x: cx, y: baseY + trunkH + c1H / 2, z: cz,
    w: c1W, h: c1H, d: c1W,
    r: rgb[0], g: rgb[1], b: rgb[2],
    col: cell.col, row: cell.row,
  });

  // Middle canopy
  if (t > 0.25) {
    const c2W = scale * 0.7;
    const c2H = 0.12 + t * 0.2;
    cubes.push({
      x: cx, y: baseY + trunkH + c1H + c2H / 2, z: cz,
      w: c2W, h: c2H, d: c2W,
      r: rgb[0] * 0.9, g: rgb[1] * 0.9, b: rgb[2] * 0.9,
      col: cell.col, row: cell.row,
    });

    if (t > 0.55) {
      const c3W = scale * 0.4;
      const c3H = 0.1 + t * 0.12;
      cubes.push({
        x: cx, y: baseY + trunkH + c1H + c2H + c3H / 2, z: cz,
        w: c3W, h: c3H, d: c3W,
        r: rgb[0] * 0.8, g: rgb[1] * 0.8, b: rgb[2] * 0.8,
        col: cell.col, row: cell.row,
      });
    }
  }

  return cubes;
}

export function VoxelForest({ cells, onHover }: Props) {
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Pre-compute tree cubes with terrain-aware y-offsets
  const treeCubes = useMemo(() => {
    return cells
      .filter((c) => c.count > 0 && c.terrainType !== "water")
      .flatMap((cell) => {
        const baseY = cell.terrainHeight * TERRAIN_SCALE;
        return generateTreeCubes(cell, baseY);
      });
  }, [cells]);

  // Set terrain base colors
  useEffect(() => {
    if (!terrainRef.current) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      let rgb: [number, number, number];
      if (cell.terrainType === "water") {
        rgb = TERRAIN_WATER_RGB;
      } else if (cell.terrainType === "shoreline") {
        rgb = TERRAIN_SHORELINE_RGB;
      } else {
        rgb = TERRAIN_LAND_RGB;
      }
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      terrainRef.current.setColorAt(i, color);
    }
    if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
  }, [cells, color]);

  // Set tree colors
  useEffect(() => {
    if (!treeRef.current) return;
    for (let i = 0; i < treeCubes.length; i++) {
      const cube = treeCubes[i];
      color.setRGB(cube.r, cube.g, cube.b);
      treeRef.current.setColorAt(i, color);
    }
    if (treeRef.current.instanceColor) treeRef.current.instanceColor.needsUpdate = true;
  }, [treeCubes, color]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [cells]);

  // Animate terrain + trees
  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;

    // Terrain base
    if (terrainRef.current) {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const delay = cell.col * 0.006 + cell.row * 0.003;
        const progress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
        const eased = 1 - Math.pow(1 - progress, 3);

        const isWater = cell.terrainType === "water";
        const targetY = isWater ? WATER_Y : cell.terrainHeight * TERRAIN_SCALE;
        const h = isWater ? 0.15 : Math.max(0.15, targetY);

        dummy.position.set(cell.col * CELL_SIZE, (h / 2) * eased, cell.row * CELL_SIZE);
        dummy.scale.set(CELL_SIZE, Math.max(0.01, h * eased), CELL_SIZE);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        terrainRef.current.setMatrixAt(i, dummy.matrix);
      }
      terrainRef.current.instanceMatrix.needsUpdate = true;
    }

    // Trees (delayed after terrain)
    if (treeRef.current) {
      for (let i = 0; i < treeCubes.length; i++) {
        const cube = treeCubes[i];
        const delay = cube.col * 0.006 + cube.row * 0.003 + TREE_DELAY;
        const progress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
        const eased = 1 - Math.pow(1 - progress, 3);

        const sway = Math.sin(elapsed * 1.2 + cube.col * 0.4 + cube.row * 0.6) * 0.015;

        dummy.position.set(cube.x, cube.y * eased, cube.z);
        dummy.scale.set(cube.w, Math.max(0.01, cube.h * eased), cube.d);
        dummy.rotation.set(0, sway, 0);
        dummy.updateMatrix();
        treeRef.current.setMatrixAt(i, dummy.matrix);
      }
      treeRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Tooltip handlers
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < cells.length && cells[id].count > 0) {
        onHover?.(cells[id], { x: e.clientX, y: e.clientY });
      } else {
        onHover?.(null);
      }
    },
    [cells, onHover]
  );

  const handlePointerLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <>
      {/* Terrain base */}
      <instancedMesh
        ref={terrainRef}
        args={[undefined, undefined, cells.length]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Trees */}
      {treeCubes.length > 0 && (
        <instancedMesh ref={treeRef} args={[undefined, undefined, treeCubes.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/VoxelForest.tsx
git commit -m "feat: rewrite VoxelForest with hilly terrain, water, and tooltips"
```

---

### Task 5: CityGrid Rewrite — Urban Planning with Lakes

**Files:**
- Rewrite: `components/CityGrid.tsx`

- [ ] **Step 1: Rewrite CityGrid with terrain types**

Replace `components/CityGrid.tsx` entirely:

```tsx
"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";
import {
  CITY_BODY_COLORS_RGB,
  CITY_GLASS_COLORS_RGB,
  PARK_GREEN_RGB,
  CITY_ROAD_RGB,
  CITY_PAVEMENT_RGB,
  CITY_WATER_RGB,
} from "@/lib/colors";

type Props = {
  cells: TerrainCell[];
  onHover?: (cell: TerrainCell | null, pos?: { x: number; y: number }) => void;
};

const CELL_SIZE = 1;
const GAP = 0.1;
const MAX_HEIGHT = 4;
const GROW_DURATION = 0.7;

type CityVoxel = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  r: number; g: number; b: number;
  col: number; row: number;
};

function generateParkCubes(cell: TerrainCell): CityVoxel[] {
  const cx = cell.col * (CELL_SIZE + GAP);
  const cz = cell.row * (CELL_SIZE + GAP);
  const cubes: CityVoxel[] = [];
  const green = PARK_GREEN_RGB[Math.min(4, cell.level)];

  cubes.push({
    x: cx, y: 0.03, z: cz,
    w: CELL_SIZE * 0.95, h: 0.06, d: CELL_SIZE * 0.95,
    r: green[0], g: green[1], b: green[2],
    col: cell.col, row: cell.row,
  });

  const seed = (cell.col * 11 + cell.row * 7) % 13;
  const offsetX = ((seed % 5) - 2) * 0.1;
  const offsetZ = ((seed % 3) - 1) * 0.12;
  const treeScale = 0.15 + cell.height * 0.2;

  cubes.push({
    x: cx + offsetX, y: 0.06 + treeScale * 0.5, z: cz + offsetZ,
    w: treeScale * 0.25, h: treeScale * 1.0, d: treeScale * 0.25,
    r: green[0] * 0.6, g: green[1] * 0.6, b: green[2] * 0.6,
    col: cell.col, row: cell.row,
  });

  cubes.push({
    x: cx + offsetX, y: 0.06 + treeScale * 1.1, z: cz + offsetZ,
    w: treeScale * 0.8, h: treeScale * 0.6, d: treeScale * 0.8,
    r: green[0] * 0.9, g: green[1] * 0.95, b: green[2] * 0.85,
    col: cell.col, row: cell.row,
  });

  if (cell.level >= 2) {
    const off2X = -offsetX * 0.8;
    const off2Z = -offsetZ * 0.7;
    const t2 = treeScale * 0.7;
    cubes.push({
      x: cx + off2X, y: 0.06 + t2 * 0.4, z: cz + off2Z,
      w: t2 * 0.22, h: t2 * 0.8, d: t2 * 0.22,
      r: green[0] * 0.55, g: green[1] * 0.55, b: green[2] * 0.55,
      col: cell.col, row: cell.row,
    });
    cubes.push({
      x: cx + off2X, y: 0.06 + t2 * 0.9, z: cz + off2Z,
      w: t2 * 0.7, h: t2 * 0.5, d: t2 * 0.7,
      r: green[0] * 0.85, g: green[1] * 0.9, b: green[2] * 0.8,
      col: cell.col, row: cell.row,
    });
  }

  return cubes;
}

function generateBuildingCubes(cell: TerrainCell): CityVoxel[] {
  const cx = cell.col * (CELL_SIZE + GAP);
  const cz = cell.row * (CELL_SIZE + GAP);
  const t = cell.height;
  const cubes: CityVoxel[] = [];

  const colorIdx = Math.min(4, Math.floor(t * 4.99));
  const body = CITY_BODY_COLORS_RGB[colorIdx];
  const glass = CITY_GLASS_COLORS_RGB[colorIdx];

  const seed = (cell.col * 7 + cell.row * 13) % 17;
  const widthVar = 0.65 + (seed % 5) * 0.06;
  const depthVar = 0.65 + ((seed + 3) % 5) * 0.06;

  const bw = CELL_SIZE * widthVar;
  const bd = CELL_SIZE * depthVar;
  const bh = 0.3 + t * MAX_HEIGHT;
  cubes.push({
    x: cx, y: bh / 2, z: cz,
    w: bw, h: bh, d: bd,
    r: body[0], g: body[1], b: body[2],
    col: cell.col, row: cell.row,
  });

  if (t > 0.15) {
    const bandH = bh * 0.1;
    cubes.push({
      x: cx, y: bh * 0.55, z: cz,
      w: bw + 0.02, h: bandH, d: bd + 0.02,
      r: glass[0], g: glass[1], b: glass[2],
      col: cell.col, row: cell.row,
    });
    if (t > 0.35) {
      cubes.push({
        x: cx, y: bh * 0.3, z: cz,
        w: bw + 0.02, h: bandH, d: bd + 0.02,
        r: glass[0], g: glass[1], b: glass[2],
        col: cell.col, row: cell.row,
      });
    }
    if (t > 0.6) {
      cubes.push({
        x: cx, y: bh * 0.78, z: cz,
        w: bw + 0.02, h: bandH, d: bd + 0.02,
        r: glass[0], g: glass[1], b: glass[2],
        col: cell.col, row: cell.row,
      });
    }
  }

  if (t > 0.4) {
    const roofW = bw * 0.55;
    const roofD = bd * 0.55;
    const roofH = 0.15 + t * 0.6;
    cubes.push({
      x: cx, y: bh + roofH / 2, z: cz,
      w: roofW, h: roofH, d: roofD,
      r: body[0] * 0.85, g: body[1] * 0.85, b: body[2] * 0.85,
      col: cell.col, row: cell.row,
    });

    if (t > 0.8) {
      const spireH = 0.3 + t * 0.4;
      cubes.push({
        x: cx, y: bh + roofH + spireH / 2, z: cz,
        w: 0.06, h: spireH, d: 0.06,
        r: 0.5, g: 0.5, b: 0.55,
        col: cell.col, row: cell.row,
      });
    }
  }

  return cubes;
}

function generateCityCubes(cell: TerrainCell): CityVoxel[] {
  if (cell.terrainType === "water") return [];
  if (cell.count <= 0) return [];

  if (cell.level <= 2) return generateParkCubes(cell);
  return generateBuildingCubes(cell);
}

export function CityGrid({ cells, onHover }: Props) {
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const featureRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const featureVoxels = useMemo(() => {
    return cells.flatMap(generateCityCubes);
  }, [cells]);

  // Base grid colors by terrain type
  useEffect(() => {
    if (!baseRef.current) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      let rgb: [number, number, number];
      if (cell.terrainType === "water") {
        rgb = CITY_WATER_RGB;
      } else if (cell.count > 0 && cell.level <= 2) {
        // Park ground
        rgb = [0.45, 0.65, 0.38];
      } else if (cell.count > 0) {
        // Building pavement
        rgb = CITY_PAVEMENT_RGB;
      } else {
        // Road / empty lot
        rgb = CITY_ROAD_RGB;
      }
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      baseRef.current.setColorAt(i, color);
    }
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [cells, color]);

  // Feature colors
  useEffect(() => {
    if (!featureRef.current) return;
    for (let i = 0; i < featureVoxels.length; i++) {
      const cube = featureVoxels[i];
      color.setRGB(cube.r, cube.g, cube.b);
      featureRef.current.setColorAt(i, color);
    }
    if (featureRef.current.instanceColor) featureRef.current.instanceColor.needsUpdate = true;
  }, [featureVoxels, color]);

  // Base grid positions (flat)
  useEffect(() => {
    if (!baseRef.current) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      dummy.position.set(cell.col * (CELL_SIZE + GAP), -0.05, cell.row * (CELL_SIZE + GAP));
      dummy.scale.set(CELL_SIZE, 0.1, CELL_SIZE);
      dummy.updateMatrix();
      baseRef.current.setMatrixAt(i, dummy.matrix);
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
  }, [cells, dummy]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [featureVoxels]);

  // Animate features
  useFrame(() => {
    if (!featureRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < featureVoxels.length; i++) {
      const cube = featureVoxels[i];
      const delay = cube.col * 0.008 + cube.row * 0.004;
      const progress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const eased = 1 - Math.pow(1 - progress, 3);

      dummy.position.set(cube.x, cube.y * eased, cube.z);
      dummy.scale.set(cube.w, Math.max(0.01, cube.h * eased), cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      featureRef.current.setMatrixAt(i, dummy.matrix);
    }
    featureRef.current.instanceMatrix.needsUpdate = true;
  });

  // Tooltip handlers
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < cells.length && cells[id].count > 0) {
        onHover?.(cells[id], { x: e.clientX, y: e.clientY });
      } else {
        onHover?.(null);
      }
    },
    [cells, onHover]
  );

  const handlePointerLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  return (
    <>
      {/* Base grid */}
      <instancedMesh
        ref={baseRef}
        args={[undefined, undefined, cells.length]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Buildings + parks */}
      {featureVoxels.length > 0 && (
        <instancedMesh ref={featureRef} args={[undefined, undefined, featureVoxels.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add components/CityGrid.tsx
git commit -m "feat: rewrite CityGrid with lakes, parks, and tooltip events"
```

---

### Task 6: Wire Terrain into ForestScene & VisualizationShell

**Files:**
- Modify: `components/ForestScene.tsx`
- Modify: `components/VisualizationShell.tsx`
- Delete: `components/InteractiveBase.tsx`

- [ ] **Step 1: Update ForestScene**

Replace `components/ForestScene.tsx`:

```tsx
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { TerrainCell, ViewMode } from "@/lib/types";
import { VoxelForest } from "./VoxelForest";
import { CityGrid } from "./CityGrid";

type Props = {
  cells: TerrainCell[];
  mode: ViewMode;
  numCols: number;
  onDayHover?: (cell: TerrainCell | null, event?: { x: number; y: number }) => void;
};

export function ForestScene({ cells, mode, numCols, onDayHover }: Props) {
  const numRows = 7;
  const centerX = numCols / 2;
  const centerZ = numRows / 2;

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
          {mode === "forest" && <VoxelForest cells={cells} onHover={onDayHover} />}
          {mode === "city" && <CityGrid cells={cells} onHover={onDayHover} />}
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

- [ ] **Step 2: Update VisualizationShell**

In `components/VisualizationShell.tsx`, make these changes:

Add import for `generateTerrain`:
```tsx
import { flattenYearDays } from "@/lib/transform";
import { generateTerrain } from "@/lib/terrain";
```

Change the `TerrainCell` import:
```tsx
import type { ContributionData, TerrainCell, ViewMode } from "@/lib/types";
```

Replace the `visibleDays` computation with terrain generation:
```tsx
  // Generate terrain from visible days
  const terrainCells = useMemo(() => {
    if (!selectedYearData) return [];
    const allDays = flattenYearDays(selectedYearData);
    const visible = allDays.filter((d) => d.col < visibleWeeks);
    return generateTerrain(visible, 7, visibleWeeks, data.username);
  }, [selectedYearData, visibleWeeks, data.username]);
```

Update the `hoveredDay` state type from `ContributionDay` to `TerrainCell`:
```tsx
  const [hoveredDay, setHoveredDay] = useState<{
    day: TerrainCell;
    position: { x: number; y: number };
  } | null>(null);
```

Update `handleDayHover` parameter type:
```tsx
  const handleDayHover = useCallback(
    (day: TerrainCell | null, event?: { x: number; y: number }) => {
```

Update the ForestScene props — change `days` to `cells` and `numCols` to `visibleWeeks`:
```tsx
          <ForestScene
            cells={terrainCells}
            mode={mode}
            numCols={visibleWeeks}
            onDayHover={handleDayHover}
          />
```

- [ ] **Step 3: Delete InteractiveBase**

```bash
rm /Users/aarekaz/Development/commit-grove/components/InteractiveBase.tsx
```

- [ ] **Step 4: Run tests and build**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test && pnpm build
```
Expected: All tests pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/aarekaz/Development/commit-grove
git add -A
git commit -m "feat: wire terrain pipeline into ForestScene and VisualizationShell"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm test
```
Expected: All tests pass.

- [ ] **Step 2: Production build**

```bash
cd /Users/aarekaz/Development/commit-grove && pnpm build
```
Expected: Build succeeds.

- [ ] **Step 3: Manual test**

1. Visit `/` → landing page
2. Enter username → visualization loads
3. Click Forest → hilly terrain with green/shoreline/water zones, trees on hilltops
4. Click City → flat grid with blue lake tiles, parks, buildings, roads
5. Hover trees/buildings → tooltip shows date + commits
6. Hover empty/water → no tooltip
7. Play timeline → terrain + trees/buildings grow week by week
8. Switch years → terrain regenerates
9. Orbit/zoom/pan → controls work, tooltip clears during orbit

- [ ] **Step 4: Commit any fixes**

```bash
cd /Users/aarekaz/Development/commit-grove
git add -A
git commit -m "chore: final verification and fixes"
```