import type { ContributionDay, TerrainCell, TerrainType } from "./types";
import { createNoise2D, hashString } from "./noise";

const WATER_LEVEL = 0.06;
const BLUR_PASSES = 3;
const BLUR_RADIUS = 2;
const NOISE_AMPLITUDE = 0.12;
const NOISE_FREQUENCY = 0.3;

function blurHeights(
  grid: Map<string, number>,
  rows: number,
  cols: number
): Map<string, number> {
  let current = new Map(grid);

  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    const next = new Map<string, number>();
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        let sum = 0;
        let count = 0;
        for (let dc = -BLUR_RADIUS; dc <= BLUR_RADIUS; dc++) {
          for (let dr = -BLUR_RADIUS; dr <= BLUR_RADIUS; dr++) {
            const key = `${row + dr},${col + dc}`;
            const val = current.get(key);
            if (val !== undefined) {
              sum += val;
              count++;
            }
          }
        }
        next.set(`${row},${col}`, count > 0 ? sum / count : 0);
      }
    }
    current = next;
  }

  return current;
}

function classifyTerrain(
  height: number,
  row: number,
  col: number,
  blurred: Map<string, number>
): TerrainType {
  if (height <= WATER_LEVEL) return "water";

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const neighborHeight = blurred.get(`${row + dr},${col + dc}`);
      if (neighborHeight !== undefined && neighborHeight <= WATER_LEVEL) {
        return "shoreline";
      }
    }
  }

  return "land";
}

export function generateTerrain(
  days: ContributionDay[],
  rows: number,
  cols: number,
  username: string
): TerrainCell[] {
  const grid = new Map<string, number>();
  for (const day of days) {
    grid.set(`${day.row},${day.col}`, day.height);
  }

  const blurred = blurHeights(grid, rows, cols);

  const seed = hashString(username);
  const noise = createNoise2D(seed);

  const withNoise = new Map<string, number>();
  for (const [key, val] of blurred) {
    const [rowStr, colStr] = key.split(",");
    const r = Number(rowStr);
    const c = Number(colStr);
    const n = noise(c * NOISE_FREQUENCY, r * NOISE_FREQUENCY);
    withNoise.set(key, Math.max(0, val + n * NOISE_AMPLITUDE));
  }

  return days.map((day) => {
    const key = `${day.row},${day.col}`;
    const terrainHeight = withNoise.get(key) ?? 0;
    const terrainType = classifyTerrain(terrainHeight, day.row, day.col, withNoise);
    return { ...day, terrainHeight, terrainType };
  });
}
