import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePob2Export } from "@poe2-helper/data-sources";
import {
  IsolatedPob2Worker,
  calculateBaseline,
  evaluateItemReplacement,
  evaluatePassiveCandidate,
  readRuntimeManifest,
  runtimeFingerprint,
} from "@poe2-helper/pob2-calculator";
import { afterAll, describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fixtureDirectory = path.join(
  repositoryRoot,
  "packages/data-sources/src/pob2/fixtures/real",
);
const runtimeDir =
  process.env.POB2_CALCULATOR_DIR?.trim() ||
  path.join(process.env.LOCALAPPDATA ?? "", "poe2-buddy", "pob2-runtime");

const manifest = readRuntimeManifest(runtimeDir);
const worker = new IsolatedPob2Worker(runtimeDir, manifest);
const performanceNotes: string[] = [];

function note(line: string) {
  performanceNotes.push(line);
}

afterAll(() => {
  worker.discard();
  writeFileSync(
    path.join(runtimeDir, "calculator-performance.json"),
    `${JSON.stringify(performanceNotes, null, 2)}\n`,
  );
});

function xmlFor(name: string) {
  const code = readFileSync(path.join(fixtureDirectory, name), "utf8");
  return decodePob2Export(code);
}

const shared = {
  pobTreeKey: manifest.treeKey,
  gggVersion: "0.5.5",
  pobVersion: manifest.pobVersion,
  runtimeChecksum: manifest.runtimeChecksum,
  runtimeFingerprint: manifest.runtimeFingerprint,
  transport: worker,
  timeoutMs: 60_000,
};

const wrappedGreathelm = [
  "Rarity: RARE",
  "Spike Helm",
  "Wrapped Greathelm",
  "Armour: 40",
  "Quality: 0",
  "LevelReq: 16",
  "Implicits: 0",
  "+80 to maximum Life",
].join("\n");

describe("real PoB2 worker", () => {
  it("measures fixture B node 4739 and restores the baseline", async () => {
    const decoded = xmlFor("B.code.txt");
    const started = Date.now();
    const baseline = await calculateBaseline({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
    });
    const baselineMs = Date.now() - started;
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;
    expect(baseline.result.skill.name).toBe("Fireball");
    expect(baseline.result.skill.effectId).toBe("FireballPlayer");
    const life = baseline.result.metrics.find((metric) => metric.id === "Life");
    const hit = baseline.result.metrics.find(
      (metric) => metric.id === "AverageHit",
    );
    const dps = baseline.result.metrics.find(
      (metric) => metric.id === "TotalDPS",
    );
    expect(life?.before).toBe(254);
    expect(hit?.before).toBeCloseTo(5.35, 2);
    expect(dps?.before).toBeCloseTo(4.458333333, 5);

    const candidateStarted = Date.now();
    const outcome = await evaluatePassiveCandidate({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
      candidate: {
        nodeIds: [4739],
        allocationMode: "shared",
        verifiedPointCost: 1,
      },
    });
    const candidateMs = Date.now() - candidateStarted;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.restoreVerified).toBe(true);
    expect(outcome.result.candidate.requestedNodeIds).toEqual([4739]);
    expect(outcome.result.candidate.verifiedNodeIds).toEqual([4739]);
    expect(outcome.result.candidate.actuallyAllocatedNodeIds).toEqual([4739]);
    expect(outcome.result.candidate.verifiedPointCost).toBe(1);
    expect(outcome.result.provenance.runtimeFingerprint).toBe(
      manifest.runtimeFingerprint,
    );
    const afterHit = outcome.result.metrics.find(
      (metric) => metric.id === "AverageHit",
    );
    const afterDps = outcome.result.metrics.find(
      (metric) => metric.id === "TotalDPS",
    );
    const afterLife = outcome.result.metrics.find(
      (metric) => metric.id === "Life",
    );
    const energy = outcome.result.metrics.find(
      (metric) => metric.id === "EnergyShield",
    );
    const fire = outcome.result.metrics.find(
      (metric) => metric.id === "FireResist",
    );
    expect(afterHit?.after).toBeCloseTo(5.885, 3);
    expect(afterHit?.percentDelta).toBeCloseTo(10, 1);
    expect(afterDps?.after).toBeCloseTo(4.904166667, 5);
    expect(afterDps?.percentDelta).toBeCloseTo(10, 1);
    expect(afterLife?.absoluteDelta).toBe(0);
    expect(energy?.percentDelta).toBeNull();
    expect(fire?.percentDelta).toBeNull();
    expect(fire?.before).toBe(-50);

    const weaponSet = await evaluatePassiveCandidate({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
      candidate: {
        nodeIds: [4739],
        allocationMode: "weaponSet1",
        verifiedPointCost: 1,
      },
    });
    if (weaponSet.ok) {
      expect(weaponSet.result.candidate.allocationMode).toBe("weaponSet1");
      expect(weaponSet.result.candidate.actuallyAllocatedNodeIds).toEqual([
        4739,
      ]);
      expect(weaponSet.result.restoreVerified).toBe(true);
    } else {
      expect(weaponSet.error.code).toBe("candidate-allocation-mismatch");
    }
    note(
      `baselineMs=${baselineMs} candidateMs=${candidateMs} startupIncludedInBaseline=true weaponSet1=${weaponSet.ok ? "measured" : weaponSet.error.code}`,
    );
  }, 120_000);

  it("reads fixture D weapon-set allocation for node 1755", async () => {
    const decoded = xmlFor("D.code.txt");
    const baseline = await calculateBaseline({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
    });
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) return;
    expect(baseline.result.weaponSetNodes).toContainEqual({
      id: 1755,
      allocMode: 1,
    });
  }, 120_000);

  it("records fingerprint cost and measures one exact multi-node candidate", async () => {
    const fingerprintStarted = Date.now();
    const fingerprint = runtimeFingerprint(runtimeDir);
    const fingerprintMs = Date.now() - fingerprintStarted;
    expect(fingerprint).toBe(manifest.runtimeFingerprint);

    const decoded = xmlFor("B.code.txt");
    const outcome = await evaluatePassiveCandidate({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
      candidate: {
        nodeIds: [4739, 18845],
        allocationMode: "shared",
        verifiedPointCost: 2,
      },
    });
    if (outcome.ok) {
      expect(outcome.result.candidate.actuallyAllocatedNodeIds).toEqual([
        4739, 18845,
      ]);
      expect(outcome.result.candidate.verifiedPointCost).toBe(2);
      note(
        `fingerprintMs=${fingerprintMs} multiNode=exact ids=4739,18845 verifiedPointCost=2`,
      );
      return;
    }
    expect(outcome.error.code).toBe("candidate-allocation-mismatch");
    note(
      `fingerprintMs=${fingerprintMs} multiNode=candidate-allocation-mismatch requested=4739,18845 unexpected=${outcome.allocation?.unexpectedNodeIds.join(",") ?? ""} missing=${outcome.allocation?.missingNodeIds.join(",") ?? ""}`,
    );
  }, 120_000);

  it("replaces fixture F helmet and restores the original item", async () => {
    const decoded = xmlFor("F.code.txt");
    const started = Date.now();
    const outcome = await evaluateItemReplacement({
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
      item: {
        slot: "helmet",
        rawItemText: wrappedGreathelm,
        label: "Spike Helm",
      },
    });
    const itemMs = Date.now() - started;
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result.restoreVerified).toBe(true);
    expect(outcome.result.slot).toBe("helmet");
    expect(outcome.result.provenance.runtimeFingerprint).toBe(
      manifest.runtimeFingerprint,
    );
    const candidateChecksum = outcome.result.candidateItem.rawChecksum;
    expect(candidateChecksum?.startsWith("sha256:")).toBe(true);
    expect("score" in outcome.result).toBe(false);
    const life = outcome.result.metrics.find((metric) => metric.id === "Life");
    const armour = outcome.result.metrics.find(
      (metric) => metric.id === "Armour",
    );
    const ehp = outcome.result.metrics.find(
      (metric) => metric.id === "TotalEHP",
    );
    const mana = outcome.result.metrics.find((metric) => metric.id === "Mana");
    expect(life?.before).toBe(382);
    expect(life?.after).toBe(464);
    expect(life?.absoluteDelta).toBe(82);
    expect(armour?.before).toBe(194);
    expect(armour?.after).toBe(144);
    expect(armour?.absoluteDelta).toBe(-50);
    expect(ehp?.before).toBeCloseTo(331.5453384, 4);
    expect(ehp?.after).toBeCloseTo(396.638227, 4);
    expect(mana?.before).toBe(174);
    expect(mana?.after).toBe(172);
    note(
      `itemReplacementMs=${itemMs} slot=helmet build=${decoded.checksum} candidate=${outcome.result.candidateItem.rawChecksum} restoreVerified=true fingerprint=${manifest.runtimeFingerprint}`,
    );
  }, 120_000);

  it("times a 10-candidate and a 50-candidate reload batch", async () => {
    const decoded = xmlFor("B.code.txt");
    const once = {
      ...shared,
      xml: decoded.xml,
      buildChecksum: decoded.checksum,
      candidate: {
        nodeIds: [4739],
        allocationMode: "shared" as const,
        verifiedPointCost: 1,
      },
    };
    const tenStarted = Date.now();
    for (let index = 0; index < 10; index += 1) {
      const outcome = await evaluatePassiveCandidate(once);
      expect(outcome.ok).toBe(true);
    }
    const tenMs = Date.now() - tenStarted;
    const fiftyStarted = Date.now();
    for (let index = 0; index < 50; index += 1) {
      const outcome = await evaluatePassiveCandidate(once);
      expect(outcome.ok).toBe(true);
    }
    const fiftyMs = Date.now() - fiftyStarted;
    note(`tenMs=${tenMs} fiftyMs=${fiftyMs}`);
  }, 180_000);
});
