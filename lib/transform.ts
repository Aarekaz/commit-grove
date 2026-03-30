import type { ContributionDay, ContributionLevel, ContributionYear } from "./types";

const LEVEL_MAP: Record<string, ContributionLevel> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

type GitHubContributionDay = {
  date: string;
  contributionCount: number;
  contributionLevel: string;
};

type GitHubCalendarResponse = {
  contributionCalendar: {
    totalContributions: number;
    weeks: { contributionDays: GitHubContributionDay[] }[];
  };
};

export function transformContributions(
  response: GitHubCalendarResponse,
  year: number
): ContributionYear {
  const { contributionCalendar } = response;

  let maxCount = 0;
  for (const week of contributionCalendar.weeks) {
    for (const day of week.contributionDays) {
      if (day.contributionCount > maxCount) {
        maxCount = day.contributionCount;
      }
    }
  }

  const weeks: ContributionDay[][] = contributionCalendar.weeks.map(
    (week, colIndex) =>
      week.contributionDays.map((day, rowIndex) => ({
        date: day.date,
        count: day.contributionCount,
        level: LEVEL_MAP[day.contributionLevel] ?? 0,
        row: rowIndex,
        col: colIndex,
        height: maxCount > 0 ? day.contributionCount / maxCount : 0,
      }))
  );

  return {
    year,
    total: contributionCalendar.totalContributions,
    weeks,
  };
}

export function smoothHeights(
  days: ContributionDay[],
  _rows: number,
  _cols: number
): ContributionDay[] {
  const grid = new Map<string, ContributionDay>();
  for (const day of days) {
    grid.set(`${day.row},${day.col}`, day);
  }

  return days.map((day) => {
    const neighbors: number[] = [day.height];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const neighbor = grid.get(`${day.row + dr},${day.col + dc}`);
        if (neighbor) neighbors.push(neighbor.height);
      }
    }
    const avg = neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
    return { ...day, height: avg };
  });
}

export function flattenYearDays(year: ContributionYear): ContributionDay[] {
  return year.weeks.flat();
}
