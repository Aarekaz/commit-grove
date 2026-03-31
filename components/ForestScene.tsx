"use client";

import { useEffect, useRef, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { TerrainCell, ViewMode } from "@/lib/types";
import { VoxelForest } from "./VoxelForest";
import { CityGrid } from "./CityGrid";

type CameraProps = { numCols: number };

function CameraController({ numCols }: CameraProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    const maxDim = Math.max(numCols, 7);
    const zoom = Math.min(80, Math.max(20, (52 / Math.max(maxDim, 10)) * 35));
    camera.zoom = zoom;
    camera.position.set(20, 20, 20);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 1, 0);
      controlsRef.current.update();
    }
  }, [numCols, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      minZoom={10}
      maxZoom={120}
      target={[0, 1, 0]}
      makeDefault
    />
  );
}

type Props = {
  cells: TerrainCell[];
  revealedCols: number;
  mode: ViewMode;
  numCols: number;
  onDayHover?: (cell: TerrainCell | null, event?: { x: number; y: number }) => void;
};

export function ForestScene({ cells, revealedCols, mode, numCols, onDayHover }: Props) {
  const centerX = numCols / 2;
  const centerZ = 7 / 2;

  const mousePos = useRef({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e: React.PointerEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleCellHover = useCallback(
    (cell: TerrainCell | null) => {
      if (cell) {
        onDayHover?.(cell, mousePos.current);
      } else {
        onDayHover?.(null);
      }
    },
    [onDayHover]
  );

  return (
    <div className="h-full w-full" onPointerMove={handleMouseMove}>
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[15, 25, 10]} intensity={0.9} castShadow />
        <directionalLight position={[-10, 10, -10]} intensity={0.25} color="#c0d8f0" />

        <group position={[-centerX, 0, -centerZ]}>
          {mode === "forest" && (
            <VoxelForest cells={cells} revealedCols={revealedCols} onHover={handleCellHover} />
          )}
          {mode === "city" && (
            <CityGrid cells={cells} revealedCols={revealedCols} onHover={handleCellHover} />
          )}
        </group>

        <CameraController numCols={numCols} />
      </Canvas>
    </div>
  );
}
