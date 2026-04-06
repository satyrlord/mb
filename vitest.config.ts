/**
 * Vitest configuration for MEMORYBLOX.
 *
 * See {@link docs/testing-strategy.md} for coverage exclusion rationale
 * and overall testing conventions.
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "e2e/**",
    ],
    coverage: {
      provider: "istanbul",
      exclude: [
        "tools/**",
        // Bootstrap entrypoint excluded from unit-test coverage.
        // E2E tests will provide better coverage when added. For details, see docs/testing-strategy.md.
        "src/index.ts",
        "dist/**",
        "eslint.config.mjs",
        "vitest.config.ts",
        ".github/**",
      ],
    },
  },
});
