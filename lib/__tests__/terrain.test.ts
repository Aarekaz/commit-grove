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

// A deterministic cols × rows grid of varied heights (mirrors the original
// `((col + row) % 5) / 4` fixture) for tests that need a fuller board.
function grid(cols: number, rows = 7): number[][] {
  return Array.from({ length: cols }, (_, col) =>
    Array.from({ length: rows }, (_, row) => ((col + row) % 5) / 4)
  );
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
    const days = makeDays(grid(10));
    const a = generateTerrain(days, 7, 10, "aarekaz");
    const b = generateTerrain(days, 7, 10, "aarekaz");
    expect(a).toHaveLength(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].terrainHeight).toBe(b[i].terrainHeight);
      expect(a[i].terrainType).toBe(b[i].terrainType);
    }
  });

  it("produces different noise for different usernames", () => {
    const days = makeDays(grid(10));
    const a = generateTerrain(days, 7, 10, "aarekaz");
    const b = generateTerrain(days, 7, 10, "torvalds");
    const differingCells = a.filter((cell, i) => cell.terrainHeight !== b[i].terrainHeight);
    // Noise should shift at least 25% of cells even at low amplitude.
    expect(differingCells.length).toBeGreaterThan(a.length * 0.25);
  });

  it("never produces negative terrain heights", () => {
    const days = makeDays(grid(10));
    const out = generateTerrain(days, 7, 10, "aarekaz");
    for (const cell of out) {
      expect(cell.terrainHeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves original row, col, and date mapping", () => {
    const days = makeDays(grid(5));
    const out = generateTerrain(days, 7, 5, "aarekaz");
    expect(out).toHaveLength(days.length);
    for (let i = 0; i < days.length; i++) {
      expect(out[i].row).toBe(days[i].row);
      expect(out[i].col).toBe(days[i].col);
      expect(out[i].date).toBe(days[i].date);
    }
  });
});
