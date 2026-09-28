import type { EconomySnapshot } from "@poe2-helper/domain";
import {
  evaluateItemReplacement,
  itemReplacementRejection,
  itemTextChecksum,
  type ItemDeltaResult,
} from "@poe2-helper/pob2-calculator";
import {
  decodePob2Export,
  getPinnedPassiveTreeSnapshot,
  importPob2Build,
  pob2AscendancyNodeIds,
} from "@poe2-helper/data-sources";
import {
  compareUpgradeCandidates,
  isPriceCurrency,
  isRankableMetric,
  type BudgetAwareComparison,
  type CandidateMeasurement,
  type DisplayMetricDelta,
  type PriceCurrency,
  type UpgradeCandidateInput,
} from "@poe2-helper/upgrade-engine";
import { defaultSnapshotDirectory } from "./analyze-passive-build";
import { serverPoeNinjaClient } from "./economy-route";
import { openCalculator } from "./pob2-session";

export type UpgradeCandidateRequest = {
  id: string;
  slot: string;
  rawItemText: string;
  label: string;
  priceAmount: number | null;
  priceCurrency: string | null;
};

export type UpgradeRequest = {
  pob2Code: string;
  selectedMetric: string;
  budgetAmount: number;
  budgetCurrency: string;
  useEconomy: boolean;
  leagueId: string;
  candidates: readonly UpgradeCandidateRequest[];
};

export type UpgradeComparisonRow = {
  id: string;
  label: string;
  slot: string;
  checksum: string;
  price: string;
  priceSource: string;
  budgetStatus: string;
  before: string;
  after: string;
  gain: string;
  efficiency: string;
  otherDeltas: string;
  calculatorNote: string;
  warnings: readonly string[];
};

export type UpgradeComparisonView = {
  status: "ready" | "partial" | "insufficient" | "error";
  message: string;
  headline: string | null;
  budgetText: string;
  metricLabel: string;
  comparisonCurrency: string;
  economyNote: string | null;
  warnings: readonly string[];
  rows: readonly UpgradeComparisonRow[];
};

type ItemEvaluator = (item: {
  slot: string;
  rawItemText: string;
  label?: string;
}) => Promise<
  | { ok: true; result: ItemDeltaResult }
  | { ok: false; error: { code: string; message: string } }
>;

type DivineRate = {
  chaosPerDivine: number;
  fetchedAt: string;
  leagueId: string;
  source: "poe.ninja" | "fixture";
};

const BUDGET_STATUS_LABEL = {
  "within-budget": "Within budget",
  "over-budget": "Over budget",
  "price-unavailable": "Price unavailable",
} as const;

export function chaosPerDivine(snapshot: EconomySnapshot): number | null {
  const reference = snapshot.referenceCurrency?.trim().toLowerCase() ?? "";
  if (reference === "chaos" || reference === "chaos orb") {
    const divine = snapshot.lines.find(
      (line) => line.id === "divine" || line.name === "Divine Orb",
    );
    if (!divine || divine.primaryValue <= 0) return null;
    return divine.primaryValue;
  }
  if (reference === "divine" || reference === "divine orb") {
    const chaos = snapshot.lines.find(
      (line) => line.id === "chaos" || line.name === "Chaos Orb",
    );
    if (!chaos || chaos.primaryValue <= 0) return null;
    return 1 / chaos.primaryValue;
  }
  return null;
}

export async function compareSuppliedUpgrades(
  input: UpgradeRequest,
  deps?: {
    evaluate?: ItemEvaluator;
    loadDivineRate?: (leagueId: string) => Promise<DivineRate | null>;
  },
): Promise<UpgradeComparisonView> {
  if (!isRankableMetric(input.selectedMetric)) {
    return errorView("Choose one supported ranking metric.");
  }
  if (!isPriceCurrency(input.budgetCurrency)) {
    return errorView("Choose chaos or divine for the budget.");
  }
  if (input.candidates.length < 2) {
    return errorView("Add at least two explicit items.");
  }

  const prepared = await measureCandidates(input, deps?.evaluate);
  if (!prepared.ok) return errorView(prepared.message);

  const currencies = new Set<PriceCurrency>([input.budgetCurrency]);
  for (const candidate of prepared.candidates) {
    if (candidate.price) currencies.add(candidate.price.currency);
  }
  let normalization = null;
  if (currencies.size > 1 && input.useEconomy) {
    const loader = deps?.loadDivineRate ?? loadLiveDivineRate;
    const rate = await loader(input.leagueId);
    if (rate) {
      normalization = {
        comparisonCurrency: "chaos" as const,
        rates: [
          { currency: "divine" as const, chaosPerUnit: rate.chaosPerDivine },
        ],
        source: rate.source,
        fetchedAt: rate.fetchedAt,
        leagueId: rate.leagueId,
      };
    }
  }

  const compared = compareUpgradeCandidates({
    selectedMetric: input.selectedMetric,
    budget: { amount: input.budgetAmount, currency: input.budgetCurrency },
    normalization,
    candidates: prepared.candidates,
  });
  if (!compared.ok) return errorView(compared.message);
  return presentComparison(compared.result);
}

async function measureCandidates(
  input: UpgradeRequest,
  evaluate: ItemEvaluator | undefined,
): Promise<
  | { ok: true; candidates: UpgradeCandidateInput[] }
  | { ok: false; message: string }
> {
  let evaluator: ItemEvaluator;
  if (evaluate) {
    evaluator = evaluate;
  } else {
    const created = await defaultEvaluator(input.pob2Code);
    if (!created.ok) return created;
    evaluator = created.evaluate;
  }
  const candidates: UpgradeCandidateInput[] = [];
  for (const candidate of input.candidates) {
    const rejection = itemReplacementRejection({
      slot: candidate.slot,
      rawItemText: candidate.rawItemText,
    });
    const price = priceInput(candidate);
    if (rejection) {
      candidates.push({
        id: candidate.id,
        slot: candidate.slot,
        label: candidate.label.trim() || null,
        rawChecksum: itemTextChecksum(candidate.rawItemText),
        price,
        measurement: {
          ok: false,
          code: rejection,
          message:
            rejection === "item-slot-unsupported"
              ? "That equipment slot is not supported."
              : "The item text was not accepted.",
        },
      });
      continue;
    }
    let measurement: CandidateMeasurement;
    try {
      const outcome = await evaluator({
        slot: candidate.slot,
        rawItemText: candidate.rawItemText,
        ...(candidate.label.trim() ? { label: candidate.label.trim() } : {}),
      });
      measurement = outcome.ok
        ? measurementFromResult(outcome.result)
        : {
            ok: false,
            code: outcome.error.code,
            message: outcome.error.message,
          };
    } catch (error) {
      console.error(
        `pob2-calculator calculation-failed ${error instanceof Error ? error.name : "error"}`,
      );
      measurement = {
        ok: false,
        code: "calculation-failed",
        message: "Character-aware calculation unavailable for this candidate.",
      };
    }
    candidates.push({
      id: candidate.id,
      slot: candidate.slot,
      label: candidate.label.trim() || null,
      rawChecksum: itemTextChecksum(candidate.rawItemText),
      price,
      measurement,
    });
  }
  return { ok: true, candidates };
}

function priceInput(
  candidate: UpgradeCandidateRequest,
): UpgradeCandidateInput["price"] {
  if (candidate.priceAmount === null || candidate.priceCurrency === null) {
    return null;
  }
  if (!isPriceCurrency(candidate.priceCurrency)) return null;
  return {
    amount: candidate.priceAmount,
    currency: candidate.priceCurrency,
    source: "user-entered",
  };
}

async function defaultEvaluator(
  pob2Code: string,
): Promise<
  { ok: true; evaluate: ItemEvaluator } | { ok: false; message: string }
> {
  const opened = openCalculator();
  if (!opened.ok) {
    return {
      ok: true,
      evaluate: () => Promise.resolve({ ok: false, error: opened.error }),
    };
  }
  let xml: string;
  let buildChecksum: string;
  try {
    const decoded = decodePob2Export(pob2Code);
    xml = decoded.xml;
    buildChecksum = decoded.checksum;
  } catch {
    return { ok: false, message: "The PoB2 code could not be read." };
  }
  const snapshot = getPinnedPassiveTreeSnapshot({
    snapshotDirectory: defaultSnapshotDirectory(),
    logger: () => undefined,
  });
  const imported = importPob2Build(pob2Code, {
    nodeIds: new Set(snapshot.nodes.map((node) => node.id)),
    ascendancyNodeIds: pob2AscendancyNodeIds(snapshot.nodes),
    source: snapshot.version.source,
    version: snapshot.version.version,
    commit: snapshot.version.commit,
    checksum: snapshot.version.checksum,
  });
  if (
    !imported.ok ||
    !imported.document.treeVersion ||
    !snapshot.version.version
  ) {
    return { ok: false, message: "This PoB2 build is not on the pinned tree." };
  }
  const { manifest, worker } = opened;
  return {
    ok: true,
    evaluate: (item) =>
      evaluateItemReplacement({
        xml,
        buildChecksum,
        pobTreeKey: imported.document.treeVersion ?? "",
        gggVersion: snapshot.version.version ?? "",
        pobVersion: manifest.pobVersion,
        buddyTreeCommit: snapshot.version.commit ?? null,
        buddyTreeChecksum: snapshot.version.checksum ?? null,
        runtimeChecksum: manifest.runtimeChecksum,
        runtimeFingerprint: manifest.runtimeFingerprint,
        item,
        transport: worker,
      }),
  };
}

function measurementFromResult(result: ItemDeltaResult): CandidateMeasurement {
  return {
    ok: true,
    metrics: result.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      unit: metric.unit,
      category: metric.category,
      before: metric.before,
      after: metric.after,
      absoluteDelta: metric.absoluteDelta,
      percentDelta: metric.percentDelta,
    })),
    provenance: {
      pobVersion: result.provenance.pobVersion,
      pobTreeKey: result.provenance.pobTreeKey,
      buddyTreeVersion: result.provenance.buddyTreeVersion,
      adapterVersion: result.provenance.adapterVersion,
      protocolVersion: result.provenance.protocolVersion,
      buildChecksum: result.provenance.buildChecksum,
      runtimeFingerprint: result.provenance.runtimeFingerprint,
      skillEffectId: result.skill.effectId,
    },
  };
}

async function loadLiveDivineRate(
  leagueId: string,
): Promise<DivineRate | null> {
  const contact = process.env.POE2_NINJA_CONTACT?.trim() ?? "";
  const league = leagueId.trim();
  if (contact.length === 0 || league.length === 0) return null;
  try {
    const snapshot = await serverPoeNinjaClient(contact).getExchangeOverview(
      league,
      "Currency",
    );
    const chaosPerDivineRate = chaosPerDivine(snapshot);
    if (chaosPerDivineRate === null) return null;
    return {
      chaosPerDivine: chaosPerDivineRate,
      fetchedAt: snapshot.fetchedAt,
      leagueId: snapshot.leagueId,
      source: "poe.ninja",
    };
  } catch (error) {
    console.error(
      `economy conversion unavailable ${error instanceof Error ? error.name : "error"}`,
    );
    return null;
  }
}

function presentComparison(
  result: BudgetAwareComparison,
): UpgradeComparisonView {
  const byId = new Map(
    result.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const rows = result.ordering.flatMap((id) => {
    const candidate = byId.get(id);
    return candidate ? [rowFor(candidate)] : [];
  });
  const headline = result.summaryLines.join(" ");
  const budgetText = `${trimNumber(result.budget.amount)} ${result.budget.currency}`;
  const economyNote = economySentence(result);
  const message = result.warnings.includes("comparison-invalid")
    ? "These measurements do not share one baseline, so they are not ranked together."
    : "This budget is the most you would pay for one item. It is not a combined shopping list.";
  return {
    status: result.readiness,
    message,
    headline,
    budgetText,
    metricLabel: result.selectedMetricLabel,
    comparisonCurrency: result.comparisonCurrency,
    economyNote,
    warnings: result.warnings.filter(
      (warning) => warning !== "comparison-invalid",
    ),
    rows,
  };
}

function rowFor(candidate: BudgetAwareCandidateResult): UpgradeComparisonRow {
  const selected = candidate.selectedMetricDelta;
  const measurement = candidate.measurement;
  return {
    id: candidate.id,
    label: displayName(candidate),
    slot: candidate.slot,
    checksum: candidate.rawChecksum,
    price: priceText(candidate),
    priceSource: candidate.price.sourceLabel,
    budgetStatus: BUDGET_STATUS_LABEL[candidate.budgetStatus],
    before: selected ? trimNumber(selected.before) : "unavailable",
    after: selected ? trimNumber(selected.after) : "unavailable",
    gain:
      selected?.percentDelta === null || selected?.percentDelta === undefined
        ? "unavailable"
        : signedPercent(selected.percentDelta),
    efficiency:
      candidate.efficiency.kind === "value"
        ? `${trimNumber(candidate.efficiency.perTen)}% per 10 ${candidate.price.normalizedCurrency ?? ""}`.trim()
        : "not applicable",
    otherDeltas: otherDeltaText(candidate),
    calculatorNote: measurement.ok
      ? `PoB2 ${measurement.provenance.pobVersion} · tree ${measurement.provenance.pobTreeKey} · ${measurement.provenance.runtimeFingerprint}`
      : measurement.message,
    warnings: candidate.warnings,
  };
}

type BudgetAwareCandidateResult = BudgetAwareComparison["candidates"][number];

function otherDeltaText(candidate: BudgetAwareCandidateResult): string {
  if (!candidate.measurement.ok) return "Measured deltas unavailable.";
  const rows = candidate.displayMetricDeltas.filter(
    (row) => !row.isRankingMetric,
  );
  if (rows.length === 0) return "No other measured changes.";
  return rows.map(formatTradeoff).join("; ");
}

function formatTradeoff(row: DisplayMetricDelta): string {
  if (row.unit === "percent-points") {
    return `${row.label} ${row.direction}: ${formatMeasured(row.before)}% → ${formatMeasured(row.after)}% (${signedNumber(row.absoluteDelta)} percentage points)`;
  }
  if (row.percentDelta !== null) {
    return `${row.label} ${row.direction}: ${formatMeasured(row.before)} → ${formatMeasured(row.after)} (${signedPercent(row.percentDelta)})`;
  }
  return `${row.label} ${row.direction}: ${formatMeasured(row.before)} → ${formatMeasured(row.after)} (${signedNumber(row.absoluteDelta)})`;
}

function priceText(candidate: BudgetAwareCandidateResult): string {
  if (
    candidate.price.inputAmount === null ||
    candidate.price.inputCurrency === null
  ) {
    return "No price";
  }
  const entered = `${trimNumber(candidate.price.inputAmount)} ${candidate.price.inputCurrency}`;
  if (
    candidate.price.normalizedAmount !== null &&
    candidate.price.normalizedCurrency !== null &&
    candidate.price.normalizedCurrency !== candidate.price.inputCurrency
  ) {
    return `${entered} (${trimNumber(candidate.price.normalizedAmount)} ${candidate.price.normalizedCurrency})`;
  }
  return entered;
}

function economySentence(result: BudgetAwareComparison): string | null {
  const snapshot = result.economySnapshot;
  if (!snapshot || snapshot.source === "identity") return null;
  const divine = snapshot.rates.find((rate) => rate.currency === "divine");
  if (!divine) return null;
  const when = snapshot.fetchedAt ? ` at ${snapshot.fetchedAt}` : "";
  const league = snapshot.leagueId ? ` league ${snapshot.leagueId}` : "";
  return `Currency conversion from ${snapshot.source}: 1 divine = ${trimNumber(divine.chaosPerUnit)} chaos${league}${when}. The entered price is separate from this conversion.`;
}

function displayName(candidate: { label: string | null; id: string }): string {
  return candidate.label && candidate.label.trim().length > 0
    ? candidate.label.trim()
    : candidate.id;
}

function signedPercent(value: number): string {
  return `${signedNumber(value)}%`;
}

function signedNumber(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMeasured(value)}`;
}

function formatMeasured(value: number): string {
  if (value === 0) return "0";
  const rounded = Math.round(value * 10000) / 10000;
  if (rounded === 0) return String(value);
  return String(rounded);
}

function trimNumber(value: number): string {
  return formatMeasured(value);
}

function errorView(message: string): UpgradeComparisonView {
  return {
    status: "error",
    message,
    headline: null,
    budgetText: "",
    metricLabel: "",
    comparisonCurrency: "",
    economyNote: null,
    warnings: [],
    rows: [],
  };
}
