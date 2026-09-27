"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import { analyzePassiveBuild } from "./actions";
import { CharacterDelta } from "./character-delta";
import type {
  AnalysisResult,
  Pob2AnalysisView,
} from "../server/analyze-passive-build";
import type { GearAnalysis } from "@poe2-helper/gear-engine";
import type { RecommendationClaim } from "@poe2-helper/scoring-engine";
import {
  allocationSteps,
  buildPathMap,
  comparePathNodeSets,
  nodeLabel,
  pathKey,
  type LayoutNode,
  type PathMap,
} from "../lib/path-layout";

const CLAIM_TEXT: Record<RecommendationClaim, string> = {
  "no-candidates": "No paths were found for this point budget.",
  "no-complete-candidate":
    "No fully valued path was found. The paths below have a known score, and their full value is unknown.",
  "not-definitive-incomplete-valuation":
    "Fully valued paths are listed first. A higher known score on an incomplete path is not a definitive win.",
  "highest-scoring-complete-path-found-within-search-limits":
    "Highest-scoring fully valued path found within search limits. This is not a global optimum.",
  "highest-scoring-complete-path-among-enumerated-candidates":
    "Highest-scoring fully valued path among the enumerated candidates.",
};

type FixtureOption = { id: string; label: string };

function formatScore(value: number): string {
  return String(value);
}

export function AnalysisScreen({
  fixtures,
  liveImport,
}: {
  fixtures: readonly FixtureOption[];
  liveImport: { enabled: boolean; message: string };
}) {
  const [importSource, setImportSource] = useState<"fixture" | "pob2">(
    "fixture",
  );
  const importSourceRef = useRef(importSource);
  function chooseImportSource(value: "fixture" | "pob2") {
    importSourceRef.current = value;
    setImportSource(value);
  }
  const [submittedPob2Code, setSubmittedPob2Code] = useState("");
  const [result, action, pending] = useActionState(
    async (_previous: AnalysisResult | null, formData: FormData) => {
      const pob2Code = String(formData.get("pob2Code") ?? "");
      setSubmittedPob2Code(importSourceRef.current === "pob2" ? pob2Code : "");
      return analyzePassiveBuild({
        fixtureId: String(formData.get("fixtureId") ?? ""),
        fixtureJson: String(formData.get("fixtureJson") ?? ""),
        objective: String(formData.get("objective") ?? ""),
        pointBudget: String(formData.get("pointBudget") ?? ""),
        importSource: importSourceRef.current,
        pob2Code,
      });
    },
    null,
  );

  function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const textarea =
      event.currentTarget.form?.elements.namedItem("fixtureJson");
    if (!file || !(textarea instanceof HTMLTextAreaElement)) return;
    void file.text().then((text) => {
      textarea.value = text;
    });
  }

  return (
    <main className="analysis">
      <h1>PoE2 Helper</h1>
      <p>
        Analyze a passive-tree fixture. The score is a heuristic. It is not DPS
        or EHP. Imported character data is not a character-aware score.
      </p>
      {liveImport.enabled ? (
        <p>
          <a href="/api/auth/ggg/start">Connect GGG account</a>
        </p>
      ) : (
        <p>{liveImport.message}</p>
      )}
      <form action={action} className="analysis-form">
        <label>
          Import source
          <select
            name="importSource"
            value={importSource}
            onChange={(event) =>
              chooseImportSource(
                event.target.value === "pob2" ? "pob2" : "fixture",
              )
            }
          >
            <option value="fixture">Fixture</option>
            <option value="pob2">PoB2</option>
          </select>
        </label>
        {importSource === "fixture" ? (
          <>
            <label>
              Fixture
              <select name="fixtureId" defaultValue={fixtures[0]?.id ?? ""}>
                {fixtures.map((fixture) => (
                  <option key={fixture.id} value={fixture.id}>
                    {fixture.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Import fixture JSON
              <input
                type="file"
                accept="application/json,.json"
                onChange={loadFile}
              />
            </label>
            <label>
              Or paste fixture JSON. When this box is not empty, it is used
              instead of the fixture list.
              <textarea name="fixtureJson" rows={5} />
            </label>
          </>
        ) : (
          <label>
            Paste PoB2 export
            <textarea name="pob2Code" rows={5} />
          </label>
        )}
        <label>
          Objective
          <select name="objective" defaultValue="offensive">
            <option value="offensive">Offensive</option>
            <option value="defensive">Defensive</option>
            <option value="balanced">Balanced</option>
          </select>
        </label>
        <label>
          Passive point budget
          <input
            name="pointBudget"
            type="number"
            min={0}
            step={1}
            defaultValue={5}
          />
        </label>
        <button type="submit" disabled={pending}>
          {pending
            ? "Analyzing…"
            : importSource === "pob2"
              ? "Import / Analyze"
              : "Analyze"}
        </button>
      </form>
      {result?.pob2 ? <Pob2Summary view={result.pob2} /> : null}
      {result?.context ? <ContextSummary context={result.context} /> : null}
      {result?.gear ? <GearSummary gear={result.gear} /> : null}
      {result?.ok === false ? (
        <p className="analysis-error" role="alert">
          {result.message}
        </p>
      ) : null}
      {result?.ok === true ? (
        <AnalysisReport result={result} pob2Code={submittedPob2Code} />
      ) : null}
    </main>
  );
}

function Pob2Summary({ view }: { view: Pob2AnalysisView }) {
  return (
    <section>
      <h2>PoB2 import</h2>
      <p>Status: {view.status}</p>
      <p>Build: {view.name ?? "unavailable"}</p>
      <p>Class: {view.className ?? "unavailable"}</p>
      <p>Level: {view.level ?? "unavailable"}</p>
      <p>Ascendancy: {view.ascendancy ?? "unavailable"}</p>
      <p>
        Ascendancy passives:{" "}
        {view.ascendancyPassiveIds.length > 0
          ? view.ascendancyPassiveIds.join(", ")
          : "none"}
      </p>
      <p>PoB tree key: {view.treeVersion ?? "unavailable"}</p>
      <p>Active GGG data version: {view.activeTreeVersion ?? "unavailable"}</p>
      <p>
        Passive ids:{" "}
        {view.unknownPassiveIds.length > 0
          ? "unknown ids present"
          : "all imported passive ids recognized"}
      </p>
      <p>Skill groups: {view.skillGroupCount}</p>
      <p>
        Main skill:{" "}
        {view.mainSkillResolved
          ? (view.mainSkillName ?? "resolved")
          : "unresolved"}
      </p>
      <p>Supports: {view.supportCount}</p>
      <p>Unresolved-role gems: {view.unresolvedRoleGemCount}</p>
      <p>Equipment: {view.equipmentCount}</p>
      <p>
        Configuration:{" "}
        {view.configurationSelection === "unresolved"
          ? "unresolved"
          : view.configurationCount > 0
            ? view.configurationSummary
            : "unavailable"}
      </p>
      {view.unknownPassiveIds.length > 0 ? (
        <p>Unknown passive ids: {view.unknownPassiveIds.join(", ")}</p>
      ) : null}
      {view.warnings.map((warning, index) => (
        <p key={`${index}:${warning}`}>{warning}</p>
      ))}
      <p>
        PoB2 character data imported. Current optimizer remains passive-tree
        heuristic only.
      </p>
    </section>
  );
}

function relevanceText(state: string): string {
  if (state === "relevant") return "Relevant based on imported build evidence";
  if (state === "no-evidence") return "No supported evidence found";
  return "Unresolved from current parser/data";
}

function ContextSummary({
  context,
}: {
  context: NonNullable<AnalysisResult["context"]>;
}) {
  const listed = [
    ...context.offense.map((entry) => ({ side: "Offensive", ...entry })),
    ...context.defense.map((entry) => ({ side: "Defensive", ...entry })),
  ];
  const visible = listed.filter((entry) => entry.relevance !== "no-evidence");
  const quiet = listed.filter((entry) => entry.relevance === "no-evidence");
  return (
    <section>
      <h2>Build context</h2>
      <p>
        Primary skill: {context.primarySkill.name ?? "unavailable"}. Status:{" "}
        {context.primarySkill.status}.
      </p>
      <p>Context readiness: {context.readiness.status}.</p>
      <p>
        This describes imported evidence. It is not a value, a gear ranking, or
        an upgrade list.
      </p>
      {visible.map((entry) => (
        <details key={`${entry.side}:${entry.mechanic}`}>
          <summary>
            {entry.side} {entry.mechanic}: {relevanceText(entry.relevance)}
          </summary>
          {entry.evidence.length > 0 ? (
            <ul>
              {entry.evidence.map((evidence, index) => (
                <li key={`${evidence.sourceId}:${index}`}>
                  {evidence.sourceType}: {evidence.rawLabel}
                </li>
              ))}
            </ul>
          ) : (
            <p>{relevanceText(entry.relevance)}</p>
          )}
        </details>
      ))}
      <p>Unresolved mechanics: {context.unresolvedMechanics.length}</p>
      {quiet.length > 0 ? (
        <details>
          <summary>
            No supported evidence found for {quiet.length} mechanics
          </summary>
          <ul>
            {quiet.map((entry) => (
              <li key={`${entry.side}:${entry.mechanic}`}>
                {entry.side} {entry.mechanic}: {relevanceText(entry.relevance)}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

function GearSummary({ gear }: { gear: GearAnalysis }) {
  const missing = gear.diagnostics.filter(
    (diagnostic) => diagnostic.code === "missing-equipment-slot",
  );
  const other = gear.diagnostics.filter(
    (diagnostic) => diagnostic.code !== "missing-equipment-slot",
  );
  return (
    <section>
      <h2>Gear</h2>
      <p>
        Gear-analysis readiness: {gear.readiness.status}. Parser coverage
        describes how much of the item text is understood. It is not an item
        quality score.
      </p>
      {gear.items.map((item, index) => (
        <article key={`${item.sourceSlot}:${item.name}:${index}`}>
          <h3>{item.label}</h3>
          <p>
            {item.name}
            {item.baseType ? ` · ${item.baseType}` : ""}
          </p>
          <p>Rarity: {item.rarity ?? "unavailable"}</p>
          <p>
            {item.totalModifierLines} modifier{" "}
            {item.totalModifierLines === 1 ? "line" : "lines"},{" "}
            {item.semanticallyUnderstoodLines} understood,{" "}
            {item.unsupportedLines.length} unsupported
          </p>
          <p>
            Understood modifiers:{" "}
            {item.understoodSemanticIds.length > 0
              ? item.understoodSemanticIds.join(", ")
              : "none"}
          </p>
          <p>Analysis confidence: {item.confidence}</p>
          {item.modifiers.some((modifier) => modifier.parsed) ? (
            <details>
              <summary>Modifier locality</summary>
              <ul>
                {item.modifiers
                  .filter((modifier) => modifier.parsed)
                  .map((modifier, lineIndex) => (
                    <li key={`${lineIndex}:${modifier.rawText}`}>
                      {modifier.rawText} — {modifier.semanticId} — locality:{" "}
                      {modifier.locality}
                      {modifier.locality === "unknown"
                        ? " — Parsed modifier; item/global scope unresolved."
                        : ""}
                    </li>
                  ))}
              </ul>
            </details>
          ) : null}
          {item.unsupportedLines.length > 0 ? (
            <details>
              <summary>Unsupported lines</summary>
              <ul>
                {item.unsupportedLines.map((line, lineIndex) => (
                  <li key={`${lineIndex}:${line}`}>{line}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </article>
      ))}
      <p>Missing slots: {missing.length === 0 ? "none" : missing.length}</p>
      {missing.length > 0 ? (
        <ul>
          {missing.map((diagnostic) => (
            <li key={`${diagnostic.slot}:${diagnostic.message}`}>
              {diagnostic.message}
            </li>
          ))}
        </ul>
      ) : null}
      <p>Diagnostics: {other.length}</p>
      {other.length > 0 ? (
        <ul>
          {other.map((diagnostic) => (
            <li
              key={`${diagnostic.code}:${diagnostic.slot}:${diagnostic.message}`}
            >
              {diagnostic.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AnalysisReport({
  result,
  pob2Code,
}: {
  result: Extract<AnalysisResult, { ok: true }>;
  pob2Code: string;
}) {
  const { recommendation } = result;
  const version = recommendation.dataVersion;
  const catalog = new Map<number, LayoutNode>(
    result.nodes.map((node) => [
      node.id,
      { id: node.id, name: node.name, x: node.x, y: node.y },
    ]),
  );
  const candidates = [
    ...recommendation.rankedCompleteCandidates,
    ...recommendation.incompleteCandidates,
  ];
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [comparedKeys, setComparedKeys] = useState<string[]>([]);
  const focused =
    candidates.find((candidate) => pathKey(candidate.nodeIds) === focusedKey) ??
    candidates[0];
  const compared = comparedKeys
    .map((key) =>
      candidates.find((candidate) => pathKey(candidate.nodeIds) === key),
    )
    .filter((candidate) => candidate !== undefined);
  const primary = compared.length === 2 ? compared[0] : focused;
  const secondary = compared.length === 2 ? compared[1] : undefined;
  const map =
    primary === undefined
      ? null
      : buildPathMap({
          proposedIds: primary.nodeIds,
          entryNodeId: result.entryNodeIds[pathKey(primary.nodeIds)] ?? null,
          otherIds: secondary?.nodeIds,
          otherEntryNodeId:
            secondary === undefined
              ? null
              : (result.entryNodeIds[pathKey(secondary.nodeIds)] ?? null),
          nodes: catalog,
        });

  function toggleCompared(key: string) {
    setComparedKeys((current) => {
      if (current.includes(key)) return current.filter((item) => item !== key);
      if (current.length >= 2) return current;
      return [...current, key];
    });
  }

  return (
    <section className="analysis-report" aria-live="polite">
      <h2>
        {result.characterName} · {result.className}
      </h2>
      <p data-claim={recommendation.selectionClaim}>
        {CLAIM_TEXT[recommendation.selectionClaim]}
      </p>
      <dl className="analysis-meta">
        <div>
          <dt>Tree version</dt>
          <dd>{version.version ?? "unknown"}</dd>
        </div>
        <div>
          <dt>Tree commit</dt>
          <dd>{version.commit ?? "unknown"}</dd>
        </div>
        <div>
          <dt>Profile</dt>
          <dd>
            {recommendation.profileId} v{recommendation.profileVersion}
          </dd>
        </div>
        <div>
          <dt>Point budget</dt>
          <dd>{recommendation.pointBudget}</dd>
        </div>
        <div>
          <dt>Search</dt>
          <dd>{recommendation.searchCompleteness}</dd>
        </div>
        <div>
          <dt>Definitive</dt>
          <dd>{recommendation.definitive ? "yes" : "no"}</dd>
        </div>
      </dl>
      <h3>Already allocated</h3>
      <AllocationList
        nodeIds={result.allocatedNodeIds}
        catalog={catalog}
        classStartNodeId={result.classStartNodeId}
      />
      <h3>{compared.length === 2 ? "First selected path" : "Selected path"}</h3>
      {primary === undefined ? (
        <p>No path to show.</p>
      ) : (
        <>
          <ol data-allocation-order="proposed">
            {allocationSteps(primary.nodeIds, catalog).map((step) => (
              <li key={step.id}>
                {step.step}. {step.name} ({step.id})
              </li>
            ))}
          </ol>
          <PathSketch map={map} comparing={compared.length === 2} />
        </>
      )}
      {compared.length === 2 && compared[0] && compared[1] ? (
        <PathComparison
          left={compared[0].nodeIds}
          right={compared[1].nodeIds}
          catalog={catalog}
          leftUnknown={compared[0].fullValueUnknown}
          rightUnknown={compared[1].fullValueUnknown}
        />
      ) : (
        <p>
          Choose two paths to compare their nodes. Comparison does not pick a
          winner.
        </p>
      )}
      {result.pob2 && pob2Code.trim().length > 0 && focused ? (
        <CharacterDelta
          key={`${pathKey(focused.nodeIds)}:${focused.pointCost}`}
          pob2Code={pob2Code}
          nodeIds={focused.nodeIds}
          pointCost={focused.pointCost}
          objective={recommendation.profileId}
          pointBudget={recommendation.pointBudget}
        />
      ) : null}
      <h3>Fully valued paths</h3>
      {recommendation.rankedCompleteCandidates.length === 0 ? (
        <p>No fully valued path is available.</p>
      ) : (
        <ol>
          {recommendation.rankedCompleteCandidates.map((candidate) => (
            <PathRow
              key={pathKey(candidate.nodeIds)}
              candidate={candidate}
              catalog={catalog}
              compared={comparedKeys.includes(pathKey(candidate.nodeIds))}
              compareDisabled={
                comparedKeys.length >= 2 &&
                !comparedKeys.includes(pathKey(candidate.nodeIds))
              }
              focused={
                focused !== undefined &&
                pathKey(focused.nodeIds) === pathKey(candidate.nodeIds)
              }
              onCompare={() => toggleCompared(pathKey(candidate.nodeIds))}
              onFocus={() => setFocusedKey(pathKey(candidate.nodeIds))}
            />
          ))}
        </ol>
      )}
      <h3>Incomplete paths ({recommendation.incompleteCandidates.length})</h3>
      {recommendation.incompleteCandidates.length === 0 ? (
        <p>No incomplete paths.</p>
      ) : (
        <ol>
          {recommendation.incompleteCandidates.map((candidate) => (
            <PathRow
              key={pathKey(candidate.nodeIds)}
              candidate={candidate}
              catalog={catalog}
              compared={comparedKeys.includes(pathKey(candidate.nodeIds))}
              compareDisabled={
                comparedKeys.length >= 2 &&
                !comparedKeys.includes(pathKey(candidate.nodeIds))
              }
              focused={
                focused !== undefined &&
                pathKey(focused.nodeIds) === pathKey(candidate.nodeIds)
              }
              onCompare={() => toggleCompared(pathKey(candidate.nodeIds))}
              onFocus={() => setFocusedKey(pathKey(candidate.nodeIds))}
            />
          ))}
        </ol>
      )}
    </section>
  );
}

function AllocationList({
  nodeIds,
  catalog,
  classStartNodeId,
}: {
  nodeIds: readonly number[];
  catalog: ReadonlyMap<number, LayoutNode>;
  classStartNodeId: number | null;
}) {
  return (
    <ul>
      {classStartNodeId !== null ? (
        <li>
          Class start:{" "}
          {nodeLabel(catalog.get(classStartNodeId), classStartNodeId)} (
          {classStartNodeId})
        </li>
      ) : null}
      {nodeIds
        .filter((id) => id !== classStartNodeId)
        .map((id) => (
          <li key={id}>
            {nodeLabel(catalog.get(id), id)} ({id})
          </li>
        ))}
    </ul>
  );
}

function PathSketch({
  map,
  comparing,
}: {
  map: PathMap | null;
  comparing: boolean;
}) {
  if (map === null) {
    return (
      <p>
        This local map needs node positions. The numbered list is the allocation
        order.
      </p>
    );
  }
  const xs = map.points.map((point) => point.x);
  const ys = map.points.map((point) => point.y);
  const span = Math.max(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
    1,
  );
  const radius = span * 0.045;
  return (
    <>
      <svg
        className="path-map"
        viewBox={map.viewBox}
        role="img"
        aria-label="Local sketch of the selected path"
      >
        {map.edges.map((edge) => {
          const from = map.points.find((point) => point.id === edge.from);
          const to = map.points.find((point) => point.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.kind}-${edge.from}-${edge.to}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              strokeWidth={radius * 0.35}
              className={`path-edge path-edge-${edge.kind}`}
            />
          );
        })}
        {map.points.map((point) => (
          <g key={`${point.role}-${point.id}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              className={`path-node path-node-${point.role}`}
            >
              <title>
                {point.step === null
                  ? "Already allocated"
                  : `Step ${point.step}`}
                : {point.name} ({point.id})
              </title>
            </circle>
            <text
              x={point.x}
              y={point.y}
              fontSize={radius}
              className="path-step"
            >
              {point.step ?? "·"}
            </text>
          </g>
        ))}
      </svg>
      <p>
        Gray is already allocated. Blue is the path shown above.
        {comparing
          ? " Purple is shared with the second selected path. Orange is only on that second path. Step numbers follow the first selected path."
          : ""}
      </p>
    </>
  );
}

function PathComparison({
  left,
  right,
  catalog,
  leftUnknown,
  rightUnknown,
}: {
  left: readonly number[];
  right: readonly number[];
  catalog: ReadonlyMap<number, LayoutNode>;
  leftUnknown: boolean;
  rightUnknown: boolean;
}) {
  const comparison = comparePathNodeSets(left, right);
  return (
    <section>
      <h3>Node comparison</h3>
      <p>
        Shared and unique nodes follow each path&apos;s allocation order. This
        comparison does not decide which path is better.
        {leftUnknown || rightUnknown
          ? " At least one path has an unknown full value."
          : ""}
      </p>
      <p>Shared: {namesFor(comparison.shared, catalog)}</p>
      <p>
        Only in the first selected path:{" "}
        {namesFor(comparison.onlyLeft, catalog)}
      </p>
      <p>
        Only in the second selected path:{" "}
        {namesFor(comparison.onlyRight, catalog)}
      </p>
    </section>
  );
}

function namesFor(
  ids: readonly number[],
  catalog: ReadonlyMap<number, LayoutNode>,
): string {
  if (ids.length === 0) return "none";
  return ids
    .map((id) => `${nodeLabel(catalog.get(id), id)} (${id})`)
    .join(", ");
}

function PathRow({
  candidate,
  catalog,
  compared,
  compareDisabled,
  focused,
  onCompare,
  onFocus,
}: {
  candidate: {
    nodeIds: readonly number[];
    pointCost: number;
    heuristicScore: number;
    scorePerPoint: number;
    semanticConfidence: string;
    valuationComplete: boolean;
    searchCompleteness: string;
    fullValueUnknown: boolean;
    unsupportedRawLines: readonly string[];
    contributions: readonly {
      label: string;
      amount: number | null;
      weight: number;
      contribution: number;
      supported: boolean;
    }[];
    pathSemanticCoverage: { semanticCoverageRatio: number };
  };
  catalog: ReadonlyMap<number, LayoutNode>;
  compared: boolean;
  compareDisabled: boolean;
  focused: boolean;
  onCompare: () => void;
  onFocus: () => void;
}) {
  const steps = allocationSteps(candidate.nodeIds, catalog);
  return (
    <li className="path-row">
      <label className="compare-toggle">
        <input
          type="checkbox"
          checked={compared}
          disabled={compareDisabled}
          onChange={onCompare}
        />
        Compare
      </label>
      <button type="button" onClick={onFocus} aria-pressed={focused}>
        {focused ? "Showing on map" : "Show on map"}
      </button>
      <details>
        <summary>
          {steps.map((step) => `${step.step}. ${step.name}`).join(" → ")} ·{" "}
          {candidate.pointCost} points · score{" "}
          {formatScore(candidate.heuristicScore)}
          {candidate.fullValueUnknown ? " · full value unknown" : ""}
        </summary>
        <ol>
          {steps.map((step) => (
            <li key={step.id}>
              {step.step}. {step.name} ({step.id})
            </li>
          ))}
        </ol>
        <p>
          Score per point {formatScore(candidate.scorePerPoint)}. Semantic
          confidence {candidate.semanticConfidence}. Coverage{" "}
          {candidate.pathSemanticCoverage.semanticCoverageRatio}. Valuation{" "}
          {candidate.valuationComplete ? "complete" : "incomplete"}. Search{" "}
          {candidate.searchCompleteness}.
        </p>
        <table>
          <caption>Score breakdown</caption>
          <thead>
            <tr>
              <th>Stat</th>
              <th>Amount</th>
              <th>Weight</th>
              <th>Contribution</th>
              <th>Supported</th>
            </tr>
          </thead>
          <tbody>
            {candidate.contributions.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <td>{row.label}</td>
                <td>{row.amount ?? "unknown"}</td>
                <td>{row.weight}</td>
                <td>{formatScore(row.contribution)}</td>
                <td>{row.supported ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {candidate.unsupportedRawLines.length > 0 ? (
          <>
            <h4>Unsupported lines</h4>
            <ul>
              {candidate.unsupportedRawLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </li>
  );
}
