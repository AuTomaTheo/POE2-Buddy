import { describe, expect, it } from "vitest";
import { selectVerifiedPassiveCandidate } from "../apps/web/src/server/measure-passive-delta";

const recommendation = {
  rankedCompleteCandidates: [{ nodeIds: [4739, 18845], pointCost: 2 }],
  incompleteCandidates: [{ nodeIds: [1755], pointCost: 1 }],
};

describe("selectVerifiedPassiveCandidate", () => {
  it("accepts a server candidate only when the claimed point cost matches", () => {
    expect(
      selectVerifiedPassiveCandidate(recommendation, [4739, 18845], 2),
    ).toEqual({ verifiedPointCost: 2 });
    expect(
      selectVerifiedPassiveCandidate(recommendation, [4739, 18845], 4),
    ).toBeNull();
    expect(selectVerifiedPassiveCandidate(recommendation, [999], 1)).toBeNull();
    expect(
      selectVerifiedPassiveCandidate(recommendation, [1755], null),
    ).toBeNull();
  });
});
