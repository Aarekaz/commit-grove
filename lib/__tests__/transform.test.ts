import { describe, it, expect } from "vitest";
import { transformContributions } from "../transform";

const mockApiResponse = {
  contributionCalendar: {
    totalContributions: 150,
    weeks: [
      {
        contributionDays: [
          { date: "2025-01-05", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-06", contributionCount: 3, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-07", contributionCount: 7, contributionLevel: "SECOND_QUARTILE" },
          { date: "2025-01-08", contributionCount: 12, contributionLevel: "THIRD_QUARTILE" },
          { date: "2025-01-09", contributionCount: 20, contributionLevel: "FOURTH_QUARTILE" },
          { date: "2025-01-10", contributionCount: 1, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-11", contributionCount: 0, contributionLevel: "NONE" },
        ],
      },
      {
        contributionDays: [
          { date: "2025-01-12", contributionCount: 5, contributionLevel: "SECOND_QUARTILE" },
          { date: "2025-01-13", contributionCount: 10, contributionLevel: "THIRD_QUARTILE" },
          { date: "2025-01-14", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-15", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-16", contributionCount: 2, contributionLevel: "FIRST_QUARTILE" },
          { date: "2025-01-17", contributionCount: 0, contributionLevel: "NONE" },
          { date: "2025-01-18", contributionCount: 0, contributionLevel: "NONE" },
        ],
      },
    ],
  },
};

describe("transformContributions", () => {
  it("normalizes API response into ContributionYear", () => {
    const result = transformContributions(mockApiResponse, 2025);
    expect(result.year).toBe(2025);
    expect(result.total).toBe(150);
    expect(result.weeks).toHaveLength(2);
  });

  it("assigns correct row and col to each day", () => {
    const result = transformContributions(mockApiResponse, 2025);
    const firstDay = result.weeks[0][0];
    expect(firstDay.row).toBe(0);
    expect(firstDay.col).toBe(0);

    const lastDayWeek1 = result.weeks[0][6];
    expect(lastDayWeek1.row).toBe(6);
    expect(lastDayWeek1.col).toBe(0);

    const firstDayWeek2 = result.weeks[1][0];
    expect(firstDayWeek2.row).toBe(0);
    expect(firstDayWeek2.col).toBe(1);
  });

  it("maps contribution levels to numeric levels", () => {
    const result = transformContributions(mockApiResponse, 2025);
    expect(result.weeks[0][0].level).toBe(0); // NONE
    expect(result.weeks[0][1].level).toBe(1); // FIRST_QUARTILE
    expect(result.weeks[0][2].level).toBe(2); // SECOND_QUARTILE
    expect(result.weeks[0][3].level).toBe(3); // THIRD_QUARTILE
    expect(result.weeks[0][4].level).toBe(4); // FOURTH_QUARTILE
  });

  it("normalizes height relative to max commit count", () => {
    const result = transformContributions(mockApiResponse, 2025);
    // Max is 20 commits
    expect(result.weeks[0][4].height).toBe(1.0); // 20/20
    expect(result.weeks[0][0].height).toBe(0);   // 0/20
    expect(result.weeks[0][1].height).toBeCloseTo(0.15); // 3/20
  });
});

