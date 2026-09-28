export type BuildIdentitySource = "pob2" | "ggg" | "fixture";

export type BuildIdentity = {
  name: string;
  detail: string;
  primarySkill: string;
  sourceLabel: string;
  statusLabel: string;
};

const SOURCE_LABELS: Record<BuildIdentitySource, string> = {
  pob2: "Path of Building",
  ggg: "GGG account",
  fixture: "Demo build",
};

export function buildIdentity(input: {
  name: string | null;
  className: string | null;
  ascendancy: string | null;
  level: number | null;
  primarySkill: string | null;
  source: BuildIdentitySource;
  readiness: "ready" | "partial" | "insufficient" | null;
}): BuildIdentity | null {
  const name = input.name?.trim() || input.className?.trim() || "";
  if (name.length === 0) return null;
  const detail = [
    input.className?.trim() || null,
    input.ascendancy?.trim() || null,
    input.level === null ? null : `Level ${input.level}`,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(" · ");
  return {
    name,
    detail,
    primarySkill: input.primarySkill?.trim() || "unavailable",
    sourceLabel: SOURCE_LABELS[input.source],
    statusLabel:
      input.readiness === "ready"
        ? "Ready"
        : input.readiness === "partial"
          ? "Partial"
          : input.readiness === "insufficient"
            ? "Not enough evidence"
            : "Unavailable",
  };
}
