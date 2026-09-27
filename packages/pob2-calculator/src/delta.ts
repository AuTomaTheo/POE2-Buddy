import {
  allowsPercentDelta,
  METRIC_DEFINITIONS,
  type MetricDefinition,
} from "./metrics.js";

export type RawMetricMap = Readonly<Record<string, number>>;

export type MetricDelta = {
  id: string;
  label: string;
  unit: MetricDefinition["unit"];
  category: MetricDefinition["category"];
  sourceField: string;
  before: number;
  after: number;
  absoluteDelta: number;
  percentDelta: number | null;
};

export type DeltaComputation = {
  metrics: MetricDelta[];
  unsupportedFields: string[];
};

export function sameMetricMap(
  left: RawMetricMap,
  right: RawMetricMap,
): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index];
    if (key !== rightKeys[index]) return false;
    if (left[key] !== right[key]) return false;
  }
  return true;
}

export function computeMetricDeltas(
  before: RawMetricMap,
  after: RawMetricMap,
): DeltaComputation {
  const metrics: MetricDelta[] = [];
  const known = new Set<string>();
  for (const definition of METRIC_DEFINITIONS) {
    known.add(definition.sourceField);
    const beforeValue = before[definition.sourceField];
    const afterValue = after[definition.sourceField];
    if (typeof beforeValue !== "number" || typeof afterValue !== "number") {
      continue;
    }
    const absoluteDelta = afterValue - beforeValue;
    const percentDelta = allowsPercentDelta(definition, beforeValue)
      ? (absoluteDelta / Math.abs(beforeValue)) * 100
      : null;
    metrics.push({
      id: definition.id,
      label: definition.label,
      unit: definition.unit,
      category: definition.category,
      sourceField: definition.sourceField,
      before: beforeValue,
      after: afterValue,
      absoluteDelta,
      percentDelta,
    });
  }
  const unsupportedFields = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ]
    .filter(
      (field) =>
        !known.has(field) &&
        (typeof before[field] === "number" || typeof after[field] === "number"),
    )
    .sort();
  return { metrics, unsupportedFields };
}

function trimNumber(value: number): string {
  if (!Number.isFinite(value)) return "unavailable";
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded);
}

export function formatAbsoluteDelta(metric: MetricDelta): string {
  if (metric.absoluteDelta === 0) {
    return metric.unit === "percent-points"
      ? "0 percentage points"
      : "no change";
  }
  const magnitude = trimNumber(Math.abs(metric.absoluteDelta));
  const sign = metric.absoluteDelta > 0 ? "+" : "-";
  if (metric.unit === "percent-points") {
    return `${sign}${magnitude} percentage points`;
  }
  return `${sign}${magnitude}`;
}

export function formatPercentDelta(metric: MetricDelta): string | null {
  if (metric.percentDelta === null) return null;
  const rounded = Math.round(metric.percentDelta * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}%`;
}

export function formatMetricValue(
  value: number,
  unit: MetricDelta["unit"],
): string {
  const text = trimNumber(value);
  return unit === "percent-points" ? `${text}%` : text;
}
