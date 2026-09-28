import { z } from "zod";
import {
  MAX_UPGRADE_CANDIDATES,
  RANKABLE_METRIC_LABELS,
  UPGRADE_ENGINE_VERSION,
  VISIBLE_METRIC_DISPLAY,
  isPriceCurrency,
  isRankableMetric,
  type MeasuredMetricCategory,
  type MeasuredMetricUnit,
  type PriceCurrency,
  type RankableMetricId,
} from "./policy.js";

export type MeasuredMetric = {
  id: string;
  before: number;
  after: number;
  absoluteDelta: number;
  percentDelta: number | null;
  label?: string;
  unit?: MeasuredMetricUnit;
  category?: MeasuredMetricCategory;
};

export type CalculatorProvenanceInput = {
  pobVersion: string;
  pobTreeKey: string;
  buddyTreeVersion: string;
  adapterVersion: number;
  protocolVersion: number;
  buildChecksum: string;
  runtimeFingerprint: string;
  skillEffectId: string | null;
};

export type CandidateMeasurement =
  | {
      ok: true;
      metrics: readonly MeasuredMetric[];
      provenance: CalculatorProvenanceInput;
    }
  | { ok: false; code: string; message: string };

export type CandidatePriceInput = {
  amount: number;
  currency: PriceCurrency;
  source: "user-entered" | "fixture";
};

export type UpgradeCandidateInput = {
  id: string;
  slot: string;
  label: string | null;
  rawChecksum: string;
  price: CandidatePriceInput | null;
  measurement: CandidateMeasurement;
};

/**
 * Rates are chaos per one unit of the named currency.
 * `1 divine = chaosPerUnit chaos`. Chaos itself is 1 and is not inverted.
 */
export type CurrencyRate = {
  currency: PriceCurrency;
  chaosPerUnit: number;
};

export type PriceNormalizationContext = {
  comparisonCurrency: "chaos";
  rates: readonly CurrencyRate[];
  source: "poe.ninja" | "fixture";
  fetchedAt: string | null;
  leagueId: string | null;
};

export type UpgradeComparisonInput = {
  selectedMetric: string;
  budget: { amount: number; currency: string };
  candidates: readonly UpgradeCandidateInput[];
  normalization: PriceNormalizationContext | null;
};

export type PriceConfidence =
  "exact-input" | "normalized" | "estimated" | "unavailable";

export type PriceProvenance = {
  source: "user-entered" | "fixture" | null;
  inputAmount: number | null;
  inputCurrency: PriceCurrency | null;
  normalizedAmount: number | null;
  normalizedCurrency: PriceCurrency | null;
  conversionRate: number | null;
  confidence: PriceConfidence;
  sourceLabel: string;
};

export type EfficiencyResult =
  | { kind: "value"; perUnit: number; perTen: number }
  | { kind: "not-applicable" };

export type DisplayMetricDirection = "improved" | "decreased" | "unchanged";

export type DisplayMetricDelta = {
  metricId: string;
  label: string;
  before: number;
  after: number;
  absoluteDelta: number;
  percentDelta: number | null;
  unit: MeasuredMetricUnit;
  category: MeasuredMetricCategory;
  isRankingMetric: boolean;
  direction: DisplayMetricDirection;
};

export type ComparisonSummaryState =
  | "positive-within-budget"
  | "no-positive-within-budget"
  | "no-rankable-candidates";

export type BudgetAwareCandidateResult = {
  id: string;
  slot: string;
  label: string | null;
  rawChecksum: string;
  price: PriceProvenance;
  measurement: CandidateMeasurement;
  selectedMetricId: RankableMetricId | null;
  selectedMetricDelta: MeasuredMetric | null;
  displayMetricDeltas: readonly DisplayMetricDelta[];
  efficiency: EfficiencyResult;
  budgetStatus: "within-budget" | "over-budget" | "price-unavailable";
  rankability: "rankable" | "not-rankable";
  warnings: readonly string[];
};

export type BudgetAwareComparison = {
  upgradeEngineVersion: typeof UPGRADE_ENGINE_VERSION;
  selectedMetric: RankableMetricId;
  selectedMetricLabel: string;
  budget: { amount: number; currency: PriceCurrency };
  comparisonCurrency: PriceCurrency;
  economyReadiness: "ready" | "partial" | "unavailable";
  economySnapshot: {
    source: "identity" | "poe.ninja" | "fixture";
    fetchedAt: string | null;
    leagueId: string | null;
    rates: readonly CurrencyRate[];
  } | null;
  candidates: readonly BudgetAwareCandidateResult[];
  ordering: readonly string[];
  readiness: "ready" | "partial" | "insufficient";
  warnings: readonly string[];
  summaryState: ComparisonSummaryState;
  winnerCandidateId: string | null;
  rankedCandidateCount: number;
  positiveWithinBudgetCount: number;
  summaryLines: readonly string[];
};

const displayMetricDeltaSchema = z.object({
  metricId: z.string(),
  label: z.string(),
  before: z.number(),
  after: z.number(),
  absoluteDelta: z.number(),
  percentDelta: z.number().nullable(),
  unit: z.enum(["number", "percent-points"]),
  category: z.enum(["offense", "defense", "resource", "resistance"]),
  isRankingMetric: z.boolean(),
  direction: z.enum(["improved", "decreased", "unchanged"]),
});

export const upgradeComparisonResultSchema = z
  .object({
    upgradeEngineVersion: z.literal(UPGRADE_ENGINE_VERSION),
    summaryState: z.enum([
      "positive-within-budget",
      "no-positive-within-budget",
      "no-rankable-candidates",
    ]),
    winnerCandidateId: z.string().nullable(),
    rankedCandidateCount: z.number().int().nonnegative(),
    positiveWithinBudgetCount: z.number().int().nonnegative(),
    candidates: z.array(
      z
        .object({
          displayMetricDeltas: z.array(displayMetricDeltaSchema),
        })
        .passthrough(),
    ),
  })
  .passthrough();

export type UpgradeComparisonOutcome =
  | { ok: true; result: BudgetAwareComparison }
  | { ok: false; code: "comparison-invalid"; message: string };

type NormalizedAmount = {
  amount: number;
  confidence: PriceConfidence;
  conversionRate: number | null;
};

export function compareUpgradeCandidates(
  input: UpgradeComparisonInput,
): UpgradeComparisonOutcome {
  if (!isRankableMetric(input.selectedMetric)) {
    return invalid("Choose one of the supported ranking metrics.");
  }
  if (!isPriceCurrency(input.budget.currency)) {
    return invalid("Choose chaos or divine for the budget.");
  }
  if (!Number.isFinite(input.budget.amount) || input.budget.amount < 0) {
    return invalid("Budget amount must be zero or greater.");
  }
  if (
    input.candidates.length === 0 ||
    input.candidates.length > MAX_UPGRADE_CANDIDATES
  ) {
    return invalid(
      `Compare between 1 and ${MAX_UPGRADE_CANDIDATES} explicit items.`,
    );
  }
  const ids = new Set<string>();
  for (const candidate of input.candidates) {
    if (candidate.id.trim().length === 0 || ids.has(candidate.id)) {
      return invalid("Each candidate needs a unique id.");
    }
    ids.add(candidate.id);
  }

  const selectedMetric = input.selectedMetric;
  const budgetCurrency = input.budget.currency;
  const successful = input.candidates.flatMap((candidate) =>
    candidate.measurement.ok ? [candidate.measurement.provenance] : [],
  );
  if (!sameBaseline(successful)) {
    const unranked = input.candidates.map((candidate) =>
      describeCandidate(candidate, selectedMetric, null, null, [
        "comparison-invalid",
      ]),
    );
    return finish({
      upgradeEngineVersion: UPGRADE_ENGINE_VERSION,
      selectedMetric,
      selectedMetricLabel: RANKABLE_METRIC_LABELS[selectedMetric],
      budget: { amount: input.budget.amount, currency: budgetCurrency },
      comparisonCurrency: budgetCurrency,
      economyReadiness: "unavailable",
      economySnapshot: null,
      candidates: unranked,
      ordering: unranked.map((candidate) => candidate.id),
      readiness: "insufficient",
      warnings: ["comparison-invalid"],
    });
  }

  const pricedCurrencies = new Set<PriceCurrency>([budgetCurrency]);
  for (const candidate of input.candidates) {
    const price = candidate.price;
    if (
      price &&
      validPriceAmount(price.amount) &&
      isPriceCurrency(price.currency)
    ) {
      pricedCurrencies.add(price.currency);
    }
  }
  const conversion = resolveConversion(
    budgetCurrency,
    pricedCurrencies,
    input.normalization,
  );
  const budgetNormalized = convertAmount(
    input.budget.amount,
    budgetCurrency,
    conversion,
  );

  const described = input.candidates.map((candidate) =>
    describeCandidate(
      candidate,
      selectedMetric,
      conversion,
      budgetNormalized,
      [],
    ),
  );
  const ordering = [...described].sort(compareCandidates);
  const rankableCount = described.filter(
    (candidate) => candidate.rankability === "rankable",
  ).length;
  const warnings: string[] = [];
  if (new Set(input.candidates.map((candidate) => candidate.slot)).size > 1) {
    warnings.push(
      "These are one-at-a-time replacement effects, not combined effects.",
    );
  }
  if (conversion.droppedCrossCurrency) {
    warnings.push("Cross-currency budget comparison is unavailable.");
  }

  return finish({
    upgradeEngineVersion: UPGRADE_ENGINE_VERSION,
    selectedMetric,
    selectedMetricLabel: RANKABLE_METRIC_LABELS[selectedMetric],
    budget: { amount: input.budget.amount, currency: budgetCurrency },
    comparisonCurrency: conversion.comparisonCurrency,
    economyReadiness: conversion.economyReadiness,
    economySnapshot: conversion.snapshot,
    candidates: described,
    ordering: ordering.map((candidate) => candidate.id),
    readiness:
      rankableCount >= 2
        ? described.every((candidate) => candidate.rankability === "rankable")
          ? "ready"
          : "partial"
        : rankableCount === 1
          ? "partial"
          : "insufficient",
    warnings,
  });
}

function finish(
  body: Omit<
    BudgetAwareComparison,
    | "summaryState"
    | "winnerCandidateId"
    | "rankedCandidateCount"
    | "positiveWithinBudgetCount"
    | "summaryLines"
  >,
): UpgradeComparisonOutcome {
  const result: BudgetAwareComparison = { ...body, ...buildSummary(body) };
  upgradeComparisonResultSchema.parse(result);
  return { ok: true, result };
}

type ConversionPlan = {
  comparisonCurrency: PriceCurrency;
  economyReadiness: "ready" | "partial" | "unavailable";
  snapshot: BudgetAwareComparison["economySnapshot"];
  droppedCrossCurrency: boolean;
  rateFor(currency: PriceCurrency): number | null;
};

function resolveConversion(
  budgetCurrency: PriceCurrency,
  used: ReadonlySet<PriceCurrency>,
  normalization: PriceNormalizationContext | null,
): ConversionPlan {
  const multiple = used.size > 1;
  if (!multiple) {
    return {
      comparisonCurrency: budgetCurrency,
      economyReadiness: "ready",
      snapshot: {
        source: "identity",
        fetchedAt: null,
        leagueId: null,
        rates: [],
      },
      droppedCrossCurrency: false,
      rateFor(currency) {
        return currency === budgetCurrency ? 1 : null;
      },
    };
  }

  const divineRate = normalization?.rates.find(
    (rate) => rate.currency === "divine",
  );
  const chaosRate = normalization?.rates.find(
    (rate) => rate.currency === "chaos",
  );
  const divineReady =
    divineRate !== undefined &&
    Number.isFinite(divineRate.chaosPerUnit) &&
    divineRate.chaosPerUnit > 0;
  const chaosReady =
    chaosRate === undefined ||
    (Number.isFinite(chaosRate.chaosPerUnit) && chaosRate.chaosPerUnit === 1);
  if (
    normalization &&
    normalization.comparisonCurrency === "chaos" &&
    divineReady &&
    chaosReady
  ) {
    const rates: CurrencyRate[] = [
      { currency: "chaos", chaosPerUnit: 1 },
      { currency: "divine", chaosPerUnit: divineRate.chaosPerUnit },
    ];
    return {
      comparisonCurrency: "chaos",
      economyReadiness: "ready",
      snapshot: {
        source: normalization.source,
        fetchedAt: normalization.fetchedAt,
        leagueId: normalization.leagueId,
        rates,
      },
      droppedCrossCurrency: false,
      rateFor(currency) {
        if (currency === "chaos") return 1;
        if (currency === "divine") return divineRate.chaosPerUnit;
        return null;
      },
    };
  }

  return {
    comparisonCurrency: budgetCurrency,
    economyReadiness: "partial",
    snapshot: null,
    droppedCrossCurrency: true,
    rateFor(currency) {
      return currency === budgetCurrency ? 1 : null;
    },
  };
}

function convertAmount(
  amount: number,
  currency: PriceCurrency,
  conversion: ConversionPlan,
): NormalizedAmount | null {
  const rate = conversion.rateFor(currency);
  if (rate === null) return null;
  return {
    amount: amount * rate,
    confidence:
      rate === 1 && currency === conversion.comparisonCurrency
        ? "exact-input"
        : "normalized",
    conversionRate:
      currency === conversion.comparisonCurrency && rate === 1 ? null : rate,
  };
}

function describeCandidate(
  candidate: UpgradeCandidateInput,
  selectedMetric: RankableMetricId,
  conversion: ConversionPlan | null,
  budgetNormalized: NormalizedAmount | null,
  extraWarnings: readonly string[],
): BudgetAwareCandidateResult {
  const warnings = [...extraWarnings];
  const metric = selectedMetricOf(candidate, selectedMetric);
  const price = priceProvenance(candidate.price, conversion, warnings);
  let budgetStatus: BudgetAwareCandidateResult["budgetStatus"] =
    "price-unavailable";
  let efficiency: EfficiencyResult = { kind: "not-applicable" };
  if (
    price.normalizedAmount !== null &&
    price.normalizedCurrency !== null &&
    budgetNormalized
  ) {
    budgetStatus =
      price.normalizedAmount <= budgetNormalized.amount
        ? "within-budget"
        : "over-budget";
    if (price.normalizedAmount === 0) {
      warnings.push("A zero price is not used for cost efficiency.");
    } else if (price.normalizedAmount < 0) {
      budgetStatus = "price-unavailable";
    } else if (
      metric?.percentDelta !== null &&
      metric?.percentDelta !== undefined
    ) {
      const perUnit = metric.percentDelta / price.normalizedAmount;
      efficiency = { kind: "value", perUnit, perTen: perUnit * 10 };
    }
  }
  if (!candidate.measurement.ok) {
    warnings.push(candidate.measurement.message);
  } else if (!metric) {
    warnings.push("Selected metric is unavailable for this candidate.");
  } else if (metric.percentDelta === null) {
    warnings.push(
      "Selected metric has no percent change, so it is not ranked.",
    );
  }
  const rankable =
    extraWarnings.length === 0 &&
    candidate.measurement.ok &&
    metric?.percentDelta !== null &&
    metric?.percentDelta !== undefined &&
    efficiency.kind === "value" &&
    price.normalizedAmount !== null &&
    price.normalizedAmount > 0 &&
    budgetStatus !== "price-unavailable";
  return {
    id: candidate.id,
    slot: candidate.slot,
    label: candidate.label,
    rawChecksum: candidate.rawChecksum,
    price,
    measurement: candidate.measurement,
    selectedMetricId: metric ? selectedMetric : null,
    selectedMetricDelta: metric,
    displayMetricDeltas: displayMetricDeltas(candidate, selectedMetric),
    efficiency,
    budgetStatus,
    rankability: rankable ? "rankable" : "not-rankable",
    warnings,
  };
}

function priceProvenance(
  price: CandidatePriceInput | null,
  conversion: ConversionPlan | null,
  warnings: string[],
): PriceProvenance {
  if (!price) {
    return emptyPrice("No acquisition price was entered.");
  }
  if (!isPriceCurrency(price.currency)) {
    warnings.push("That price currency is not supported.");
    return emptyPrice("Unsupported price currency.");
  }
  if (!Number.isFinite(price.amount)) {
    warnings.push("Price must be a finite number.");
    return emptyPrice("Invalid price.");
  }
  if (price.amount < 0) {
    warnings.push("Negative price is not accepted.");
    return {
      source: price.source,
      inputAmount: price.amount,
      inputCurrency: price.currency,
      normalizedAmount: null,
      normalizedCurrency: null,
      conversionRate: null,
      confidence: "unavailable",
      sourceLabel: sourceLabel(price.source),
    };
  }
  if (!conversion) {
    return {
      source: price.source,
      inputAmount: price.amount,
      inputCurrency: price.currency,
      normalizedAmount: null,
      normalizedCurrency: null,
      conversionRate: null,
      confidence: "unavailable",
      sourceLabel: sourceLabel(price.source),
    };
  }
  const normalized = convertAmount(price.amount, price.currency, conversion);
  if (!normalized) {
    warnings.push(
      "This price could not be converted into the comparison currency.",
    );
    return {
      source: price.source,
      inputAmount: price.amount,
      inputCurrency: price.currency,
      normalizedAmount: null,
      normalizedCurrency: null,
      conversionRate: null,
      confidence: "unavailable",
      sourceLabel: sourceLabel(price.source),
    };
  }
  return {
    source: price.source,
    inputAmount: price.amount,
    inputCurrency: price.currency,
    normalizedAmount: normalized.amount,
    normalizedCurrency: conversion.comparisonCurrency,
    conversionRate: normalized.conversionRate,
    confidence: normalized.confidence,
    sourceLabel: sourceLabel(price.source),
  };
}

function emptyPrice(note: string): PriceProvenance {
  return {
    source: null,
    inputAmount: null,
    inputCurrency: null,
    normalizedAmount: null,
    normalizedCurrency: null,
    conversionRate: null,
    confidence: "unavailable",
    sourceLabel: note,
  };
}

function sourceLabel(source: "user-entered" | "fixture"): string {
  if (source === "user-entered") return "User-entered price";
  return "Fixture price";
}

function selectedMetricOf(
  candidate: UpgradeCandidateInput,
  selectedMetric: RankableMetricId,
): MeasuredMetric | null {
  if (!candidate.measurement.ok) return null;
  return (
    candidate.measurement.metrics.find(
      (metric) => metric.id === selectedMetric,
    ) ?? null
  );
}

function validPriceAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount >= 0;
}

function sameBaseline(rows: readonly CalculatorProvenanceInput[]): boolean {
  const first = rows[0];
  if (!first) return true;
  return rows.every(
    (row) =>
      row.buildChecksum === first.buildChecksum &&
      row.runtimeFingerprint === first.runtimeFingerprint &&
      row.pobVersion === first.pobVersion &&
      row.pobTreeKey === first.pobTreeKey &&
      row.buddyTreeVersion === first.buddyTreeVersion &&
      row.adapterVersion === first.adapterVersion &&
      row.protocolVersion === first.protocolVersion &&
      row.skillEffectId === first.skillEffectId,
  );
}

function compareCandidates(
  left: BudgetAwareCandidateResult,
  right: BudgetAwareCandidateResult,
): number {
  const groupDiff = groupOf(left) - groupOf(right);
  if (groupDiff !== 0) return groupDiff;
  if (efficiencySortValue(left) !== efficiencySortValue(right)) {
    return efficiencySortValue(right) - efficiencySortValue(left);
  }
  if (improvementSortValue(left) !== improvementSortValue(right)) {
    return improvementSortValue(right) - improvementSortValue(left);
  }
  if (priceSortValue(left) !== priceSortValue(right)) {
    return priceSortValue(left) - priceSortValue(right);
  }
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function groupOf(candidate: BudgetAwareCandidateResult): number {
  if (candidate.rankability !== "rankable") return 4;
  if (candidate.budgetStatus === "over-budget") return 3;
  if (candidate.efficiency.kind !== "value") return 4;
  if (candidate.efficiency.perUnit > 0) return 1;
  return 2;
}

function efficiencySortValue(candidate: BudgetAwareCandidateResult): number {
  return candidate.efficiency.kind === "value"
    ? candidate.efficiency.perUnit
    : Number.NEGATIVE_INFINITY;
}

function improvementSortValue(candidate: BudgetAwareCandidateResult): number {
  return (
    candidate.selectedMetricDelta?.percentDelta ?? Number.NEGATIVE_INFINITY
  );
}

function priceSortValue(candidate: BudgetAwareCandidateResult): number {
  return candidate.price.normalizedAmount ?? Number.POSITIVE_INFINITY;
}

function invalid(message: string): UpgradeComparisonOutcome {
  return { ok: false, code: "comparison-invalid", message };
}

function displayMetricDeltas(
  candidate: UpgradeCandidateInput,
  selectedMetric: RankableMetricId,
): DisplayMetricDelta[] {
  if (!candidate.measurement.ok) return [];
  return candidate.measurement.metrics.flatMap((metric) => {
    if (metric.absoluteDelta === 0 && metric.id !== selectedMetric) return [];
    const known = VISIBLE_METRIC_DISPLAY[metric.id];
    const absoluteDelta = metric.absoluteDelta;
    const direction: DisplayMetricDirection =
      absoluteDelta > 0
        ? "improved"
        : absoluteDelta < 0
          ? "decreased"
          : "unchanged";
    return [
      {
        metricId: metric.id,
        label: metric.label ?? known?.label ?? metric.id,
        before: metric.before,
        after: metric.after,
        absoluteDelta,
        percentDelta: metric.percentDelta,
        unit: metric.unit ?? known?.unit ?? "number",
        category: metric.category ?? known?.category ?? "offense",
        isRankingMetric: metric.id === selectedMetric,
        direction,
      },
    ];
  });
}

function buildSummary(
  body: Pick<
    BudgetAwareComparison,
    "candidates" | "ordering" | "selectedMetricLabel" | "comparisonCurrency"
  >,
): Pick<
  BudgetAwareComparison,
  | "summaryState"
  | "winnerCandidateId"
  | "rankedCandidateCount"
  | "positiveWithinBudgetCount"
  | "summaryLines"
> {
  const byId = new Map(
    body.candidates.map((candidate) => [candidate.id, candidate]),
  );
  const positive = body.candidates.filter(isPositiveWithinBudget);
  const rankedCount = body.candidates.filter(
    (candidate) => candidate.rankability === "rankable",
  ).length;
  const winner =
    body.ordering
      .map((id) => byId.get(id))
      .find(
        (candidate) =>
          candidate !== undefined && isPositiveWithinBudget(candidate),
      ) ?? null;
  const summaryState: ComparisonSummaryState =
    rankedCount === 0
      ? "no-rankable-candidates"
      : positive.length > 0
        ? "positive-within-budget"
        : "no-positive-within-budget";
  const metricName = body.selectedMetricLabel.replaceAll(" ", "-");
  const lines: string[] = [];
  if (summaryState === "positive-within-budget" && winner) {
    lines.push(
      `${displayName(winner)} has the highest measured ${body.selectedMetricLabel} gain per ${body.comparisonCurrency} among these supplied items within the stated budget.`,
    );
  } else if (summaryState === "no-positive-within-budget") {
    lines.push(
      `No supplied candidate provides a positive ${metricName} improvement within this budget.`,
    );
    for (const id of body.ordering) {
      const candidate = byId.get(id);
      if (!candidate || !isPositiveOverBudget(candidate)) continue;
      lines.push(
        `${displayName(candidate)} improves ${body.selectedMetricLabel} but is over budget.`,
      );
    }
  } else {
    lines.push(
      "These candidates cannot be ranked for the selected metric with the available measurements and prices.",
    );
  }
  if (rankedCount > 0 && rankedCount < body.candidates.length) {
    lines.push(
      `${rankedCount} of ${body.candidates.length} supplied candidates could be ranked for ${body.selectedMetricLabel} efficiency.`,
    );
  }
  return {
    summaryState,
    winnerCandidateId: winner?.id ?? null,
    rankedCandidateCount: rankedCount,
    positiveWithinBudgetCount: positive.length,
    summaryLines: lines,
  };
}

function isPositiveWithinBudget(
  candidate: BudgetAwareCandidateResult,
): boolean {
  return (
    candidate.rankability === "rankable" &&
    candidate.budgetStatus === "within-budget" &&
    candidate.efficiency.kind === "value" &&
    candidate.efficiency.perUnit > 0 &&
    (candidate.selectedMetricDelta?.percentDelta ?? 0) > 0
  );
}

function isPositiveOverBudget(candidate: BudgetAwareCandidateResult): boolean {
  return (
    candidate.rankability === "rankable" &&
    candidate.budgetStatus === "over-budget" &&
    (candidate.selectedMetricDelta?.percentDelta ?? 0) > 0
  );
}

function displayName(candidate: { label: string | null; id: string }): string {
  return candidate.label && candidate.label.trim().length > 0
    ? candidate.label.trim()
    : candidate.id;
}
