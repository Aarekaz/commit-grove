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
const RULER_VIEW_WIDTH = 620;
const RULER_HEIGHT = 48;

// Tick tiers give the ruler an instrument-dial feel: every week a hair,
// each month a finger, each quarter a long index.
const TICK_H = {
  week: 5,
  month: 14,
  quarter: 22,
} as const;

const QUARTER_MONTHS = new Set([0, 3, 6, 9]); // Jan / Apr / Jul / Oct

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

  // Map each week to a month, used for both ticks and labels.
  const monthWeeks = new Map<number, number>();
  for (let m = 0; m < 12; m++) {
    const weekForMonth = Math.round((m / 12) * 52);
    if (weekForMonth <= maxWeeks) monthWeeks.set(weekForMonth, m);
  }

  const ticks = [];
  for (let w = 0; w <= maxWeeks; w++) {
    const monthIdx = monthWeeks.get(w);
    const isMonth = monthIdx !== undefined;
    const isQuarter = isMonth && QUARTER_MONTHS.has(monthIdx);

    const h = isQuarter ? TICK_H.quarter : isMonth ? TICK_H.month : TICK_H.week;
    const color = isQuarter
      ? "bg-gray-700"
      : isMonth
        ? "bg-gray-400"
        : "bg-gray-300";

    ticks.push(
      <div
        key={w}
        className="absolute top-0 flex flex-col items-center"
        style={{ left: w * TICK_WIDTH }}
      >
        <div className={`w-px ${color}`} style={{ height: h }} />
        {isMonth && (
          <span
            className={`absolute top-[26px] whitespace-nowrap text-[9px] tabular-nums uppercase tracking-[0.14em] ${
              isQuarter ? "font-semibold text-gray-600" : "font-medium text-gray-400"
            }`}
          >
            {MONTHS[monthIdx]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-1/2 z-10 -translate-x-1/2">
      <div className="relative flex items-stretch rounded-2xl border border-gray-200/70 bg-white/85 shadow-[0_6px_24px_-8px_rgba(15,23,42,0.15)] backdrop-blur-md">
        {/* Year nav cell */}
        <div className="flex items-center gap-0.5 px-3">
          <button
            onClick={() => prevYear && onYearChange(prevYear)}
            disabled={!prevYear}
            aria-label={prevYear ? `Previous year (${prevYear})` : "Previous year"}
            className="flex h-7 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-25"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5.5 0.5L1 5l4.5 4.5" /></svg>
          </button>
          <span className="min-w-[3rem] text-center text-[13px] font-semibold tabular-nums text-gray-800">
            {selectedYear}
          </span>
          <button
            onClick={() => nextYear && onYearChange(nextYear)}
            disabled={!nextYear}
            aria-label={nextYear ? `Next year (${nextYear})` : "Next year"}
            className="flex h-7 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:pointer-events-none disabled:opacity-25"
          >
            <svg width="7" height="10" viewBox="0 0 7 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 0.5L6 5l-4.5 4.5" /></svg>
          </button>
        </div>

        {/* Divider */}
        <div className="my-2 w-px bg-gray-200/80" />

        {/* Compass ruler cell */}
        <div
          className="relative cursor-grab overflow-hidden select-none active:cursor-grabbing"
          style={{
            width: `min(${RULER_VIEW_WIDTH}px, 58vw)`,
            height: RULER_HEIGHT,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
        >
          {/* Baseline hairline so empty-ruler doesn't feel hollow */}
          <div className="pointer-events-none absolute top-[22px] left-0 right-0 h-px bg-gray-200/70" />

          {/* Fade edges — fade to the housing's own bg so the seam is clean */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />

          {/* Needle: small triangle at top edge + 1px hairline drop + dot at the baseline */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 flex-col items-center">
            <svg width="10" height="7" viewBox="0 0 10 7" aria-hidden="true" className="text-green-600">
              <path d="M0 0 L10 0 L5 7 Z" fill="currentColor" />
            </svg>
            <div className="h-[22px] w-px bg-green-600/80" />
            <div className="-mt-[3px] h-1.5 w-1.5 rounded-full bg-green-600 shadow-[0_0_0_2px_rgba(22,163,74,0.15)]" />
          </div>

          {/* Scrolling ruler track */}
          <div
            className="absolute top-[2px]"
            style={{
              transform: `translateX(${offset}px)`,
              width: totalWidth,
              transition: isDragging ? "none" : "transform 0.06s linear",
            }}
          >
            {ticks}
          </div>
        </div>

        {/* Divider */}
        <div className="my-2 w-px bg-gray-200/80" />

        {/* Playback cell */}
        <div className="flex items-center gap-1 px-2.5">
          <button
            onClick={onPlayToggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            aria-pressed={isPlaying}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            {isPlaying ? (
              <svg width="9" height="11" viewBox="0 0 9 11" fill="currentColor" aria-hidden="true">
                <rect x="0.5" y="0.5" width="2.5" height="10" rx="0.5" />
                <rect x="6" y="0.5" width="2.5" height="10" rx="0.5" />
              </svg>
            ) : (
              <svg width="10" height="11" viewBox="0 0 10 11" fill="currentColor" className="ml-[1px]" aria-hidden="true">
                <path d="M1 0.5v10l8.5-5z" />
              </svg>
            )}
          </button>
          <div
            role="group"
            aria-label="Playback speed"
            className="hidden sm:flex items-center rounded-md bg-gray-100/80 p-[2px]"
          >
            {SPEEDS.map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                aria-label={`${s}× speed`}
                aria-pressed={speed === s}
                className={`rounded px-1.5 py-[3px] text-[10px] font-semibold tabular-nums transition-colors ${
                  speed === s
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {showHint && (
        <p
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium tracking-[0.08em] text-gray-400 opacity-0 animate-[fade-in_0.4s_ease-out_0.8s_forwards]"
          aria-hidden="true"
        >
          drag to scrub · scroll to step
        </p>
      )}
    </div>
  );
}
