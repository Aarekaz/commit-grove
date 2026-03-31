"use client";

import { motion, AnimatePresence } from "framer-motion";

type Props = {
  username: string;
  currentWeek: number;
  maxWeeks: number;
  visible: boolean;
  onSkip: () => void;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function CinematicOverlay({ username, currentWeek, maxWeeks, visible, onSkip }: Props) {
  const monthIndex = Math.min(
    Math.floor((maxWeeks / 52) * 12) - 1, // cap at actual data months
    Math.floor((currentWeek / Math.max(maxWeeks, 1)) * Math.ceil((maxWeeks / 52) * 12))
  );
  const safeMonthIndex = Math.max(0, Math.min(11, monthIndex));
  const progress = maxWeeks > 0 ? (currentWeek / maxWeeks) * 100 : 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-auto absolute inset-0 z-20 flex flex-col items-center justify-end pb-16"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          {/* Top gradient for text readability */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent" />

          {/* Username title */}
          <motion.div
            className="absolute top-12 left-1/2 -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <p className="text-sm font-medium tracking-widest text-gray-400 uppercase">
              {username}
            </p>
          </motion.div>

          {/* Month indicator */}
          <motion.div
            className="mb-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span className="text-6xl font-bold tracking-tight text-gray-800/30 sm:text-8xl">
              {MONTHS[safeMonthIndex]}
            </span>
          </motion.div>

          {/* Progress bar */}
          <motion.div
            className="w-64 sm:w-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="h-[2px] w-full rounded-full bg-gray-300/50">
              <div
                className="h-full rounded-full bg-green-500 transition-[width] duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>

          {/* Skip button */}
          <motion.button
            onClick={onSkip}
            className="mt-4 rounded-lg px-4 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            skip intro
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
