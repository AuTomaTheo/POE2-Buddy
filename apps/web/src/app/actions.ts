"use server";

import {
  runPassiveAnalysis,
  type AnalysisInput,
  type AnalysisResult,
} from "../server/analyze-passive-build";
import {
  measurePassiveDelta as runPassiveDelta,
  type PassiveDeltaView,
} from "../server/measure-passive-delta";

export type { PassiveDeltaView };

export async function analyzePassiveBuild(
  input: AnalysisInput,
): Promise<AnalysisResult> {
  return runPassiveAnalysis(input);
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
