"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import type { ContributionData, TerrainCell, ViewMode } from "@/lib/types";
import { generateTerrain } from "@/lib/terrain";
import { flattenYearDays } from "@/lib/transform";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ViewToggle } from "./ViewToggle";
import { TimelineRuler } from "./TimelineRuler";
import { HoverInfo } from "./HoverInfo";
import { StatsOverlay } from "./StatsOverlay";
import { CinematicOverlay } from "./CinematicOverlay";

// Dynamic-import the 3D scene so three.js + @react-three/fiber +
// @react-three/drei only load when the user actually enters Forest or
// City mode. ssr:false keeps the chunk out of the initial hydration
// payload — Grid-mode and landing-page visitors never pay for it.
const ForestScene = dynamic(() => import("./Scene3D"), { ssr: false });

type Props = {
  data: ContributionData;
};

type IntroPhase = "cinematic" | "ready";

export function VisualizationShell({ data }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [introPhase, setIntroPhase] = useState<IntroPhase>("cinematic");
  const [mode, setMode] = useState<ViewMode>("forest");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const yearNumbers = data.years.map((y) => y.year);
  const selectedYearData = data.years.find((y) => y.year === selectedYear);

  // Pre-compute terrain ONCE for the full year
  const today = new Date().toISOString().slice(0, 10);
  const fullTerrain = useMemo(() => {
    if (!selectedYearData) return [];
    const allDays = flattenYearDays(selectedYearData);
    const pastDays = allDays.filter((d) => d.date <= today);
    if (pastDays.length === 0) return [];
    const numCols = Math.max(...pastDays.map((d) => d.col)) + 1;
    return generateTerrain(pastDays, 7, numCols, data.username);
  }, [selectedYearData, data.username, today]);

  const totalCols = fullTerrain.length > 0 ? Math.max(...fullTerrain.map((c) => c.col)) + 1 : 0;
  const maxWeeks = totalCols;

  const [visibleWeeks, setVisibleWeeks] = useState(0); // start at 0 for cinematic

  // Cinematic auto-play
  const cinematicInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (introPhase !== "cinematic") return;
    if (totalCols === 0) return;

    // Accessibility: users with prefers-reduced-motion skip the cinematic
    // reveal entirely and land directly on the fully-built scene. Schedule
    // via microtask so the state updates run after the current render.
    if (prefersReducedMotion) {
      queueMicrotask(() => {
        setVisibleWeeks(totalCols);
        setIntroPhase("ready");
      });
      return;
    }

    const startDelay = setTimeout(() => {
      cinematicInterval.current = setInterval(() => {
        setVisibleWeeks((prev) => {
          if (prev >= totalCols) {
            if (cinematicInterval.current) clearInterval(cinematicInterval.current);
            setTimeout(() => setIntroPhase("ready"), 600);
            return totalCols;
          }
          return prev + 1;
        });
      }, 60);
    }, 800);

    return () => {
      clearTimeout(startDelay);
      if (cinematicInterval.current) clearInterval(cinematicInterval.current);
    };
  }, [introPhase, totalCols, prefersReducedMotion]);

  const handleSkipIntro = useCallback(() => {
    if (cinematicInterval.current) clearInterval(cinematicInterval.current);
    setVisibleWeeks(totalCols);
    setIntroPhase("ready");
  }, [totalCols]);

  const yearBuildInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (yearBuildInterval.current) clearInterval(yearBuildInterval.current);
      if (cinematicInterval.current) clearInterval(cinematicInterval.current);
    };
  }, []);

  const buildTargetRef = useRef(0);

  const startBuildAnimation = useCallback((target: number) => {
    if (yearBuildInterval.current) clearInterval(yearBuildInterval.current);
    buildTargetRef.current = target;
    yearBuildInterval.current = setInterval(() => {
      setVisibleWeeks((prev) => {
        if (prev >= buildTargetRef.current) {
          if (yearBuildInterval.current) clearInterval(yearBuildInterval.current);
          return buildTargetRef.current;
        }
        return prev + 1;
      });
    }, 40);
  }, []);

  const handleYearChange = useCallback(
    (year: number) => {
      setSelectedYear(year);
      setIsPlaying(false);
      setVisibleWeeks(0);
    },
    []
  );

  // Auto-build when selectedYear changes
  const prevYear = useRef(selectedYear);
  useEffect(() => {
    if (introPhase !== "ready") return;
    if (totalCols === 0) return;
    if (selectedYear !== prevYear.current) {
      prevYear.current = selectedYear;
      if (prefersReducedMotion) {
        queueMicrotask(() => setVisibleWeeks(totalCols));
        return;
      }
      // Small delay to let fullTerrain recompute with new year data
      setTimeout(() => startBuildAnimation(totalCols), 80);
    }
  }, [selectedYear, totalCols, introPhase, startBuildAnimation, prefersReducedMotion]);

  const handleVisibleWeeksChange = useCallback(
    (value: number) => {
      if (value === -1) {
        setVisibleWeeks((prev) => {
          if (prev >= maxWeeks) {
            setIsPlaying(false);
            return maxWeeks;
          }
          return prev + 1;
        });
      } else {
        setVisibleWeeks(value);
      }
    },
    [maxWeeks]
  );

  const handlePlayToggle = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && visibleWeeks >= maxWeeks) {
        setVisibleWeeks(0);
      }
      return !prev;
    });
  }, [visibleWeeks, maxWeeks]);

  // 3D tooltip
  const [hoveredDay, setHoveredDay] = useState<{
    day: TerrainCell;
    position: { x: number; y: number };
  } | null>(null);

  const handleDayHover = useCallback(
    (day: TerrainCell | null, event?: { x: number; y: number }) => {
      if (introPhase === "cinematic") return;
      if (day && event) {
        setHoveredDay({ day, position: event });
      } else {
        setHoveredDay(null);
      }
    },
    [introPhase]
  );

  const is3D = mode === "forest" || mode === "city";
  const showControls = introPhase === "ready";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f6f8fa]">
      {/* 2D Heatmap */}
      <AnimatePresence>
        {showControls && !is3D && (
          <motion.div
            key="grid"
            className="absolute inset-0 z-[1]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <ContributionHeatmap years={data.years} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Scene — always visible during cinematic + 3D modes */}
      {fullTerrain.length > 0 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: introPhase === "cinematic" || is3D ? 1 : 0,
            pointerEvents: introPhase === "cinematic" || is3D ? "auto" : "none",
            transition: "opacity 0.3s ease-out",
          }}
        >
          <ForestScene
            cells={fullTerrain}
            revealedCols={visibleWeeks}
            mode={mode === "grid" ? "forest" : mode}
            numCols={totalCols}
            onDayHover={handleDayHover}
          />
        </div>
      )}

      {/* Cinematic overlay */}
      <CinematicOverlay
        username={data.username}
        currentWeek={visibleWeeks}
        maxWeeks={totalCols}
        visible={introPhase === "cinematic"}
        onSkip={handleSkipIntro}
      />

      {/* 3D Tooltip */}
      {showControls && is3D && hoveredDay && (
        <HoverInfo day={hoveredDay.day} position={hoveredDay.position} />
      )}

      {/* Controls — fade in after cinematic */}
      <AnimatePresence>
        {showControls && (
          <>
            <motion.a
              href="/"
              aria-label="CommitGrove home"
              className="absolute left-4 top-4 z-10 rounded-lg bg-black/5 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-black/10"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              ← CommitGrove
            </motion.a>

            <motion.div
              className="absolute right-4 top-4 z-10 rounded-lg bg-black/5 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {data.username}&apos;s forest
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <StatsOverlay data={data} selectedYear={selectedYear} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ViewToggle mode={mode} onModeChange={setMode} />
            </motion.div>

            {is3D && maxWeeks > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <TimelineRuler
                  maxWeeks={maxWeeks}
                  visibleWeeks={visibleWeeks}
                  onVisibleWeeksChange={handleVisibleWeeksChange}
                  isPlaying={isPlaying}
                  onPlayToggle={handlePlayToggle}
                  years={yearNumbers}
                  selectedYear={selectedYear}
                  onYearChange={handleYearChange}
                  speed={speed}
                  onSpeedChange={setSpeed}
                />
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
