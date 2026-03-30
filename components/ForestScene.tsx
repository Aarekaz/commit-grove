"use client";

import { useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ContributionDay, ViewMode } from "@/lib/types";
import { VoxelForest } from "./VoxelForest";
import { CityGrid } from "./CityGrid";
import { InteractiveBase } from "./InteractiveBase";

type Props = {
  days: ContributionDay[];
  mode: ViewMode;
  numCols: number;
  onDayHover?: (day: ContributionDay | null, event?: { x: number; y: number }) => void;
};

export function ForestScene({ days, mode, numCols, onDayHover }: Props) {
  const numRows = 7;
  const centerX = (numCols * 1.1) / 2;
  const centerZ = (numRows * 1.1) / 2;

  const handlePointerMove = useCallback(
    (day: ContributionDay | null, screenPos?: { x: number; y: number }) => {
      onDayHover?.(day, screenPos);
    },
    [onDayHover]
  );

  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{
          zoom: 40,
          position: [20, 20, 20],
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "#f6f8fa" }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />

        <group position={[-centerX, 0, -centerZ]}>
          <InteractiveBase days={days} onHover={handlePointerMove} />
          {mode === "forest" && <VoxelForest days={days} />}
          {mode === "city" && <CityGrid days={days} />}
        </group>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minZoom={10}
          maxZoom={100}
          target={[0, 2, 0]}
        />
      </Canvas>
    </div>
  );
}
