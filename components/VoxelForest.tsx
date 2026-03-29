"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { LEVEL_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
};

const CELL_SIZE = 1;
const GAP = 0.1;
const GROW_DURATION = 0.8;

type VoxelCube = {
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

function generateTreeCubes(day: ContributionDay): VoxelCube[] {
  const cx = day.col * (CELL_SIZE + GAP);
  const cz = day.row * (CELL_SIZE + GAP);
  const t = day.height; // 0-1 normalized

  if (t <= 0) return [];

  const cubes: VoxelCube[] = [];
  const rgb = LEVEL_COLORS_RGB[day.level];
  const scale = 0.3 + t * 0.45;

  // Trunk — narrow, darker green
  const trunkW = scale * 0.28;
  const trunkH = 0.15 + t * 0.6;
  cubes.push({
    x: cx, y: trunkH / 2, z: cz,
    w: trunkW, h: trunkH, d: trunkW,
    r: rgb[0] * 0.6, g: rgb[1] * 0.6, b: rgb[2] * 0.6,
    col: day.col, row: day.row,
  });

  // Bottom canopy — widest layer, always present
  const c1W = scale * 0.95;
  const c1H = 0.15 + t * 0.25;
  cubes.push({
    x: cx, y: trunkH + c1H / 2, z: cz,
    w: c1W, h: c1H, d: c1W,
    r: rgb[0], g: rgb[1], b: rgb[2],
    col: day.col, row: day.row,
  });

  // Middle canopy — for medium+ commits
  if (t > 0.25) {
    const c2W = scale * 0.7;
    const c2H = 0.12 + t * 0.2;
    cubes.push({
      x: cx, y: trunkH + c1H + c2H / 2, z: cz,
      w: c2W, h: c2H, d: c2W,
      r: rgb[0] * 0.9, g: rgb[1] * 0.9, b: rgb[2] * 0.9,
      col: day.col, row: day.row,
    });

    // Top canopy — for high commits
    if (t > 0.55) {
      const c3W = scale * 0.4;
      const c3H = 0.1 + t * 0.12;
      cubes.push({
        x: cx, y: trunkH + c1H + c2H + c3H / 2, z: cz,
        w: c3W, h: c3H, d: c3W,
        r: rgb[0] * 0.8, g: rgb[1] * 0.8, b: rgb[2] * 0.8,
        col: day.col, row: day.row,
      });
    }
  }

  return cubes;
}

export function VoxelForest({ days }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Pre-compute all tree cubes
  const treeCubes = useMemo(() => {
    return days.filter((d) => d.height > 0).flatMap(generateTreeCubes);
  }, [days]);

  // Set up base grid
  useEffect(() => {
    if (!baseRef.current) return;
    const baseColor = new THREE.Color(0.92, 0.93, 0.94);
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
      baseRef.current.setColorAt(i, baseColor);
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [days, dummy]);

  // Set colors for tree cubes
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < treeCubes.length; i++) {
      const cube = treeCubes[i];
      color.setRGB(cube.r, cube.g, cube.b);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [treeCubes, color]);

  // Reset animation on data change
  useEffect(() => {
    startTime.current = Date.now();
  }, [treeCubes]);

  // Animate: grow trees + gentle sway
  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < treeCubes.length; i++) {
      const cube = treeCubes[i];

      // Staggered grow based on grid position
      const delay = cube.col * 0.008 + cube.row * 0.004;
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const eased = 1 - Math.pow(1 - growProgress, 3);

      // Gentle sway on Y-axis
      const sway = Math.sin(elapsed * 1.2 + cube.col * 0.4 + cube.row * 0.6) * 0.015;

      dummy.position.set(cube.x, cube.y * eased, cube.z);
      dummy.scale.set(cube.w, Math.max(0.01, cube.h * eased), cube.d);
      dummy.rotation.set(0, sway, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Base grid */}
      <instancedMesh ref={baseRef} args={[undefined, undefined, days.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Tree cubes */}
      {treeCubes.length > 0 && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, treeCubes.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
