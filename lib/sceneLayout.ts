/**
 * Shared mapping from contribution grid coordinates to 3D world space.
 *
 * VoxelForest and CityGrid both arrange cells on a flat (x, z) grid where
 * x = col * step and z = row * step. The only difference is the step size
 * (forest packs cells tightly, the city leaves gaps for streets).
 *
 * Keeping this in one place means mode transitions and any future
 * shared-coordinate features (minimap, tooltips, camera targeting) stay
 * consistent with the scene geometry.
 */
export type GridCell = { col: number; row: number };

export type WorldPosition = { x: number; z: number };

export function cellToWorld(cell: GridCell, step: number): WorldPosition {
  return { x: cell.col * step, z: cell.row * step };
}
