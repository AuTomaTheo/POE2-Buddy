import { Badge } from "../shared/badge";
import { statusBadgeTone } from "../shared/status-tone";
import type { AnalysisSuccess } from "../../server/analyze-passive-build";

function sourceLabel(result: AnalysisSuccess): string {
  return result.pob2 ? "Path of Building" : "Demo build";
}

function skillLabel(result: AnalysisSuccess): string {
  return (
    result.context.primarySkill.name ??
    result.pob2?.mainSkillName ??
    "Not identified"
  );
}

function contextSummary(result: AnalysisSuccess): string {
  const relevant = [
    ...result.context.offense,
    ...result.context.defense,
  ].filter((entry) => entry.relevance === "relevant").length;
  if (relevant > 0)
    return `${relevant} relevant mechanic${relevant === 1 ? "" : "s"} identified.`;
  return result.context.readiness.status === "insufficient"
    ? "Not enough build evidence to identify mechanics."
    : "Build context is still being resolved.";
}

export function BuildOverview({ result }: { result: AnalysisSuccess }) {
  const gear = result.gear;
  const understood = gear.items.reduce(
    (count, item) => count + item.semanticallyUnderstoodLines,
    0,
  );
  const uncertain = gear.items.reduce(
    (count, item) => count + item.unsupportedLines.length,
    0,
  );
  const contextStatus = result.context.readiness.status;
  const statusLabel =
    contextStatus === "ready"
      ? "Ready"
      : contextStatus === "partial"
        ? "Partial"
        : "Not enough evidence";

  return (
    <section
      className="build-overview card"
      id="build-overview"
      aria-labelledby="build-overview-title"
    >
      <div className="build-overview-heading">
        <div>
          <p className="eyebrow">Build overview</p>
          <h2 id="build-overview-title">{result.characterName}</h2>
          <p>
            {result.className}
            {result.pob2?.ascendancy ? ` · ${result.pob2.ascendancy}` : ""}
            {result.pob2?.level !== null && result.pob2?.level !== undefined
              ? ` · Level ${result.pob2.level}`
              : ""}
          </p>
        </div>
        <Badge tone={statusBadgeTone(contextStatus)}>{statusLabel}</Badge>
      </div>
      <dl className="overview-facts">
        <div>
          <dt>Primary skill</dt>
          <dd>{skillLabel(result)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{sourceLabel(result)}</dd>
        </div>
        <div>
          <dt>Analysis</dt>
          <dd>Passive recommendations ready</dd>
        </div>
      </dl>
      <div className="overview-grid">
        <section>
          <h3>What Buddy understands</h3>
          <p>{contextSummary(result)}</p>
          <a href="#build-context">Review build context</a>
        </section>
        <section>
          <h3>Gear summary</h3>
          <p>
            {gear.items.length} equipped item
            {gear.items.length === 1 ? "" : "s"}; {understood} modifier line
            {understood === 1 ? "" : "s"} understood
            {uncertain > 0 ? `; ${uncertain} uncertain.` : "."}
          </p>
          <a href="#gear">Review gear</a>
        </section>
      </div>
      <nav className="overview-actions" aria-label="Build actions">
        <a className="button" href="#passives">
          Review passive paths
        </a>
        <a className="button button-secondary" href="#gear">
          Review gear
        </a>
        <a className="button button-secondary" href="/build/crafting">
          Plan craft targets
        </a>
      </nav>
    </section>
  );
}
