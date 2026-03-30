"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { TerrainCell, ViewMode } from "@/lib/types";
import { VoxelForest } from "./VoxelForest";
import { CityGrid } from "./CityGrid";

type Props = {
  cells: TerrainCell[];
  mode: ViewMode;
  numCols: number;
  onDayHover?: (cell: TerrainCell | null, event?: { x: number; y: number }) => void;
};

export function ForestScene({ cells, mode, numCols, onDayHover }: Props) {
  const numRows = 7;
  const centerX = numCols / 2;
  const centerZ = numRows / 2;

  // Adapt zoom to grid size so it always fills the viewport
  const zoom = useMemo(() => {
    const maxDim = Math.max(numCols, numRows);
    if (maxDim <= 0) return 40;
    // Base zoom for a 52-week grid, scale up for smaller grids
    return Math.min(80, Math.max(20, (52 / Math.max(maxDim, 10)) * 35));
  }, [numCols, numRows]);

  return (
    <div className="h-full w-full">
      <Canvas
        orthographic
        camera={{
          zoom,
          position: [20, 20, 20],
          near: 0.1,
          far: 1000,
        }}
        style={{ background: "#f6f8fa" }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 25, 10]} intensity={0.9} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.25} color="#c0d8f0" />

        <group position={[-centerX, 0, -centerZ]}>
          {mode === "forest" && <VoxelForest cells={cells} onHover={onDayHover} />}
          {mode === "city" && <CityGrid cells={cells} onHover={onDayHover} />}
        </group>

        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minZoom={10}
          maxZoom={120}
          target={[0, 1, 0]}
          makeDefault
        />
      </Canvas>
    </div>
  );
}
