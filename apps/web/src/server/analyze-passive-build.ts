import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  developmentPassiveTreeSnapshotDirectory,
  getPinnedPassiveTreeSnapshot,
  importPob2Build,
  loadBuildFixture,
  pob2AscendancyNodeIds,
  reportBuildFixtureAgainstSnapshot,
  type Pob2BuildDocument,
  type Pob2ImportSuccess,
} from "@poe2-helper/data-sources";
import { parseBuildFixture, type BuildFixture } from "@poe2-helper/domain";
import {
  buildPassiveGraph,
  DisconnectedAllocationError,
  OptimizationNotReadyError,
  PathSearchLimitError,
  UnpricedPassiveNodeError,
  type OptimizationBlocker,
  type PassiveGraph,
} from "@poe2-helper/passive-engine";
import {
  recommendMainTreePaths,
  scoringProfile,
  type PassivePathRecommendation,
} from "@poe2-helper/scoring-engine";
import { analyzeEquipment, type GearAnalysis } from "@poe2-helper/gear-engine";
import type { CharacterContext } from "@poe2-helper/character-context";
import { pathKey } from "../lib/path-layout";
import { characterContextForAnalysis } from "./context-from-analysis";

export const ANALYSIS_TOP_K = 5;

export const ANALYSIS_FIXTURES = [
  { id: "witch-offensive.json", label: "Witch offensive" },
  { id: "warrior-defensive.json", label: "Warrior defensive" },
] as const;

const FIXTURE_IDS = new Set<string>(
  ANALYSIS_FIXTURES.map((fixture) => fixture.id),
);

const OBJECTIVES = new Set(["offensive", "defensive", "balanced"]);

const fixtureDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/data-sources/fixtures/builds",
);

const graphs = new Map<string, PassiveGraph>();

export type AnalysisInput = {
  fixtureId: string;
  fixtureJson: string;
  objective: string;
  pointBudget: string;
  snapshotDirectory?: string;
  importSource?: "fixture" | "pob2";
  pob2Code?: string;
};

export type Pob2AnalysisView = {
  status: Pob2ImportSuccess["status"];
  name: string | null;
  className: string | null;
  level: number | null;
  ascendancy: string | null;
  skillGroupCount: number;
  mainSkillResolved: boolean;
  mainSkillName: string | null;
  supportCount: number;
  unresolvedRoleGemCount: number;
  equipmentCount: number;
  configurationCount: number;
  configurationSummary: string;
  configurationSelection: Pob2ImportSuccess["document"]["configurationSelection"];
  ascendancyPassiveIds: readonly number[];
  unknownPassiveIds: readonly number[];
  warnings: readonly string[];
  treeVersion: string | null;
  activeTreeVersion: string | null;
};

export type AnalysisNodeView = {
  id: number;
  name: string;
  kinds: readonly string[];
  x: number | null;
  y: number | null;
};

export type AnalysisSuccess = {
  ok: true;
  characterName: string;
  className: string;
  recommendation: PassivePathRecommendation;
  allocatedNodeIds: readonly number[];
  classStartNodeId: number | null;
  nodes: readonly AnalysisNodeView[];
  entryNodeIds: Readonly<Record<string, number | null>>;
  pob2?: Pob2AnalysisView;
  gear: GearAnalysis;
  context: CharacterContext;
};

export type AnalysisFailure = {
  ok: false;
  message: string;
  pob2?: Pob2AnalysisView;
  gear?: GearAnalysis;
  context?: CharacterContext;
};

export type AnalysisResult = AnalysisSuccess | AnalysisFailure;

export function defaultSnapshotDirectory(): string {
  const configured = process.env.POE2_PASSIVE_TREE_SNAPSHOT_DIR?.trim();
  if (configured) return path.resolve(configured);
  return developmentPassiveTreeSnapshotDirectory;
}

function graphFor(snapshotDirectory: string): PassiveGraph {
  const cached = graphs.get(snapshotDirectory);
  if (cached) return cached;
  const snapshot = getPinnedPassiveTreeSnapshot({
    snapshotDirectory,
    logger: () => undefined,
  });
  const graph = buildPassiveGraph(snapshot);
  graphs.set(snapshotDirectory, graph);
  return graph;
}

function fixtureFromRequest(
  input: AnalysisInput,
  snapshotDirectory: string,
): BuildFixture {
  const pasted = input.fixtureJson.trim();
  const snapshot = getPinnedPassiveTreeSnapshot({
    snapshotDirectory,
    logger: () => undefined,
  });
  if (pasted.length > 0) {
    if (pasted.length > 1_000_000) {
      throw new Error("Fixture JSON is too large.");
    }
    const parsed = parseBuildFixture(JSON.parse(pasted) as unknown);
    return reportBuildFixtureAgainstSnapshot(parsed, snapshot).fixture;
  }
  if (!FIXTURE_IDS.has(input.fixtureId)) {
    throw new Error("Choose a known fixture or paste fixture JSON.");
  }
  return loadBuildFixture({
    filePath: path.join(fixtureDirectory, input.fixtureId),
    snapshot,
  }).fixture;
}

function entryNodeId(
  graph: PassiveGraph,
  nodeIds: readonly number[],
  allocated: ReadonlySet<number>,
): number | null {
  const first = nodeIds[0];
  if (first === undefined) return null;
  const attached = graph
    .neighbors(first)
    .filter((id) => allocated.has(id))
    .sort((left, right) => left - right);
  return attached[0] ?? null;
}

function analysisNodes(
  graph: PassiveGraph,
  ids: ReadonlySet<number>,
): AnalysisNodeView[] {
  return [...ids]
    .sort((left, right) => left - right)
    .map((id) => {
      const node = graph.node(id);
      return {
        id: node.id,
        name: node.name,
        kinds: node.kinds,
        x: node.position?.x ?? null,
        y: node.position?.y ?? null,
      };
    });
}

function blockerMessage(blocker: OptimizationBlocker): string {
  switch (blocker.kind) {
    case "unknown-class":
      return `Unknown class ${blocker.className}.`;
    case "unknown-allocated-id":
      return `Allocated node ${blocker.nodeId} is not on this tree.`;
    case "unknown-weapon-set-id":
      return `Weapon set ${blocker.set} node ${blocker.nodeId} is not on this tree.`;
    case "source-incompatible":
      return "The fixture tree version does not match the pinned tree.";
    case "graph-issue":
      return `Passive tree graph issue: ${blocker.issue.kind}.`;
    default: {
      const unexpected: never = blocker;
      return `Optimization is not ready: ${JSON.stringify(unexpected)}.`;
    }
  }
}

function analysisErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) return "The fixture is not valid JSON.";
  if (error instanceof PathSearchLimitError) return error.message;
  if (error instanceof DisconnectedAllocationError) return error.message;
  if (error instanceof UnpricedPassiveNodeError) return error.message;
  if (error instanceof OptimizationNotReadyError) {
    const details = error.readiness.blockers.map(blockerMessage);
    return ["Optimization is not ready.", ...details].join(" ");
  }
  if (error instanceof Error && error.name === "ZodError") {
    const issues = (error as Error & { issues?: { message: string }[] }).issues;
    const detail = issues
      ?.slice(0, 3)
      .map((issue) => issue.message)
      .join(" ");
    return detail
      ? `The fixture JSON does not match a build fixture. ${detail}`
      : "The fixture JSON does not match a build fixture.";
  }
  if (
    error instanceof Error &&
    error.message === "Fixture JSON is too large."
  ) {
    return error.message;
  }
  if (
    error instanceof Error &&
    error.message === "Choose a known fixture or paste fixture JSON."
  ) {
    return error.message;
  }
  return "Analysis failed.";
}

function pob2View(result: Pob2ImportSuccess): Pob2AnalysisView {
  return {
    status: result.status,
    name: result.document.buildName,
    className: result.document.className,
    level: result.document.level,
    ascendancy: result.document.ascendancy,
    skillGroupCount: result.document.skillGroups.length,
    mainSkillResolved: result.document.mainSkill.resolved,
    mainSkillName: result.document.mainSkill.name,
    supportCount: result.document.skillGroups.reduce(
      (count, group) =>
        count + group.rawGems.filter((gem) => gem.role === "support").length,
      0,
    ),
    unresolvedRoleGemCount: result.document.skillGroups.reduce(
      (count, group) =>
        count + group.rawGems.filter((gem) => gem.role === "unknown").length,
      0,
    ),
    equipmentCount: result.document.items.length,
    configurationCount: result.document.configuration.length,
    configurationSummary: result.document.configuration
      .map((entry) => `${entry.key}=${entry.value}`)
      .join(", "),
    configurationSelection: result.document.configurationSelection,
    ascendancyPassiveIds: result.document.ascendancyPassiveIds,
    unknownPassiveIds: result.unknownPassiveIds,
    warnings: result.warnings,
    treeVersion: result.document.treeVersion,
    activeTreeVersion: result.activeTreeVersion,
  };
}

function failureGearAndContext(
  character: BuildFixture["character"],
  checksum: string,
  document: Pob2BuildDocument,
  snapshotDirectory: string,
): { gear: GearAnalysis; context: CharacterContext } {
  const gear = analyzeEquipment({
    items: character.equipment,
    provider: "pob2",
    sourceChecksum: checksum,
  });
  return {
    gear,
    context: characterContextForAnalysis({
      source: "pob2",
      character,
      graph: graphFor(snapshotDirectory),
      gear,
      document,
    }),
  };
}

function pob2FromRequest(
  input: AnalysisInput,
  snapshotDirectory: string,
):
  | {
      ok: true;
      fixture: BuildFixture;
      view: Pob2AnalysisView;
      checksum: string;
      document: Pob2BuildDocument;
    }
  | AnalysisFailure {
  const code = input.pob2Code?.trim() ?? "";
  if (code.length === 0) {
    return { ok: false, message: "Paste a PoB2 export code." };
  }
  const snapshot = getPinnedPassiveTreeSnapshot({
    snapshotDirectory,
    logger: () => undefined,
  });
  const imported = importPob2Build(code, {
    nodeIds: new Set(snapshot.nodes.map((node) => node.id)),
    ascendancyNodeIds: pob2AscendancyNodeIds(snapshot.nodes),
    source: snapshot.version.source,
    version: snapshot.version.version,
    commit: snapshot.version.commit,
    checksum: snapshot.version.checksum,
  });
  if (!imported.ok) return { ok: false, message: imported.message };
  const view = pob2View(imported);
  if (imported.status === "incompatible" || imported.character === null) {
    const unknown =
      imported.unknownPassiveIds.length > 0
        ? ` Unknown passive ids: ${imported.unknownPassiveIds.join(", ")}.`
        : "";
    return {
      ok: false,
      message: `The PoB2 tree cannot enter passive analysis.${unknown}`,
      pob2: view,
      ...(imported.character
        ? failureGearAndContext(
            imported.character,
            imported.checksum,
            imported.document,
            snapshotDirectory,
          )
        : {}),
    };
  }
  return {
    ok: true,
    view,
    checksum: imported.checksum,
    document: imported.document,
    fixture: {
      character: imported.character,
      goals: { objective: "offensive", pointBudget: 0 },
    },
  };
}

export function runPassiveAnalysis(input: AnalysisInput): AnalysisResult {
  try {
    if (!OBJECTIVES.has(input.objective)) {
      return {
        ok: false,
        message: "Choose an offensive, defensive, or balanced objective.",
      };
    }
    if (!/^\d+$/.test(input.pointBudget)) {
      return {
        ok: false,
        message: "Point budget must be a whole number, 0 or greater.",
      };
    }
    const pointBudget = Number(input.pointBudget);
    const objective = input.objective as "offensive" | "defensive" | "balanced";
    const snapshotDirectory =
      input.snapshotDirectory ?? defaultSnapshotDirectory();
    const imported =
      input.importSource === "pob2"
        ? pob2FromRequest(input, snapshotDirectory)
        : undefined;
    if (imported && !imported.ok) return imported;
    const loaded = imported
      ? imported.fixture
      : fixtureFromRequest(input, snapshotDirectory);
    const fixture: BuildFixture = {
      ...loaded,
      goals: { objective, pointBudget },
    };
    const graph = graphFor(snapshotDirectory);
    const recommendation = recommendMainTreePaths({
      fixture,
      graph,
      profile: scoringProfile(objective),
      k: ANALYSIS_TOP_K,
    });
    const allocatedNodeIds = fixture.character.allocatedPassiveIds;
    const allocated = new Set(allocatedNodeIds);
    const classStartNodeId =
      graph.classStartNodeIds(fixture.character.className)[0] ?? null;
    const shownIds = new Set<number>(allocated);
    if (classStartNodeId !== null) shownIds.add(classStartNodeId);
    const entryNodeIds: Record<string, number | null> = {};
    for (const candidate of [
      ...recommendation.rankedCompleteCandidates,
      ...recommendation.incompleteCandidates,
    ]) {
      for (const id of candidate.nodeIds) shownIds.add(id);
      const entry = entryNodeId(graph, candidate.nodeIds, allocated);
      entryNodeIds[pathKey(candidate.nodeIds)] = entry;
      if (entry !== null) shownIds.add(entry);
    }
    const gear = analyzeEquipment({
      items: fixture.character.equipment,
      provider: imported ? "pob2" : "fixture",
      sourceChecksum: imported?.checksum ?? null,
    });
    return {
      ok: true,
      characterName: fixture.character.name ?? "Unnamed character",
      className: fixture.character.className,
      recommendation,
      allocatedNodeIds,
      classStartNodeId,
      nodes: analysisNodes(graph, shownIds),
      entryNodeIds,
      gear,
      context: characterContextForAnalysis({
        source: imported ? "pob2" : "fixture",
        character: fixture.character,
        graph,
        gear,
        ...(imported ? { document: imported.document } : {}),
      }),
      ...(imported?.view ? { pob2: imported.view } : {}),
    };
  } catch (error) {
    return { ok: false, message: analysisErrorMessage(error) };
  }
}

export function readBundledFixture(fixtureId: string): string {
  if (!FIXTURE_IDS.has(fixtureId)) {
    throw new Error("Choose a known fixture or paste fixture JSON.");
  }
  return readFileSync(path.join(fixtureDirectory, fixtureId), "utf8");
}
