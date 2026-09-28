import { describe, expect, it } from "vitest";
import { analysisInputForDemo } from "../apps/web/src/server/load-start-demo";

describe("start demos", () => {
  it("loads the Fireball Witch export without accepting an arbitrary id", () => {
    const loaded = analysisInputForDemo("fireball-witch");
    expect(loaded?.importSource).toBe("pob2");
    expect(loaded?.pob2Code?.length).toBeGreaterThan(20);
    expect(analysisInputForDemo("../A.code.txt")).toBeNull();
    expect(analysisInputForDemo("crafting-example")).toBeNull();
  });

  it("loads the passive demo as the existing witch fixture", () => {
    expect(analysisInputForDemo("passive-recommendation")).toEqual({
      importSource: "fixture",
      fixtureId: "witch-offensive.json",
      fixtureJson: "",
      pob2Code: "",
    });
  });
});
