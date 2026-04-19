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
import { Scene3DSkeleton } from "./Scene3DSkeleton";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import {
  MODE_TRANSITION_EASE,
  MODE_TRANSITION_EASE_CSS,
  MODE_TRANSITION_S,
} from "@/lib/transitions";

// Dynamic-import the 3D scene so three.js + @react-three/fiber +
// @react-three/drei only load when the user actually enters Forest or
// City mode. ssr:false keeps the chunk out of the initial hydration
// payload — Grid-mode and landing-page visitors never pay for it.
const ForestScene = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => <Scene3DSkeleton />,
});

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

  // Speculatively start fetching the 3D chunk when the user hovers or
  // focuses Forest/City. By the time they click, the module is in the
  // browser cache and next/dynamic renders synchronously. Landing on
  // Grid never triggers this, so Grid-only users still pay nothing.
  const preloadedRef = useRef(false);
  const handleModeIntent = useCallback((target: ViewMode) => {
    if (preloadedRef.current) return;
    if (target === "forest" || target === "city") {
      preloadedRef.current = true;
      import("./Scene3D");
    }
  }, []);

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

  // Keyboard shortcuts help modal — declared here so the keydown effect
  // below can reference it.
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Keyboard shortcuts:
  //   1/2/3       → Grid/Forest/City
  //   Space       → play/pause the scrubber (3D modes only)
  //   ←/→         → previous / next year
  //
  // Deliberately global keydown (not scoped to a focused element) so the
  // shortcuts work from anywhere on the page. Skip when focus is inside
  // an editable element to avoid stealing key input.
  useEffect(() => {
    if (!showControls) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "?") {
        setShortcutsOpen((s) => !s);
        return;
      }
      if (e.key === "Escape" && shortcutsOpen) {
        setShortcutsOpen(false);
        return;
      }
      if (shortcutsOpen) return; // swallow all other shortcuts while modal is open

      if (e.key === "1") setMode("grid");
      else if (e.key === "2") setMode("forest");
      else if (e.key === "3") setMode("city");
      else if (e.key === " " && is3D) {
        e.preventDefault(); // stop page scroll
        handlePlayToggle();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const idx = yearNumbers.indexOf(selectedYear!);
        // yearNumbers is newest-first, so left = older (idx + 1), right = newer (idx - 1)
        const nextIdx = e.key === "ArrowLeft" ? idx + 1 : idx - 1;
        const nextYear = yearNumbers[nextIdx];
        if (nextYear !== undefined) handleYearChange(nextYear);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showControls, is3D, handlePlayToggle, yearNumbers, selectedYear, handleYearChange, shortcutsOpen]);

  // Reduced-motion: collapse the mode crossfade to an instant swap. Same
  // timing applies to both the grid's framer-motion fade and the 3D scene's
  // inline CSS so the two sides stay coordinated (even at 0s).
  const transitionS = prefersReducedMotion ? 0 : MODE_TRANSITION_S;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f6f8fa]">
      {/* 2D Heatmap — pure opacity crossfade against the 3D scene below. */}
      <AnimatePresence>
        {showControls && !is3D && (
          <motion.div
            key="grid"
            className="absolute inset-0 z-[1]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: transitionS, ease: MODE_TRANSITION_EASE }}
          >
            <ContributionHeatmap years={data.years} />
          </motion.div>
        )}
      </AnimatePresence>

      {/*
        3D Scene — the other half of the grid↔3D crossfade. Always
        mounted (to keep three.js state warm), opacity toggled in sync
        with the grid's AnimatePresence fade so the two surfaces land
        on the same duration + easing curve.
      */}
      {fullTerrain.length > 0 && (
        <div
          className="absolute inset-0"
          style={{
            opacity: introPhase === "cinematic" || is3D ? 1 : 0,
            pointerEvents: introPhase === "cinematic" || is3D ? "auto" : "none",
            transition: `opacity ${transitionS}s ${MODE_TRANSITION_EASE_CSS}`,
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
              <ViewToggle
                mode={mode}
                onModeChange={setMode}
                onModeIntent={handleModeIntent}
              />
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

      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
