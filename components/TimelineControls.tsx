"use client";

import { useEffect, useRef, useCallback } from "react";

type Props = {
  maxWeeks: number;
  visibleWeeks: number;
  onVisibleWeeksChange: (weeks: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
};

export function TimelineControls({
  maxWeeks,
  visibleWeeks,
  onVisibleWeeksChange,
  isPlaying,
  onPlayToggle,
}: Props) {
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
        onVisibleWeeksChange(-1); // signal to increment
      }, 80);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [isPlaying, clearTimer, onVisibleWeeksChange]);

  const progress = maxWeeks > 0 ? (visibleWeeks / maxWeeks) * 100 : 0;

  return (
    <div className="absolute bottom-20 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
      <div className="flex items-center gap-3 rounded-xl bg-white/80 px-4 py-2 shadow-lg backdrop-blur">
        {/* Play/Pause */}
        <button
          onClick={onPlayToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 transition-colors hover:bg-gray-100"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <rect x="1" y="1" width="4" height="12" rx="1" />
              <rect x="9" y="1" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M2 1.5v11l10-5.5z" />
            </svg>
          )}
        </button>

        {/* Slider */}
        <div className="relative h-1.5 w-48 rounded-full bg-gray-200 sm:w-64">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gray-900 transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
          <input
            type="range"
            min={1}
            max={maxWeeks}
            value={visibleWeeks}
            onChange={(e) => onVisibleWeeksChange(Number(e.target.value))}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Week counter */}
        <span className="min-w-[3.5rem] text-xs tabular-nums text-gray-500">
          {visibleWeeks}/{maxWeeks}w
        </span>
      </div>
    </div>
  );
}
