"use client";

import { AnimatePresence, motion } from "framer-motion";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ["1"], label: "Grid view" },
  { keys: ["2"], label: "Forest view" },
  { keys: ["3"], label: "City view" },
  { keys: ["Space"], label: "Play / pause scrubber" },
  { keys: ["←"], label: "Previous year" },
  { keys: ["→"], label: "Next year" },
  { keys: ["?"], label: "Toggle this help" },
  { keys: ["Esc"], label: "Close this help" },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-gray-100">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-gray-950 p-6 shadow-2xl"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </button>
            </div>
            <ul className="flex flex-col gap-2">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.label}
                  className="flex items-center justify-between text-sm text-gray-300"
                >
                  <span>{s.label}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) => (
                      <Kbd key={k}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
