import type { ContributionDay } from "@/lib/types";

type Props = {
  day: ContributionDay;
  position: { x: number; y: number };
};

export function DayTooltip({ day, position }: Props) {
  const dateStr = new Date(day.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: position.x, top: position.y - 40 }}
    >
      <span className="font-medium">{dateStr}</span>
      <span className="ml-1.5 text-gray-300">
        {day.count} {day.count === 1 ? "commit" : "commits"}
      </span>
    </div>
  );
}
