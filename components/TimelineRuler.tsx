"use client";

import { useRef, useCallback, useEffect } from "react";
import { MONTHS } from "@/lib/constants";

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
const TICK_WIDTH = 8;
const RULER_VIEW_WIDTH = 400;

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
  const dragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWeek = useRef(0);
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWeek.current = visibleWeeks;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [visibleWeeks]
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
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? 1 : -1;
      const newWeek = Math.max(0, Math.min(maxWeeks, visibleWeeks + delta));
      onVisibleWeeksChange(newWeek);
    },
    [maxWeeks, visibleWeeks, onVisibleWeeksChange]
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
          className={`w-px ${isMajor ? "h-3.5 bg-gray-400" : "h-1.5 bg-gray-300/60"}`}
        />
        {monthLabel !== undefined && (
          <span className="absolute top-4 whitespace-nowrap text-[7px] font-semibold tracking-wider text-gray-400 uppercase">
            {MONTHS[monthLabel]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-center gap-3 px-4 pt-3 pb-1">
        {/* Year nav */}
        <div className="flex shrink-0 items-center">
          <button
            onClick={() => prevYear && onYearChange(prevYear)}
            disabled={!prevYear}
            className="flex h-8 w-6 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="currentColor"><path d="M5.5 0.5L1 5l4.5 4.5" /></svg>
          </button>
          <span className="min-w-[2.5rem] text-center text-[11px] font-bold tabular-nums text-gray-800">
            {selectedYear}
          </span>
          <button
            onClick={() => nextYear && onYearChange(nextYear)}
            disabled={!nextYear}
            className="flex h-8 w-6 items-center justify-center text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="currentColor"><path d="M1.5 0.5L6 5l-4.5 4.5" /></svg>
          </button>
        </div>

        {/* Compass ruler */}
        <div
          className="relative cursor-grab overflow-hidden select-none active:cursor-grabbing"
          style={{ width: `min(${RULER_VIEW_WIDTH}px, 50vw)`, height: 28 }}
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
            <div className="mx-auto h-4 w-0.5 rounded-full bg-green-500" />
            <div className="mx-auto mt-px h-1.5 w-1.5 rotate-45 bg-green-500" />
          </div>

          {/* Scrolling ruler track */}
          <div
            className="absolute top-0"
            style={{
              transform: `translateX(${offset}px)`,
              width: totalWidth,
              transition: dragging.current ? "none" : "transform 0.06s linear",
            }}
          >
            {ticks}
          </div>
        </div>

        {/* Play + speed */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onPlayToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-black/5"
          >
            {isPlaying ? (
              <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor" className="text-gray-500">
                <rect x="0.5" y="0" width="2.5" height="10" rx="0.5" />
                <rect x="5" y="0" width="2.5" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" className="ml-0.5 text-gray-500">
                <path d="M0.5 0.5v9l8-4.5z" />
              </svg>
            )}
          </button>
          <div className="hidden sm:flex rounded bg-black/5 p-0.5">
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
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
