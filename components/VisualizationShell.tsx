"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";
import { ContributionHeatmap } from "./ContributionHeatmap";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* 2D Heatmap */}
      {mode === "grid" && <ContributionHeatmap years={data.years} />}

      {/* 3D Scene placeholder */}
      {mode !== "grid" && (
        <div className="flex h-full items-center justify-center text-gray-400">
          3D view coming soon (mode: {mode}, year: {selectedYear})
        </div>
      )}

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>
    </div>
  );
}
