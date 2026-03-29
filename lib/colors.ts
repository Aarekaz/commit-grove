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

// City building colors — green glass
export const CITY_BODY_COLORS_RGB: [number, number, number][] = [
  [0.55, 0.72, 0.52],  // light green
  [0.40, 0.62, 0.38],  // medium green
  [0.30, 0.54, 0.30],  // forest green
  [0.22, 0.46, 0.24],  // dark green
  [0.16, 0.38, 0.18],  // deep green
];

export const CITY_GLASS_COLORS_RGB: [number, number, number][] = [
  [0.65, 0.80, 0.62],  // light green glass
  [0.50, 0.72, 0.50],  // green glass
  [0.38, 0.64, 0.40],  // tinted green
  [0.30, 0.56, 0.32],  // dark green glass
  [0.22, 0.48, 0.25],  // deep green glass
];

// Park colors
export const PARK_GREEN_RGB: [number, number, number][] = [
  [0.55, 0.78, 0.45],  // light grass
  [0.40, 0.70, 0.35],  // grass
  [0.30, 0.62, 0.28],  // rich grass
  [0.22, 0.55, 0.22],  // deep green
  [0.18, 0.48, 0.18],  // dark foliage
];
