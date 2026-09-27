import {
  parsePassiveTreeSnapshot,
  type GameDataVersion,
  type PassiveNode,
  type PassiveNodeKind,
  type PassiveTreeSnapshot,
} from "@poe2-helper/domain";
import {
  PASSIVE_KIND_FLAGS,
  PASSIVE_SOURCE_FLAGS,
  parseSkillTreeExport,
  type SkillTreeExportNode,
} from "./raw-schema";

export type NormalizedSkillTree = {
  snapshot: PassiveTreeSnapshot;
  skippedRootEdges: number;
  skippedSelfEdges: number;
};

export function normalizeSkillTreeExport(
  value: unknown,
  version: GameDataVersion,
): NormalizedSkillTree {
  const exported = parseSkillTreeExport(value);
  const skillNodes = new Map<number, SkillTreeExportNode>();
  let rootNodes = 0;

  for (const node of Object.values(exported.nodes)) {
    if (node.skill === undefined) {
      if (node.classStartIndex && node.classStartIndex.length > 0) {
        throw new Error(
          "Passive tree export root placeholder cannot declare classStartIndex.",
        );
      }
      rootNodes += 1;
      continue;
    }
    if (skillNodes.has(node.skill)) {
      throw new Error(
        `Passive tree export has duplicate skill id ${node.skill}.`,
      );
    }
    skillNodes.set(node.skill, node);
  }

  if (rootNodes !== 1) {
    throw new Error(
      `Passive tree export must contain exactly one root placeholder node, found ${rootNodes}.`,
    );
  }

  const neighborSets = new Map<number, Set<number>>();
  for (const skillId of skillNodes.keys()) {
    neighborSets.set(skillId, new Set());
  }

  for (const [skillId, node] of skillNodes) {
    for (const endpoint of [...node.out, ...node.in]) {
      const neighborId = parseSkillReference(endpoint, skillId);
      if (neighborId === skillId) {
        continue;
      }
      if (!skillNodes.has(neighborId)) {
        throw new Error(
          `Passive tree export node ${skillId} links to unknown skill ${neighborId}.`,
        );
      }
      neighborSets.get(skillId)?.add(neighborId);
      neighborSets.get(neighborId)?.add(skillId);
    }
  }

  const edgeKeys = new Set<string>();
  const rootTargetIds = new Set<number>();
  let rootEdges = 0;
  let selfEdges = 0;
  for (const edge of exported.edges) {
    const fromIsRoot = edge.from === "root";
    const toIsRoot = edge.to === "root";
    if (fromIsRoot || toIsRoot) {
      if (fromIsRoot === toIsRoot) {
        throw new Error(
          "Passive tree export has an edge with no skill endpoint.",
        );
      }
      const skillEndpoint = fromIsRoot ? edge.to : edge.from;
      const skillId = parseSkillReference(skillEndpoint, "root edge");
      if (!skillNodes.has(skillId)) {
        throw new Error(
          `Passive tree export root edge links to unknown skill ${skillId}.`,
        );
      }
      rootTargetIds.add(skillId);
      rootEdges += 1;
      continue;
    }

    const fromId = parseSkillReference(edge.from, "edge");
    const toId = parseSkillReference(edge.to, "edge");
    if (fromId === toId) {
      selfEdges += 1;
      continue;
    }
    if (!skillNodes.has(fromId) || !skillNodes.has(toId)) {
      throw new Error(
        `Passive tree export edge ${String(edge.from)}-${String(edge.to)} references an unknown skill.`,
      );
    }
    edgeKeys.add(undirectedKey(fromId, toId));
  }

  const linkKeys = new Set<string>();
  for (const [skillId, neighbors] of neighborSets) {
    for (const neighborId of neighbors) {
      if (skillId < neighborId) {
        linkKeys.add(undirectedKey(skillId, neighborId));
      }
    }
  }

  if (
    linkKeys.size !== edgeKeys.size ||
    [...linkKeys].some((key) => !edgeKeys.has(key))
  ) {
    const onlyLinks = [...linkKeys]
      .filter((key) => !edgeKeys.has(key))
      .slice(0, 5);
    const onlyEdges = [...edgeKeys]
      .filter((key) => !linkKeys.has(key))
      .slice(0, 5);
    throw new Error(
      `Passive tree export node links do not match the edges array. links=${linkKeys.size} edges=${edgeKeys.size} onlyLinks=${onlyLinks.join(",")} onlyEdges=${onlyEdges.join(",")}`,
    );
  }

  const nodes: PassiveNode[] = [...skillNodes.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([skillId, node]) => {
      const neighbors = [...(neighborSets.get(skillId) ?? [])].sort(
        (left, right) => left - right,
      );
      const normalized: PassiveNode = {
        id: skillId,
        name: node.name ?? "",
        rawStats: node.stats ?? [],
        neighborIds: neighbors,
        kinds: kindsForNode(node),
        sourceFlags: sourceFlagsForNode(node),
      };
      if (node.ascendancyId) {
        normalized.ascendancyId = node.ascendancyId;
      }
      if (node.x !== undefined && node.y !== undefined) {
        normalized.position = { x: node.x, y: node.y };
      }
      return normalized;
    });

  const edges = [...edgeKeys]
    .map((key) => {
      const match = /^(\d+)-(\d+)$/.exec(key);
      if (!match?.[1] || !match[2]) {
        throw new Error(
          `Passive tree export produced an invalid edge key ${key}.`,
        );
      }
      return { fromNodeId: Number(match[1]), toNodeId: Number(match[2]) };
    })
    .sort(
      (left, right) =>
        left.fromNodeId - right.fromNodeId || left.toNodeId - right.toNodeId,
    );

  return {
    snapshot: parsePassiveTreeSnapshot({
      version,
      nodes,
      edges,
      classStarts: classStartsFromExport(exported, rootTargetIds),
    }),
    skippedRootEdges: rootEdges,
    skippedSelfEdges: selfEdges,
  };
}

function classStartsFromExport(
  exported: ReturnType<typeof parseSkillTreeExport>,
  rootTargetIds: Set<number>,
): Array<{ classIndex: number; className: string; nodeId: number }> {
  const classStarts: Array<{
    classIndex: number;
    className: string;
    nodeId: number;
  }> = [];
  const startNodeIds = new Set<number>();

  for (const node of Object.values(exported.nodes)) {
    if (node.skill === undefined || !node.classStartIndex) {
      continue;
    }
    for (const classIndex of node.classStartIndex) {
      const classInfo = exported.classes[classIndex];
      if (!classInfo) {
        throw new Error(
          `Passive tree export skill ${node.skill} has classStartIndex ${classIndex}, which is outside the classes array.`,
        );
      }
      classStarts.push({
        classIndex,
        className: classInfo.name,
        nodeId: node.skill,
      });
    }
    startNodeIds.add(node.skill);
  }

  const sameNodes =
    startNodeIds.size === rootTargetIds.size &&
    [...startNodeIds].every((nodeId) => rootTargetIds.has(nodeId));
  if (!sameNodes) {
    throw new Error(
      "Passive tree export root edges do not match nodes with classStartIndex.",
    );
  }

  classStarts.sort((left, right) => left.classIndex - right.classIndex);
  return classStarts;
}

function kindsForNode(node: SkillTreeExportNode): PassiveNodeKind[] {
  const kinds = PASSIVE_KIND_FLAGS.filter(([flag]) => node[flag] === true).map(
    ([, kind]) => kind,
  );
  return kinds.length > 0 ? [...kinds] : ["small"];
}

function sourceFlagsForNode(node: SkillTreeExportNode): string[] {
  return PASSIVE_SOURCE_FLAGS.filter((flag) => node[flag] === true);
}

function parseSkillReference(
  value: string | number,
  label: string | number,
): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number(value);
  }
  throw new Error(
    `Passive tree export reference ${String(value)} on ${label} is not a skill id.`,
  );
}

function undirectedKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`;
}
