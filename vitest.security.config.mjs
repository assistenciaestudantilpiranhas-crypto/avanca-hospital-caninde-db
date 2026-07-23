import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/security/**/*.test.js"],
    isolate: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    testTimeout: 30000,
  },
});
