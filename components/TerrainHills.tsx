"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { TERRAIN_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
  smoothedDays: ContributionDay[];
};

const MAX_HEIGHT = 2.5;
const CELL_SIZE = 1;
const GROW_DURATION = 0.6;

export function TerrainHills({ days, smoothedDays }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Set colors based on smoothed height
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < smoothedDays.length; i++) {
      const day = smoothedDays[i];
      // Map height to color gradient
      const colorIndex = Math.min(4, Math.floor(day.height * 4.99));
      const rgb = TERRAIN_COLORS_RGB[colorIndex];
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [smoothedDays, color]);

  useEffect(() => {
    startTime.current = Date.now();
  }, [smoothedDays]);

  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < smoothedDays.length; i++) {
      const day = smoothedDays[i];
      const targetHeight = Math.max(0.15, day.height * MAX_HEIGHT);

      const delay = (day.col * 0.01) + (day.row * 0.005);
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const easedProgress = 1 - Math.pow(1 - growProgress, 3);
      const currentHeight = targetHeight * easedProgress;

      dummy.position.set(
        day.col * CELL_SIZE,
        currentHeight / 2,
        day.row * CELL_SIZE
      );
      dummy.scale.set(CELL_SIZE, Math.max(0.15, currentHeight), CELL_SIZE);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, smoothedDays.length]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
}
