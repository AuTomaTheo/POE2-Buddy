import type { PassiveTreeSnapshot } from "@poe2-helper/domain";
import {
  assessPassiveTreeCompatibility,
  type PassiveTreeCompatibility,
} from "@poe2-helper/passive-engine";
import { weightedSemanticIds } from "./profiles.js";

export function assessPassiveTreeRefreshCandidate(input: {
  candidate: PassiveTreeSnapshot;
  current: PassiveTreeSnapshot | null;
  candidateClassCount: number;
}): PassiveTreeCompatibility {
  return assessPassiveTreeCompatibility({
    candidate: input.candidate,
    current: input.current,
    candidateClassCount: input.candidateClassCount,
    weightedSemanticIds: weightedSemanticIds(),
  });
}
