import { describe, it, expect } from "vitest";
import { getSeasonPalette, getCitySeasonPalette, palettesEqual } from "../seasons";

describe("palettesEqual", () => {
  it("is true for deep-equal palettes", () => {
    expect(palettesEqual(getSeasonPalette(24), getSeasonPalette(24))).toBe(true);
  });

  it("is false when any value differs", () => {
    expect(palettesEqual(getSeasonPalette(8), getSeasonPalette(12))).toBe(false);
  });
});

describe("getSeasonPalette plateau vs transition (drives the recolor guard)", () => {
  it("is constant across the summer plateau (weeks 22–34)", () => {
    // Both ends of weeks 22–34 are SUMMER, so any week inside lerps to the same
    // values — the guard should skip recoloring across this whole stretch.
    expect(palettesEqual(getSeasonPalette(24), getSeasonPalette(30))).toBe(true);
    expect(palettesEqual(getSeasonPalette(22), getSeasonPalette(34))).toBe(true);
  });

  it("changes across a season transition (winter→spring)", () => {
    // Week 8 lerps winter→spring; week 12 is already in the spring plateau.
    expect(palettesEqual(getSeasonPalette(8), getSeasonPalette(12))).toBe(false);
  });
});

describe("getCitySeasonPalette plateau vs transition", () => {
  it("is constant across the summer plateau and changes across transitions", () => {
    expect(palettesEqual(getCitySeasonPalette(24), getCitySeasonPalette(30))).toBe(true);
    expect(palettesEqual(getCitySeasonPalette(8), getCitySeasonPalette(12))).toBe(false);
  });
});
