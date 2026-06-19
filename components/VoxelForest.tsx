"use client";

import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import { getSeasonPalette, type SeasonPalette } from "@/lib/seasons";
import { cellToWorld } from "@/lib/sceneLayout";
import { InstancedVoxelLayer, type VoxelBase, type RGB } from "./InstancedVoxelLayer";

type Props = {
  cells: TerrainCell[];
  revealedCols: number;
  onHover?: (cell: TerrainCell | null) => void;
};

const CELL_SIZE = 1;
const TERRAIN_SCALE = 3;
const WATER_Y = 0.06 * TERRAIN_SCALE;

type VoxelCube = VoxelBase & {
  level: number; // 1-4 for canopy color indexing
  isTrunk: boolean;
};

function generateTreeCubes(cell: TerrainCell, baseY: number): VoxelCube[] {
  if (cell.count <= 0 || cell.terrainType === "water") return [];

  const { x: cx, z: cz } = cellToWorld(cell, CELL_SIZE);
  const t = cell.height;
  const cubes: VoxelCube[] = [];
  const scale = 0.3 + t * 0.45;
  const lvl = Math.max(0, cell.level - 1); // 0-3 index

  // Trunk
  const trunkW = scale * 0.28;
  const trunkH = 0.15 + t * 0.6;
  cubes.push({ x: cx, y: baseY + trunkH / 2, z: cz, w: trunkW, h: trunkH, d: trunkW, col: cell.col, level: lvl, isTrunk: true });

  // Bottom canopy
  const c1W = scale * 0.95;
  const c1H = 0.15 + t * 0.25;
  cubes.push({ x: cx, y: baseY + trunkH + c1H / 2, z: cz, w: c1W, h: c1H, d: c1W, col: cell.col, level: lvl, isTrunk: false });

  if (t > 0.25) {
    const c2W = scale * 0.7;
    const c2H = 0.12 + t * 0.2;
    cubes.push({ x: cx, y: baseY + trunkH + c1H + c2H / 2, z: cz, w: c2W, h: c2H, d: c2W, col: cell.col, level: lvl, isTrunk: false });

    if (t > 0.55) {
      const c3W = scale * 0.4;
      const c3H = 0.1 + t * 0.12;
      cubes.push({ x: cx, y: baseY + trunkH + c1H + c2H + c3H / 2, z: cz, w: c3W, h: c3H, d: c3W, col: cell.col, level: lvl, isTrunk: false });
    }
  }

  return cubes;
}

// Stable module-level callbacks injected into InstancedVoxelLayer. Keeping these
// out of the component preserves referential stability so the layer's memos and
// "set matrices once" effects don't re-run on every render.
function buildTreeCubes(cell: TerrainCell): VoxelCube[] {
  return generateTreeCubes(cell, cell.terrainHeight * TERRAIN_SCALE);
}

function terrainMatrix(cell: TerrainCell, dummy: THREE.Object3D): void {
  const isWater = cell.terrainType === "water";
  const targetY = isWater ? WATER_Y : cell.terrainHeight * TERRAIN_SCALE;
  const h = isWater ? 0.15 : Math.max(0.15, targetY);
  dummy.position.set(cell.col * CELL_SIZE, h / 2, cell.row * CELL_SIZE);
  dummy.scale.set(CELL_SIZE, h, CELL_SIZE);
  dummy.rotation.set(0, 0, 0);
}

function terrainColor(cell: TerrainCell, season: SeasonPalette): RGB {
  if (cell.terrainType === "water") return season.water;
  if (cell.terrainType === "shoreline") return season.shoreline;
  return season.land;
}

function treeColor(cube: VoxelCube, season: SeasonPalette): RGB {
  if (cube.isTrunk) return season.trunk;
  return season.canopy[Math.min(3, cube.level)];
}

export function VoxelForest({ cells, revealedCols, onHover }: Props) {
  return (
    <InstancedVoxelLayer
      cells={cells}
      revealedCols={revealedCols}
      buildCubes={buildTreeCubes}
      getPalette={getSeasonPalette}
      terrainMatrixOf={terrainMatrix}
      terrainColorOf={terrainColor}
      cubeColorOf={treeColor}
      onHover={onHover}
    />
  );
}
