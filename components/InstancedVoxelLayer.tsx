"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import * as THREE from "three";
import type { TerrainCell } from "@/lib/types";
import type { ThreeEvent } from "@react-three/fiber";
import { palettesEqual } from "@/lib/seasons";

export type RGB = [number, number, number];

// Every voxel cube — tree part or building part — shares this positional shape.
// Renderers extend it with their own color-selection fields (e.g. `isTrunk`,
// `tag`). `col` drives the progressive left-to-right reveal.
export type VoxelBase = {
  x: number; y: number; z: number;
  w: number; h: number; d: number;
  col: number;
};

type Props<TCube extends VoxelBase, TPalette> = {
  cells: TerrainCell[];
  revealedCols: number;
  /** Per-renderer cube generator. MUST be a stable reference (module-level fn). */
  buildCubes: (cell: TerrainCell) => TCube[];
  /** Palette source for the current week. Stable reference. */
  getPalette: (week: number) => TPalette;
  /** Position + scale the terrain/base instance for a cell. Stable reference. */
  terrainMatrixOf: (cell: TerrainCell, dummy: THREE.Object3D) => void;
  /** Color of the terrain/base instance for a cell. Stable reference. */
  terrainColorOf: (cell: TerrainCell, palette: TPalette) => RGB;
  /** Color of a feature cube. Stable reference. */
  cubeColorOf: (cube: TCube, palette: TPalette) => RGB;
  onHover?: (cell: TerrainCell | null) => void;
};

// Shared machinery for both 3D views: two InstancedMeshes (a terrain/base grid
// plus a feature layer of cubes), matrices set once, colors recomputed only when
// the season palette actually changes, and a progressive `count`-based reveal.
// The per-view differences (geometry, palette, color rules) are injected as
// stable callbacks so the heavy memos/effects below never needlessly re-run.
export function InstancedVoxelLayer<TCube extends VoxelBase, TPalette>({
  cells,
  revealedCols,
  buildCubes,
  getPalette,
  terrainMatrixOf,
  terrainColorOf,
  cubeColorOf,
  onHover,
}: Props<TCube, TPalette>) {
  const terrainRef = useRef<THREE.InstancedMesh>(null);
  const featureRef = useRef<THREE.InstancedMesh>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const sortedCells = useMemo(
    () => [...cells].sort((a, b) => a.col - b.col || a.row - b.row),
    [cells]
  );

  const allCubes = useMemo(
    () => sortedCells.flatMap(buildCubes).sort((a, b) => a.col - b.col),
    [sortedCells, buildCubes]
  );

  // Set ALL terrain/base matrices ONCE (geometry doesn't change).
  useEffect(() => {
    if (!terrainRef.current || sortedCells.length === 0) return;
    for (let i = 0; i < sortedCells.length; i++) {
      terrainMatrixOf(sortedCells[i], dummy);
      dummy.updateMatrix();
      terrainRef.current.setMatrixAt(i, dummy.matrix);
    }
    terrainRef.current.instanceMatrix.needsUpdate = true;
  }, [sortedCells, dummy, terrainMatrixOf]);

  // Set ALL feature matrices ONCE.
  useEffect(() => {
    if (!featureRef.current || allCubes.length === 0) return;
    for (let i = 0; i < allCubes.length; i++) {
      const cube = allCubes[i];
      dummy.position.set(cube.x, cube.y, cube.z);
      dummy.scale.set(cube.w, cube.h, cube.d);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      featureRef.current.setMatrixAt(i, dummy.matrix);
    }
    featureRef.current.instanceMatrix.needsUpdate = true;
  }, [allCubes, dummy]);

  // Update COLORS based on season. Skip when neither geometry nor palette
  // changed since the last applied recolor: the palette is constant across
  // plateau weeks (e.g. the ~12-week summer hold), so this avoids needless full
  // instanceColor re-uploads on every reveal tick. The geometry check forces a
  // recolor when the mesh is rebuilt (year switch) even if the palette matches.
  const lastPaletteRef = useRef<TPalette | null>(null);
  const lastGeomRef = useRef<{ cells: TerrainCell[]; cubes: TCube[] } | null>(null);
  useEffect(() => {
    const palette = getPalette(revealedCols);
    const geomChanged =
      !lastGeomRef.current ||
      lastGeomRef.current.cells !== sortedCells ||
      lastGeomRef.current.cubes !== allCubes;
    if (!geomChanged && lastPaletteRef.current && palettesEqual(lastPaletteRef.current, palette)) {
      return;
    }
    lastPaletteRef.current = palette;
    lastGeomRef.current = { cells: sortedCells, cubes: allCubes };

    if (terrainRef.current && sortedCells.length > 0) {
      for (let i = 0; i < sortedCells.length; i++) {
        const rgb = terrainColorOf(sortedCells[i], palette);
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        terrainRef.current.setColorAt(i, color);
      }
      if (terrainRef.current.instanceColor) terrainRef.current.instanceColor.needsUpdate = true;
    }

    if (featureRef.current && allCubes.length > 0) {
      for (let i = 0; i < allCubes.length; i++) {
        const rgb = cubeColorOf(allCubes[i], palette);
        color.setRGB(rgb[0], rgb[1], rgb[2]);
        featureRef.current.setColorAt(i, color);
      }
      if (featureRef.current.instanceColor) featureRef.current.instanceColor.needsUpdate = true;
    }
  }, [revealedCols, sortedCells, allCubes, color, getPalette, terrainColorOf, cubeColorOf]);

  // Progressive reveal via mesh.count (cells are sorted by col, so all instances
  // belonging to revealed columns are contiguous at the front of each array).
  useEffect(() => {
    if (terrainRef.current) {
      let count = 0;
      for (let i = 0; i < sortedCells.length; i++) {
        if (sortedCells[i].col < revealedCols) count = i + 1;
        else break;
      }
      terrainRef.current.count = count;
    }
    if (featureRef.current) {
      let count = 0;
      for (let i = 0; i < allCubes.length; i++) {
        if (allCubes[i].col < revealedCols) count = i + 1;
        else break;
      }
      featureRef.current.count = count;
    }
  }, [revealedCols, sortedCells, allCubes]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      const id = e.instanceId;
      if (id !== undefined && id < sortedCells.length && sortedCells[id].terrainType !== "water") {
        onHover?.(sortedCells[id]);
      } else {
        onHover?.(null);
      }
    },
    [sortedCells, onHover]
  );

  const handlePointerLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  if (sortedCells.length === 0) return null;

  return (
    <>
      <instancedMesh
        ref={terrainRef}
        args={[undefined, undefined, sortedCells.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </instancedMesh>
      {allCubes.length > 0 && (
        <instancedMesh ref={featureRef} args={[undefined, undefined, allCubes.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial />
        </instancedMesh>
      )}
    </>
  );
}
