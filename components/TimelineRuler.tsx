"use client";

import { useRef, useCallback, useEffect } from "react";

type Props = {
  maxWeeks: number;
  visibleWeeks: number;
  onVisibleWeeksChange: (weeks: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  years: number[];
  selectedYear: number;
  onYearChange: (year: number) => void;
};

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function TimelineRuler({
  maxWeeks,
  visibleWeeks,
  onVisibleWeeksChange,
  isPlaying,
  onPlayToggle,
  years,
  selectedYear,
  onYearChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Play timer
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onVisibleWeeksChange(-1);
      }, 80);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, clearTimer, onVisibleWeeksChange]);

  // Drag-to-scrub on the ruler track
  const updateFromPointer = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      const week = Math.max(1, Math.round(ratio * maxWeeks));
      onVisibleWeeksChange(week);
    },
    [maxWeeks, onVisibleWeeksChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientY);
    },
    [updateFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current) updateFromPointer(e.clientY);
    },
    [updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Generate month tick marks for the current year
  const monthTicks = [];
  for (let m = 0; m < 12; m++) {
    const weekOfMonth = Math.round((m / 12) * maxWeeks);
    if (weekOfMonth <= maxWeeks) {
      monthTicks.push({ label: MONTHS_SHORT[m], position: weekOfMonth / maxWeeks });
    }
  }

  // Week ticks (every week, small marks)
  const weekTicks = [];
  for (let w = 0; w < maxWeeks; w++) {
    weekTicks.push(w / maxWeeks);
  }

  const progress = maxWeeks > 0 ? visibleWeeks / maxWeeks : 0;

  return (
    <div className="absolute right-6 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-4">
      {/* Year pills */}
      <div className="flex flex-col gap-1 rounded-xl bg-white/80 p-1 shadow-lg backdrop-blur">
        {years.map((year) => (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums transition-colors ${
              selectedYear === year
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Ruler track */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/80 p-2 shadow-lg backdrop-blur">
        {/* Play/Pause button */}
        <button
          onClick={onPlayToggle}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100"
        >
          {isPlaying ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="0" width="3" height="10" rx="0.5" />
              <rect x="6" y="0" width="3" height="10" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <path d="M1 0.5v11l8.5-5.5z" />
            </svg>
          )}
        </button>

        {/* Vertical ruler */}
        <div
          ref={trackRef}
          className="relative w-8 cursor-pointer select-none"
          style={{ height: "min(50vh, 320px)" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Center line */}
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-300" />

          {/* Week ticks (fine) */}
          {weekTicks.map((pos, i) => (
            <div
              key={`w${i}`}
              className="absolute left-1/2 h-px -translate-x-1/2 bg-gray-300"
              style={{
                top: `${pos * 100}%`,
                width: i % 4 === 0 ? "10px" : "4px",
              }}
            />
          ))}

          {/* Month ticks (major) + labels */}
          {monthTicks.map(({ label, position }) => (
            <div
              key={label}
              className="absolute left-0 flex items-center"
              style={{ top: `${position * 100}%` }}
            >
              <div className="h-px w-8 bg-gray-400" />
              <span className="ml-1.5 text-[9px] font-medium leading-none text-gray-400">
                {label}
              </span>
            </div>
          ))}

          {/* Progress fill */}
          <div
            className="absolute left-1/2 top-0 w-0.5 -translate-x-1/2 rounded-full bg-gray-900 transition-[height] duration-75"
            style={{ height: `${progress * 100}%` }}
          />

          {/* Scrubber handle */}
          <div
            className="absolute left-1/2 h-2 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 shadow-md"
            style={{ top: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
