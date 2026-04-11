// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { TimelineRuler } from "./TimelineRuler";

afterEach(cleanup);

function renderRuler(overrides: Partial<React.ComponentProps<typeof TimelineRuler>> = {}) {
  const props: React.ComponentProps<typeof TimelineRuler> = {
    maxWeeks: 52,
    visibleWeeks: 10,
    onVisibleWeeksChange: vi.fn(),
    isPlaying: false,
    onPlayToggle: vi.fn(),
    years: [2026, 2025, 2024],
    selectedYear: 2025,
    onYearChange: vi.fn(),
    speed: 1,
    onSpeedChange: vi.fn(),
    ...overrides,
  };
  render(<TimelineRuler {...props} />);
  return props;
}

describe("TimelineRuler", () => {
  it("renders the selected year", () => {
    renderRuler({ selectedYear: 2025 });
    expect(screen.getByText("2025")).toBeDefined();
  });

  it("fires onYearChange when previous year button is clicked", () => {
    const onYearChange = vi.fn();
    renderRuler({
      years: [2026, 2025, 2024],
      selectedYear: 2025,
      onYearChange,
    });
    const prevButton = screen.getByLabelText("Previous year (2024)");
    fireEvent.click(prevButton);
    expect(onYearChange).toHaveBeenCalledWith(2024);
  });

  it("fires onYearChange when next year button is clicked", () => {
    const onYearChange = vi.fn();
    renderRuler({
      years: [2026, 2025, 2024],
      selectedYear: 2025,
      onYearChange,
    });
    const nextButton = screen.getByLabelText("Next year (2026)");
    fireEvent.click(nextButton);
    expect(onYearChange).toHaveBeenCalledWith(2026);
  });

  it("disables previous button on the oldest year", () => {
    renderRuler({ years: [2026, 2025, 2024], selectedYear: 2024 });
    const prevButton = screen.getByLabelText("Previous year") as HTMLButtonElement;
    expect(prevButton.disabled).toBe(true);
  });

  it("disables next button on the most recent year", () => {
    renderRuler({ years: [2026, 2025, 2024], selectedYear: 2026 });
    const nextButton = screen.getByLabelText("Next year") as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
  });

  it("fires onPlayToggle when play button is clicked", () => {
    const onPlayToggle = vi.fn();
    renderRuler({ onPlayToggle });
    const playButton = screen.getByLabelText("Play");
    fireEvent.click(playButton);
    expect(onPlayToggle).toHaveBeenCalledTimes(1);
  });

  it("marks the active speed chip as pressed", () => {
    renderRuler({ speed: 2 });
    const chip = screen.getByLabelText("2× speed");
    expect(chip.getAttribute("aria-pressed")).toBe("true");
  });
});
