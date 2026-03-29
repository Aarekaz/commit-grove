"use client";

import { useState } from "react";
import type { ContributionData, ViewMode } from "@/lib/types";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Placeholder — will be replaced by heatmap + 3D scene */}
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">{data.username}&apos;s forest</h2>
          <p className="mt-2 text-gray-500">
            {data.years.length} year(s) · {data.years.reduce((sum, y) => sum + y.total, 0)} total contributions
          </p>
          <p className="mt-1 text-sm text-gray-400">Mode: {mode} · Year: {selectedYear}</p>
        </div>
      </div>

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 rounded-lg bg-white/80 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-white"
      >
        ← Try another
      </a>
    </div>
  );
}
