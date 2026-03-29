"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { CITY_BODY_COLORS_RGB, CITY_GLASS_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
};

const CELL_SIZE = 1;
const GAP = 0.1;
const MAX_HEIGHT = 4;
const GROW_DURATION = 0.7;

type BuildingCube = {
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

function generateBuildingCubes(day: ContributionDay): BuildingCube[] {
  const cx = day.col * (CELL_SIZE + GAP);
  const cz = day.row * (CELL_SIZE + GAP);
  const t = day.height; // 0-1 normalized

  if (t <= 0) return [];

  const cubes: BuildingCube[] = [];
  const colorIdx = Math.min(4, Math.floor(t * 4.99));
  const body = CITY_BODY_COLORS_RGB[colorIdx];
  const glass = CITY_GLASS_COLORS_RGB[colorIdx];

  // Seed pseudo-random variation from grid position
  const seed = (day.col * 7 + day.row * 13) % 17;
  const widthVar = 0.65 + (seed % 5) * 0.06; // 0.65-0.89
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

  // Window band (slightly inset, lighter)
  if (t > 0.15) {
    const bandH = bh * 0.12;
    const bandY = bh * 0.55;
    cubes.push({
      x: cx, y: bandY, z: cz,
      w: bw + 0.02, h: bandH, d: bd + 0.02,
      r: glass[0], g: glass[1], b: glass[2],
      col: day.col, row: day.row,
    });
    // Second window band
    if (t > 0.35) {
      cubes.push({
        x: cx, y: bh * 0.3, z: cz,
        w: bw + 0.02, h: bandH, d: bd + 0.02,
        r: glass[0], g: glass[1], b: glass[2],
        col: day.col, row: day.row,
      });
    }
  }

  // Rooftop section for taller buildings
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

    // Antenna/spire for the tallest buildings
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

export function CityGrid({ days }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const buildingCubes = useMemo(() => {
    return days.filter((d) => d.height > 0).flatMap(generateBuildingCubes);
  }, [days]);

  // Base grid — darker, like pavement
  useEffect(() => {
    if (!baseRef.current) return;
    const roadColor = new THREE.Color(0.75, 0.76, 0.78);
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
      baseRef.current.setColorAt(i, roadColor);
    }
    baseRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current.instanceColor) baseRef.current.instanceColor.needsUpdate = true;
  }, [days, dummy]);

  // Set colors
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < buildingCubes.length; i++) {
      const cube = buildingCubes[i];
      color.setRGB(cube.r, cube.g, cube.b);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [buildingCubes, color]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [buildingCubes]);

  // Animate: buildings rise from ground
  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < buildingCubes.length; i++) {
      const cube = buildingCubes[i];

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
      {/* Street grid */}
      <instancedMesh ref={baseRef} args={[undefined, undefined, days.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Buildings */}
      {buildingCubes.length > 0 && (
        <instancedMesh ref={meshRef} args={[undefined, undefined, buildingCubes.length]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
