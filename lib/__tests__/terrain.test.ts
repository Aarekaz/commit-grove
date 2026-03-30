import { describe, it, expect } from "vitest";
import { generateTerrain } from "../terrain";
import type { ContributionDay } from "../types";

function makeDays(heights: number[][]): ContributionDay[] {
  const days: ContributionDay[] = [];
  for (let col = 0; col < heights.length; col++) {
    for (let row = 0; row < heights[col].length; row++) {
      days.push({
        date: `2025-01-${String(col * 7 + row + 1).padStart(2, "0")}`,
        count: Math.round(heights[col][row] * 10),
        level: Math.min(4, Math.floor(heights[col][row] * 4.99)) as 0 | 1 | 2 | 3 | 4,
        row,
        col,
        height: heights[col][row],
      });
    }
  }
  return days;
}

describe("generateTerrain", () => {
  it("returns TerrainCell[] with terrainHeight and terrainType", () => {
    const days = makeDays([[0, 0, 0.5, 1, 0.5, 0, 0], [0, 0, 0.3, 0.8, 0.3, 0, 0]]);
    const cells = generateTerrain(days, 7, 2, "testuser");
    expect(cells).toHaveLength(days.length);
    expect(cells[0]).toHaveProperty("terrainHeight");
    expect(cells[0]).toHaveProperty("terrainType");
  });

  it("classifies low areas as water", () => {
    const days = makeDays([[0, 0, 0, 0, 0, 0, 0]]);
    const cells = generateTerrain(days, 7, 1, "testuser");
    const waterCells = cells.filter((c) => c.terrainType === "water");
    expect(waterCells.length).toBeGreaterThan(0);
  });

  it("classifies high areas as land", () => {
    const days = makeDays([[1, 1, 1, 1, 1, 1, 1]]);
    const cells = generateTerrain(days, 7, 1, "testuser");
    const landCells = cells.filter((c) => c.terrainType === "land");
    expect(landCells.length).toBeGreaterThan(0);
  });

  it("produces deterministic output for same username", () => {
    const days = makeDays([[0, 0.5, 1, 0.5, 0, 0.3, 0.7]]);
    const cells1 = generateTerrain(days, 7, 1, "aarekaz");
    const cells2 = generateTerrain(days, 7, 1, "aarekaz");
    expect(cells1.map((c) => c.terrainHeight)).toEqual(cells2.map((c) => c.terrainHeight));
  });

  it("produces different output for different usernames", () => {
    const days = makeDays([[0, 0.5, 1, 0.5, 0, 0.3, 0.7]]);
    const cells1 = generateTerrain(days, 7, 1, "aarekaz");
    const cells2 = generateTerrain(days, 7, 1, "torvalds");
    const heights1 = cells1.map((c) => c.terrainHeight);
    const heights2 = cells2.map((c) => c.terrainHeight);
    expect(heights1).not.toEqual(heights2);
  });
});
