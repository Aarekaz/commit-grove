"use client";

import { useState, useCallback } from "react";
import type { ContributionDay, ContributionYear } from "@/lib/types";
import { LEVEL_COLORS } from "@/lib/colors";
import { DayTooltip } from "./DayTooltip";

type Props = {
  years: ContributionYear[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getMonthLabels(weeks: ContributionDay[][]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  for (let col = 0; col < weeks.length; col++) {
    const firstDay = weeks[col]?.[0];
    if (!firstDay) continue;
    const month = new Date(firstDay.date).getMonth();
    if (month !== lastMonth) {
      labels.push({ label: MONTHS[month], col });
      lastMonth = month;
    }
  }
  return labels;
}

function YearGrid({ year }: { year: ContributionYear }) {
  const [tooltip, setTooltip] = useState<{
    day: ContributionDay;
    position: { x: number; y: number };
  } | null>(null);

  const handleMouseEnter = useCallback(
    (day: ContributionDay, e: React.MouseEvent) => {
      setTooltip({ day, position: { x: e.clientX, y: e.clientY } });
    },
    []
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  const monthLabels = getMonthLabels(year.weeks);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-400">
          {year.year}
        </span>
        <div className="flex flex-col gap-0.5">
          {/* Month labels */}
          <div className="flex gap-[3px]">
            {Array.from({ length: year.weeks.length }).map((_, col) => {
              const label = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="h-3 w-[11px] text-[9px] leading-none text-gray-400">
                  {label?.label ?? ""}
                </div>
              );
            })}
          </div>
          {/* Grid */}
          <div className="flex flex-col gap-[3px]">
            {Array.from({ length: 7 }).map((_, row) => (
              <div key={row} className="flex gap-[3px]">
                {year.weeks.map((week, col) => {
                  const day = week[row];
                  if (!day) return <div key={col} className="h-[11px] w-[11px]" />;
                  return (
                    <div
                      key={col}
                      className="h-[11px] w-[11px] rounded-sm"
                      style={{ backgroundColor: LEVEL_COLORS[day.level] }}
                      onMouseEnter={(e) => handleMouseEnter(day, e)}
                      onMouseLeave={handleMouseLeave}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {tooltip && <DayTooltip day={tooltip.day} position={tooltip.position} />}
    </div>
  );
}

export function ContributionHeatmap({ years }: Props) {
  if (years.length === 0 || years.every((y) => y.total === 0)) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-lg text-gray-400">
          No contributions yet — start planting seeds!
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-8">
      <div className="flex flex-col gap-6">
        {years.map((year) => (
          <YearGrid key={year.year} year={year} />
        ))}
      </div>
    </div>
  );
}
