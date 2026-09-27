import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/*/src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.git/**", "**/*.integration.test.ts"],
    // Several files load the pinned passive tree. Loading many copies at once
    // pushes those tests past the default timeout. Two workers keep file
    // parallelism without that pile-up. Timeouts are not raised to hide it.
    maxWorkers: 2,
  },
});
