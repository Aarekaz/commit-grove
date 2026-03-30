"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { ContributionDay } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";

type Props = {
  days: ContributionDay[];
  onHover: (day: ContributionDay | null, screenPos?: { x: number; y: number }) => void;
};

const CELL_SIZE = 1;
const GAP = 0.1;

export function InteractiveBase({ days, onHover }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      dummy.position.set(
        day.col * (CELL_SIZE + GAP),
        0,
        day.row * (CELL_SIZE + GAP)
      );
      dummy.scale.set(CELL_SIZE, 0.5, CELL_SIZE);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [days, dummy]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < days.length) {
        onHover(days[id], { x: e.clientX, y: e.clientY });
      }
    },
    [days, onHover]
  );

  const handlePointerLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, days.length]}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </instancedMesh>
  );
}
