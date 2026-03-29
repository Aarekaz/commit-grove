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

export const TERRAIN_COLORS_RGB: [number, number, number][] = [
  [0.922, 0.929, 0.941], // height 0 — empty
  [0.608, 0.914, 0.659], // low
  [0.251, 0.769, 0.388], // medium-low
  [0.188, 0.631, 0.306], // medium-high
  [0.129, 0.431, 0.224], // high
];
