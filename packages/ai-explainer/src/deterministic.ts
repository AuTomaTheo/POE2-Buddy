import type { ExplainerProvider } from "./provider.js";
import type { ExplanationFact, ExplanationInput } from "./schema.js";
import {
  explanationDocumentSchema,
  parseExplanationInput,
  type ExplanationDocument,
  type ExplanationSectionId,
} from "./schema.js";
import { quoteUntrustedText } from "./sanitize.js";
import {
  DETERMINISTIC_PROVIDER_ID,
  DETERMINISTIC_PROVIDER_KIND,
  EXPLAINER_INTERFACE_VERSION,
  EXPLANATION_SCHEMA_VERSION,
} from "./version.js";

const SECTION_ORDER: readonly ExplanationSectionId[] = [
  "summary",
  "passive-path",
  "build-context",
  "measured-impact",
  "upgrade-comparison",
  "craft-target",
  "limitations",
  "provenance",
];

const SECTION_HEADING: Record<ExplanationSectionId, string> = {
  summary: "Summary",
  "passive-path": "Passive path",
  "build-context": "Build context",
  "measured-impact": "Measured impact",
  "upgrade-comparison": "Upgrade comparison",
  "craft-target": "Craft target",
  limitations: "Limitations",
  provenance: "Provenance",
};

type Bucket = {
  paragraphs: string[];
  ids: string[];
};

function shown(fact: ExplanationFact): string {
  const raw =
    fact.value === undefined
      ? (fact.text ?? "")
      : typeof fact.value === "number"
        ? String(fact.value)
        : fact.value;
  const withUnit =
    fact.unit && fact.value !== undefined ? `${raw}${fact.unit}` : raw;
  if (fact.sourceKind === "user-label") return quoteUntrustedText(withUnit);
  return withUnit;
}

function claimSentence(code: string): string {
  switch (code) {
    case "no-candidates":
      return "No paths were found for this point budget.";
    case "no-complete-candidate":
      return "No fully valued path was found. The paths described here have a known heuristic score, and their full value is unknown.";
    case "not-definitive-incomplete-valuation":
      return "Fully valued paths are listed first. A higher known score on an incomplete path is not a definitive win.";
    case "highest-scoring-complete-path-found-within-search-limits":
      return "This is the highest heuristic score among fully valued paths found within search limits. This is not a global optimum.";
    case "highest-scoring-complete-path-among-enumerated-candidates":
      return "This is the highest heuristic score among the enumerated fully valued candidates.";
    default:
      return `Selection claim: ${code}.`;
  }
}

function isHighestClaim(code: string | undefined): boolean {
  return (
    code === "highest-scoring-complete-path-found-within-search-limits" ||
    code === "highest-scoring-complete-path-among-enumerated-candidates"
  );
}

function field(fact: ExplanationFact): string {
  return String(fact.text ?? fact.value ?? "");
}

export function renderDeterministicExplanation(
  value: unknown,
): ExplanationDocument {
  const input = parseExplanationInput(value);
  const buckets = new Map<ExplanationSectionId, Bucket>();
  const take = (id: ExplanationSectionId): Bucket => {
    const existing = buckets.get(id);
    if (existing) return existing;
    const created: Bucket = { paragraphs: [], ids: [] };
    buckets.set(id, created);
    return created;
  };
  const used = new Set<string>();
  const say = (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => {
    take(id).paragraphs.push(paragraph);
    take(id).ids.push(fact.id);
    used.add(fact.id);
  };

  const summary = take("summary");
  summary.paragraphs.push(summarySentence(input));

  renderPassive(input, say, used);
  renderContext(input, say);
  renderGear(input, say);
  renderMeasured(input, say);
  renderUpgrade(input, say);
  renderCraft(input, say);
  renderLimitations(input, take, say);
  renderProvenance(input, say, take);
  renderRemaining(input, say, used);

  const sections = SECTION_ORDER.flatMap((id) => {
    const bucket = buckets.get(id);
    if (!bucket || bucket.paragraphs.length === 0) return [];
    return [
      {
        id,
        heading: SECTION_HEADING[id],
        paragraphs: bucket.paragraphs,
      },
    ];
  });

  const document: ExplanationDocument = {
    schemaVersion: EXPLANATION_SCHEMA_VERSION,
    provider: {
      providerId: DETERMINISTIC_PROVIDER_ID,
      providerKind: DETERMINISTIC_PROVIDER_KIND,
      networkRequired: false,
      configured: true,
      interfaceVersion: EXPLAINER_INTERFACE_VERSION,
    },
    sections,
    warnings: [...input.warnings],
    usedFactIds: input.facts
      .map((fact) => fact.id)
      .filter((id) => used.has(id)),
  };
  return explanationDocumentSchema.parse(document);
}

function summarySentence(input: ExplanationInput): string {
  switch (input.source) {
    case "upgrade-comparison":
      return "How this result was derived: the wording below repeats supplied upgrade facts.";
    case "craft-target":
      return "How this result was derived: the wording below repeats supplied craft-target facts.";
    case "mixed":
      return "How this result was derived: the wording below repeats supplied engine facts.";
    default:
      return "How this result was derived: the wording below repeats supplied passive-analysis facts.";
  }
}

function renderPassive(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
  used: Set<string>,
): void {
  const facts = input.facts.filter((fact) => fact.category === "passive");
  const claim = facts.find((fact) => fact.id === "passive.claim");
  const claimCode = claim ? field(claim) : undefined;
  if (claim) say("passive-path", claim, claimSentence(claimCode ?? ""));
  const score =
    facts.find((fact) => fact.id === "passive.score.total") ??
    facts.find((fact) => fact.id === "passive.path.0.heuristic-score");
  const measured = input.facts.some((fact) => fact.category === "calculator");
  if (score) {
    if (measured) {
      say(
        "passive-path",
        score,
        "The path ranked first under the heuristic objective.",
      );
    } else if (claimCode === undefined || isHighestClaim(claimCode)) {
      say(
        "passive-path",
        score,
        "This path has the highest heuristic score among the displayed candidates for the selected objective.",
      );
    }
    say("passive-path", score, `The heuristic score is ${shown(score)}.`);
    used.add(score.id);
  }
  for (const fact of facts) {
    if (fact.id === "passive.claim" || fact.id === score?.id) continue;
    if (/\.heuristic-score$/.test(fact.id)) {
      say(
        "passive-path",
        fact,
        `Another displayed candidate has heuristic score ${shown(fact)}.`,
      );
      continue;
    }
    if (fact.id === "passive.path.0.point-cost") {
      say("passive-path", fact, `Point cost: ${shown(fact)}.`);
      continue;
    }
    if (/\.point-cost$/.test(fact.id)) {
      say(
        "passive-path",
        fact,
        `Another displayed candidate has point cost ${shown(fact)}.`,
      );
      continue;
    }
    if (fact.id.endsWith(".node-count")) {
      say("passive-path", fact, `Node count: ${shown(fact)}.`);
      continue;
    }
    if (fact.id.endsWith(".nodes")) {
      say("passive-path", fact, `Node sequence: ${shown(fact)}.`);
      continue;
    }
    if (fact.id.includes(".contribution.")) {
      say("passive-path", fact, `${fact.label} contribution ${shown(fact)}.`);
      continue;
    }
    say("passive-path", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderContext(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const facts = input.facts.filter(
    (fact) => fact.category === "character-context",
  );
  const status = facts.find(
    (fact) => fact.id === "character.primary-skill.status",
  );
  const name = facts.find((fact) => fact.id === "character.primary-skill.name");
  if (status) {
    say(
      "build-context",
      status,
      name
        ? `Primary skill ${shown(name)} is ${shown(status)}.`
        : `Primary skill status: ${shown(status)}.`,
    );
  }
  if (name) say("build-context", name, `Primary skill label: ${shown(name)}.`);
  for (const fact of facts) {
    if (fact.id === status?.id || fact.id === name?.id) continue;
    say("build-context", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderGear(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const facts = input.facts.filter((fact) => fact.category === "gear");
  const anchor = facts[0];
  if (!anchor) return;
  say("build-context", anchor, "Parser coverage is not an item quality score.");
  for (const fact of facts) {
    say("build-context", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderMeasured(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const measured = input.facts.filter((fact) => fact.category === "calculator");
  if (measured.length === 0) return;
  const score = input.facts.find(
    (fact) =>
      fact.id === "passive.score.total" ||
      fact.id === "passive.path.0.heuristic-score",
  );
  if (score) {
    say(
      "measured-impact",
      measured[0] as ExplanationFact,
      "A separate PoB2 measurement reported the following build deltas.",
    );
  }
  for (const fact of measured) {
    if (fact.direction === "positive") {
      say(
        "measured-impact",
        fact,
        `PoB2 measured a positive ${fact.label} change for this candidate.`,
      );
    }
    say("measured-impact", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderUpgrade(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const facts = input.facts.filter((fact) => fact.category === "upgrade");
  const summary = facts.find((fact) => fact.id === "upgrade.summary");
  const summaryCode = summary ? field(summary) : "";
  if (summary && summaryCode === "no-positive-within-budget") {
    say(
      "upgrade-comparison",
      summary,
      "No supplied candidate provides a positive improvement within this budget.",
    );
  } else if (summary && summaryCode === "positive-within-budget") {
    const winner = facts.find((fact) => fact.id === "upgrade.winner");
    const metric = facts.find((fact) => fact.id === "upgrade.ranking.metric");
    if (winner && metric) {
      say(
        "upgrade-comparison",
        summary,
        `This item is first in the supplied-candidate ordering for ${shown(metric)} within the stated budget.`,
      );
      say("upgrade-comparison", winner, `Supplied winner: ${shown(winner)}.`);
      say("upgrade-comparison", metric, `Ranking metric: ${shown(metric)}.`);
    } else if (summary) {
      say(
        "upgrade-comparison",
        summary,
        "The comparison reports a positive result within the stated budget, and no winner id was supplied.",
      );
    }
  } else if (summary) {
    say("upgrade-comparison", summary, `Comparison state: ${shown(summary)}.`);
  }
  for (const fact of facts) {
    if (
      summaryCode === "no-positive-within-budget" &&
      fact.id === "upgrade.winner"
    ) {
      say("upgrade-comparison", fact, `Supplied candidate id: ${shown(fact)}.`);
      continue;
    }
    if (
      fact.id === "upgrade.summary" ||
      fact.id === "upgrade.winner" ||
      (summaryCode === "positive-within-budget" &&
        fact.id === "upgrade.ranking.metric")
    ) {
      continue;
    }
    if (field(fact) === "user-entered") {
      say(
        "upgrade-comparison",
        fact,
        `${fact.label}: the price is user-entered.`,
      );
      continue;
    }
    if (field(fact) === "normalized") {
      say(
        "upgrade-comparison",
        fact,
        `${fact.label}: the price is normalized / converted.`,
      );
      continue;
    }
    say("upgrade-comparison", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderCraft(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const facts = input.facts.filter((fact) => fact.category === "craft-target");
  const eligibility = facts.find(
    (fact) => fact.id === "craft.target.eligibility",
  );
  if (eligibility && field(eligibility) === "eligible") {
    say(
      "craft-target",
      eligibility,
      "This modifier is in the validated source pool for this selected base and item level.",
    );
  } else if (eligibility) {
    say(
      "craft-target",
      eligibility,
      `Craft target state: ${shown(eligibility)}.`,
    );
  }
  const provenance = facts.find(
    (fact) => fact.id === "craft.probability.provenance",
  );
  const patch = facts.find((fact) => fact.id === "craft.probability.patch");
  const chance = facts.find((fact) => fact.id === "craft.probability.value");
  if (provenance && field(provenance) === "community-derived") {
    const patchText = patch ? ` for patch ${shown(patch)}` : "";
    say(
      "craft-target",
      provenance,
      `This chance is community-derived${patchText}.`,
    );
    if (patch) say("craft-target", patch, `Weight patch: ${shown(patch)}.`);
    if (chance) {
      say("craft-target", chance, `Supplied chance: ${shown(chance)}.`);
    }
  }
  for (const fact of facts) {
    if (
      fact.id === "craft.target.eligibility" ||
      fact.id === "craft.probability.provenance" ||
      fact.id === "craft.probability.patch" ||
      fact.id === "craft.probability.value"
    ) {
      continue;
    }
    say("craft-target", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderLimitations(
  input: ExplanationInput,
  take: (id: ExplanationSectionId) => Bucket,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
): void {
  const bucket = take("limitations");
  if (input.readiness !== "ready") {
    bucket.paragraphs.push(`Readiness is ${input.readiness}.`);
  }
  for (const fact of input.facts) {
    if (fact.category !== "warning") continue;
    say("limitations", fact, `${fact.label}: ${shown(fact)}.`);
  }
  for (const warning of input.warnings) {
    bucket.paragraphs.push(warning);
  }
}

function renderProvenance(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
  take: (id: ExplanationSectionId) => Bucket,
): void {
  const bucket = take("provenance");
  for (const label of input.provenance.labels) {
    bucket.paragraphs.push(label);
  }
  for (const fact of input.facts) {
    if (fact.category !== "provenance") continue;
    say("provenance", fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function renderRemaining(
  input: ExplanationInput,
  say: (
    id: ExplanationSectionId,
    fact: ExplanationFact,
    paragraph: string,
  ) => void,
  used: Set<string>,
): void {
  for (const fact of input.facts) {
    if (used.has(fact.id)) continue;
    const section = sectionFor(fact.category);
    say(section, fact, `${fact.label}: ${shown(fact)}.`);
  }
}

function sectionFor(
  category: ExplanationFact["category"],
): ExplanationSectionId {
  switch (category) {
    case "passive":
      return "passive-path";
    case "character-context":
      return "build-context";
    case "calculator":
      return "measured-impact";
    case "gear":
      return "build-context";
    case "upgrade":
      return "upgrade-comparison";
    case "craft-target":
      return "craft-target";
    case "warning":
      return "limitations";
    default:
      return "provenance";
  }
}

export const deterministicExplainer: ExplainerProvider = {
  id: DETERMINISTIC_PROVIDER_ID,
  capability: {
    providerId: DETERMINISTIC_PROVIDER_ID,
    providerKind: DETERMINISTIC_PROVIDER_KIND,
    networkRequired: false,
    configured: true,
  },
  explain(input: unknown) {
    return Promise.resolve(renderDeterministicExplanation(input));
  },
};
