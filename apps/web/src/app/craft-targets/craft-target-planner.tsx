"use client";

import { useRef, useState } from "react";
import {
  loadCraftBases,
  searchCraftTargetOptions,
  submitCraftTargets,
} from "../craft-actions";
import { Alert } from "../shared/alert";
import { LoadingNote } from "../shared/loading-note";
import type {
  PlannerResponse,
  TargetSearchHit,
} from "@poe2-helper/crafting-planner";

type TargetDraft =
  | { kind: "stat"; statId: string; minimumValue?: number }
  | { kind: "modifier"; modifierId: string };

export function CraftTargetPlanner({
  supported,
  unsupported,
}: {
  supported: string[];
  unsupported: string[];
}) {
  const [itemClass, setItemClass] = useState(supported[0] ?? "Body Armour");
  const [bases, setBases] = useState<{ id: string; name: string }[]>([]);
  const [baseId, setBaseId] = useState("");
  const [itemLevel, setItemLevel] = useState("82");
  const [statId, setStatId] = useState("");
  const [minimumValue, setMinimumValue] = useState("");
  const [modifierId, setModifierId] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<TargetSearchHit[]>([]);
  const [targets, setTargets] = useState<TargetDraft[]>([]);
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<PlannerResponse | null>(null);
  const [planning, setPlanning] = useState(false);
  const classRequest = useRef(0);

  async function chooseClass(nextClass: string) {
    const request = classRequest.current + 1;
    classRequest.current = request;
    setItemClass(nextClass);
    setBaseId("");
    setBases([]);
    const loaded = await loadCraftBases(nextClass);
    if (request !== classRequest.current) {
      return;
    }
    if (!loaded.ok) {
      setNotice(loaded.error.message);
      return;
    }
    setNotice("");
    setBases(loaded.bases);
    setBaseId(loaded.bases[0]?.id ?? "");
  }

  function addTarget(target: TargetDraft) {
    setTargets((current) => [...current, target]);
  }

  async function plan() {
    setPlanning(true);
    setResult(null);
    const level = Number(itemLevel);
    try {
      const planned = await submitCraftTargets({
        baseId,
        itemLevel: level,
        targets,
      });
      setResult(planned);
    } finally {
      setPlanning(false);
    }
  }

  return (
    <main className="analysis">
      <p className="eyebrow">Craft targets</p>
      <h1>Plan an item target</h1>
      <p>
        Choose a base, an item level, and the stat or modifier you want. This
        lists source-pool matches. It does not choose a crafting method.
      </p>
      <form
        className="analysis-form"
        onSubmit={(event) => {
          event.preventDefault();
          void plan();
        }}
      >
        <label>
          Item class
          <select
            value={itemClass}
            onChange={(event) => {
              void chooseClass(event.target.value);
            }}
          >
            <optgroup label="Supported">
              {supported.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Unsupported">
              {unsupported.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            void chooseClass(itemClass);
          }}
        >
          Load bases
        </button>
        <label>
          Base
          <select
            value={baseId}
            onChange={(event) => setBaseId(event.target.value)}
          >
            <option value="">Select a base</option>
            {bases.map((base) => (
              <option key={base.id} value={base.id}>
                {base.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Item level
          <input
            inputMode="numeric"
            value={itemLevel}
            onChange={(event) => setItemLevel(event.target.value)}
          />
        </label>
        <label>
          Desired stat or modifier
          <input
            placeholder="For example: Maximum Life"
            value={statId}
            onChange={(event) => setStatId(event.target.value)}
          />
        </label>
        <label>
          Minimum value (optional)
          <input
            inputMode="decimal"
            value={minimumValue}
            onChange={(event) => setMinimumValue(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const trimmed = statId.trim();
            if (!trimmed) {
              return;
            }
            const parsedMinimum = minimumValue.trim();
            addTarget({
              kind: "stat",
              statId: trimmed,
              ...(parsedMinimum ? { minimumValue: Number(parsedMinimum) } : {}),
            });
            setStatId("");
            setMinimumValue("");
          }}
        >
          Add stat target
        </button>
        <label>
          Advanced modifier id
          <input
            value={modifierId}
            onChange={(event) => setModifierId(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            const trimmed = modifierId.trim();
            if (!trimmed) {
              return;
            }
            addTarget({ kind: "modifier", modifierId: trimmed });
            setModifierId("");
          }}
        >
          Add modifier target
        </button>
        <label>
          Search available stats and modifiers
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void searchCraftTargetOptions(query).then((found) => {
              if (!found.ok) {
                setNotice(found.error.message);
                setHits([]);
                return;
              }
              setNotice("");
              setHits(found.hits);
            });
          }}
        >
          Find targets
        </button>
        {hits.length > 0 ? (
          <ul>
            {hits.map((hit) => (
              <li key={`${hit.kind}:${hit.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    if (hit.kind === "stat") {
                      addTarget({ kind: "stat", statId: hit.id });
                    } else {
                      addTarget({ kind: "modifier", modifierId: hit.id });
                    }
                  }}
                >
                  Add {hit.id}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <h2>Chosen targets</h2>
        {targets.length === 0 ? (
          <p>No targets yet.</p>
        ) : (
          <ul>
            {targets.map((target, index) => (
              <li key={`${targetLabel(target)}:${index}`}>
                {targetLabel(target)}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setTargets((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    );
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="submit"
          disabled={planning || targets.length === 0 || baseId === ""}
        >
          {planning ? "Checking eligible modifiers…" : "Plan targets"}
        </button>
      </form>
      {planning ? (
        <LoadingNote>Checking the modifier source pool…</LoadingNote>
      ) : null}
      {notice ? <Alert tone="blocking">{notice}</Alert> : null}
      {result ? <PlannerResult result={result} /> : null}
    </main>
  );
}

function targetLabel(target: TargetDraft): string {
  if (target.kind === "stat") {
    return target.minimumValue !== undefined
      ? `stat ${target.statId} at least ${target.minimumValue}`
      : `stat ${target.statId}`;
  }
  return `modifier ${target.modifierId}`;
}

function PlannerResult({ result }: { result: PlannerResponse }) {
  if (!result.ok) {
    return (
      <section className="alert alert-blocking" aria-live="polite">
        <h2>Craft target unavailable</h2>
        <p>{result.message}</p>
        {result.itemClass ? <p>Item class: {result.itemClass}</p> : null}
        {result.baseName ? <p>Base: {result.baseName}</p> : null}
        {result.setup ? <pre>{result.setup}</pre> : null}
      </section>
    );
  }
  return (
    <section aria-live="polite">
      <h2>
        {result.base.name} · item level {result.itemLevel}
      </h2>
      <p>
        Source-pool status: {result.status}. This describes eligible modifiers;
        it does not choose a crafting method.
      </p>
      {result.warnings.map((warning) => (
        <Alert tone="caution" key={warning}>
          {warning}
        </Alert>
      ))}
      {result.targets.map((target) => (
        <article key={target.id}>
          <h3>Target {target.label}</h3>
          <p>{target.resolution}</p>
          {target.message ? <p>{target.message}</p> : null}
          <p>
            Eligible {target.coverage.eligible}, ineligible{" "}
            {target.coverage.ineligible}, unresolved{" "}
            {target.coverage.unresolved}
          </p>
        </article>
      ))}
      {result.candidates.map((candidate) => (
        <article key={candidate.modifierId}>
          <h3>{candidate.modifierId}</h3>
          <p>
            {candidate.affixKind} · {candidate.generationType}
          </p>
          <p>
            Required item level {candidate.requiredItemLevel}
            {candidate.requiredItemLevelPassed ? " met" : " not met"}
          </p>
          <ul>
            {candidate.stats.map((stat) => (
              <li key={stat.id}>
                {stat.id}: {stat.min}–{stat.max}
              </li>
            ))}
          </ul>
          <p>{candidate.eligibilityLabel}</p>
          <p>
            {candidate.spawnWeightLabel}:{" "}
            {candidate.spawnWeight === null
              ? "unavailable"
              : candidate.spawnWeight}
          </p>
          <p>Presentation: {candidate.presentationStatus}</p>
          <pre>{candidate.presentation}</pre>
          <ul>
            {candidate.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {candidate.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </article>
      ))}
      <details>
        <summary>Crafting snapshot</summary>
        <dl className="analysis-meta">
          <div>
            <dt>Checksum</dt>
            <dd>{result.provenance.snapshotChecksum}</dd>
          </div>
          <div>
            <dt>Schema</dt>
            <dd>{result.provenance.schemaVersion}</dd>
          </div>
          <div>
            <dt>Source commit</dt>
            <dd>{result.provenance.sourceCommit}</dd>
          </div>
          <div>
            <dt>Compatibility policy</dt>
            <dd>{result.provenance.compatibilityPolicyVersion}</dd>
          </div>
          <div>
            <dt>Planner version</dt>
            <dd>{result.provenance.plannerVersion}</dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
