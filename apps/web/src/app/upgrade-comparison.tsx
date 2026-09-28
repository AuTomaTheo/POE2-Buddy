"use client";

import { useState } from "react";
import {
  RANKABLE_METRIC_IDS,
  RANKABLE_METRIC_LABELS,
  type RankableMetricId,
} from "@poe2-helper/upgrade-engine";
import { compareUpgrades, type UpgradeComparisonView } from "./actions";

const SLOTS = [
  ["helmet", "Helmet"],
  ["body-armour", "Body armour"],
  ["gloves", "Gloves"],
  ["boots", "Boots"],
  ["amulet", "Amulet"],
  ["ring-1", "Ring 1"],
  ["ring-2", "Ring 2"],
  ["belt", "Belt"],
  ["main-hand", "Weapon 1"],
  ["off-hand", "Weapon 2"],
] as const;

type Draft = {
  key: string;
  slot: string;
  rawItemText: string;
  label: string;
  priceAmount: string;
  priceCurrency: "chaos" | "divine";
};

type CompareState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; view: UpgradeComparisonView };

export function UpgradeComparison({ pob2Code }: { pob2Code: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([blank("1"), blank("2")]);
  const [budgetAmount, setBudgetAmount] = useState("100");
  const [budgetCurrency, setBudgetCurrency] = useState<"chaos" | "divine">(
    "chaos",
  );
  const [metric, setMetric] = useState<RankableMetricId>("TotalDPS");
  const [useEconomy, setUseEconomy] = useState(false);
  const [leagueId, setLeagueId] = useState("");
  const [state, setState] = useState<CompareState>({ phase: "idle" });

  async function onCompare() {
    setState({ phase: "loading" });
    const view = await compareUpgrades({
      pob2Code,
      selectedMetric: metric,
      budgetAmount: Number(budgetAmount),
      budgetCurrency,
      useEconomy,
      leagueId,
      candidates: drafts.map((draft, index) => ({
        id: `candidate-${index + 1}`,
        slot: draft.slot,
        rawItemText: draft.rawItemText,
        label: draft.label,
        ...priceFields(draft),
      })),
    });
    setState({ phase: "done", view });
  }

  return (
    <section aria-label="Budget-aware item comparison">
      <h3>Budget-aware item comparison</h3>
      <p>
        Paste items you already have and enter what each one would cost. The
        budget is the most you would pay for one item. It is not a shopping
        list, and the result is only for the metric you select.
      </p>
      {drafts.map((draft, index) => (
        <fieldset key={draft.key}>
          <legend>Supplied item {index + 1}</legend>
          <label>
            Slot
            <select
              value={draft.slot}
              onChange={(event) =>
                updateDraft(index, { slot: event.target.value })
              }
            >
              {SLOTS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Label
            <input
              value={draft.label}
              onChange={(event) =>
                updateDraft(index, { label: event.target.value })
              }
            />
          </label>
          <label>
            Item text
            <textarea
              rows={6}
              value={draft.rawItemText}
              onChange={(event) =>
                updateDraft(index, { rawItemText: event.target.value })
              }
            />
          </label>
          <label>
            Acquisition price
            <input
              inputMode="decimal"
              value={draft.priceAmount}
              onChange={(event) =>
                updateDraft(index, { priceAmount: event.target.value })
              }
            />
          </label>
          <label>
            Price currency
            <select
              value={draft.priceCurrency}
              onChange={(event) =>
                updateDraft(index, {
                  priceCurrency:
                    event.target.value === "divine" ? "divine" : "chaos",
                })
              }
            >
              <option value="chaos">chaos</option>
              <option value="divine">divine</option>
            </select>
          </label>
        </fieldset>
      ))}
      <p>
        <button
          type="button"
          disabled={drafts.length >= 10}
          onClick={() =>
            setDrafts((current) => [
              ...current,
              blank(String(current.length + 1)),
            ])
          }
        >
          Add another supplied item
        </button>
      </p>
      <label>
        Budget for one item
        <input
          inputMode="decimal"
          value={budgetAmount}
          onChange={(event) => setBudgetAmount(event.target.value)}
        />
      </label>
      <label>
        Budget currency
        <select
          value={budgetCurrency}
          onChange={(event) =>
            setBudgetCurrency(
              event.target.value === "divine" ? "divine" : "chaos",
            )
          }
        >
          <option value="chaos">chaos</option>
          <option value="divine">divine</option>
        </select>
      </label>
      <label>
        Ranking metric
        <select
          value={metric}
          onChange={(event) => {
            if (isMetric(event.target.value)) setMetric(event.target.value);
          }}
        >
          {RANKABLE_METRIC_IDS.map((id) => (
            <option key={id} value={id}>
              {RANKABLE_METRIC_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={useEconomy}
          onChange={(event) => setUseEconomy(event.target.checked)}
        />
        Convert divine prices with one poe.ninja currency snapshot
      </label>
      {useEconomy ? (
        <label>
          League id
          <input
            value={leagueId}
            onChange={(event) => setLeagueId(event.target.value)}
          />
        </label>
      ) : null}
      <p>
        <button type="button" onClick={() => void onCompare()}>
          Compare supplied items
        </button>
      </p>
      {state.phase === "loading" ? <p>Measuring supplied items…</p> : null}
      {state.phase === "done" ? <ComparisonBody view={state.view} /> : null}
    </section>
  );

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  }
}

function ComparisonBody({ view }: { view: UpgradeComparisonView }) {
  if (view.status === "error") return <p>{view.message}</p>;
  return (
    <>
      <p>{view.message}</p>
      {view.headline ? <p>{view.headline}</p> : null}
      <p>Ranked by: {view.metricLabel} efficiency</p>
      {view.economyNote ? <p>{view.economyNote}</p> : null}
      {view.warnings.length > 0 ? <p>{view.warnings.join(" ")}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Price</th>
            <th>Budget status</th>
            <th>{view.metricLabel} before</th>
            <th>{view.metricLabel} after</th>
            <th>{view.metricLabel} gain</th>
            <th>Efficiency</th>
            <th>Other measured changes</th>
            <th>Price source</th>
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.label}
                <br />
                {row.slot}
                <br />
                {row.calculatorNote}
              </td>
              <td>{row.price}</td>
              <td>{row.budgetStatus}</td>
              <td>{row.before}</td>
              <td>{row.after}</td>
              <td>{row.gain}</td>
              <td>{row.efficiency}</td>
              <td>{row.otherDeltas}</td>
              <td>{row.priceSource}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function blank(key: string): Draft {
  return {
    key,
    slot: "helmet",
    rawItemText: "",
    label: "",
    priceAmount: "",
    priceCurrency: "chaos",
  };
}

function priceFields(draft: Draft): {
  priceAmount: number | null;
  priceCurrency: "chaos" | "divine" | null;
} {
  const trimmed = draft.priceAmount.trim();
  if (trimmed.length === 0) return { priceAmount: null, priceCurrency: null };
  const amount = Number(trimmed);
  if (!Number.isFinite(amount)) {
    return { priceAmount: null, priceCurrency: null };
  }
  return { priceAmount: amount, priceCurrency: draft.priceCurrency };
}

function isMetric(value: string): value is RankableMetricId {
  return RANKABLE_METRIC_IDS.some((id) => id === value);
}
