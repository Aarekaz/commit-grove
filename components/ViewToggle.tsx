"use client";

import type { ViewMode } from "@/lib/types";

type Props = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
};

const MODES: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "forest", label: "Forest" },
  { value: "city", label: "City" },
];

export function ViewToggle({ mode, onModeChange }: Props) {
  const is3D = mode === "forest" || mode === "city";

  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
      <div
        className={`flex rounded-xl p-1 shadow-lg backdrop-blur ${
          is3D
            ? "border border-white/10 bg-white/5"
            : "bg-white/80"
        }`}
      >
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === m.value
                ? is3D
                  ? "bg-green-500 text-gray-950 shadow-sm"
                  : "bg-gray-900 text-white shadow-sm"
                : is3D
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
