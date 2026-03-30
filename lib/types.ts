export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
  row: number;
  col: number;
  height: number;
};

export type ContributionYear = {
  year: number;
  total: number;
  weeks: ContributionDay[][];
};

export type ContributionData = {
  username: string;
  years: ContributionYear[];
};

export type ViewMode = "grid" | "forest" | "city";

export type TerrainType = "water" | "shoreline" | "land";

export type TerrainCell = ContributionDay & {
  terrainHeight: number;
  terrainType: TerrainType;
};
