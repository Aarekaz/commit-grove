"use client";

import type { ContributionData } from "@/lib/types";
import { useMemo } from "react";

type Props = {
  data: ContributionData;
  selectedYear: number;
};

export function StatsOverlay({ data, selectedYear }: Props) {
  const stats = useMemo(() => {
    const yearData = data.years.find((y) => y.year === selectedYear);
    if (!yearData) return null;

    const allDays = yearData.weeks.flat();
    const activeDays = allDays.filter((d) => d.count > 0);
    const maxDay = allDays.reduce((max, d) => (d.count > max.count ? d : max), allDays[0]);

    // Calculate longest streak
    const sorted = [...allDays].sort((a, b) => a.date.localeCompare(b.date));
    let currentStreak = 0;
    let longestStreak = 0;
    for (const day of sorted) {
      if (day.count > 0) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    return {
      total: yearData.total,
      activeDays: activeDays.length,
      longestStreak,
      busiestDay: maxDay,
    };
  }, [data, selectedYear]);

  if (!stats) return null;

  const busiestDate = new Date(stats.busiestDay.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="absolute left-5 bottom-6 z-10 flex flex-col gap-1">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-gray-900">
          {stats.total.toLocaleString()}
        </span>
        <span className="text-xs font-medium text-gray-500">commits</span>
      </div>
      <div className="flex gap-4 text-[11px] text-gray-500">
        <span>
          <span className="font-semibold tabular-nums text-gray-400">{stats.activeDays}</span> active days
        </span>
        <span>
          <span className="font-semibold tabular-nums text-gray-400">{stats.longestStreak}</span> day streak
        </span>
        <span>
          peak <span className="font-semibold tabular-nums text-gray-400">{stats.busiestDay.count}</span> on {busiestDate}
        </span>
      </div>
    </div>
  );
}
