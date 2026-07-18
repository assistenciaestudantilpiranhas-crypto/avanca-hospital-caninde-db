import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
  },
});
