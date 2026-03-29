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

// City building colors — concrete/glass
export const CITY_BODY_COLORS_RGB: [number, number, number][] = [
  [0.62, 0.63, 0.65],  // light concrete
  [0.52, 0.53, 0.56],  // concrete
  [0.42, 0.44, 0.50],  // dark concrete
  [0.34, 0.37, 0.45],  // steel
  [0.26, 0.30, 0.40],  // dark steel
];

export const CITY_GLASS_COLORS_RGB: [number, number, number][] = [
  [0.70, 0.75, 0.82],  // light glass
  [0.55, 0.62, 0.74],  // blue glass
  [0.42, 0.52, 0.68],  // tinted glass
  [0.35, 0.45, 0.60],  // dark glass
  [0.28, 0.38, 0.55],  // deep glass
];

// Park colors
export const PARK_GREEN_RGB: [number, number, number][] = [
  [0.55, 0.78, 0.45],  // light grass
  [0.40, 0.70, 0.35],  // grass
  [0.30, 0.62, 0.28],  // rich grass
  [0.22, 0.55, 0.22],  // deep green
  [0.18, 0.48, 0.18],  // dark foliage
];
