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
  speed: number;
  onSpeedChange: (speed: number) => void;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SPEEDS = [0.5, 1, 2, 4];

export function TimelineRuler({
  maxWeeks,
  visibleWeeks,
  onVisibleWeeksChange,
  isPlaying,
  onPlayToggle,
  years,
  selectedYear,
  onYearChange,
  speed,
  onSpeedChange,
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
      const interval = Math.round(200 / speed);
      intervalRef.current = setInterval(() => {
        onVisibleWeeksChange(-1);
      }, interval);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, speed, clearTimer, onVisibleWeeksChange]);

  const updateFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const week = Math.max(1, Math.round(ratio * maxWeeks));
      onVisibleWeeksChange(week);
    },
    [maxWeeks, onVisibleWeeksChange]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    },
    [updateFromPointer]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging.current) updateFromPointer(e.clientX);
    },
    [updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const yearIdx = years.indexOf(selectedYear);
  const prevYear = yearIdx < years.length - 1 ? years[yearIdx + 1] : null;
  const nextYear = yearIdx > 0 ? years[yearIdx - 1] : null;

  const progress = maxWeeks > 0 ? (visibleWeeks / maxWeeks) * 100 : 0;

  return (
    <div className="absolute top-4 left-1/2 z-10 w-[min(90vw,700px)] -translate-x-1/2">
      <div className="rounded-2xl border border-gray-200/60 bg-white/85 px-4 py-3 shadow-xl backdrop-blur-xl">

        {/* Top row: year nav + play + speed */}
        <div className="mb-3 flex items-center justify-between">
          {/* Year navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => prevYear && onYearChange(prevYear)}
              disabled={!prevYear}
              className="rounded px-1.5 py-0.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M8 1L3 6l5 5" /></svg>
            </button>
            <span className="min-w-[3rem] text-center text-sm font-bold tabular-nums text-gray-900">
              {selectedYear}
            </span>
            <button
              onClick={() => nextYear && onYearChange(nextYear)}
              disabled={!nextYear}
              className="rounded px-1.5 py-0.5 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M4 1l5 5-5 5" /></svg>
            </button>
          </div>

          {/* Play + speed */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPlayToggle}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
            >
              {isPlaying ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-gray-600">
                  <rect x="1" y="0" width="3" height="10" rx="0.5" />
                  <rect x="6" y="0" width="3" height="10" rx="0.5" />
                </svg>
              ) : (
                <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" className="ml-0.5 text-gray-600">
                  <path d="M1 1v10l8.5-5z" />
                </svg>
              )}
            </button>
            <div className="flex rounded-md bg-gray-100 p-0.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSpeedChange(s)}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
                    speed === s
                      ? "bg-gray-900 text-white"
                      : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scrub track */}
        <div
          ref={trackRef}
          className="relative h-6 cursor-pointer select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Track background */}
          <div className="absolute left-0 top-[10px] h-[3px] w-full rounded-full bg-gray-200" />

          {/* Progress fill */}
          <div
            className="absolute left-0 top-[10px] h-[3px] rounded-full bg-green-500 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />

          {/* Month markers */}
          {MONTHS.map((_, m) => {
            const pos = ((m + 1) / 12) * 100;
            if (m === 11) return null;
            return (
              <div
                key={m}
                className="absolute top-[7px] h-[9px] w-px bg-gray-200"
                style={{ left: `${pos}%` }}
              />
            );
          })}

          {/* Scrubber handle */}
          <div
            className="absolute top-[4px] h-[15px] w-[15px] -translate-x-1/2 rounded-full border-[3px] border-green-500 bg-white shadow-sm transition-[left] duration-75"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Month labels */}
        <div className="mt-0.5 flex justify-between px-1">
          {MONTHS.map((label) => (
            <span key={label} className="text-[9px] font-medium text-gray-400">
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
