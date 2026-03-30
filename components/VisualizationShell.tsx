"use client";

import { useState, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ContributionData, TerrainCell, ViewMode } from "@/lib/types";
import { generateTerrain } from "@/lib/terrain";
import { flattenYearDays } from "@/lib/transform";
import { ContributionHeatmap } from "./ContributionHeatmap";
import { ForestScene } from "./ForestScene";
import { ViewToggle } from "./ViewToggle";
import { TimelineRuler } from "./TimelineRuler";
import { HoverInfo } from "./HoverInfo";
import { StatsOverlay } from "./StatsOverlay";

type Props = {
  data: ContributionData;
};

export function VisualizationShell({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedYear, setSelectedYear] = useState(data.years[0]?.year);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  const yearNumbers = data.years.map((y) => y.year);
  const selectedYearData = data.years.find((y) => y.year === selectedYear);
  const maxWeeks = selectedYearData?.weeks.length ?? 0;

  const [visibleWeeks, setVisibleWeeks] = useState(maxWeeks);

  // Pre-compute terrain ONCE for the full year — never recompute on timeline scrub
  const today = new Date().toISOString().slice(0, 10);
  const fullTerrain = useMemo(() => {
    if (!selectedYearData) return [];
    const allDays = flattenYearDays(selectedYearData);
    const pastDays = allDays.filter((d) => d.date <= today);
    if (pastDays.length === 0) return [];
    const numCols = Math.max(...pastDays.map((d) => d.col)) + 1;
    return generateTerrain(pastDays, 7, numCols, data.username);
  }, [selectedYearData, data.username, today]);

  // Slice pre-computed terrain by visible weeks — cheap array filter, no recomputation
  const visibleCells = useMemo(() => {
    return fullTerrain.filter((c) => c.col < visibleWeeks);
  }, [fullTerrain, visibleWeeks]);

  const handleYearChange = useCallback(
    (year: number) => {
      setSelectedYear(year);
      const yearData = data.years.find((y) => y.year === year);
      setVisibleWeeks(yearData?.weeks.length ?? 0);
      setIsPlaying(false);
    },
    [data.years]
  );

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
      if (day && event) {
        setHoveredDay({ day, position: event });
      } else {
        setHoveredDay(null);
      }
    },
    []
  );

  const is3D = mode === "forest" || mode === "city";

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#f6f8fa]">
      {/* 2D Heatmap */}
      <AnimatePresence>
        {!is3D && (
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

      {/* 3D Scene — always mounted */}
      {selectedYearData && (
        <div
          className="absolute inset-0"
          style={{
            opacity: is3D ? 1 : 0,
            pointerEvents: is3D ? "auto" : "none",
            transition: "opacity 0.3s ease-out",
          }}
        >
          <ForestScene
            cells={visibleCells}
            mode={mode}
            numCols={visibleCells.length > 0 ? Math.max(...visibleCells.map((c) => c.col)) + 1 : 0}
            onDayHover={handleDayHover}
          />
        </div>
      )}

      {/* 3D Tooltip */}
      {is3D && hoveredDay && (
        <HoverInfo day={hoveredDay.day} position={hoveredDay.position} />
      )}

      {/* Back link */}
      <a
        href="/"
        className="absolute left-4 top-4 z-10 rounded-lg bg-black/5 px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-black/10"
      >
        ← Try another
      </a>

      {/* Username badge */}
      <div className="absolute right-4 top-4 z-10 rounded-lg bg-black/5 px-3 py-1.5 text-sm text-gray-600 shadow-sm backdrop-blur">
        {data.username}&apos;s forest
      </div>

      {/* Stats */}
      {is3D && <StatsOverlay data={data} selectedYear={selectedYear} />}

      {/* View toggle */}
      <ViewToggle mode={mode} onModeChange={setMode} />

      {/* Timeline ruler (3D modes only) */}
      {is3D && maxWeeks > 0 && (
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
      )}
    </div>
  );
}
