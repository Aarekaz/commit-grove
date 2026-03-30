"use client";

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
        style={{ background: "#0a0f1a" }}
      >
        <fog attach="fog" args={["#0a0f1a", 30, 80]} />
        <ambientLight intensity={0.35} />
        <directionalLight position={[15, 25, 10]} intensity={1.2} color="#ffeedd" castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#aaccff" />

        <group position={[-centerX, 0, -centerZ]}>
          {mode === "forest" && <VoxelForest cells={cells} onHover={onDayHover} />}
          {mode === "city" && <CityGrid cells={cells} onHover={onDayHover} />}
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
