import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

describe("lint coverage", () => {
  it("includes package TypeScript, not only the web app", async () => {
    const eslint = new ESLint();
    const packageFiles = [
      "packages/domain/src/index.ts",
      "packages/data-sources/src/index.ts",
    ];

    for (const file of packageFiles) {
      expect(await eslint.isPathIgnored(file)).toBe(false);
    }

    const results = await eslint.lintFiles(packageFiles);
    expect(results.map((result) => result.filePath.length > 0)).toEqual([
      true,
      true,
    ]);
    expect(results.every((result) => result.errorCount === 0)).toBe(true);
  }, 20000);
});
