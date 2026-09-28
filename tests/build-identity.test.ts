import { describe, expect, it } from "vitest";
import { buildIdentity } from "../apps/web/src/app/shell/build-identity";

describe("build identity", () => {
  it("uses player-facing source and status labels", () => {
    const identity = buildIdentity({
      name: "Fireball Witch",
      className: "Witch",
      ascendancy: "Infernalist",
      level: 16,
      primarySkill: "Fireball",
      source: "pob2",
      readiness: "partial",
    });
    expect(identity).toEqual({
      name: "Fireball Witch",
      detail: "Witch · Infernalist · Level 16",
      primarySkill: "Fireball",
      sourceLabel: "Path of Building",
      statusLabel: "Partial",
    });
  });

  it("labels a fixture as a demo and omits a missing level", () => {
    const identity = buildIdentity({
      name: null,
      className: "Witch",
      ascendancy: null,
      level: null,
      primarySkill: null,
      source: "fixture",
      readiness: "insufficient",
    });
    expect(identity?.name).toBe("Witch");
    expect(identity?.detail).toBe("Witch");
    expect(identity?.primarySkill).toBe("unavailable");
    expect(identity?.sourceLabel).toBe("Demo build");
    expect(identity?.statusLabel).toBe("Not enough evidence");
  });

  it("returns nothing when the result has no name or class", () => {
    expect(
      buildIdentity({
        name: "  ",
        className: null,
        ascendancy: null,
        level: null,
        primarySkill: null,
        source: "ggg",
        readiness: null,
      }),
    ).toBeNull();
  });
});
