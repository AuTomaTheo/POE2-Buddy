# STEP-018C.1 — Trade-off visibility and ranking-summary fidelity

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018C.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the two remaining STEP-018C fidelity gaps before freezing the budget-aware comparison layer:

```text
1. all meaningful measured metric changes must remain visible,
   even when those metrics are not allowed as ranking metrics;

2. the comparison headline must remain truthful when no positive
   within-budget candidate exists.
```

This is a small correctness/UX closure step.

It must not change the core cost-efficiency formula, PoB2 calculator behavior, price model, or candidate sourcing model.

---

## 2. Why this step is required

STEP-018C correctly restricts ranking to a conservative metric allowlist such as:

```text
Total DPS
Combined DPS
Average Hit
Life
Energy Shield
Total EHP
Armour
Evasion
```

That restriction is good.

However:

```text
not rankable
!=
not important
```

A candidate may improve the selected metric while harming:

```text
Fire Resistance
Cold Resistance
Lightning Resistance
Chaos Resistance
Crit Chance
Hit Chance
Deflect Chance
Mana
Spirit
Deflection Rating
or another measured metric
```

Those changes must remain visible as trade-offs.

Separately, the summary/headline must not imply a positive recommendation if every affordable candidate is neutral or negative for the selected metric.

---

## 3. Core invariants

Hard rule:

```text
ranking metric
controls ordering
```

but:

```text
all meaningful measured deltas
remain inspectable
```

Also:

```text
no positive within-budget candidate
→ no positive-winner headline
```

---

## 4. Acceptance criteria

- [ ] The selected ranking metric remains unchanged in behavior.
- [ ] Initial rankable metric allowlist remains unchanged unless a separate decision explicitly changes it.
- [ ] All measured non-zero calculator deltas are preserved for display.
- [ ] Non-rankable metrics are not silently dropped from candidate trade-offs.
- [ ] Resistance/chance/resource changes may be displayed without becoming ranking metrics.
- [ ] Candidate ordering still uses only the selected rankable metric and price policy.
- [ ] Trade-off visibility does not affect ranking.
- [ ] The UI distinguishes ranking metrics from supporting trade-off metrics.
- [ ] The comparison headline is safe when no positive within-budget candidate exists.
- [ ] The comparison headline is safe when only over-budget positive candidates exist.
- [ ] The comparison headline is safe when all candidates are unrankable.
- [ ] The comparison headline is safe when the top within-budget candidate has zero delta.
- [ ] Existing price/economy behavior remains unchanged.
- [ ] Existing PoB2 delta behavior remains unchanged.
- [ ] No trade search, crafting, candidate generation, or composite score is added.
- [ ] Default tests remain offline.
- [ ] Repository checks pass.
- [ ] Create:
      `docs/progress/STEP-018C-1-trade-off-visibility-and-ranking-summary-fidelity.md`

---

## 5. Scope

STEP-018C.1 may change:

```text
upgrade-engine comparison view model
trade-off extraction
summary/headline generation
comparison UI
tests
documentation
```

STEP-018C.1 must not change:

```text
PoB2 worker
item replacement mutation
runtime fingerprinting
price conversion formulas
budget semantics
selected-metric efficiency formula
candidate source policy
trade/economy provider behavior
```

---

## 6. Separate ranking metrics from visible metrics

Keep two distinct concepts.

### Rankable metrics

Metrics permitted to control ordering.

Current allowlist remains:

```text
TotalDPS
CombinedDPS
AverageHit
Life
EnergyShield
TotalEHP
Armour
Evasion
```

### Visible measured metrics

Any supported calculator metric that has a meaningful before/after delta.

Conceptually:

```text
visible metric
=
calculator metric exists
AND before exists
AND after exists
AND delta is meaningful
```

Do not require the metric to be rankable.

---

## 7. Visible trade-off inventory

Candidates should preserve/display measured changes from the calculator catalog including, when available:

```text
AverageDamage
AverageHit
TotalDPS
CombinedDPS
CritChance
CritMultiplier
Speed
CastRate
HitChance
Life
EnergyShield
Armour
Evasion
DeflectionRating
DeflectChance
TotalEHP
Mana
Spirit
FireResist
ColdResist
LightningResist
ChaosResist
```

Do not invent values for missing metrics.

---

## 8. Non-zero display policy

Default trade-off view should include metrics where:

```text
absoluteDelta != 0
```

using raw numeric comparison before display rounding.

Optional:

```text
selected ranking metric
```

may remain visible even when its delta is zero.

Do not hide a small real delta merely because display rounding makes it appear as zero.

---

## 9. Missing metric behavior

If a metric is absent from the calculator result:

```text
do not display it
```

Do not render:

```text
0
no change
unknown = zero
```

unless PoB2 actually supplied zero.

---

## 10. Trade-off type

Add a display-only categorization if useful:

```text
improved
decreased
unchanged
```

This must be based on raw delta sign only.

Do not interpret the metric as globally good/bad beyond its numeric direction.

For example:

```text
FireResist -20 percentage points
```

can be labeled:

```text
decreased
```

but not:

```text
bad item
```

---

## 11. Percentage-point metrics

For:

```text
CritChance
HitChance
DeflectChance
resistances
```

show absolute percentage-point change according to the existing calculator semantics.

Example:

```text
Fire Resistance
75% → 45%
-30 percentage points
```

Do not create an efficiency percentage for these metrics.

---

## 12. Resource/absolute metrics

For:

```text
Mana
Spirit
DeflectionRating
CritMultiplier
```

use the calculator's existing absolute-delta representation.

They may be shown as trade-offs even though they are not ranking metrics.

---

## 13. Selected metric remains primary

The ranking metric should remain visually prominent.

Example:

```text
Ranked by: Life efficiency
```

Trade-offs should appear underneath or in an expandable/details section.

Do not make secondary metrics look like hidden ranking inputs.

---

## 14. Trade-off display model

Conceptually extend each candidate result with:

```text
displayMetricDeltas[]
```

Each row may include:

```text
metricId
label
before
after
absoluteDelta
percentDelta?
unit
category
isRankingMetric
```

Do not add:

```text
importance
weight
score
```

---

## 15. No hidden trade-off filtering by rankability

Hard rule:

```text
rankableMetricIds
```

must not be reused as:

```text
visibleTradeoffMetricIds
```

Those are different policies.

---

## 16. Candidate comparison table

Keep the compact table focused on:

```text
Candidate
Price
Budget status
Selected metric
Gain
Efficiency
```

Then expose:

```text
Other measured changes
```

per candidate.

This can be:

```text
expandable details
secondary rows
compact chips/text
```

Use the simplest readable UI.

---

## 17. Example trade-off display

```text
Candidate A

Ranked metric:
Life
382 → 464
+21.5%

Other measured changes:
Total EHP 331.5 → 396.6 (+19.6%)
Armour 194 → 144 (-50)
Mana 174 → 172 (-2)
Fire Resistance 75% → 45% (-30 percentage points)
```

Only show metrics actually present in the calculation.

---

## 18. No cross-metric verdict

Do not produce:

```text
overall positive
overall negative
balanced upgrade
risky upgrade
```

from trade-off rows.

STEP-018C.1 exposes facts only.

---

## 19. Ranking summary states

Create an explicit summary state rather than assuming the first ordered row is a positive winner.

Recommended states:

```text
positive-within-budget
no-positive-within-budget
no-rankable-candidates
partial-comparison
```

Exact names may differ.

---

## 20. Positive-within-budget summary

When at least one candidate has:

```text
within-budget
AND rankable
AND selectedMetricDelta > 0
AND valid positive efficiency
```

the existing style is allowed:

```text
Candidate A has the highest measured Life gain per chaos
among these supplied items within the stated budget.
```

---

## 21. No-positive-within-budget summary

If no within-budget candidate has positive selected-metric benefit:

do not name a winner.

Preferred wording:

```text
No supplied candidate provides a positive Life improvement within this budget.
```

or:

```text
No supplied candidate provides a positive Total-DPS improvement within this budget.
```

Candidates remain visible.

---

## 22. Positive but over-budget case

Example:

```text
Budget: 100 chaos

Candidate A
+15% Total DPS
200 chaos

Candidate B
-2% Total DPS
50 chaos
```

Headline must not select Candidate B.

Preferred:

```text
No supplied candidate provides a positive Total-DPS improvement within this budget.
Candidate A improves Total DPS but is over budget.
```

The second sentence may be omitted if the table already makes that clear.

---

## 23. Zero-benefit affordable case

Example:

```text
Candidate A
0% Life
50 chaos
```

Do not say:

```text
highest Life gain
```

when the gain is zero.

Use the no-positive summary.

---

## 24. All-unrankable case

If every candidate lacks:

```text
valid selected metric
or
valid price normalization
or
successful measurement
```

summary should state:

```text
These candidates cannot be ranked for the selected metric with the available measurements and prices.
```

Do not pick the first ordered row.

---

## 25. Partial comparison case

If some candidates are rankable and others are not:

```text
rank valid candidates
```

and state that some supplied candidates were excluded from ordering.

Example:

```text
2 of 3 supplied candidates could be ranked for Total EHP efficiency.
```

Avoid implying the ranking covers candidates that lacked price/metric data.

---

## 26. Headline source

Headline generation must use the structured comparison state.

Do not derive it solely from:

```text
orderedCandidates[0]
```

That pattern caused the ambiguity this closure step is preventing.

---

## 27. Server-side summary generation

Prefer generating:

```text
summary state
winnerCandidateId?
rankedCandidateCount
positiveWithinBudgetCount
```

inside the upgrade engine/server result.

The client should render structured facts.

Do not make the browser independently reimplement ranking-summary logic.

---

## 28. Ordering stays unchanged

Do not alter the existing candidate group ordering merely to fix headline wording.

The table may still order:

```text
1 positive within budget
2 zero/negative within budget
3 over budget
4 unrankable
```

This step changes visibility and interpretation, not the ranking formula.

---

## 29. Metric-specific wording

Headline must always name the selected metric.

Good:

```text
No supplied candidate provides a positive Total-EHP improvement within this budget.
```

Bad:

```text
No good upgrades found.
```

---

## 30. Budget wording

Preserve the STEP-018C meaning:

```text
budget = maximum acquisition cost of one candidate
```

Do not introduce combined-shopping-budget wording.

---

## 31. Price provenance unchanged

Trade-off visibility must not alter:

```text
user-entered price
normalized price
economy snapshot
price confidence
```

No new price source.

---

## 32. Economy behavior unchanged

No additional poe.ninja calls.

Trade-off metrics come from PoB2 measurements, not economy data.

---

## 33. Calculator behavior unchanged

Do not rerun PoB2 solely to expose additional metrics if those metrics are already returned by the item delta result.

If the orchestration currently discards calculator metric rows too early, preserve them in the comparison view model instead.

---

## 34. Candidate failure behavior

A failed candidate may still show:

```text
measurement unavailable
price
label
slot
```

It must not have fabricated trade-off rows.

---

## 35. Test — hidden resistance loss

Add a regression case:

```text
Candidate A:
Life +20%
FireResist -30 percentage points

Candidate B:
Life +10%
FireResist 0
```

Rank by Life.

Expected:

```text
A may rank above B
FireResist loss remains visible for A
```

Resistance must not become a ranking input.

---

## 36. Test — chance/resource trade-offs

Add at least one case with:

```text
CritChance
Mana
Spirit
DeflectChance
```

where those metrics change.

Verify they are visible but do not alter ranking order.

---

## 37. Test — no positive affordable candidate

Input:

```text
Budget: 100 chaos

A:
+15% TotalDPS
200 chaos

B:
-2% TotalDPS
50 chaos
```

Expected summary:

```text
no-positive-within-budget
```

No winner id.

---

## 38. Test — zero benefit

Input:

```text
A:
0% Life
40 chaos
```

Expected:

```text
no-positive-within-budget
```

Do not label A as having the highest positive gain.

---

## 39. Test — all unrankable

Use candidates with:

```text
missing price
missing selected metric
calculator failure
```

Expected:

```text
no-rankable-candidates
```

No winner.

---

## 40. Test — partial comparison

Example:

```text
A rankable
B rankable
C missing price
```

Expected:

```text
rankedCandidateCount = 2
comparison remains partial
headline applies only to ranked candidates
```

---

## 41. Test — ranking unchanged

Reuse an existing STEP-018C comparison where:

```text
A ranks above B
```

Add non-rankable trade-off metric changes.

Expected:

```text
A still ranks above B
```

This proves trade-off visibility does not become hidden weighting.

---

## 42. Browser verification

Demonstrate at least:

### Scenario A — visible trade-off

Two candidate items where the higher-ranked item loses at least one non-rankable measured metric.

Verify that metric is visible.

### Scenario B — no positive within budget

Verify the headline states no positive candidate fits the budget and does not name a winner.

---

## 43. UI wording

Preferred section labels:

```text
Ranking metric
Other measured changes
Within budget
Over budget
Price unavailable
```

Avoid:

```text
Pros
Cons
Good
Bad
Best overall
```

Those imply evaluation across metrics.

---

## 44. Accessibility/readability

Do not rely only on green/red color to indicate metric direction.

Use:

```text
+ / -
text labels
numeric deltas
```

Color may supplement but not replace text.

---

## 45. Upgrade engine version

This change can alter user-visible comparison output for identical inputs.

Increment:

```text
UPGRADE_ENGINE_VERSION
```

Recommended:

```text
1 → 2
```

Reason:

```text
trade-off visibility + summary-state semantics
```

Even if candidate ordering remains the same.

---

## 46. Schema/version behavior

If the comparison result schema changes to add:

```text
summaryState
winnerCandidateId?
displayMetricDeltas
rankedCandidateCount
```

validate it explicitly.

Do not silently tolerate an old result shape as version 2.

---

## 47. Documentation

Create:

```text
docs/progress/STEP-018C-1-trade-off-visibility-and-ranking-summary-fidelity.md
```

Include:

```text
Why STEP-018C Needed Closure
Rankable vs Visible Metrics
Visible Trade-Off Policy
Non-Zero Metric Policy
Percentage-Point Display
Comparison Summary States
Positive Within-Budget Summary
No-Positive Summary
All-Unrankable Summary
Partial Comparison Summary
Winner-ID Policy
Ordering Regression
Upgrade Engine Version
UI Verification
Security / Privacy
Known Limitations
STEP-018 Chain Status
Next-Step Options
```

---

## 48. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for durable decisions:

```text
non-rankable measured metrics remain visible
ranking and trade-off visibility are separate policies
winner exists only for positive within-budget rankable result
no-positive-within-budget has no winner
UPGRADE_ENGINE_VERSION = 2
```

---

## 49. Security/privacy

No new external calls.

Do not log additional raw item text or build XML.

This step should only preserve/display already measured numeric deltas.

---

## 50. Performance

No new PoB2 calculation should be necessary solely for trade-off display.

If all measured metrics are already present:

```text
performance impact should be negligible
```

Document any unexpected recalculation if implementation architecture requires one.

---

## 51. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run the existing opt-in calculator comparison test if the integration/view-model path changed materially:

```bash
npm run test:pob2-calculator
```

Default tests remain offline.

---

## 52. Non-goals

Do not implement:

- new ranking metrics;
- resistance valuation;
- resistance-cap optimization;
- crit-specific valuation;
- hidden trade-off weights;
- automatic candidate sourcing;
- trade search;
- crafting;
- multi-item optimization;
- passive reranking;
- AI recommendations.

---

## 53. Expected result — visible trade-off

```text
Budget:
100 chaos

Rank by:
Life efficiency

Candidate A
Price: 40 chaos
Life: +20%
Efficiency: 5.0% Life per 10 chaos

Other measured changes:
Total EHP +12%
Armour -50
Fire Resistance -30 percentage points
Mana -2
```

Candidate A may remain first by Life efficiency.

The system does not hide the resistance/armour/resource trade-offs.

---

## 54. Expected result — no positive affordable candidate

```text
Budget:
100 chaos

Rank by:
Total DPS efficiency

Candidate A
+15% Total DPS
200 chaos
Over budget

Candidate B
-2% Total DPS
50 chaos
Within budget

Summary:
No supplied candidate provides a positive Total-DPS improvement within this budget.
```

Do not generate:

```text
Candidate B has the highest Total-DPS gain per chaos.
```

---

## 55. STEP-018 chain completion gate

After this closure succeeds, consider:

```text
STEP-018
STEP-018A
STEP-018A.1
STEP-018B
STEP-018B.1
STEP-018C
STEP-018C.1
```

as a frozen foundation for:

```text
import
→ understand build
→ measure explicit changes
→ attach explicit cost
→ compare by explicit metric
→ expose trade-offs
```

Do not reopen this chain unless a real bug or new requirement requires it.

---

## 56. Next-step options after validation

After STEP-018C.1 review, choose deliberately among:

```text
A. candidate sourcing / supported trade-integration research
B. original STEP-019 crafting data ingestion
C. passive PoB2 reranking
D. runtime skill-metadata enrichment for CharacterContext
```

Do not automatically start any of them.

---

## 57. Stop condition

After trade-off visibility, safe summary states, tests, browser verification, versioning, and documentation are complete:

**STOP.**

Wait for explicit review and approval before the next roadmap decision.
