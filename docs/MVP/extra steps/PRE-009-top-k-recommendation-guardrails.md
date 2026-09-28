# PRE-009 — Top-K recommendation guardrails

**Date:** 2026-09-26  
**Purpose:** Mandatory pre-implementation rules for STEP-009  
**Status:** APPROVED PRE-STEP REQUIREMENT

Read and apply this file before implementing STEP-009.

This is not a separate roadmap implementation step. It is a guardrail contract for the Top-K recommendation engine.

---

## 1. Do not build one misleading leaderboard

STEP-009 must not simply sort every candidate by:

```text
heuristicScore descending
```

and return that as the Top-K list.

A candidate with incomplete semantic valuation is not directly comparable to a fully understood candidate solely by numeric score.

---

## 2. Complete and incomplete candidates are different classes

Use the existing path semantic coverage/confidence contract.

Conceptually:

```text
complete candidates
→ may participate in normal deterministic ranking
```

```text
incomplete candidates
→ may show their known heuristic score
→ must remain explicitly incomplete
→ must not silently rank above or below complete candidates as if fully comparable
```

The exact presentation may differ, but the distinction must remain explicit in the recommendation result.

---

## 3. Normal Top-K ranking

The primary ranked Top-K should be based on candidates that are safe to compare under the STEP-008 comparison rules.

For candidates that are:

```text
semantic confidence = complete
valuationComplete = true
```

ranking may use:

```text
heuristicScore
```

with the existing deterministic tie-break rules.

Do not switch to `scorePerPoint` as the primary ranking key unless separately approved.

---

## 4. Incomplete candidates must be surfaced separately

Candidates with:

```text
valuationComplete = false
```

or incomplete semantic coverage must not disappear.

They should be returned in a separate concept such as:

```text
incompleteCandidates
```

or:

```text
candidatesNeedingReview
```

The exact type/name is up to the implementation.

Each must retain:

- known heuristic score;
- semantic coverage ratio;
- confidence/status;
- unsupported/unmapped raw effects;
- point cost;
- node ids/path;
- search completeness.

The recommendation layer must make it clear that their full value is unknown.

---

## 5. Higher partial score is not a definitive winner

Example:

```text
Path A
score: 80
confidence: complete
valuationComplete: true
```

```text
Path B
score: 95
confidence: partial
valuationComplete: false
```

STEP-009 must not state:

```text
Path B is better.
```

Allowed interpretation:

```text
Path B has a higher known heuristic score,
but unsupported effects prevent a definitive comparison.
```

This rule must be tested.

---

## 6. Search completeness remains separate

Keep:

```text
searchCompleteness:
- exhaustive
- truncated
```

separate from:

```text
semantic confidence
```

A candidate can therefore be:

```text
exhaustive + complete
exhaustive + partial
truncated + complete
truncated + partial
```

Do not collapse these into one confidence value.

---

## 7. Truncated search claims

If the underlying path search is truncated, STEP-009 must never claim:

- global optimum;
- best possible path;
- exhaustive best path.

Allowed wording is equivalent to:

```text
highest-scoring complete path found within search limits
```

If no complete candidate exists, the wording must reflect that only incomplete candidates were found/evaluated.

---

## 8. Maximum resistance must be handled deliberately

STEP-008A showed that maximum resistance is semantically understood but currently absent from all scoring profiles.

Before STEP-009 implementation, Cursor must inspect the pinned passive-tree occurrences of maximum resistance and make one explicit decision:

### Option A — Add heuristic weights

If the stat can be safely valued heuristically, add documented weights to the appropriate profiles.

Any new weight must:

- be explicit;
- be documented;
- increment the scoring profile version;
- have calibration tests;
- remain clearly heuristic.

### Option B — Keep unscored

If it remains unscored, document why.

Then any candidate containing maximum resistance must remain valuation-incomplete and be handled by the incomplete-candidate rules above.

Do not let maximum resistance silently behave like a zero-value stat.

---

## 9. Derived Deflection remains incomplete unless build context exists

For:

```text
Gain Deflection Rating equal to N% of Evasion Rating
```

do not invent a static heuristic value if the current scorer lacks the Evasion context required to evaluate it properly.

Keep:

```text
deflection-from-evasion
```

visible and valuation-incomplete.

Do not convert it into:

```text
N% increased Deflection
```

or a flat Deflection amount.

---

## 10. Unsupported effects remain visible

Hard invariant:

```text
unsupported != zero value
```

Top-K results must preserve unsupported/unmapped effects.

Do not remove them from output just because the recommendation engine cannot rank them numerically.

---

## 11. Public recommendation result contract

The public STEP-009 result should conceptually contain:

```text
rankedCompleteCandidates
incompleteCandidates
searchCompleteness
selectionClaim
dataVersion
profileVersion
```

Each candidate should preserve at minimum:

```text
path
pointCost
heuristicScore
scorePerPoint
contributions
semanticCoverage
semanticConfidence
valuationComplete
unsupportedRawLines
searchCompleteness
```

The exact TypeScript shape may differ.

---

## 12. Do not expose a ranking-only shortcut

Do not export a normal public API that accepts scored candidates and returns only:

```text
[path1, path2, path3]
```

without their reliability metadata.

The main recommendation API must preserve the complete scored candidate objects and recommendation claim.

Internal helpers may sort arrays, but they must not become the normal application-facing contract.

---

## 13. Deterministic Top-K behavior

For fully comparable complete candidates:

Primary key:

```text
heuristicScore descending
```

Use the already documented deterministic tie-break:

1. semantic confidence rank if relevant;
2. lower point cost;
3. stable ascending node-id ordering.

Do not add undocumented gameplay preferences.

---

## 14. `K` behavior

Define and test:

```text
K = 0
K = 1
K > number of complete candidates
no candidates
only incomplete candidates
mixed complete and incomplete candidates
```

Do not crash or invent placeholder recommendations.

---

## 15. Empty complete set

If there are no fully valued candidates but incomplete candidates exist, the result must say so explicitly.

Conceptually:

```text
rankedCompleteCandidates: []
incompleteCandidates: [...]
```

Do not promote an incomplete candidate into the complete Top-K merely so the list is non-empty.

---

## 16. Data-version reproducibility

STEP-009 results must preserve enough version metadata to reproduce a recommendation.

At minimum retain:

```text
passive-tree version / pin
scoring profile version
```

The same:

```text
build
tree pin
point budget
objective
profile version
search limits
```

should produce the same recommendation ordering.

---

## 17. Recommendation claim

Reuse the existing reliability-aware claim concepts.

The recommendation result should distinguish cases such as:

```text
definitive among complete enumerated candidates
best found within search limits
not definitive due to incomplete valuation
no complete candidate available
```

The exact enum names may differ.

Do not generate marketing-style claims.

---

## 18. Maximum-resistance tests

If maximum-resistance weights are added:

Test that:

- the new weights are intentional;
- the profile version increments;
- defensive/balanced behavior changes predictably;
- offensive behavior remains deliberate;
- the stat no longer makes a path valuation-incomplete solely because of missing profile weight.

If it remains unscored:

Test that:

- the path remains valuation-incomplete;
- the stat appears in unsupported/unvalued output;
- the candidate is routed to the incomplete-candidate set.

---

## 19. Required STEP-009 tests

At minimum cover:

- complete candidates only;
- incomplete candidates only;
- mixed complete/incomplete candidates;
- partial candidate with higher score than complete candidate;
- exhaustive search;
- truncated search;
- K = 0;
- K = 1;
- K larger than candidate count;
- deterministic ties;
- same input returns same ordering;
- objective/profile changes alter ranking predictably;
- unsupported maximum resistance behavior;
- derived Deflection remains incomplete;
- no complete candidate available.

---

## 20. No LLM ranking

Do not use an LLM to:

- rank paths;
- choose the winner;
- override heuristic scores;
- decide which incomplete candidate is secretly better;
- infer missing stat value.

AI may later explain deterministic recommendation output.

---

## 21. STEP-009 scope

STEP-009 may implement:

- Top-K complete-candidate ranking;
- separate incomplete-candidate surfacing;
- recommendation claim/status;
- deterministic tie handling;
- version metadata;
- tests;
- documentation.

STEP-009 must not implement:

- exact DPS;
- exact EHP;
- gear scoring;
- crafting;
- live character import;
- OAuth;
- poe.ninja pricing;
- AI explanation;
- recommendation UI.

---

## 22. Documentation requirement

After STEP-009 is complete, create:

```text
docs/progress/STEP-009-top-k-recommendation-engine.md
```

In addition to the normal progress sections, explicitly document:

```text
Ranking Policy
Complete vs Incomplete Candidate Policy
Maximum Resistance Decision
Tie-Break Policy
K Edge Cases
Search Completeness Contract
Semantic Confidence Contract
Recommendation Claim Rules
Version/Reproducibility Metadata
Pinned Fixture Examples
```

---

## 23. Stop condition

After STEP-009 implementation, tests, and documentation are complete:

**STOP.**

Do not automatically begin the next roadmap step.

Wait for explicit review and approval.
