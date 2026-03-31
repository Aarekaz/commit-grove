"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";
import { getCitySeasonPalette } from "@/lib/seasons";

type Props = {
  cells: TerrainCell[];
  revealedCols: number;
  onHover?: (cell: TerrainCell | null) => void;
};

const CELL_SIZE = 1;
const GAP = 0.1;
const MAX_HEIGHT = 4;

// Feature type tags for seasonal coloring
type FeatureTag = "body" | "glass" | "roof" | "spire" | "parkGround" | "parkTrunk" | "parkCanopy";

type CityVoxel = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  col: number;
  colorIdx: number; // 0-4 index into palette arrays
  tag: FeatureTag;
};

function generateParkCubes(cell: TerrainCell): CityVoxel[] {
  const cx = cell.col * (CELL_SIZE + GAP);
  const cz = cell.row * (CELL_SIZE + GAP);
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
  const cx = cell.col * (CELL_SIZE + GAP);
  const cz = cell.row * (CELL_SIZE + GAP);
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

export function CityGrid({ cells, revealedCols, onHover }: Props) {
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const featureRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const sortedCells = useMemo(() => [...cells].sort((a, b) => a.col - b.col || a.row - b.row), [cells]);
  const allFeatures = useMemo(() => sortedCells.flatMap(generateCityCubes).sort((a, b) => a.col - b.col), [sortedCells]);

  // Set base matrices ONCE
  useEffect(() => {
    if (!baseRef.current || sortedCells.length === 0) return;
    for (let i = 0; i < sortedCells.length; i++) {
      const cell = sortedCells[i];
      dummy.position.set(cell.col * (CELL_SIZE + GAP), -0.05, cell.row * (CELL_SIZE + GAP));
      dummy.scale.set(CELL_SIZE, 0.1, CELL_SIZE);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      baseRef.current.setMatrixAt(i, dummy.matrix);
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
  }, [sortedCells, dummy]);

  // Set feature matrices ONCE
  useEffect(() => {
    if (!featureRef.current || allFeatures.length === 0) return;
    for (let i = 0; i < allFeatures.length; i++) {
      const cube = allFeatures[i];
      dummy.position.set(cube.x, cube.y, cube.z);
      dummy.scale.set(cube.w, cube.h, cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      featureRef.current.setMatrixAt(i, dummy.matrix);
    }
    featureRef.current.instanceMatrix.needsUpdate = true;
  }, [allFeatures, dummy]);

  // Update COLORS based on season
  useEffect(() => {
    const season = getCitySeasonPalette(revealedCols);

    if (baseRef.current && sortedCells.length > 0) {
      for (let i = 0; i < sortedCells.length; i++) {
        const cell = sortedCells[i];
        let rgb: [number, number, number];
        if (cell.terrainType === "water") rgb = season.water;
        else if (cell.count > 0 && cell.level <= 2) rgb = season.parkGreen[Math.min(4, cell.level)];
        else if (cell.count > 0) rgb = season.pavement;
        else rgb = season.road;
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        baseRef.current.setColorAt(i, color);
      }
      if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
    }

    if (featureRef.current && allFeatures.length > 0) {
      for (let i = 0; i < allFeatures.length; i++) {
        const cube = allFeatures[i];
        const idx = cube.colorIdx;
        let rgb: [number, number, number];
        switch (cube.tag) {
          case "body": rgb = season.body[idx] as [number, number, number]; break;
          case "glass": rgb = season.glass[idx] as [number, number, number]; break;
          case "roof": { const b = season.body[idx]; rgb = [b[0] * 0.85, b[1] * 0.85, b[2] * 0.85]; break; }
          case "spire": rgb = [0.5, 0.5, 0.55]; break;
          case "parkGround": rgb = season.parkGreen[idx] as [number, number, number]; break;
          case "parkTrunk": { const g = season.parkGreen[idx]; rgb = [g[0] * 0.6, g[1] * 0.6, g[2] * 0.6]; break; }
          case "parkCanopy": { const g = season.parkGreen[idx]; rgb = [g[0] * 0.9, g[1] * 0.95, g[2] * 0.85]; break; }
          default: rgb = [0.5, 0.5, 0.5];
        }
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        featureRef.current.setColorAt(i, color);
      }
      if (featureRef.current.instanceColor) featureRef.current.instanceColor.needsUpdate = true;
    }
  }, [revealedCols, sortedCells, allFeatures, color]);

  // Progressive reveal
  useEffect(() => {
    if (baseRef.current) {
      let count = 0;
      for (let i = 0; i < sortedCells.length; i++) {
        if (sortedCells[i].col < revealedCols) count = i + 1; else break;
      }
      baseRef.current.count = count;
    }
    if (featureRef.current) {
      let count = 0;
      for (let i = 0; i < allFeatures.length; i++) {
        if (allFeatures[i].col < revealedCols) count = i + 1; else break;
      }
      featureRef.current.count = count;
    }
  }, [revealedCols, sortedCells, allFeatures]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < sortedCells.length && sortedCells[id].terrainType !== "water") {
        onHover?.(sortedCells[id]);
      } else { onHover?.(null); }
    },
    [sortedCells, onHover]
  );

  const handlePointerLeave = useCallback(() => { onHover?.(null); }, [onHover]);

  if (sortedCells.length === 0) return null;

  return (
    <>
      <instancedMesh ref={baseRef} args={[undefined, undefined, sortedCells.length]} frustumCulled={false} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      {allFeatures.length > 0 && (
        <instancedMesh ref={featureRef} args={[undefined, undefined, allFeatures.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
