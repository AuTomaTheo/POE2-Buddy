"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { analyzePassiveBuild } from "./actions";
import { Alert } from "./shared/alert";
import { Badge } from "./shared/badge";
import { LoadingNote } from "./shared/loading-note";
import { exportInputProblem } from "./build/import-validation";
import { BuildOverview } from "./build/build-overview";
import { PassiveTreeCanvas } from "./passives/passive-tree-canvas";
import { START_DEMOS } from "./start/demos";
import { buildIdentity } from "./shell/build-identity";
import { useBuildSession } from "./shell/build-session";
import { CharacterDelta } from "./character-delta";
import { UpgradeComparison } from "./upgrade-comparison";
import type {
  AnalysisResult,
  Pob2AnalysisView,
} from "../server/analyze-passive-build";
import type { ExplanationDocument } from "@poe2-helper/ai-explainer";
import type { GearAnalysis } from "@poe2-helper/gear-engine";
import type { RecommendationClaim } from "@poe2-helper/scoring-engine";
import {
  allocationSteps,
  buildPathMap,
  comparePathNodeSets,
  nodeLabel,
  pathKey,
  type LayoutNode,
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
type ImportChoice = "fixture" | "pob2" | "ggg";

const FIXTURE_DEMOS = START_DEMOS.filter((demo) => demo.kind === "fixture");

function formatScore(value: number): string {
  return String(value);
}

export function AnalysisScreen({
  fixtures,
  liveImport,
  initialSource,
  initialDemoId,
  initialObjective,
  initialPob2Code,
}: {
  fixtures: readonly FixtureOption[];
  liveImport: { enabled: boolean; message: string };
  initialSource: "fixture" | "pob2";
  initialDemoId: string;
  initialObjective: "offensive" | "defensive" | "balanced";
  initialPob2Code: string;
}) {
  const [pob2Draft, setPob2Draft] = useState(initialPob2Code);
  const [inputProblem, setInputProblem] = useState<string | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [importSource, setImportSource] = useState<ImportChoice>(initialSource);
  const importSourceRef = useRef(importSource);
  function chooseImportSource(value: ImportChoice) {
    setInputProblem(null);
    importSourceRef.current = value;
    setImportSource(value);
  }
  const [fixtureDemoId, setFixtureDemoId] = useState(
    initialSource === "fixture" && initialDemoId
      ? initialDemoId
      : "passive-recommendation",
  );
  const [autoDemoId, setAutoDemoId] = useState(
    initialSource === "pob2" ? initialDemoId : "",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const autoRan = useRef(false);
  const [submittedPob2Code, setSubmittedPob2Code] = useState("");
  const { setBuild } = useBuildSession();
  const [result, action, pending] = useActionState(
    async (
      _previous: AnalysisResult | null,
      formData: FormData,
    ): Promise<AnalysisResult> => {
      const pob2Code = String(formData.get("pob2Code") ?? "");
      const demoId = String(formData.get("demoId") ?? "");
      setAutoDemoId("");
      setSubmittedPob2Code(importSourceRef.current === "pob2" ? pob2Code : "");
      try {
        return await analyzePassiveBuild({
          fixtureId: String(formData.get("fixtureId") ?? ""),
          fixtureJson: String(formData.get("fixtureJson") ?? ""),
          objective: String(formData.get("objective") ?? ""),
          pointBudget: String(formData.get("pointBudget") ?? ""),
          importSource: importSourceRef.current === "pob2" ? "pob2" : "fixture",
          pob2Code,
          demoId,
        });
      } catch {
        return {
          ok: false as const,
          message:
            "The build could not be analyzed. Your input is still here; please try again.",
        };
      }
    },
    null,
  );

  useEffect(() => {
    if (!result) return;
    resultRef.current?.focus();
    setBuild(
      buildIdentity({
        name: result.pob2?.name ?? (result.ok ? result.characterName : null),
        className:
          result.pob2?.className ??
          (result.ok ? result.className : null) ??
          result.context?.ascendancy.className ??
          null,
        ascendancy:
          result.pob2?.ascendancy ?? result.context?.ascendancy.name ?? null,
        level: result.pob2?.level ?? null,
        primarySkill:
          result.context?.primarySkill.name ??
          result.pob2?.mainSkillName ??
          null,
        source: result.context?.source ?? (result.pob2 ? "pob2" : "fixture"),
        readiness: result.context?.readiness.status ?? null,
      }),
    );
  }, [result, setBuild]);

  useEffect(() => {
    if (!initialDemoId || autoRan.current) return;
    autoRan.current = true;
    formRef.current?.requestSubmit();
  }, [initialDemoId]);

  useEffect(() => {
    if (!result?.ok) return;
    const hash = window.location.hash;
    if (hash.length === 0) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [result]);

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
    <main className="analysis" id="build">
      <p>
        Load a demo build or paste a Path of Building 2 export. The score is a
        heuristic. It is not DPS or EHP. Imported character data is not a
        character-aware score.
      </p>
      <form
        ref={formRef}
        action={action}
        className="analysis-form"
        aria-busy={pending}
        onSubmit={(event) => {
          if (importSource !== "pob2" || autoDemoId) return;
          const problem = exportInputProblem(pob2Draft);
          setInputProblem(problem);
          if (problem) {
            event.preventDefault();
            formRef.current
              ?.querySelector<HTMLTextAreaElement>('[name="pob2Code"]')
              ?.focus();
          }
        }}
      >
        <fieldset disabled={pending} className="import-fields">
          <legend>Load your build</legend>
          <label>
            Import source
            <select
              name="importSource"
              value={importSource}
              onChange={(event) =>
                chooseImportSource(
                  event.target.value === "pob2"
                    ? "pob2"
                    : event.target.value === "ggg"
                      ? "ggg"
                      : "fixture",
                )
              }
            >
              <option value="pob2">Path of Building</option>
              <option value="fixture">Demo build</option>
              <option value="ggg">GGG account</option>
            </select>
          </label>
          {importSource === "pob2" ? (
            <>
              {autoDemoId ? (
                <input type="hidden" name="demoId" value={autoDemoId} />
              ) : null}
              <label>
                Paste your PoB2 export code
                <textarea
                  name="pob2Code"
                  rows={5}
                  value={pob2Draft}
                  onChange={(event) => {
                    setPob2Draft(event.target.value);
                    setAutoDemoId("");
                    setInputProblem(null);
                  }}
                  aria-invalid={!!inputProblem}
                  aria-describedby="pob-import-help pob-import-feedback"
                  spellCheck={false}
                />
              </label>
              <p id="pob-import-help">
                Paste the export code, not a share link. It is used for this
                analysis and is not saved in browser storage.
              </p>
              <div id="pob-import-feedback" aria-live="polite">
                {inputProblem}
              </div>
              <button
                type="button"
                className="button-secondary"
                onClick={async () => {
                  try {
                    setPob2Draft(await navigator.clipboard.readText());
                    setAutoDemoId("");
                    setInputProblem(null);
                  } catch {
                    setInputProblem(
                      "Clipboard access is unavailable. Click the code box and paste with Ctrl+V (or Command+V).",
                    );
                  }
                }}
              >
                Paste from clipboard
              </button>
              <details>
                <summary>Where do I find this?</summary>
                <p>
                  In Path of Building 2, copy the build export code and paste it
                  here. Buddy does not open share links.
                </p>
                <p>
                  Use the PoE2 version of Path of Building. Copy its generated
                  export code in full. If you only have a link, open that link
                  and copy its code first.
                </p>
                <a href="/build?demo=fireball-witch">
                  Try a Fireball Witch example
                </a>
              </details>
            </>
          ) : null}
          {importSource === "fixture" ? (
            <>
              <label>
                Demo build
                <select
                  name="demoId"
                  value={fixtureDemoId}
                  onChange={(event) => setFixtureDemoId(event.target.value)}
                >
                  {FIXTURE_DEMOS.map((demo) => (
                    <option key={demo.id} value={demo.id}>
                      {demo.title}
                    </option>
                  ))}
                </select>
              </label>
              <details>
                <summary>Advanced testing</summary>
                <p>
                  Paste fixture JSON to replace the selected demo. When this box
                  is not empty, it is used instead of the demo.
                </p>
                <label>
                  Import fixture JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={loadFile}
                  />
                </label>
                <label>
                  Fixture JSON
                  <textarea name="fixtureJson" rows={5} />
                </label>
                <p className="technical">
                  Known fixture ids:{" "}
                  {fixtures.map((fixture) => fixture.id).join(", ")}
                </p>
              </details>
            </>
          ) : null}
          {importSource === "ggg" ? (
            liveImport.enabled ? (
              <p>
                <a href="/api/auth/ggg/start">Connect GGG account</a>
              </p>
            ) : (
              <Alert tone="info">{liveImport.message}</Alert>
            )
          ) : null}
          {importSource === "ggg" ? null : (
            <>
              <label>
                Objective
                <select name="objective" defaultValue={initialObjective}>
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
                    ? "Import and analyze build"
                    : "Analyze demo"}
              </button>
              {pending ? (
                <LoadingNote>
                  {importSource === "pob2"
                    ? "Importing Path of Building…"
                    : "Analyzing passive tree…"}
                </LoadingNote>
              ) : null}
            </>
          )}
        </fieldset>
      </form>
      <div className="import-result" aria-label="Import result">
        {result ? (
          <h2 ref={resultRef} tabIndex={-1}>
            {result.ok
              ? "Build loaded · Analysis complete"
              : "Could not complete this analysis"}
          </h2>
        ) : null}
        {result?.ok === false ? (
          <p>
            Check the export code and the analysis settings, then try again.
            Details below explain what prevented analysis.
          </p>
        ) : null}
        {result?.pob2 ? <Pob2Summary view={result.pob2} /> : null}
        {result?.ok === true ? <BuildOverview result={result} /> : null}
        {result?.context ? <ContextSummary context={result.context} /> : null}
        {result?.gear ? <GearSummary gear={result.gear} /> : null}
        {result?.ok === false ? (
          <Alert tone="blocking">{result.message}</Alert>
        ) : null}
        {result?.ok === true ? (
          <AnalysisReport result={result} pob2Code={submittedPob2Code} />
        ) : null}
      </div>
    </main>
  );
}

function Pob2Summary({ view }: { view: Pob2AnalysisView }) {
  return (
    <section>
      <h2>Imported build</h2>
      <p>Build: {view.name ?? "unavailable"}</p>
      <p>Class: {view.className ?? "unavailable"}</p>
      <p>Level: {view.level ?? "unavailable"}</p>
      <p>Ascendancy: {view.ascendancy ?? "unavailable"}</p>
      <p>
        Primary skill:{" "}
        {view.mainSkillResolved
          ? (view.mainSkillName ?? "Not identified")
          : "Not identified"}
      </p>
      <details>
        <summary>Import details and compatibility</summary>
        <p>Status: {view.status}</p>
        <p>
          Ascendancy passives:{" "}
          {view.ascendancyPassiveIds.length > 0
            ? view.ascendancyPassiveIds.join(", ")
            : "none"}
        </p>
        <p>PoB tree key: {view.treeVersion ?? "unavailable"}</p>
        <p>
          Active GGG data version: {view.activeTreeVersion ?? "unavailable"}
        </p>
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
      </details>
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
    <section className="build-context" id="build-context">
      <div className="context-heading">
        <div>
          <p className="eyebrow">Imported build evidence</p>
          <h2>Build context</h2>
        </div>
        <Badge
          tone={
            context.readiness.status === "ready"
              ? "success"
              : context.readiness.status === "partial"
                ? "caution"
                : "unavailable"
          }
        >
          {context.readiness.status === "ready"
            ? "Understood"
            : context.readiness.status === "partial"
              ? "Partially understood"
              : "Needs more evidence"}
        </Badge>
      </div>
      <div className="context-facts">
        <div>
          <strong>Primary skill</strong>
          <span>{context.primarySkill.name ?? "Not identified"}</span>
        </div>
        <div>
          <strong>Relevant mechanics</strong>
          <span>{visible.length}</span>
        </div>
        <div>
          <strong>Uncertain mechanics</strong>
          <span>{context.unresolvedMechanics.length}</span>
        </div>
      </div>
      <p>
        Buddy uses this evidence to describe the build. It does not change the
        passive ranking or claim a gear upgrade.
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
      {context.unresolvedMechanics.length > 0 ? (
        <details>
          <summary>
            What Buddy could not determine ({context.unresolvedMechanics.length}
            )
          </summary>
          <ul>
            {context.unresolvedMechanics.map((mechanic) => (
              <li key={mechanic}>{mechanic}</li>
            ))}
          </ul>
        </details>
      ) : null}
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
    <section id="gear" className="gear-overview">
      <div className="gear-heading">
        <div>
          <p className="eyebrow">Equipment</p>
          <h2>Gear overview</h2>
        </div>
        <Badge
          tone={
            gear.readiness.status === "ready"
              ? "success"
              : gear.readiness.status === "partial"
                ? "caution"
                : "unavailable"
          }
        >
          {gear.readiness.status === "ready"
            ? "Understood"
            : gear.readiness.status === "partial"
              ? "Partially understood"
              : "Needs more item data"}
        </Badge>
      </div>
      <p>
        Parser coverage describes what Buddy can read from item text. It is not
        an item quality score.
      </p>
      <div className="gear-grid">
        {gear.items.map((item, index) => (
          <article
            className="gear-card"
            key={`${item.sourceSlot}:${item.name}:${index}`}
          >
            <h3>{item.label}</h3>
            <p>
              {item.name}
              {item.baseType ? ` · ${item.baseType}` : ""}
            </p>
            <p>{item.rarity ?? "Unknown rarity"}</p>
            <p>
              {item.totalModifierLines} modifier{" "}
              {item.totalModifierLines === 1 ? "line" : "lines"},{" "}
              {item.semanticallyUnderstoodLines} understood,{" "}
              {item.unsupportedLines.length} unsupported
            </p>
            <p>
              Buddy understood {item.semanticallyUnderstoodLines} modifier
              lines.
            </p>
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
            <details>
              <summary>Technical item details</summary>
              <p>Analysis confidence: {item.confidence}</p>
              <p>
                Understood modifiers:{" "}
                {item.understoodSemanticIds.length > 0
                  ? item.understoodSemanticIds.join(", ")
                  : "none"}
              </p>
            </details>
          </article>
        ))}
      </div>
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
  result: Extract<AnalysisResult, { ok: true }> & {
    explanation?:
      | { status: "disabled" }
      | { status: "ready"; document: ExplanationDocument }
      | { status: "error"; message: string };
  };
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
  const [incompleteQuery, setIncompleteQuery] = useState("");
  const [incompleteLimit, setIncompleteLimit] = useState(10);
  const normalizedIncompleteQuery = incompleteQuery.trim().toLocaleLowerCase();
  const visibleIncompleteCandidates =
    normalizedIncompleteQuery.length === 0
      ? recommendation.incompleteCandidates
      : recommendation.incompleteCandidates.filter((candidate) =>
          allocationSteps(candidate.nodeIds, catalog).some((step) =>
            step.name.toLocaleLowerCase().includes(normalizedIncompleteQuery),
          ),
        );
  const displayedIncompleteCandidates = visibleIncompleteCandidates.slice(
    0,
    incompleteLimit,
  );
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
    <section className="analysis-report" id="passives" aria-live="polite">
      <h2>
        {result.characterName} · {result.className}
      </h2>
      <p data-claim={recommendation.selectionClaim}>
        {CLAIM_TEXT[recommendation.selectionClaim]}
      </p>
      <details className="technical-panel">
        <summary>Data and technical details</summary>
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
            <dt>Scoring profile</dt>
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
      </details>
      <section
        className="passive-recommendations"
        aria-labelledby="recommendations-heading"
      >
        <div className="recommendations-heading">
          <div>
            <p className="eyebrow">Passive upgrades</p>
            <h3 id="recommendations-heading">Recommended passive paths</h3>
          </div>
          <Badge tone="heuristic">Heuristic</Badge>
        </div>
        <p>
          Paths keep the engine&apos;s ranking. A heuristic score estimates the
          match to the selected objective; it is not a PoB2 measurement.
        </p>
        {recommendation.rankedCompleteCandidates.length === 0 ? (
          <p>No fully valued path is available.</p>
        ) : (
          <ol className="recommendation-list">
            {recommendation.rankedCompleteCandidates.map((candidate, index) => (
              <PathRow
                key={pathKey(candidate.nodeIds)}
                candidate={candidate}
                catalog={catalog}
                rank={index + 1}
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
        {recommendation.incompleteCandidates.length === 0 ? null : (
          <details className="incomplete-paths">
            <summary>
              Other paths with incomplete valuation (
              {recommendation.incompleteCandidates.length})
            </summary>
            <p>
              These paths are kept separate because their known score does not
              establish their full value.
            </p>
            <label className="incomplete-search">
              Find a node in these paths
              <input
                type="search"
                value={incompleteQuery}
                onChange={(event) => {
                  setIncompleteQuery(event.target.value);
                  setIncompleteLimit(10);
                }}
                placeholder="Search node names"
              />
            </label>
            <p aria-live="polite">
              Showing {displayedIncompleteCandidates.length} of{" "}
              {visibleIncompleteCandidates.length} matching paths.
            </p>
            {displayedIncompleteCandidates.length === 0 ? (
              <p>No incomplete path contains that node name.</p>
            ) : (
              <ol className="recommendation-list">
                {displayedIncompleteCandidates.map((candidate, index) => (
                  <PathRow
                    key={pathKey(candidate.nodeIds)}
                    candidate={candidate}
                    catalog={catalog}
                    rank={index + 1}
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
            {displayedIncompleteCandidates.length <
            visibleIncompleteCandidates.length ? (
              <button
                type="button"
                onClick={() => setIncompleteLimit((limit) => limit + 10)}
              >
                Show 10 more paths
              </button>
            ) : null}
          </details>
        )}
      </section>
      <ExplanationPanel explanation={result.explanation} />
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
          <PassiveTreeCanvas map={map} comparing={compared.length === 2} />
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
        <>
          <CharacterDelta
            key={`${pathKey(focused.nodeIds)}:${focused.pointCost}`}
            pob2Code={pob2Code}
            nodeIds={focused.nodeIds}
            pointCost={focused.pointCost}
            objective={recommendation.profileId}
            pointBudget={recommendation.pointBudget}
          />
          <div id="upgrades">
            <UpgradeComparison pob2Code={pob2Code} />
          </div>
        </>
      ) : null}
    </section>
  );
}

function ExplanationPanel({
  explanation,
}: {
  explanation?:
    | { status: "disabled" }
    | { status: "ready"; document: ExplanationDocument }
    | { status: "error"; message: string };
}) {
  if (explanation?.status === "error") {
    return <Alert tone="caution">{explanation.message}</Alert>;
  }
  if (explanation?.status !== "ready") return null;
  return (
    <section className="explanation" aria-labelledby="explanation-heading">
      <div className="explanation-heading">
        <div>
          <p className="eyebrow">Recommendation help</p>
          <h3 id="explanation-heading">Why this recommendation?</h3>
        </div>
        <Badge tone="neutral">Deterministic</Badge>
      </div>
      <p>
        These notes repeat the checked facts used to describe this result. They
        do not add an AI estimate or change the ranking.
      </p>
      <details>
        <summary>Read the full explanation</summary>
        <p data-provider={explanation.document.provider.providerId}>
          Evidence source: deterministic explanation
        </p>
        {explanation.document.sections.map((section) => (
          <div key={section.id}>
            <h4>{section.heading}</h4>
            {section.paragraphs.map((paragraph, index) => (
              <p key={`${section.id}:${index}`}>{paragraph}</p>
            ))}
          </div>
        ))}
      </details>
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
  rank,
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
  rank: number;
  compared: boolean;
  compareDisabled: boolean;
  focused: boolean;
  onCompare: () => void;
  onFocus: () => void;
}) {
  const steps = allocationSteps(candidate.nodeIds, catalog);
  return (
    <li className="path-row recommendation-card">
      <div className="recommendation-card-heading">
        <div>
          <p className="recommendation-rank">Path {rank}</p>
          <h4>{steps.map((step) => step.name).join(" → ")}</h4>
        </div>
        <dl className="recommendation-facts">
          <div>
            <dt>Cost</dt>
            <dd>{candidate.pointCost} points</dd>
          </div>
          <div>
            <dt>Heuristic score</dt>
            <dd>{formatScore(candidate.heuristicScore)}</dd>
          </div>
        </dl>
      </div>
      <p>
        {candidate.fullValueUnknown
          ? "Full value is not known for this path."
          : "This path has a complete valuation."}
      </p>
      <div className="recommendation-actions">
        <button type="button" onClick={onFocus} aria-pressed={focused}>
          {focused ? "Showing on map" : "Show on map"}
        </button>
        <label className="compare-toggle">
          <input
            type="checkbox"
            checked={compared}
            disabled={compareDisabled}
            onChange={onCompare}
          />
          Compare
        </label>
      </div>
      <details>
        <summary>Technical score details</summary>
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
              {candidate.unsupportedRawLines.map((line, lineIndex) => (
                <li key={`${lineIndex}:${line}`}>{line}</li>
              ))}
            </ul>
          </>
        ) : null}
      </details>
    </li>
  );
}
