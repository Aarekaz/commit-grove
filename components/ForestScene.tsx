"use client";

import { useEffect, useRef, useCallback, useMemo, type ComponentRef } from "react";
import { Canvas, useStore } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { TerrainCell, ViewMode } from "@/lib/types";
import { getSeasonPalette, getCitySeasonPalette } from "@/lib/seasons";
import { VoxelForest } from "./VoxelForest";
import { CityGrid } from "./CityGrid";

type CameraProps = { numCols: number };

function CameraController({ numCols }: CameraProps) {
  const store = useStore();
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null);

  useEffect(() => {
    // Imperative access via the store avoids the react-hooks/immutability
    // rule that forbids mutating values returned from a hook. The store
    // reference itself is stable across renders.
    const { camera } = store.getState();
    const maxDim = Math.max(numCols, 7);
    const zoom = Math.min(80, Math.max(20, (52 / Math.max(maxDim, 10)) * 35));
    camera.zoom = zoom;
    camera.position.set(20, 20, 20);
    camera.updateProjectionMatrix();
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 1, 0);
      controlsRef.current.update();
    }
  }, [numCols, store]);

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

function toCSS(rgb: [number, number, number]): string {
  return `rgb(${Math.round(rgb[0] * 255)}, ${Math.round(rgb[1] * 255)}, ${Math.round(rgb[2] * 255)})`;
}

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

  // Get sky colors from current season
  const sky = useMemo(() => {
    const palette = mode === "city"
      ? getCitySeasonPalette(revealedCols)
      : getSeasonPalette(revealedCols);
    return {
      top: toCSS(palette.skyTop),
      bottom: toCSS(palette.skyBottom),
    };
  }, [revealedCols, mode]);

  return (
    <div
      className="h-full w-full transition-colors duration-300"
      style={{
        background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.bottom} 100%)`,
      }}
      onPointerMove={handleMouseMove}
    >
      <Canvas
        orthographic
        camera={{
          zoom: 40,
          position: [20, 20, 20],
          near: 0.1,
          far: 1000,
        }}
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[15, 25, 10]} intensity={1.0} color="#fff5e6" castShadow />
        <directionalLight position={[-10, 8, -10]} intensity={0.3} color="#b8d4f0" />
        <hemisphereLight args={["#e8f0ff", "#d4c8a8", 0.3]} />

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
