"use client";

import type { ViewMode } from "@/lib/types";

type Props = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

const MODES: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "forest", label: "Forest" },
  { value: "city", label: "City" },
];

export function ViewToggle({
  mode,
  onModeChange,
  years,
  selectedYear,
  onYearChange,
}: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
      {/* Mode toggle */}
      <div className="flex rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === m.value
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Year selector (visible in 3D modes) */}
      {mode !== "grid" && years.length > 1 && (
        <div className="flex rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                selectedYear === year
                  ? "bg-gray-900 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
