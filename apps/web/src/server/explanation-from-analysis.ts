import {
  EXPLANATION_LIMITS,
  EXPLANATION_SCHEMA_VERSION,
  renderDeterministicExplanation,
  type ExplanationDocument,
  type ExplanationFact,
  type ExplanationInput,
  type ExplainerMode,
} from "@poe2-helper/ai-explainer";
import type { AnalysisResult, AnalysisSuccess } from "./analyze-passive-build";

export type AnalysisExplanation =
  | { status: "disabled" }
  | { status: "ready"; document: ExplanationDocument }
  | {
      status: "error";
      message: string;
    };

const EXPLANATION_ERROR =
  "The explanation could not be rendered. The analysis result is unchanged.";

/**
 * Facts included for a passive analysis:
 * objective, budget, selection claim, tree version, search, definitive flag,
 * up to five fully valued candidates in engine order (score and point cost;
 * the first also includes node ids, node count, and up to three supported
 * contributions), primary-skill status, one skill-group label, context
 * readiness, up to four relevant mechanics plus an omitted count when needed,
 * no-evidence and unresolved markers, gear readiness, up to three item labels
 * with confidence and recognized families, and a locality or unsupported-line
 * marker. Context warnings are copied until the warning limit, and one
 * explicit remainder warning replaces the rest. Raw item text, export codes,
 * and checksums are not included.
 */
export function explanationInputFromAnalysis(
  result: AnalysisSuccess,
): ExplanationInput {
  const notes: string[] = [];
  const clip = (value: string): string => {
    if (value.length <= EXPLANATION_LIMITS.maxTextLength) return value;
    const note = "Some explanation text was shortened to the text limit.";
    if (!notes.includes(note)) notes.push(note);
    return value.slice(0, EXPLANATION_LIMITS.maxTextLength);
  };
  const facts: ExplanationFact[] = [];
  const recommendation = result.recommendation;
  const ranked =
    recommendation.rankedCompleteCandidates.length > 0
      ? recommendation.rankedCompleteCandidates.slice(
          0,
          EXPLANATION_LIMITS.maxCandidates,
        )
      : recommendation.incompleteCandidates.slice(0, 1);

  facts.push(
    {
      id: "character.name",
      category: "character-context",
      label: "Character label",
      text: clip(result.characterName),
      sourceKind: "user-label",
    },
    {
      id: "passive.objective",
      category: "passive",
      label: "Selected objective",
      text: recommendation.profileId,
      sourceKind: "engine",
    },
    {
      id: "passive.point-budget",
      category: "passive",
      label: "Point budget",
      value: recommendation.pointBudget,
      sourceKind: "engine",
    },
    {
      id: "passive.claim",
      category: "passive",
      label: "Selection claim",
      text: recommendation.selectionClaim,
      sourceKind: "engine",
    },
    {
      id: "passive.tree.version",
      category: "passive",
      label: "Tree version",
      text: recommendation.dataVersion.version ?? "unknown",
      sourceKind: "provenance",
    },
    {
      id: "passive.search",
      category: "passive",
      label: "Search",
      text: recommendation.searchCompleteness,
      sourceKind: "engine",
    },
    {
      id: "passive.definitive",
      category: "passive",
      label: "Definitive",
      text: recommendation.definitive ? "yes" : "no",
      sourceKind: "engine",
    },
  );

  ranked.forEach((candidate, index) => {
    facts.push(
      {
        id: `passive.path.${index}.heuristic-score`,
        category: "passive",
        label: "Heuristic score",
        value: candidate.heuristicScore,
        sourceKind: "engine",
      },
      {
        id: `passive.path.${index}.point-cost`,
        category: "passive",
        label: "Point cost",
        value: candidate.pointCost,
        sourceKind: "engine",
      },
    );
    if (index !== 0) return;
    facts.push(
      {
        id: "passive.path.0.node-count",
        category: "passive",
        label: "Node count",
        value: candidate.nodeIds.length,
        sourceKind: "engine",
      },
      {
        id: "passive.path.0.nodes",
        category: "passive",
        label: "Node sequence",
        text: clip(candidate.nodeIds.join(", ")),
        sourceKind: "engine",
      },
    );
    candidate.contributions
      .filter((contribution) => contribution.supported)
      .slice(0, 3)
      .forEach((contribution, contributionIndex) => {
        facts.push({
          id: `passive.path.0.contribution.${contributionIndex}`,
          category: "passive",
          label: clip(contribution.label),
          value: contribution.contribution,
          sourceKind: "engine",
        });
      });
  });

  facts.push({
    id: "character.primary-skill.status",
    category: "character-context",
    label: "Primary skill",
    text: result.context.primarySkill.status,
    sourceKind: "engine",
  });
  if (result.context.primarySkill.name) {
    facts.push({
      id: "character.primary-skill.name",
      category: "character-context",
      label: "Primary skill label",
      text: clip(result.context.primarySkill.name),
      sourceKind: "user-label",
    });
  }
  const group = result.context.skillGroups[0];
  if (group?.label) {
    facts.push({
      id: "character.skill-group.0.label",
      category: "character-context",
      label: "Skill group label",
      text: clip(group.label),
      sourceKind: "user-label",
    });
  }
  facts.push({
    id: "character.readiness",
    category: "character-context",
    label: "Context readiness",
    text: result.context.readiness.status,
    sourceKind: "engine",
  });

  const relevant = [
    ...result.context.offense,
    ...result.context.defense,
  ].filter((entry) => entry.relevance === "relevant");
  relevant.slice(0, 4).forEach((entry, index) => {
    facts.push({
      id: `character.mechanic.${index}`,
      category: "character-context",
      label: clip(entry.mechanic),
      text: entry.relevance,
      sourceKind: "engine",
    });
  });
  if (relevant.length > 4) {
    facts.push({
      id: "character.relevant.omitted-count",
      category: "character-context",
      label: "Relevant mechanics not repeated",
      value: relevant.length - 4,
      sourceKind: "engine",
    });
  }
  if (
    [...result.context.offense, ...result.context.defense].some(
      (entry) => entry.relevance === "no-evidence",
    )
  ) {
    facts.push({
      id: "character.no-evidence",
      category: "character-context",
      label: "Mechanics without evidence",
      text: "no-evidence",
      sourceKind: "engine",
    });
  }
  if (result.context.unresolvedMechanics.length > 0) {
    facts.push({
      id: "character.unresolved",
      category: "character-context",
      label: "Unresolved mechanics",
      text: "unresolved",
      sourceKind: "engine",
    });
  }

  facts.push({
    id: "gear.readiness",
    category: "gear",
    label: "Gear readiness",
    text: result.gear.readiness.status,
    sourceKind: "engine",
  });
  result.gear.items.slice(0, 3).forEach((item, index) => {
    facts.push(
      {
        id: `gear.item.${index}.name`,
        category: "gear",
        label: "Item label",
        text: clip(item.name || "unavailable"),
        sourceKind: "user-label",
      },
      {
        id: `gear.item.${index}.confidence`,
        category: "gear",
        label: "Analysis confidence",
        text: item.confidence,
        sourceKind: "engine",
      },
      {
        id: `gear.item.${index}.families`,
        category: "gear",
        label: "Recognized modifier families",
        text: clip(item.understoodSemanticIds.join(", ") || "none"),
        sourceKind: "engine",
      },
    );
  });
  if (
    result.gear.items.some((item) =>
      item.modifiers.some(
        (modifier) => modifier.parsed && modifier.locality === "unknown",
      ),
    )
  ) {
    facts.push({
      id: "gear.locality",
      category: "gear",
      label: "Modifier locality",
      text: "unresolved",
      sourceKind: "engine",
    });
  }
  if (result.gear.items.some((item) => item.unsupportedLines.length > 0)) {
    facts.push({
      id: "gear.unsupported-lines",
      category: "gear",
      label: "Unsupported modifier lines",
      text: "unresolved",
      sourceKind: "engine",
    });
  }

  let warnings = result.context.readiness.warnings.map((warning) =>
    clip(warning),
  );
  for (const note of notes) warnings.push(note);
  if (warnings.length > EXPLANATION_LIMITS.maxWarnings) {
    const omitted = warnings.length - (EXPLANATION_LIMITS.maxWarnings - 1);
    warnings = [
      ...warnings.slice(0, EXPLANATION_LIMITS.maxWarnings - 1),
      `Additional warnings remain in the analysis result: ${omitted}.`,
    ];
  }

  const version = recommendation.dataVersion;
  return {
    schemaVersion: EXPLANATION_SCHEMA_VERSION,
    source: "passive-analysis",
    objective: recommendation.profileId,
    readiness: combinedReadiness(result),
    facts,
    warnings,
    provenance: {
      labels: [
        `scoring profile ${recommendation.profileId} v${recommendation.profileVersion}`,
        `tree version ${version.version ?? "unknown"}`,
        `gear normalization ${result.gear.gearNormalizationVersion}`,
        `character context ${result.context.characterContextVersion}`,
      ],
    },
  };
}

function combinedReadiness(
  result: AnalysisSuccess,
): ExplanationInput["readiness"] {
  const context = result.context.readiness.status;
  const gear = result.gear.readiness.status;
  if (context === "insufficient" || gear === "insufficient") return "blocked";
  if (context === "partial" || gear === "partial") return "partial";
  if (result.context.primarySkill.status !== "resolved") return "unresolved";
  return "ready";
}

export function attachAnalysisExplanation<T extends AnalysisResult>(
  result: T,
  mode: ExplainerMode,
  explain: (
    input: ExplanationInput,
  ) => ExplanationDocument = renderDeterministicExplanation,
): T & { explanation: AnalysisExplanation } {
  if (!result.ok || mode === "disabled") {
    return { ...result, explanation: { status: "disabled" } };
  }
  try {
    return {
      ...result,
      explanation: {
        status: "ready",
        document: explain(explanationInputFromAnalysis(result)),
      },
    };
  } catch {
    return {
      ...result,
      explanation: { status: "error", message: EXPLANATION_ERROR },
    };
  }
}
