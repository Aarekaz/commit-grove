"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";
import { flattenYearDays } from "@/lib/transform";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ForestScene } from "./ForestScene";
import { ViewToggle } from "./ViewToggle";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  const yearNumbers = data.years.map((y) => y.year);
  const selectedYearData = data.years.find((y) => y.year === selectedYear);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 2D Heatmap */}
      {mode === "grid" && <ContributionHeatmap years={data.years} />}

      {/* 3D Scene */}
      {mode !== "grid" && selectedYearData && (
        <ForestScene
          days={flattenYearDays(selectedYearData)}
          mode={mode}
          numCols={selectedYearData.weeks.length}
        />
      )}

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>

      {/* View toggle */}
      <ViewToggle
        mode={mode}
        onModeChange={setMode}
        years={yearNumbers}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
    </div>
  );
}
