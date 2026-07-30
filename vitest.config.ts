import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Unit tests only: plain Node environment, no browser mode / playwright provider.
    environment: "node",
    include: ["test/**/*.{test,spec}.ts"],
    testTimeout: 10000,
    // Tests import { describe, it, expect } explicitly, so globals stay off.
    globals: false,
  },
});
