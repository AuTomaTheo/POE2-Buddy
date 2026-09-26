import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe(".env.example", () => {
  it("lists placeholder names and stores no secret values", () => {
    const contents = readFileSync(
      path.join(repositoryRoot, ".env.example"),
      "utf8",
    );

    expect(contents).toContain("GGG_CLIENT_ID=");
    expect(contents).toContain("GGG_CLIENT_SECRET=");
    expect(contents).toContain("GGG_REDIRECT_URI=");
    expect(contents).toContain("AI_PROVIDER=");
    expect(contents).toContain("AI_API_KEY=");
    expect(contents).toContain("AI_MODEL=");
    expect(contents).toContain("GITHUB_TOKEN=");

    const assignments = contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));

    expect(assignments.length).toBeGreaterThan(0);

    for (const line of assignments) {
      const separator = line.indexOf("=");
      expect(separator).toBeGreaterThan(0);
      expect(line.slice(separator + 1)).toBe("");
    }
  });
});
