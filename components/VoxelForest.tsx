"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
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
  revealedCols: number;
  onHover?: (cell: TerrainCell | null) => void;
};

const CELL_SIZE = 1;
const TERRAIN_SCALE = 3;
const WATER_Y = 0.06 * TERRAIN_SCALE;

type VoxelCube = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  r: number; g: number; b: number;
  col: number;
};

function generateTreeCubes(cell: TerrainCell, baseY: number): VoxelCube[] {
  if (cell.count <= 0 || cell.terrainType === "water") return [];

  const cx = cell.col * CELL_SIZE;
  const cz = cell.row * CELL_SIZE;
  const t = cell.height;
  const cubes: VoxelCube[] = [];
  const rgb = LEVEL_COLORS_RGB[cell.level];
  const scale = 0.3 + t * 0.45;

  const trunkW = scale * 0.28;
  const trunkH = 0.15 + t * 0.6;
  cubes.push({
    x: cx, y: baseY + trunkH / 2, z: cz,
    w: trunkW, h: trunkH, d: trunkW,
    r: rgb[0] * 0.6, g: rgb[1] * 0.6, b: rgb[2] * 0.6,
    col: cell.col,
  });

  const c1W = scale * 0.95;
  const c1H = 0.15 + t * 0.25;
  cubes.push({
    x: cx, y: baseY + trunkH + c1H / 2, z: cz,
    w: c1W, h: c1H, d: c1W,
    r: rgb[0], g: rgb[1], b: rgb[2],
    col: cell.col,
  });

  if (t > 0.25) {
    const c2W = scale * 0.7;
    const c2H = 0.12 + t * 0.2;
    cubes.push({
      x: cx, y: baseY + trunkH + c1H + c2H / 2, z: cz,
      w: c2W, h: c2H, d: c2W,
      r: rgb[0] * 0.9, g: rgb[1] * 0.9, b: rgb[2] * 0.9,
      col: cell.col,
    });

    if (t > 0.55) {
      const c3W = scale * 0.4;
      const c3H = 0.1 + t * 0.12;
      cubes.push({
        x: cx, y: baseY + trunkH + c1H + c2H + c3H / 2, z: cz,
        w: c3W, h: c3H, d: c3W,
        r: rgb[0] * 0.8, g: rgb[1] * 0.8, b: rgb[2] * 0.8,
        col: cell.col,
      });
    }
  }

  return cubes;
}

export function VoxelForest({ cells, revealedCols, onHover }: Props) {
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const treeRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Sort cells by column for progressive reveal via mesh.count
  const sortedCells = useMemo(() => {
    return [...cells].sort((a, b) => a.col - b.col || a.row - b.row);
  }, [cells]);

  // Pre-compute ALL tree cubes, sorted by column
  const allTreeCubes = useMemo(() => {
    return sortedCells
      .filter((c) => c.count > 0 && c.terrainType !== "water")
      .flatMap((cell) => generateTreeCubes(cell, cell.terrainHeight * TERRAIN_SCALE))
      .sort((a, b) => a.col - b.col);
  }, [sortedCells]);

  // Set ALL terrain matrices and colors ONCE
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

      let rgb: [number, number, number];
      if (isWater) rgb = TERRAIN_WATER_RGB;
      else if (cell.terrainType === "shoreline") rgb = TERRAIN_SHORELINE_RGB;
      else rgb = TERRAIN_LAND_RGB;
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      terrainRef.current.setColorAt(i, color);
    }
    terrainRef.current.instanceMatrix.needsUpdate = true;
    if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
  }, [sortedCells, dummy, color]);

  // Set ALL tree matrices and colors ONCE
  useEffect(() => {
    if (!treeRef.current || allTreeCubes.length === 0) return;

    for (let i = 0; i < allTreeCubes.length; i++) {
      const cube = allTreeCubes[i];
      dummy.position.set(cube.x, cube.y, cube.z);
      dummy.scale.set(cube.w, cube.h, cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      treeRef.current.setMatrixAt(i, dummy.matrix);

      color.setRGB(cube.r, cube.g, cube.b);
      treeRef.current.setColorAt(i, color);
    }
    treeRef.current.instanceMatrix.needsUpdate = true;
    if (treeRef.current.instanceColor) treeRef.current.instanceColor.needsUpdate = true;
  }, [allTreeCubes, dummy, color]);

  // Progressive reveal: set mesh.count based on revealedCols
  useEffect(() => {
    if (terrainRef.current) {
      // Count terrain cells with col < revealedCols
      let terrainCount = 0;
      for (let i = 0; i < sortedCells.length; i++) {
        if (sortedCells[i].col < revealedCols) terrainCount = i + 1;
        else break;
      }
      terrainRef.current.count = terrainCount;
    }

    if (treeRef.current) {
      let treeCount = 0;
      for (let i = 0; i < allTreeCubes.length; i++) {
        if (allTreeCubes[i].col < revealedCols) treeCount = i + 1;
        else break;
      }
      treeRef.current.count = treeCount;
    }
  }, [revealedCols, sortedCells, allTreeCubes]);

  // Tooltip
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

  const handlePointerLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  if (sortedCells.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={terrainRef}
        args={[undefined, undefined, sortedCells.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {allTreeCubes.length > 0 && (
        <instancedMesh
          ref={treeRef}
          args={[undefined, undefined, allTreeCubes.length]}
          frustumCulled={false}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
