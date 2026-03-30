# CommitGrove Terrain Upgrade — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Builds on:** `docs/superpowers/specs/2026-03-29-commit-grove-design.md`

---

## Overview

Transform CommitGrove from a flat-grid visualization into a procedurally generated world where contribution data shapes the terrain. Dense commit areas become hills and mountains, empty zones become lakes. Forest mode renders hilly organic terrain with trees on hilltops. City mode renders flat urban planning with waterfront buildings, parks, and lakes. Tooltips are reimplemented directly on visible meshes.

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Terrain source | Data-shaped (option A) | Commits literally ARE the landscape — the shape means something |
| Empty zones | Water (lakes) | Strongest visual contrast, simple flat plane implementation |
| Forest terrain | Hilly with elevation | Dramatic, organic, the signature visual |
| City terrain | Flat with urban planning | Buildings on slopes look weird; flat city with lakes/parks feels real |
| Height generation | Direct heightmap + noise detail | Data drives macro shape, simplex noise adds natural roughness |
| Tooltips | Date + count, on visible meshes | Remove invisible raycasting layer, direct pointer events |

## Terrain Generation Pipeline

### New file: `lib/terrain.ts`

Transforms flat `ContributionDay[]` into terrain-aware `TerrainCell[]`:

```
ContributionDay[] (52×7 grid)
    ↓
Step 1: Build 2D height grid (7 rows × N cols)
    — height = day.height (normalized 0-1 from commit count)
    ↓
Step 2: Multi-pass Gaussian blur (3 passes, radius 2)
    — Smooths blocky per-cell data into rolling hills
    — Each pass averages each cell with neighbors in a wider radius
    ↓
Step 3: Simplex noise overlay
    — amplitude: 0.12 (subtle roughness, doesn't override data)
    — frequency: 0.3 (medium-scale bumps)
    — Seed: hash of username string (deterministic per-user uniqueness)
    — Formula: finalHeight = blurredHeight + noise(col, row, seed) * amplitude
    ↓
Step 4: Classify terrain type
    — WATER_LEVEL constant = 0.06
    — Each cell gets a type:
      - "water"     → terrainHeight ≤ WATER_LEVEL
      - "shoreline" → terrainHeight > WATER_LEVEL AND adjacent to water
      - "land"      → terrainHeight > WATER_LEVEL AND not adjacent to water
    ↓
TerrainCell[] output
```

### New file: `lib/noise.ts`

Minimal simplex noise implementation (2D). No external dependency. ~80 lines. Deterministic given a seed value. Used only by `lib/terrain.ts`.

### New type: `TerrainCell`

```typescript
type TerrainType = "water" | "shoreline" | "land";

type TerrainCell = ContributionDay & {
  terrainHeight: number;   // 0-1, post-blur + noise
  terrainType: TerrainType;
};
```

Added to `lib/types.ts`.

## Forest Mode — Living Terrain

### `VoxelForest.tsx` — Full rewrite

**Terrain base (all cells):**
- Every cell is a voxel cube positioned at its `terrainHeight` on the y-axis
- Cubes packed edge-to-edge (CELL_SIZE = 1, GAP = 0) — reads as continuous terrain
- Colors by type:
  - Land: `#5a8a4a` (muted green) — bare terrain
  - Shoreline: `#8aaa6a` (sandy green)
  - Water: `#4a8ab0` (blue) — rendered at fixed WATER_LEVEL y, not at cell's terrain height

**Trees (land cells with commits > 0):**
- Existing voxel tree shapes (trunk + layered canopy)
- y-position = `terrainHeight` (tree sits ON the hill)
- Tree size still scales with commit count
- Trees only on land/shoreline cells, never on water

**Water rendering:**
- Water cells are flat cubes at WATER_LEVEL y-height
- Slightly transparent or lighter blue
- Terrain below water level is hidden (the water cube covers it)

**Animation:**
- Terrain rises first (staggered wave, 0.6s)
- Trees grow on top after terrain settles (delayed by 0.3s)
- Combined effect: ground rises, then forest sprouts

**Tooltip:**
- `onPointerMove` on the terrain base instanced mesh
- `instanceId` → look up `TerrainCell` from the days array
- Only fires callback for cells with `count > 0`
- `onPointerLeave` clears tooltip

## City Mode — Urban Planning

### `CityGrid.tsx` — Full rewrite

**Base grid (all cells, flat at y=0):**
- Colors by terrain type + commit level:
  - Water: `#4a8ab0` (blue lake tiles)
  - Land, no commits: `#d0d0d2` (light pavement / roads)
  - Land, level 1-2: `#5a8a4a` (green park ground)
  - Land, level 3-4: `#888890` (dark pavement under buildings)

**Features by cell type:**
- **Water cells:** Blue flat tile only. Nothing built on water.
- **Land, level 1-2 (parks):** Green ground + small voxel trees (existing park logic)
- **Land, level 3-4 (buildings):** Building cubes (existing building logic — green glass, window bands, rooftops, antennas)
- **Land, no commits:** Bare pavement/road tiles. Empty lots.

**All features at y=0** — city is flat. The personality comes from layout:
- Lakes break up the grid (waterfront properties!)
- Parks cluster where commits were light
- Skyscrapers cluster where commits were heavy
- Roads fill the gaps

**Tooltip:**
- Same approach as forest: `onPointerMove` on the base grid mesh
- `instanceId` → `TerrainCell` lookup
- Only for cells with `count > 0`

## Tooltip System — Proper Implementation

### Remove `InteractiveBase.tsx`

The invisible raycasting layer is deleted. Pointer events go directly on the visible base mesh in each renderer.

### Tooltip callback flow

```
VoxelForest/CityGrid: onPointerMove on base instanced mesh
    → instanceId → TerrainCell lookup
    → if count > 0: call onDayHover(cell, { x: clientX, y: clientY })
    → if count === 0 or onPointerLeave: call onDayHover(null)
        ↓
ForestScene: passes callback through to active renderer
        ↓
VisualizationShell: renders <HoverInfo> overlay (existing component)
```

### HoverInfo behavior
- Follows cursor (12px offset right+up)
- Only shows for cells with commits
- Disappears on pointer leave and during orbit/pan (OrbitControls consumes pointer)
- Content: "Sat, Mar 15, 2026" + "12 commits"

## Colors

### New additions to `lib/colors.ts`

```typescript
// Terrain colors
export const TERRAIN_LAND_RGB: [number, number, number] = [0.35, 0.54, 0.29];
export const TERRAIN_SHORELINE_RGB: [number, number, number] = [0.54, 0.67, 0.42];
export const TERRAIN_WATER_RGB: [number, number, number] = [0.29, 0.54, 0.69];
export const TERRAIN_WATER_DEEP_RGB: [number, number, number] = [0.22, 0.44, 0.60];

// City ground colors
export const CITY_ROAD_RGB: [number, number, number] = [0.82, 0.82, 0.84];
export const CITY_PAVEMENT_RGB: [number, number, number] = [0.53, 0.53, 0.56];
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `lib/types.ts` | Modify | Add `TerrainType`, `TerrainCell` types |
| `lib/noise.ts` | Create | Simplex noise 2D implementation |
| `lib/terrain.ts` | Create | Terrain pipeline: blur, noise, water classification |
| `lib/colors.ts` | Modify | Add terrain, water, road colors |
| `components/VoxelForest.tsx` | Rewrite | Hilly terrain base + trees on hilltops + water + tooltip events |
| `components/CityGrid.tsx` | Rewrite | Flat urban layout with lakes/parks/buildings + tooltip events |
| `components/ForestScene.tsx` | Modify | Accept TerrainCell[], remove InteractiveBase import, pass onHover to renderers |
| `components/VisualizationShell.tsx` | Modify | Generate terrain via useMemo, pass TerrainCell[] downstream |
| `components/InteractiveBase.tsx` | Delete | Replaced by direct pointer events |
| `components/HoverInfo.tsx` | Keep | Unchanged, already works |
| `components/TimelineControls.tsx` | Keep | Unchanged, timeline still works (filters by visibleWeeks before terrain generation) |

## Out of Scope

- Animated water (reflections, waves)
- Rivers connecting lakes
- Different tree species
- Bridges in city mode
- Day/night cycle
- Sound design
- Username-seeded terrain variation beyond noise (this spec uses username only for noise seed)

These are all future enhancements.
