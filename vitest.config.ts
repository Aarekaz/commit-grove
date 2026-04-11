import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Default environment stays node for pure-logic tests (lib/*.test.ts).
    // DOM tests opt in per-file via the `// @vitest-environment jsdom` pragma
    // at the top of the file.
    environment: "node",
  },
});
