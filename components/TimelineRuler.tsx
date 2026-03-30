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

const MONTHS = [
  "J", "F", "M", "A", "M", "J",
  "J", "A", "S", "O", "N", "D",
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

  const progress = maxWeeks > 0 ? visibleWeeks / maxWeeks : 0;

  return (
    <div className="absolute right-5 top-1/2 z-10 -translate-y-1/2">
      <div className="flex flex-col items-center rounded-2xl border border-gray-200/60 bg-white/70 shadow-2xl shadow-black/5 backdrop-blur-xl">

        {/* Play/Pause — top cap */}
        <button
          onClick={onPlayToggle}
          className="flex h-10 w-full items-center justify-center border-b border-gray-200/40 transition-colors hover:bg-gray-50/50"
        >
          {isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-gray-700">
              <line x1="3" y1="1" x2="3" y2="11" />
              <line x1="7" y1="1" x2="7" y2="11" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" className="ml-0.5 text-gray-700">
              <path d="M1 1.5v9l8-4.5z" />
            </svg>
          )}
        </button>

        {/* Year pills */}
        <div className="flex flex-col border-b border-gray-200/40 px-1.5 py-1.5">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => onYearChange(year)}
              className={`rounded-md px-2 py-0.5 text-[10px] font-semibold tabular-nums tracking-wide transition-all ${
                selectedYear === year
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:text-gray-700"
              }`}
            >
              {year}
            </button>
          ))}
        </div>

        {/* Ruler track */}
        <div className="px-1.5 py-3">
          <div
            ref={trackRef}
            className="relative cursor-pointer select-none"
            style={{ height: "min(45vh, 280px)", width: "36px" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Track background line */}
            <div className="absolute left-[10px] top-0 h-full w-px bg-gray-200" />

            {/* Progress fill */}
            <div
              className="absolute left-[10px] top-0 w-px bg-gray-900 transition-[height] duration-75"
              style={{ height: `${progress * 100}%` }}
            />

            {/* Week ticks */}
            {Array.from({ length: maxWeeks }).map((_, w) => {
              const pos = w / maxWeeks;
              const isMonthBoundary = w % 4 === 0;
              return (
                <div
                  key={w}
                  className="absolute bg-gray-300"
                  style={{
                    top: `${pos * 100}%`,
                    left: isMonthBoundary ? "4px" : "7px",
                    width: isMonthBoundary ? "12px" : "6px",
                    height: "0.5px",
                  }}
                />
              );
            })}

            {/* Month labels */}
            {MONTHS.map((label, m) => {
              const pos = ((m + 0.5) / 12) * 100;
              return (
                <span
                  key={m}
                  className="absolute font-mono text-[8px] font-medium leading-none text-gray-400"
                  style={{
                    top: `${pos}%`,
                    left: "20px",
                    transform: "translateY(-50%)",
                  }}
                >
                  {label}
                </span>
              );
            })}

            {/* Scrubber */}
            <div
              className="absolute -translate-y-1/2"
              style={{ top: `${progress * 100}%`, left: "3px" }}
            >
              <div className="relative flex items-center">
                {/* Diamond handle */}
                <div className="h-3.5 w-3.5 rotate-45 rounded-[2px] border-2 border-gray-900 bg-white shadow-sm" />
              </div>
            </div>

            {/* End cap dot */}
            <div className="absolute -bottom-1 left-[8px] h-1.5 w-1.5 rounded-full bg-gray-300" />
            <div className="absolute -top-1 left-[8px] h-1.5 w-1.5 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
