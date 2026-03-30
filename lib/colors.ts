import type { ContributionLevel } from "./types";

export const LEVEL_COLORS: Record<ContributionLevel, string> = {
  0: "#1b1f27",
  1: "#0e4429",
  2: "#006d32",
  3: "#26a641",
  4: "#39d353",
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

// Terrain colors (forest mode)
export const TERRAIN_LAND_RGB: [number, number, number] = [0.35, 0.54, 0.29];
export const TERRAIN_SHORELINE_RGB: [number, number, number] = [0.54, 0.67, 0.42];
export const TERRAIN_WATER_RGB: [number, number, number] = [0.29, 0.54, 0.69];
export const TERRAIN_WATER_DEEP_RGB: [number, number, number] = [0.22, 0.44, 0.60];

// City ground colors
export const CITY_ROAD_RGB: [number, number, number] = [0.82, 0.82, 0.84];
export const CITY_PAVEMENT_RGB: [number, number, number] = [0.53, 0.53, 0.56];
export const CITY_WATER_RGB: [number, number, number] = [0.29, 0.54, 0.69];
