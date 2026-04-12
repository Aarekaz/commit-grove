"use client";

import type { ViewMode } from "@/lib/types";

type Props = {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  // Fired on hover/focus of a mode the user doesn't yet own. Lets the
  // shell preload chunks speculatively (e.g. the 3D scene) so the click
  // feels instant. Called at most once per mode per mount.
  onModeIntent?: (mode: ViewMode) => void;
};

const MODES: { value: ViewMode; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "forest", label: "Forest" },
  { value: "city", label: "City" },
];

export function ViewToggle({ mode, onModeChange, onModeIntent }: Props) {
  return (
    <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
      <div
        role="group"
        aria-label="View mode"
        className="flex rounded-xl border border-gray-200/60 bg-white/80 p-1 shadow-lg backdrop-blur"
      >
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            onMouseEnter={() => onModeIntent?.(m.value)}
            onFocus={() => onModeIntent?.(m.value)}
            aria-pressed={mode === m.value}
            className={`min-h-[44px] whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 ${
              mode === m.value
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
