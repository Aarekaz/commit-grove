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

// City building colors — glass/concrete palette
export const CITY_BODY_COLORS_RGB: [number, number, number][] = [
  [0.55, 0.58, 0.63],  // warm gray
  [0.45, 0.50, 0.58],  // steel blue
  [0.38, 0.42, 0.50],  // slate
  [0.30, 0.35, 0.45],  // dark steel
  [0.22, 0.27, 0.38],  // deep navy
];

export const CITY_GLASS_COLORS_RGB: [number, number, number][] = [
  [0.65, 0.72, 0.80],  // light glass
  [0.50, 0.60, 0.72],  // blue glass
  [0.40, 0.52, 0.68],  // tinted glass
  [0.32, 0.45, 0.62],  // dark glass
  [0.25, 0.38, 0.55],  // deep glass
];
