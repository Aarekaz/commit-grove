"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import { LEVEL_COLORS_RGB } from "@/lib/colors";

type Props = {
  days: ContributionDay[];
};

const MAX_HEIGHT = 8;
const CELL_SIZE = 1;
const GAP = 0.1;
const GROW_DURATION = 0.6;

export function VoxelForest({ days }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef(Date.now());

  const activeDays = useMemo(() => days.filter((d) => d.height > 0), [days]);
  const allDays = useMemo(() => days, [days]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  // Set up base grid (flat tiles for all cells)
  useEffect(() => {
    if (!baseRef.current) return;
    const baseColor = new THREE.Color(0.92, 0.93, 0.94);
    for (let i = 0; i < allDays.length; i++) {
      const day = allDays[i];
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
  }, [allDays, dummy]);

  // Set colors for active blocks
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < activeDays.length; i++) {
      const day = activeDays[i];
      const rgb = LEVEL_COLORS_RGB[day.level];
      color.setRGB(rgb[0], rgb[1], rgb[2]);
      meshRef.current.setColorAt(i, color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [activeDays, color]);

  // Reset animation timer when days change
  useEffect(() => {
    startTime.current = Date.now();
  }, [activeDays]);

  // Animate: grow blocks upward + gentle sway
  useFrame(() => {
    if (!meshRef.current) return;
    const elapsed = (Date.now() - startTime.current) / 1000;

    for (let i = 0; i < activeDays.length; i++) {
      const day = activeDays[i];
      const targetHeight = day.height * MAX_HEIGHT;

      // Staggered grow delay based on position
      const delay = day.col * 0.01 + day.row * 0.005;
      const growProgress = Math.min(1, Math.max(0, (elapsed - delay) / GROW_DURATION));
      const easedProgress = 1 - Math.pow(1 - growProgress, 3); // easeOutCubic
      const currentHeight = targetHeight * easedProgress;

      // Gentle sway
      const sway = Math.sin(elapsed * 1.5 + day.col * 0.3 + day.row * 0.5) * 0.02;

      dummy.position.set(
        day.col * (CELL_SIZE + GAP),
        currentHeight / 2,
        day.row * (CELL_SIZE + GAP)
      );
      dummy.scale.set(CELL_SIZE, Math.max(0.01, currentHeight), CELL_SIZE);
      dummy.rotation.set(0, sway, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      {/* Base grid */}
      <instancedMesh ref={baseRef} args={[undefined, undefined, allDays.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>

      {/* Active voxel blocks */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, activeDays.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
    </>
  );
}
