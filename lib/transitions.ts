/**
 * Timing constants for UI transitions.
 *
 * Centralised so all surfaces that participate in the same transition
 * (framer-motion animations, inline CSS, children coordinating their own
 * timings) stay on the same rhythm. Tuning one number adjusts everything
 * that references it.
 */

// Mode transition: grid ⇄ 3D crossfade.
//
// 240ms feels snappier than the old 300ms without feeling rushed. The
// "expo-out" curve (0.16, 1, 0.3, 1) pops at the start and settles
// gently — lets the user feel the click land immediately, then the
// visualisation arrives into stillness instead of braking hard.
export const MODE_TRANSITION_MS = 240;
// Same curve, two forms so framer-motion and inline CSS stay exactly
// in sync — any divergence shows up as a phase offset in the crossfade.
export const MODE_TRANSITION_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const MODE_TRANSITION_EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

// Derived: seconds for framer-motion props (which take s, not ms).
export const MODE_TRANSITION_S = MODE_TRANSITION_MS / 1000;
