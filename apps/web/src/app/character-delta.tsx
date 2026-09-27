"use client";

import { useEffect, useState } from "react";
import { measurePassiveDelta, type PassiveDeltaView } from "./actions";

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
    <section aria-label="Character-aware delta">
      <h3>Character-aware delta</h3>
      <p>
        Named changes for the path shown on the map, measured as shared
        allocations. This is not a score and it does not reorder the heuristic
        paths.
      </p>
      {state.phase === "loading" ? <p>Measuring candidate…</p> : null}
      {state.phase === "done" ? <DeltaBody view={state.view} /> : null}
    </section>
  );
}

function DeltaBody({ view }: { view: PassiveDeltaView }) {
  if (view.status === "disabled" || view.status === "error") {
    return <p>{view.message}</p>;
  }
  return (
    <>
      <p>
        PoB2 {view.provenance?.pobVersion} · tree {view.provenance?.pobTreeKey}{" "}
        · Buddy tree {view.provenance?.buddyTreeVersion} · runtime{" "}
        {view.provenance?.runtimeFingerprint} · {view.status}
      </p>
      <p>
        Main skill: {view.skillName ?? "unresolved"}. Requested nodes:{" "}
        {view.requestedNodeIds?.join(", ") || "none"}. Verified nodes:{" "}
        {view.verifiedNodeIds?.join(", ") || "none"}. Newly allocated:{" "}
        {view.actuallyAllocatedNodeIds?.join(", ") || "none"}. Verified point
        cost: {view.verifiedPointCost ?? "unknown"}.{" "}
        {view.allocationVerified ? "Allocation verified." : null} {view.message}
      </p>
      {view.warnings && view.warnings.length > 0 ? (
        <p>{view.warnings.join(". ")}.</p>
      ) : null}
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
    </>
  );
}
