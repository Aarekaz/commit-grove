/**
 * Timing constants for UI transitions.
 *
 * Centralised so all surfaces that participate in the same transition
 * (framer-motion animations, inline CSS, children coordinating their own
 * timings) stay on the same rhythm. Tuning one number adjusts everything
 * that references it.
 */

// Mode transition: grid ⇄ 3D crossfade.
export const MODE_TRANSITION_MS = 300;
export const MODE_TRANSITION_EASE = "easeOut" as const;
// Matches MODE_TRANSITION_EASE but in CSS cubic-bezier form for places
// that can't take a framer-motion string (inline style transition prop).
export const MODE_TRANSITION_EASE_CSS = "cubic-bezier(0, 0, 0.2, 1)";

// Derived: seconds for framer-motion props (which take s, not ms).
export const MODE_TRANSITION_S = MODE_TRANSITION_MS / 1000;
