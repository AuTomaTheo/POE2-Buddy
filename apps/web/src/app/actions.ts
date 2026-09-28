"use server";

import { readExplainerMode } from "@poe2-helper/ai-explainer";
import {
  runPassiveAnalysis,
  type AnalysisInput,
} from "../server/analyze-passive-build";
import { analysisInputForDemo } from "../server/load-start-demo";
import { attachAnalysisExplanation } from "../server/explanation-from-analysis";
import {
  measurePassiveDelta as runPassiveDelta,
  type PassiveDeltaView,
} from "../server/measure-passive-delta";
import {
  compareSuppliedUpgrades,
  type UpgradeComparisonView,
  type UpgradeRequest,
} from "../server/compare-upgrades";

export type { PassiveDeltaView, UpgradeComparisonView };

export type ExplainedAnalysis = ReturnType<typeof attachAnalysisExplanation>;

export async function analyzePassiveBuild(
  input: AnalysisInput & { demoId?: string },
): Promise<ExplainedAnalysis> {
  const mode = readExplainerMode(process.env);
  const demoId = input.demoId?.trim() ?? "";
  if (demoId.length > 0 && input.fixtureJson.trim().length === 0) {
    const prepared = analysisInputForDemo(demoId);
    if (!prepared) {
      return attachAnalysisExplanation(
        { ok: false, message: "That demo is not available." },
        mode,
      );
    }
    return attachAnalysisExplanation(
      runPassiveAnalysis({
        ...prepared,
        objective: input.objective,
        pointBudget: input.pointBudget,
      }),
      mode,
    );
  }
  return attachAnalysisExplanation(runPassiveAnalysis(input), mode);
}

export async function measurePassiveDelta(input: {
  pob2Code: string;
  nodeIds: readonly number[];
  pointCost: number | null;
  objective: string;
  pointBudget: string;
}): Promise<PassiveDeltaView> {
  try {
    return await runPassiveDelta(input);
  } catch (error) {
    console.error(
      `pob2-calculator calculation-failed ${error instanceof Error ? error.name : "error"}`,
    );
    return {
      status: "error",
      code: "calculation-failed",
      message: "Character-aware calculation unavailable for this candidate.",
    };
  }
}

export async function compareUpgrades(
  input: UpgradeRequest,
): Promise<UpgradeComparisonView> {
  try {
    return await compareSuppliedUpgrades(input);
  } catch (error) {
    console.error(
      `upgrade-comparison failed ${error instanceof Error ? error.name : "error"}`,
    );
    return {
      status: "error",
      message: "The supplied items could not be compared.",
      headline: null,
      budgetText: "",
      metricLabel: "",
      comparisonCurrency: "",
      economyNote: null,
      warnings: [],
      rows: [],
    };
  }
}
