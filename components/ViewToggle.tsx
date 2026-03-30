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
  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
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
    </div>
  );
}
