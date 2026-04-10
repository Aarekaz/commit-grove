"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { MONTHS } from "@/lib/constants";

const RULER_HINT_STORAGE_KEY = "commit-grove:ruler-hint-seen";

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

const SPEEDS = [0.5, 1, 2, 4];
const TICK_WIDTH = 18;
const RULER_VIEW_WIDTH = 750;

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
  // Ref for high-frequency reads inside handlePointerMove; mirrored state
  // so render-time decisions (e.g. disabling the transform transition
  // while dragging) don't trip the react-hooks/refs rule.
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWeek = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // First-time ruler affordance hint — drag-to-scrub is invisible without it.
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(RULER_HINT_STORAGE_KEY)) {
      queueMicrotask(() => setShowHint(true));
    }
  }, []);
  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RULER_HINT_STORAGE_KEY, "1");
    }
  }, []);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWeek.current = visibleWeeks;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dismissHint();
    },
    [visibleWeeks, dismissHint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStartX.current;
      const weekDelta = Math.round(-dx / TICK_WIDTH);
      const newWeek = Math.max(0, Math.min(maxWeeks, dragStartWeek.current + weekDelta));
      onVisibleWeeksChange(newWeek);
    },
    [maxWeeks, onVisibleWeeksChange]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? 1 : -1;
      const newWeek = Math.max(0, Math.min(maxWeeks, visibleWeeks + delta));
      onVisibleWeeksChange(newWeek);
      dismissHint();
    },
    [maxWeeks, visibleWeeks, onVisibleWeeksChange, dismissHint]
  );

  const yearIdx = years.indexOf(selectedYear);
  const prevYear = yearIdx < years.length - 1 ? years[yearIdx + 1] : null;
  const nextYear = yearIdx > 0 ? years[yearIdx - 1] : null;

  const offset = -(visibleWeeks * TICK_WIDTH) + RULER_VIEW_WIDTH / 2;
  const totalWidth = (maxWeeks + 1) * TICK_WIDTH;

  // Generate ticks + month labels
  // Place month labels at fixed calendar positions (~4.33 weeks per month)
  const monthWeeks = new Map<number, number>(); // week → monthIdx
  for (let m = 0; m < 12; m++) {
    const weekForMonth = Math.round((m / 12) * 52);
    if (weekForMonth <= maxWeeks) {
      monthWeeks.set(weekForMonth, m);
    }
  }

  const ticks = [];
  for (let w = 0; w <= maxWeeks; w++) {
    const isMajor = w % 4 === 0;
    const monthLabel = monthWeeks.get(w);

    ticks.push(
      <div
        key={w}
        className="absolute flex flex-col items-center"
        style={{ left: w * TICK_WIDTH }}
      >
        <div
          className={`w-px ${isMajor ? "h-7 bg-gray-500" : "h-3 bg-gray-300/70"}`}
        />
        {monthLabel !== undefined && (
          <span className="absolute top-8 whitespace-nowrap text-[9px] font-semibold tracking-wider text-gray-400 uppercase">
            {MONTHS[monthLabel]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      {showHint && (
        <p
          className="pointer-events-none absolute left-1/2 top-[58px] -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tracking-wide text-gray-400 opacity-0 animate-[fade-in_0.4s_ease-out_0.8s_forwards]"
          aria-hidden="true"
        >
          drag to scrub · scroll to step
        </p>
      )}
      <div className="flex items-center justify-center gap-3 px-4 pt-3 pb-1">
        {/* Year nav */}
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => prevYear && onYearChange(prevYear)}
            disabled={!prevYear}
            aria-label={prevYear ? `Previous year (${prevYear})` : "Previous year"}
            className="flex h-8 w-6 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="currentColor" aria-hidden="true"><path d="M5.5 0.5L1 5l4.5 4.5" /></svg>
          </button>
          <span className="min-w-[3.5rem] text-center text-base font-bold tabular-nums text-gray-800">
            {selectedYear}
          </span>
          <button
            onClick={() => nextYear && onYearChange(nextYear)}
            disabled={!nextYear}
            aria-label={nextYear ? `Next year (${nextYear})` : "Next year"}
            className="flex h-8 w-6 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="currentColor" aria-hidden="true"><path d="M1.5 0.5L6 5l-4.5 4.5" /></svg>
          </button>
        </div>

        {/* Compass ruler */}
        <div
          className="relative cursor-grab overflow-hidden select-none active:cursor-grabbing"
          style={{ width: `min(${RULER_VIEW_WIDTH}px, 65vw)`, height: 44 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Fade edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f6f8fa] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f6f8fa] to-transparent" />

          {/* Center needle */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
            <div className="mx-auto h-7 w-[3px] rounded-full bg-green-500 shadow-sm shadow-green-500/40" />
            <div className="mx-auto mt-0.5 h-2.5 w-2.5 rotate-45 bg-green-500 shadow-sm shadow-green-500/40" />
          </div>

          {/* Scrolling ruler track */}
          <div
            className="absolute top-0"
            style={{
              transform: `translateX(${offset}px)`,
              width: totalWidth,
              transition: isDragging ? "none" : "transform 0.06s linear",
            }}
          >
            {ticks}
          </div>
        </div>

        {/* Play + speed */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onPlayToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-black/5"
          >
            {isPlaying ? (
              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="text-gray-500" aria-hidden="true">
                <rect x="0.5" y="0" width="2.5" height="10" rx="0.5" />
                <rect x="5" y="0" width="2.5" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" className="ml-0.5 text-gray-500" aria-hidden="true">
                <path d="M0.5 0.5v9l8-4.5z" />
              </svg>
            )}
          </button>
          <div
            role="group"
            aria-label="Playback speed"
            className="hidden sm:flex rounded bg-black/5 p-0.5"
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                aria-label={`${s}× speed`}
                aria-pressed={speed === s}
                className={`rounded px-1.5 py-0.5 text-[8px] font-bold tabular-nums transition-colors ${
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
    </div>
  );
}
