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
const TERRAIN_SCALE = 3;
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

  const trunkW = scale * 0.28;
  const trunkH = 0.15 + t * 0.6;
  cubes.push({
    x: cx, y: baseY + trunkH / 2, z: cz,
    w: trunkW, h: trunkH, d: trunkW,
    r: rgb[0] * 0.6, g: rgb[1] * 0.6, b: rgb[2] * 0.6,
    col: cell.col, row: cell.row,
  });

  const c1W = scale * 0.95;
  const c1H = 0.15 + t * 0.25;
  cubes.push({
    x: cx, y: baseY + trunkH + c1H / 2, z: cz,
    w: c1W, h: c1H, d: c1W,
    r: rgb[0], g: rgb[1], b: rgb[2],
    col: cell.col, row: cell.row,
  });

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

  const treeCubes = useMemo(() => {
    return cells
      .filter((c) => c.count > 0 && c.terrainType !== "water")
      .flatMap((cell) => {
        const baseY = cell.terrainHeight * TERRAIN_SCALE;
        return generateTreeCubes(cell, baseY);
      });
  }, [cells]);

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

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000;

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
      <instancedMesh
        ref={terrainRef}
        args={[undefined, undefined, cells.length]}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {treeCubes.length > 0 && (
        <instancedMesh ref={treeRef} args={[undefined, undefined, treeCubes.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
