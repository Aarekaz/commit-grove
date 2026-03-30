import type { TerrainCell } from "@/lib/types";

type Props = {
  day: TerrainCell;
  position: { x: number; y: number };
};

export function HoverInfo({ day, position }: Props) {
  const dateStr = new Date(day.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-3.5 py-2.5 text-white shadow-xl"
      style={{ left: position.x + 12, top: position.y - 12 }}
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
