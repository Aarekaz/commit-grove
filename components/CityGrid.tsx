"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import {
  CITY_BODY_COLORS_RGB,
  CITY_GLASS_COLORS_RGB,
  PARK_GREEN_RGB,
} from "@/lib/colors";

type Props = {
  days: ContributionDay[];
};

const CELL_SIZE = 1;
const GAP = 0.1;
const MAX_HEIGHT = 4;
const GROW_DURATION = 0.7;

type CityVoxel = {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  r: number;
  g: number;
  b: number;
  col: number;
  row: number;
};

function generateParkCubes(day: ContributionDay): CityVoxel[] {
  const cx = day.col * (CELL_SIZE + GAP);
  const cz = day.row * (CELL_SIZE + GAP);
  const cubes: CityVoxel[] = [];
  const green = PARK_GREEN_RGB[Math.min(4, day.level)];

  // Green ground tile
  cubes.push({
    x: cx, y: 0.03, z: cz,
    w: CELL_SIZE * 0.95, h: 0.06, d: CELL_SIZE * 0.95,
    r: green[0], g: green[1], b: green[2],
    col: day.col, row: day.row,
  });

  // Small tree in the park
  const seed = (day.col * 11 + day.row * 7) % 13;
  const offsetX = ((seed % 5) - 2) * 0.1;
  const offsetZ = ((seed % 3) - 1) * 0.12;
  const treeScale = 0.15 + day.height * 0.2;

  // Trunk
  cubes.push({
    x: cx + offsetX, y: 0.06 + treeScale * 0.5, z: cz + offsetZ,
    w: treeScale * 0.25, h: treeScale * 1.0, d: treeScale * 0.25,
    r: green[0] * 0.6, g: green[1] * 0.6, b: green[2] * 0.6,
    col: day.col, row: day.row,
  });

  // Canopy
  cubes.push({
    x: cx + offsetX, y: 0.06 + treeScale * 1.1, z: cz + offsetZ,
    w: treeScale * 0.8, h: treeScale * 0.6, d: treeScale * 0.8,
    r: green[0] * 0.9, g: green[1] * 0.95, b: green[2] * 0.85,
    col: day.col, row: day.row,
  });

  // Second tree for level 2 parks
  if (day.level >= 2) {
    const off2X = -offsetX * 0.8;
    const off2Z = -offsetZ * 0.7;
    const t2 = treeScale * 0.7;
    cubes.push({
      x: cx + off2X, y: 0.06 + t2 * 0.4, z: cz + off2Z,
      w: t2 * 0.22, h: t2 * 0.8, d: t2 * 0.22,
      r: green[0] * 0.55, g: green[1] * 0.55, b: green[2] * 0.55,
      col: day.col, row: day.row,
    });
    cubes.push({
      x: cx + off2X, y: 0.06 + t2 * 0.9, z: cz + off2Z,
      w: t2 * 0.7, h: t2 * 0.5, d: t2 * 0.7,
      r: green[0] * 0.85, g: green[1] * 0.9, b: green[2] * 0.8,
      col: day.col, row: day.row,
    });
  }

  return cubes;
}

function generateBuildingCubes(day: ContributionDay): CityVoxel[] {
  const cx = day.col * (CELL_SIZE + GAP);
  const cz = day.row * (CELL_SIZE + GAP);
  const t = day.height;
  const cubes: CityVoxel[] = [];

  const colorIdx = Math.min(4, Math.floor(t * 4.99));
  const body = CITY_BODY_COLORS_RGB[colorIdx];
  const glass = CITY_GLASS_COLORS_RGB[colorIdx];

  // Pseudo-random variation
  const seed = (day.col * 7 + day.row * 13) % 17;
  const widthVar = 0.65 + (seed % 5) * 0.06;
  const depthVar = 0.65 + ((seed + 3) % 5) * 0.06;

  // Main building body
  const bw = CELL_SIZE * widthVar;
  const bd = CELL_SIZE * depthVar;
  const bh = 0.3 + t * MAX_HEIGHT;
  cubes.push({
    x: cx, y: bh / 2, z: cz,
    w: bw, h: bh, d: bd,
    r: body[0], g: body[1], b: body[2],
    col: day.col, row: day.row,
  });

  // Window bands
  if (t > 0.15) {
    const bandH = bh * 0.1;
    cubes.push({
      x: cx, y: bh * 0.55, z: cz,
      w: bw + 0.02, h: bandH, d: bd + 0.02,
      r: glass[0], g: glass[1], b: glass[2],
      col: day.col, row: day.row,
    });
    if (t > 0.35) {
      cubes.push({
        x: cx, y: bh * 0.3, z: cz,
        w: bw + 0.02, h: bandH, d: bd + 0.02,
        r: glass[0], g: glass[1], b: glass[2],
        col: day.col, row: day.row,
      });
    }
    if (t > 0.6) {
      cubes.push({
        x: cx, y: bh * 0.78, z: cz,
        w: bw + 0.02, h: bandH, d: bd + 0.02,
        r: glass[0], g: glass[1], b: glass[2],
        col: day.col, row: day.row,
      });
    }
  }

  // Rooftop section
  if (t > 0.4) {
    const roofW = bw * 0.55;
    const roofD = bd * 0.55;
    const roofH = 0.15 + t * 0.6;
    cubes.push({
      x: cx, y: bh + roofH / 2, z: cz,
      w: roofW, h: roofH, d: roofD,
      r: body[0] * 0.85, g: body[1] * 0.85, b: body[2] * 0.85,
      col: day.col, row: day.row,
    });

    // Antenna for tallest
    if (t > 0.8) {
      const spireH = 0.3 + t * 0.4;
      cubes.push({
        x: cx, y: bh + roofH + spireH / 2, z: cz,
        w: 0.06, h: spireH, d: 0.06,
        r: 0.5, g: 0.5, b: 0.55,
        col: day.col, row: day.row,
      });
    }
  }

  return cubes;
}

function generateCityCubes(day: ContributionDay): CityVoxel[] {
  if (day.height <= 0) return [];

  // Low commits = parks, high commits = buildings
  if (day.level <= 2) {
    return generateParkCubes(day);
  }
  return generateBuildingCubes(day);
}

export function CityGrid({ days }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const cityVoxels = useMemo(() => {
    return days.flatMap(generateCityCubes);
  }, [days]);

  // Base grid — pavement for buildings, lighter for empty
  useEffect(() => {
    if (!baseRef.current) return;
    const pavementColor = new THREE.Color(0.78, 0.78, 0.80);
    const roadColor = new THREE.Color(0.65, 0.66, 0.68);
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      dummy.position.set(
        day.col * (CELL_SIZE + GAP),
        -0.05,
        day.row * (CELL_SIZE + GAP)
      );
      dummy.scale.set(CELL_SIZE, 0.1, CELL_SIZE);
      dummy.updateMatrix();
      baseRef.current.setMatrixAt(i, dummy.matrix);
      // Parks don't get pavement base (they have green ground)
      const isActive = day.height > 0;
      const isPark = isActive && day.level <= 2;
      baseRef.current.setColorAt(
        i,
        isPark ? new THREE.Color(0.45, 0.65, 0.38) : isActive ? roadColor : pavementColor
      );
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [days, dummy]);

  // Set colors
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < cityVoxels.length; i++) {
      const cube = cityVoxels[i];
      color.setRGB(cube.r, cube.g, cube.b);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [cityVoxels, color]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [cityVoxels]);

  // Animate: rise from ground
  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < cityVoxels.length; i++) {
      const cube = cityVoxels[i];
      const delay = cube.col * 0.008 + cube.row * 0.004;
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const eased = 1 - Math.pow(1 - growProgress, 3);

      dummy.position.set(cube.x, cube.y * eased, cube.z);
      dummy.scale.set(cube.w, Math.max(0.01, cube.h * eased), cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Street/pavement grid */}
      <instancedMesh ref={baseRef} args={[undefined, undefined, days.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Buildings + parks */}
      {cityVoxels.length > 0 && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, cityVoxels.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
