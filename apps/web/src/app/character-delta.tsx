"use client";

import { useEffect, useState } from "react";
import { measurePassiveDelta, type PassiveDeltaView } from "./actions";
import { Alert } from "./shared/alert";
import { Badge } from "./shared/badge";
import { LoadingNote } from "./shared/loading-note";

type DeltaState =
  { phase: "loading" } | { phase: "done"; view: PassiveDeltaView };

export function CharacterDelta({
  pob2Code,
  nodeIds,
  pointCost,
  objective,
  pointBudget,
}: {
  pob2Code: string;
  nodeIds: readonly number[];
  pointCost: number;
  objective: string;
  pointBudget: number;
}) {
  const [state, setState] = useState<DeltaState>({ phase: "loading" });
  const nodeKey = nodeIds.join(",");

  useEffect(() => {
    let cancelled = false;
    void measurePassiveDelta({
      pob2Code,
      nodeIds: nodeKey.length === 0 ? [] : nodeKey.split(",").map(Number),
      pointCost,
      objective,
      pointBudget: String(pointBudget),
    }).then((view) => {
      if (!cancelled) setState({ phase: "done", view });
    });
    return () => {
      cancelled = true;
    };
  }, [pob2Code, nodeKey, pointCost, objective, pointBudget]);

  return (
    <section
      className="measured-impact"
      aria-labelledby="measured-impact-heading"
    >
      <div className="measured-impact-heading">
        <div>
          <p className="eyebrow">Exact calculation</p>
          <h3 id="measured-impact-heading">Measured impact</h3>
        </div>
        <Badge tone="measured">Measured by PoB2</Badge>
      </div>
      <p>
        Changes for the path shown on the map. This does not reorder the
        heuristic recommendations.
      </p>
      {state.phase === "loading" ? (
        <LoadingNote>Measuring this path with PoB2…</LoadingNote>
      ) : null}
      {state.phase === "done" ? <DeltaBody view={state.view} /> : null}
    </section>
  );
}

function DeltaBody({ view }: { view: PassiveDeltaView }) {
  if (view.status === "disabled" || view.status === "error") {
    return <Alert tone="caution">{view.message}</Alert>;
  }
  return (
    <>
      <p>
        {view.message} {view.skillName ? `Main skill: ${view.skillName}.` : ""}
      </p>
      {view.warnings && view.warnings.length > 0 ? (
        <p>{view.warnings.join(". ")}.</p>
      ) : null}
      <div className="measured-metrics">
        {view.rows?.map((row) => (
          <article key={row.label}>
            <h4>{row.label}</h4>
            <p>{row.percent ?? row.absolute}</p>
            <p>
              {row.before} → {row.after}
            </p>
          </article>
        ))}
      </div>
      <details>
        <summary>Technical measurement details</summary>
        <p>
          PoB2 {view.provenance?.pobVersion} · tree{" "}
          {view.provenance?.pobTreeKey} · Buddy tree{" "}
          {view.provenance?.buddyTreeVersion} · runtime{" "}
          {view.provenance?.runtimeFingerprint} · {view.status}
        </p>
        <p>
          Requested nodes: {view.requestedNodeIds?.join(", ") || "none"}.
          Verified nodes: {view.verifiedNodeIds?.join(", ") || "none"}. Newly
          allocated: {view.actuallyAllocatedNodeIds?.join(", ") || "none"}.
          Verified point cost: {view.verifiedPointCost ?? "unknown"}.{" "}
          {view.allocationVerified
            ? "Allocation verified."
            : "Allocation was not verified."}
        </p>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Before</th>
              <th>After</th>
              <th>Change</th>
              <th>Percent</th>
            </tr>
          </thead>
          <tbody>
            {view.rows?.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.before}</td>
                <td>{row.after}</td>
                <td>{row.absolute}</td>
                <td>{row.percent ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
