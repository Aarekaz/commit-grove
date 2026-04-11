import { describe, expect, it } from "vitest";
import { generateTerrain } from "./terrain";
import type { ContributionDay } from "./types";

function makeDays(cols: number, rows = 7): ContributionDay[] {
  const days: ContributionDay[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      days.push({
        date: `2026-01-${String(col * 7 + row + 1).padStart(2, "0")}`,
        count: (col + row) % 5,
        level: (((col + row) % 5) as ContributionDay["level"]),
        row,
        col,
        height: ((col + row) % 5) / 4,
      });
    }
  }
  return days;
}

describe("generateTerrain", () => {
  it("is deterministic for the same username and input", () => {
    const days = makeDays(10);
    const a = generateTerrain(days, 7, 10, "aarekaz");
    const b = generateTerrain(days, 7, 10, "aarekaz");

    expect(a).toHaveLength(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].terrainHeight).toBe(b[i].terrainHeight);
      expect(a[i].terrainType).toBe(b[i].terrainType);
    }
  });

  it("produces different noise for different usernames", () => {
    const days = makeDays(10);
    const a = generateTerrain(days, 7, 10, "aarekaz");
    const b = generateTerrain(days, 7, 10, "torvalds");

    const differingCells = a.filter((cell, i) => cell.terrainHeight !== b[i].terrainHeight);
    // Noise should shift at least 25% of cells even at low amplitude.
    expect(differingCells.length).toBeGreaterThan(a.length * 0.25);
  });

  it("never produces negative terrain heights", () => {
    const days = makeDays(10);
    const out = generateTerrain(days, 7, 10, "aarekaz");
    for (const cell of out) {
      expect(cell.terrainHeight).toBeGreaterThanOrEqual(0);
    }
  });

  it("preserves original row, col, and date mapping", () => {
    const days = makeDays(5);
    const out = generateTerrain(days, 7, 5, "aarekaz");

    expect(out).toHaveLength(days.length);
    for (let i = 0; i < days.length; i++) {
      expect(out[i].row).toBe(days[i].row);
      expect(out[i].col).toBe(days[i].col);
      expect(out[i].date).toBe(days[i].date);
    }
  });

  it("classifies some cells as water when input heights are low", () => {
    // All zero-height input should yield mostly water/shoreline after noise.
    const zeroDays: ContributionDay[] = [];
    for (let col = 0; col < 8; col++) {
      for (let row = 0; row < 7; row++) {
        zeroDays.push({
          date: `2026-01-01`,
          count: 0,
          level: 0,
          row,
          col,
          height: 0,
        });
      }
    }
    const out = generateTerrain(zeroDays, 7, 8, "aarekaz");
    const waterCount = out.filter((c) => c.terrainType === "water").length;
    expect(waterCount).toBeGreaterThan(0);
  });
});
