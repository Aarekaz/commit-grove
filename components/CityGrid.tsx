"use client";

import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import { getCitySeasonPalette, type CitySeason } from "@/lib/seasons";
import { cellToWorld } from "@/lib/sceneLayout";
import { InstancedVoxelLayer, type VoxelBase, type RGB } from "./InstancedVoxelLayer";

type Props = {
  cells: TerrainCell[];
  revealedCols: number;
  onHover?: (cell: TerrainCell | null) => void;
};

const CELL_SIZE = 1;
const GAP = 0.1;
const CITY_STEP = CELL_SIZE + GAP;
const MAX_HEIGHT = 4;

// Feature type tags for seasonal coloring
type FeatureTag = "body" | "glass" | "roof" | "spire" | "parkGround" | "parkTrunk" | "parkCanopy";

type CityVoxel = VoxelBase & {
  colorIdx: number; // 0-4 index into palette arrays
  tag: FeatureTag;
};

function generateParkCubes(cell: TerrainCell): CityVoxel[] {
  const { x: cx, z: cz } = cellToWorld(cell, CITY_STEP);
  const cubes: CityVoxel[] = [];
  const idx = Math.min(4, cell.level);

  cubes.push({ x: cx, y: 0.03, z: cz, w: CELL_SIZE * 0.95, h: 0.06, d: CELL_SIZE * 0.95, col: cell.col, colorIdx: idx, tag: "parkGround" });

  const seed = (cell.col * 11 + cell.row * 7) % 13;
  const offsetX = ((seed % 5) - 2) * 0.1;
  const offsetZ = ((seed % 3) - 1) * 0.12;
  const treeScale = 0.15 + cell.height * 0.2;

  cubes.push({ x: cx + offsetX, y: 0.06 + treeScale * 0.5, z: cz + offsetZ, w: treeScale * 0.25, h: treeScale * 1.0, d: treeScale * 0.25, col: cell.col, colorIdx: idx, tag: "parkTrunk" });
  cubes.push({ x: cx + offsetX, y: 0.06 + treeScale * 1.1, z: cz + offsetZ, w: treeScale * 0.8, h: treeScale * 0.6, d: treeScale * 0.8, col: cell.col, colorIdx: idx, tag: "parkCanopy" });

  if (cell.level >= 2) {
    const off2X = -offsetX * 0.8, off2Z = -offsetZ * 0.7, t2 = treeScale * 0.7;
    cubes.push({ x: cx + off2X, y: 0.06 + t2 * 0.4, z: cz + off2Z, w: t2 * 0.22, h: t2 * 0.8, d: t2 * 0.22, col: cell.col, colorIdx: idx, tag: "parkTrunk" });
    cubes.push({ x: cx + off2X, y: 0.06 + t2 * 0.9, z: cz + off2Z, w: t2 * 0.7, h: t2 * 0.5, d: t2 * 0.7, col: cell.col, colorIdx: idx, tag: "parkCanopy" });
  }

  return cubes;
}

function generateBuildingCubes(cell: TerrainCell): CityVoxel[] {
  const { x: cx, z: cz } = cellToWorld(cell, CITY_STEP);
  const t = cell.height;
  const cubes: CityVoxel[] = [];
  const colorIdx = Math.min(4, Math.floor(t * 4.99));

  const seed = (cell.col * 7 + cell.row * 13) % 17;
  const widthVar = 0.65 + (seed % 5) * 0.06;
  const depthVar = 0.65 + ((seed + 3) % 5) * 0.06;

  const bw = CELL_SIZE * widthVar, bd = CELL_SIZE * depthVar;
  const bh = 0.3 + t * MAX_HEIGHT;
  cubes.push({ x: cx, y: bh / 2, z: cz, w: bw, h: bh, d: bd, col: cell.col, colorIdx, tag: "body" });

  if (t > 0.15) {
    const bandH = bh * 0.1;
    cubes.push({ x: cx, y: bh * 0.55, z: cz, w: bw + 0.02, h: bandH, d: bd + 0.02, col: cell.col, colorIdx, tag: "glass" });
    if (t > 0.35) cubes.push({ x: cx, y: bh * 0.3, z: cz, w: bw + 0.02, h: bandH, d: bd + 0.02, col: cell.col, colorIdx, tag: "glass" });
    if (t > 0.6) cubes.push({ x: cx, y: bh * 0.78, z: cz, w: bw + 0.02, h: bandH, d: bd + 0.02, col: cell.col, colorIdx, tag: "glass" });
  }

  if (t > 0.4) {
    const roofW = bw * 0.55, roofD = bd * 0.55, roofH = 0.15 + t * 0.6;
    cubes.push({ x: cx, y: bh + roofH / 2, z: cz, w: roofW, h: roofH, d: roofD, col: cell.col, colorIdx, tag: "roof" });
    if (t > 0.8) {
      const spireH = 0.3 + t * 0.4;
      cubes.push({ x: cx, y: bh + roofH + spireH / 2, z: cz, w: 0.06, h: spireH, d: 0.06, col: cell.col, colorIdx, tag: "spire" });
    }
  }

  return cubes;
}

function generateCityCubes(cell: TerrainCell): CityVoxel[] {
  if (cell.terrainType === "water" || cell.count <= 0) return [];
  if (cell.level <= 2) return generateParkCubes(cell);
  return generateBuildingCubes(cell);
}

// Stable module-level callbacks injected into InstancedVoxelLayer (see VoxelForest).
function baseMatrix(cell: TerrainCell, dummy: THREE.Object3D): void {
  dummy.position.set(cell.col * (CELL_SIZE + GAP), -0.05, cell.row * (CELL_SIZE + GAP));
  dummy.scale.set(CELL_SIZE, 0.1, CELL_SIZE);
  dummy.rotation.set(0, 0, 0);
}

function baseColor(cell: TerrainCell, season: CitySeason): RGB {
  if (cell.terrainType === "water") return season.water;
  if (cell.count > 0 && cell.level <= 2) return season.parkGreen[Math.min(4, cell.level)] as RGB;
  if (cell.count > 0) return season.pavement;
  return season.road;
}

function featureColor(cube: CityVoxel, season: CitySeason): RGB {
  const idx = cube.colorIdx;
  switch (cube.tag) {
    case "body": return season.body[idx] as RGB;
    case "glass": return season.glass[idx] as RGB;
    case "roof": { const b = season.body[idx]; return [b[0] * 0.85, b[1] * 0.85, b[2] * 0.85]; }
    case "spire": return [0.5, 0.5, 0.55];
    case "parkGround": return season.parkGreen[idx] as RGB;
    case "parkTrunk": { const g = season.parkGreen[idx]; return [g[0] * 0.6, g[1] * 0.6, g[2] * 0.6]; }
    case "parkCanopy": { const g = season.parkGreen[idx]; return [g[0] * 0.9, g[1] * 0.95, g[2] * 0.85]; }
    default: return [0.5, 0.5, 0.5];
  }
}

export function CityGrid({ cells, revealedCols, onHover }: Props) {
  return (
    <InstancedVoxelLayer
      cells={cells}
      revealedCols={revealedCols}
      buildCubes={generateCityCubes}
      getPalette={getCitySeasonPalette}
      terrainMatrixOf={baseMatrix}
      terrainColorOf={baseColor}
      cubeColorOf={featureColor}
      onHover={onHover}
    />
  );
}
