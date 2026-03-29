import type { ContributionLevel } from "./types";

export const LEVEL_COLORS: Record<ContributionLevel, string> = {
  0: "#ebedf0",
  1: "#9be9a8",
  2: "#40c463",
  3: "#30a14e",
  4: "#216e39",
};

export const LEVEL_COLORS_RGB: Record<ContributionLevel, [number, number, number]> = {
  0: [0.922, 0.929, 0.941],
  1: [0.608, 0.914, 0.659],
  2: [0.251, 0.769, 0.388],
  3: [0.188, 0.631, 0.306],
  4: [0.129, 0.431, 0.224],
};

// City building colors — green glass palette
export const CITY_BODY_COLORS_RGB: [number, number, number][] = [
  [0.72, 0.82, 0.72],  // light sage
  [0.50, 0.70, 0.50],  // soft green
  [0.30, 0.58, 0.35],  // medium green
  [0.22, 0.48, 0.28],  // dark green
  [0.14, 0.38, 0.20],  // deep forest
];

export const CITY_GLASS_COLORS_RGB: [number, number, number][] = [
  [0.78, 0.88, 0.78],  // light green glass
  [0.58, 0.78, 0.60],  // green glass
  [0.40, 0.68, 0.45],  // tinted green glass
  [0.30, 0.58, 0.35],  // dark green glass
  [0.20, 0.48, 0.26],  // deep green glass
];
