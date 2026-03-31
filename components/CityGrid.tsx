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
  onHover?: (cell: TerrainCell | null) => void;
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
  const animDone = useRef(false);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const featureVoxels = useMemo(() => {
    return cells.flatMap(generateCityCubes);
  }, [cells]);

  useEffect(() => {
    if (!baseRef.current) return;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      let rgb: [number, number, number];
      if (cell.terrainType === "water") {
        rgb = CITY_WATER_RGB;
      } else if (cell.count > 0 && cell.level <= 2) {
        rgb = [0.45, 0.65, 0.38];
      } else if (cell.count > 0) {
        rgb = CITY_PAVEMENT_RGB;
      } else {
        rgb = CITY_ROAD_RGB;
      }
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      baseRef.current.setColorAt(i, color);
    }
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [cells, color]);

  useEffect(() => {
    if (!featureRef.current) return;
    for (let i = 0; i < featureVoxels.length; i++) {
      const cube = featureVoxels[i];
      color.setRGB(cube.r, cube.g, cube.b);
      featureRef.current.setColorAt(i, color);
    }
    if (featureRef.current.instanceColor) featureRef.current.instanceColor.needsUpdate = true;
  }, [featureVoxels, color]);

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

  const maxAnimTime = useMemo(() => {
    let maxDelay = 0;
    for (const c of featureVoxels) {
      const d = c.col * 0.008 + c.row * 0.004;
      if (d > maxDelay) maxDelay = d;
    }
    return maxDelay + GROW_DURATION + 0.1;
  }, [featureVoxels]);

  useEffect(() => {
    startTime.current = Date.now();
    animDone.current = false;
  }, [featureVoxels]);

  useFrame(() => {
    if (animDone.current || !featureRef.current) return;

    const elapsed = (Date.now() - startTime.current) / 1000;

    if (elapsed > maxAnimTime) {
      animDone.current = true;
    }

    for (let i = 0; i < featureVoxels.length; i++) {
      const cube = featureVoxels[i];
      const delay = cube.col * 0.008 + cube.row * 0.004;
      const progress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const eased = animDone.current ? 1 : 1 - Math.pow(1 - progress, 3);

      dummy.position.set(cube.x, cube.y * eased, cube.z);
      dummy.scale.set(cube.w, Math.max(0.01, cube.h * eased), cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      featureRef.current.setMatrixAt(i, dummy.matrix);
    }
    featureRef.current.instanceMatrix.needsUpdate = true;
  });

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < cells.length && cells[id].terrainType !== "water") {
        onHover?.(cells[id]);
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
        ref={baseRef}
        args={[undefined, undefined, cells.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {featureVoxels.length > 0 && (
        <instancedMesh ref={featureRef} args={[undefined, undefined, featureVoxels.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
