import type { ContributionDay } from "@/lib/types";

type Props = {
  day: ContributionDay;
  position: { x: number; y: number };
};

// Tooltip dimensions (approximate) — used to clamp within viewport
const TOOLTIP_WIDTH = 160;
const TOOLTIP_HEIGHT = 56;
const OFFSET_X = 12;
const OFFSET_Y = -12;

export function HoverInfo({ day, position }: Props) {
  const dateStr = new Date(day.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;

  const rawLeft = position.x + OFFSET_X;
  const rawTop = position.y + OFFSET_Y;

  const left = Math.min(rawLeft, vw - TOOLTIP_WIDTH - 8);
  const top = Math.max(8, Math.min(rawTop, vh - TOOLTIP_HEIGHT - 8));

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-3.5 py-2.5 text-white shadow-xl"
      style={{ left, top }}
    >
      <div className="text-xs font-medium">{dateStr}</div>
      <div className="mt-0.5 text-sm">
        <span className="font-semibold">{day.count}</span>
        <span className="ml-1 text-gray-300">
          {day.count === 1 ? "commit" : "commits"}
        </span>
      </div>
    </div>
  );
}
