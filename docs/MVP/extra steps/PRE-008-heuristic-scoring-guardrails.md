# PRE-008 — Heuristic scoring guardrails

**Date:** 2026-09-26  
**Purpose:** Mandatory pre-implementation rules for STEP-008  
**Status:** APPROVED PRE-STEP REQUIREMENT

Read and apply this file before implementing STEP-008.

Do not treat this as a separate roadmap implementation step. It is a guardrail contract for STEP-008.

---

## 1. No public score-only API

The public scoring API must not return only a numeric score.

Every scored candidate must also expose:

- `pathSemanticCoverage`
- semantic confidence/status
- unsupported/unmapped raw stat lines
- `searchCompleteness`
- score contribution breakdown

Lower-level numeric helpers may exist internally, but the normal exported scorer must preserve the reliability context.

---

## 2. Unknown stats are not zero

Hard invariant:

```text
unsupported effect != zero-value effect
```

A stat that is unrecognized or semantically unmapped may be omitted from the numeric heuristic calculation, but it must remain visible through path coverage and unsupported-line reporting.

Do not silently assign unknown stats a value of zero and describe the result as complete.

---

## 3. Semantic confidence affects comparison claims

A numerically higher score on a semantically incomplete path is not automatically better than a complete path.

Example:

```text
Path A
score: 84
semantic coverage: 100%
confidence: complete
```

```text
Path B
score: 92
semantic coverage: 76%
confidence: partial
```

STEP-008 must not conclude that Path B is definitively superior solely because `92 > 84`.

The comparison policy for mixed-confidence candidates must be deterministic, documented, and tested.

---

## 4. Search completeness is separate

Keep these two dimensions separate:

```text
searchCompleteness:
- exhaustive
- truncated
```

and:

```text
semantic confidence:
- complete
- high
- partial
- low
```

Do not merge them into a single generic confidence field.

If the search is truncated, never claim:

- global optimum
- best possible path
- exhaustive best path

Use wording equivalent to:

```text
highest-scoring path found within search limits
```

---

## 5. Heuristic means heuristic

Continue using terminology such as:

```text
heuristicScore
```

Do not call it:

```text
DPS
true power
optimality
exact value
```

STEP-008 is not an exact PoB-style simulation.

---

## 6. Weights must be explicit and configurable

Weights must live in explicit configuration/profile data rather than being buried inside scoring logic.

The same semantic stats should be reusable with different profiles such as:

```text
offensive
defensive
balanced
```

Objectives change weights, not parsing.

Changing a weight must not require rewriting scoring logic.

---

## 7. Preserve operation semantics

Do not treat these as equivalent:

```text
flat
increased
reduced
more
less
penetration
conversion
gain-as-extra
derived-from
```

If an operation cannot yet be valued safely, leave it unscored/incomplete rather than inventing an equivalence.

---

## 8. Conditional stats require an explicit policy

Stats containing conditions such as:

```text
while
if
when
against
with
for
per
```

must not automatically receive full unconditional value.

STEP-008 must explicitly decide whether such effects are:

- unsupported for scoring; or
- handled with a documented configurable heuristic factor.

Do not silently assume conditions are always active.

---

## 9. Derived stats remain derived

Example:

```text
Gain Deflection Rating equal to N% of Evasion Rating
```

must not be treated as:

```text
N% increased Deflection
```

or:

```text
+N Deflection
```

unless the required build context exists to calculate it.

Otherwise keep it visible but unscored/incomplete.

---

## 10. Score breakdown is mandatory

Every score must be explainable through contributions.

Conceptually:

```text
Total heuristic score: 82.5

Contributions:
Projectile Damage     +20
Critical Chance       +15
Projectile Speed      +12
Evasion               +18
Deflection            +10
Life                   +7.5
```

The exact format may differ.

Do not return only the total.

---

## 11. Path cost must remain explicit

Do not accidentally penalize longer paths twice.

If useful, keep these separate:

```text
rawHeuristicScore
scorePerPoint
pointCost
```

Document exactly which value is used for candidate comparison.

---

## 12. Deterministic tie handling

If two candidates have equal scores, use a deterministic tie-break rule.

Possible inputs include:

- semantic completeness
- point cost
- stable node-id ordering

Do not invent undocumented gameplay preferences simply to break ties.

---

## 13. No LLM scoring

All scoring must remain deterministic.

Do not use an LLM to decide:

- stat value
- passive value
- path legality
- weights
- numeric score
- mathematical winner

AI may later explain deterministic results.

---

## 14. Required STEP-008 tests

STEP-008 tests must include:

- complete vs complete paths
- complete vs partial paths
- unsupported effects
- exhaustive search
- truncated search
- objective/profile changes
- configurable weight changes
- score ties
- zero-budget / empty-candidate behavior

Tests must prove that:

```text
higher numeric score != automatically definitive winner
```

when semantic reliability differs.

---

## 15. Current readiness baseline

STEP-007D approved the pinned PoE2 `0.5.5` passive tree for heuristic MVP scoring.

Current context:

```text
Structural coverage: 80.1%
Semantic coverage:   48.8%
Blocking families:   none
Readiness:            ready
```

The remaining unmapped/unknown stats must remain visible and must not be treated as zero-value effects.

---

## 16. STEP-008 scope

STEP-008 may implement:

- configurable heuristic weight profiles
- semantic contribution scoring
- candidate path scoring
- score breakdowns
- reliability-aware results
- deterministic candidate comparison
- tests
- documentation

STEP-008 must not implement:

- exact DPS
- exact EHP
- PoB integration
- gear scoring
- crafting
- live OAuth character import
- poe.ninja pricing
- AI explanations
- recommendation UI

---

## 17. Public result contract

A scored candidate should conceptually expose:

```text
path
pointCost
heuristicScore
scorePerPoint (if used)
contributions
pathSemanticCoverage
semantic confidence
unsupportedRawLines
searchCompleteness
```

The exact TypeScript shape may differ, but reliability context must not be optional in the normal public scoring flow.

---

## 18. Documentation

When STEP-008 is complete, create:

```text
docs/progress/STEP-008-configurable-heuristic-scoring.md
```

In addition to the normal progress-document sections, include:

```text
Scoring Formula
Weight Profiles
Operation Handling
Conditional Stat Policy
Path Comparison Policy
Tie-Break Policy
Semantic Coverage Contract
Search Completeness Contract
Known Unscored Effects
Pinned Fixture Examples
```

---

## 19. Stop condition

After STEP-008 implementation, tests, and documentation are complete:

**STOP.**

Do not automatically begin the next roadmap step.

Wait for explicit review and approval.
