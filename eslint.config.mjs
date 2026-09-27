import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/next-env.d.ts",
    "docs/**",
  ]),
  {
    files: ["apps/web/**/*.{js,mjs,ts,tsx}"],
    extends: [nextVitals, nextTs],
    settings: {
      next: {
        rootDir: "apps/web/",
      },
    },
  },
  {
    files: [
      "packages/**/*.ts",
      "tests/**/*.ts",
      "vitest.config.mts",
      "vitest.pob2.config.mts",
    ],
    extends: [tseslint.configs.recommended],
  },
]);
