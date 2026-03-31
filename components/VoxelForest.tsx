"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";
import { getSeasonPalette } from "@/lib/seasons";

type Props = {
  cells: TerrainCell[];
  revealedCols: number;
  onHover?: (cell: TerrainCell | null) => void;
};

const CELL_SIZE = 1;
const TERRAIN_SCALE = 3;
const WATER_Y = 0.06 * TERRAIN_SCALE;

type VoxelCube = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  col: number;
  level: number; // 1-4 for canopy color indexing
  isTrunk: boolean;
};

function generateTreeCubes(cell: TerrainCell, baseY: number): VoxelCube[] {
  if (cell.count <= 0 || cell.terrainType === "water") return [];

  const cx = cell.col * CELL_SIZE;
  const cz = cell.row * CELL_SIZE;
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

export function VoxelForest({ cells, revealedCols, onHover }: Props) {
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const sortedCells = useMemo(() => {
    return [...cells].sort((a, b) => a.col - b.col || a.row - b.row);
  }, [cells]);

  const allTreeCubes = useMemo(() => {
    return sortedCells
      .filter((c) => c.count > 0 && c.terrainType !== "water")
      .flatMap((cell) => generateTreeCubes(cell, cell.terrainHeight * TERRAIN_SCALE))
      .sort((a, b) => a.col - b.col);
  }, [sortedCells]);

  // Set ALL terrain matrices ONCE (geometry doesn't change)
  useEffect(() => {
    if (!terrainRef.current || sortedCells.length === 0) return;
    for (let i = 0; i < sortedCells.length; i++) {
      const cell = sortedCells[i];
      const isWater = cell.terrainType === "water";
      const targetY = isWater ? WATER_Y : cell.terrainHeight * TERRAIN_SCALE;
      const h = isWater ? 0.15 : Math.max(0.15, targetY);
      dummy.position.set(cell.col * CELL_SIZE, h / 2, cell.row * CELL_SIZE);
      dummy.scale.set(CELL_SIZE, h, CELL_SIZE);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      terrainRef.current.setMatrixAt(i, dummy.matrix);
    }
    terrainRef.current.instanceMatrix.needsUpdate = true;
  }, [sortedCells, dummy]);

  // Set ALL tree matrices ONCE
  useEffect(() => {
    if (!treeRef.current || allTreeCubes.length === 0) return;
    for (let i = 0; i < allTreeCubes.length; i++) {
      const cube = allTreeCubes[i];
      dummy.position.set(cube.x, cube.y, cube.z);
      dummy.scale.set(cube.w, cube.h, cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      treeRef.current.setMatrixAt(i, dummy.matrix);
    }
    treeRef.current.instanceMatrix.needsUpdate = true;
  }, [allTreeCubes, dummy]);

  // Update COLORS based on season (revealedCols → week → palette)
  useEffect(() => {
    const season = getSeasonPalette(revealedCols);

    if (terrainRef.current && sortedCells.length > 0) {
      for (let i = 0; i < sortedCells.length; i++) {
        const cell = sortedCells[i];
        let rgb: [number, number, number];
        if (cell.terrainType === "water") rgb = season.water;
        else if (cell.terrainType === "shoreline") rgb = season.shoreline;
        else rgb = season.land;
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        terrainRef.current.setColorAt(i, color);
      }
      if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
    }

    if (treeRef.current && allTreeCubes.length > 0) {
      for (let i = 0; i < allTreeCubes.length; i++) {
        const cube = allTreeCubes[i];
        const lvl = Math.min(3, cube.level);
        let rgb: [number, number, number];
        if (cube.isTrunk) {
          rgb = season.trunk;
        } else {
          rgb = season.canopy[lvl];
        }
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        treeRef.current.setColorAt(i, color);
      }
      if (treeRef.current.instanceColor) treeRef.current.instanceColor.needsUpdate = true;
    }
  }, [revealedCols, sortedCells, allTreeCubes, color]);

  // Progressive reveal via mesh.count
  useEffect(() => {
    if (terrainRef.current) {
      let count = 0;
      for (let i = 0; i < sortedCells.length; i++) {
        if (sortedCells[i].col < revealedCols) count = i + 1;
        else break;
      }
      terrainRef.current.count = count;
    }
    if (treeRef.current) {
      let count = 0;
      for (let i = 0; i < allTreeCubes.length; i++) {
        if (allTreeCubes[i].col < revealedCols) count = i + 1;
        else break;
      }
      treeRef.current.count = count;
    }
  }, [revealedCols, sortedCells, allTreeCubes]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < sortedCells.length && sortedCells[id].terrainType !== "water") {
        onHover?.(sortedCells[id]);
      } else {
        onHover?.(null);
      }
    },
    [sortedCells, onHover]
  );

  const handlePointerLeave = useCallback(() => { onHover?.(null); }, [onHover]);

  if (sortedCells.length === 0) return null;

  return (
    <>
      <instancedMesh ref={terrainRef} args={[undefined, undefined, sortedCells.length]} frustumCulled={false} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      {allTreeCubes.length > 0 && (
        <instancedMesh ref={treeRef} args={[undefined, undefined, allTreeCubes.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
