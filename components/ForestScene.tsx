"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ContributionDay, ViewMode } from "@/lib/types";
import { smoothHeights } from "@/lib/transform";
import { VoxelForest } from "./VoxelForest";
import { TerrainHills } from "./TerrainHills";

type Props = {
  days: ContributionDay[];
  mode: ViewMode;
  numCols: number;
};

export function ForestScene({ days, mode, numCols }: Props) {
  const numRows = 7;
  const centerX = (numCols * 1.1) / 2;
  const centerZ = (numRows * 1.1) / 2;

  const smoothedDays = useMemo(
    () => smoothHeights(days, numRows, numCols),
    [days, numCols]
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
          {mode === "forest" && <VoxelForest days={days} />}
          {mode === "terrain" && (
            <TerrainHills days={days} smoothedDays={smoothedDays} />
          )}
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
