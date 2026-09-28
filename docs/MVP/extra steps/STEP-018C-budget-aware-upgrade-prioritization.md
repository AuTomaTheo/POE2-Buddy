# STEP-018C — Budget-aware upgrade prioritization

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the first budget-aware upgrade-prioritization layer on top of the trusted character-aware delta evaluator.

PoE2 Buddy can already measure:

```text
current build
→ explicit passive candidate
→ whole-build metric deltas
```

and:

```text
current build
→ explicit replacement item
→ whole-build metric deltas
```

STEP-018C must combine:

```text
measured character benefit
+
explicit/trustworthy cost information
+
user-selected comparison metric
```

to answer:

```text
Which supplied upgrade candidate gives the best measurable improvement
for the selected metric within the stated budget?
```

This step must not fabricate arbitrary rare-item prices, scrape undocumented trade APIs, or hide multiple build metrics inside one generic score.

---

## 2. Why this step is now safe

Earlier roadmap versions proposed budget ranking before Buddy could measure real character impact.

That would have required:

```text
generic stat weights
generic gear scores
```

STEP-018B / STEP-018B.1 now provide:

```text
exact candidate identity
verified point cost
runtime fingerprint
version compatibility
whole-build PoB2 deltas
item replacement
restore verification
```

Therefore STEP-018C can compare measured candidates instead of guessing item quality.

---

## 3. Core invariants

```text
price != quality
```

```text
measured delta != universal value
```

```text
budget efficiency must be tied to an explicit metric
```

Allowed:

```text
Candidate A costs 40 chaos and gives +8.2% Total DPS.
Candidate B costs 90 chaos and gives +11.4% Total DPS.
Candidate A has more Total-DPS gain per chaos.
```

Not allowed:

```text
Candidate A is universally better.
```

---

## 4. Acceptance criteria

- [ ] A budget-aware comparison model exists.
- [ ] Comparison operates on explicit item candidates, not generated rare items.
- [ ] Each candidate is measured through `evaluateItemReplacement`.
- [ ] Candidate price has explicit provenance.
- [ ] User-entered price is supported.
- [ ] Supported economy-derived currency normalization is optional.
- [ ] Arbitrary rare-item market prices are never fabricated.
- [ ] User explicitly selects the ranking metric.
- [ ] Ranking is metric-specific, not a hidden composite score.
- [ ] Candidates outside budget are clearly marked.
- [ ] Missing price does not become zero.
- [ ] Missing metric does not become zero.
- [ ] Zero/negative benefit is handled explicitly.
- [ ] Other metric deltas remain visible beside the selected metric.
- [ ] Calculator provenance stays attached per candidate.
- [ ] Price provenance stays attached per candidate.
- [ ] Estimated/normalized/user-entered prices are clearly distinguished.
- [ ] At least two explicit item candidates can be compared.
- [ ] Cross-slot comparison is allowed only under one selected comparable metric.
- [ ] Existing passive heuristic remains unchanged.
- [ ] Existing passive/item delta behavior remains unchanged.
- [ ] Gear normalization remains unchanged.
- [ ] CharacterContext remains unchanged.
- [ ] No crafting or trade search is added.
- [ ] Default tests require no PoB2 runtime or live network.
- [ ] Required repository checks pass.
- [ ] Create `docs/progress/STEP-018C-budget-aware-upgrade-prioritization.md`.

---

## 5. Scope

STEP-018C may implement:

```text
explicit item candidate list
price model
budget model
currency normalization
selected metric
candidate evaluation orchestration
metric-specific cost efficiency
budget eligibility
deterministic ordering
comparison UI
price provenance
comparison readiness
warnings
```

STEP-018C must not implement:

```text
rare-item trade search
automatic item generation
target-item synthesis
crafting
AI valuation
generic item score
hidden multi-metric weights
automatic purchase
```

---

## 6. Upgrade candidate model

Conceptually:

```text
UpgradeCandidate {
  id
  slot
  rawItemText
  label?
  price?
}
```

A candidate without price may still be measured and displayed, but it is:

```text
not budget-rankable
```

---

## 7. Candidate source policy

For MVP, candidates may come from:

```text
user paste
fixtures/tests
future trusted provider adapter
```

Do not scrape rare listings and do not synthesize replacement rares.

---

## 8. Candidate identity

Preserve at least:

```text
candidate id
slot
display name/base type where available
raw item checksum
```

Do not rely on display name alone.

---

## 9. Price model

Conceptually:

```text
CandidatePrice {
  amount
  currency
  source
  sourceTimestamp?
  confidence
  note?
}
```

Supported source kinds:

```text
user-entered
supported-economy
fixture
```

Never:

```text
AI-estimated
guessed-from-rarity
guessed-from-mods
```

---

## 10. User-entered price

User-entered price is a valid MVP source.

Examples:

```text
60 chaos
1.5 divine
```

Label it:

```text
User-entered price
```

not:

```text
Live market price
```

---

## 11. Economy data boundary

Reuse the existing poe.ninja economy adapter only where it reliably supports currency conversion or another explicitly normalized economy category.

Typical safe use:

```text
Divine → Chaos equivalent
```

Do not stretch economy data into arbitrary rare-item pricing.

---

## 12. No arbitrary rare-item pricing

Hard rule:

```text
raw rare item
→ no automatic market price
```

unless a future supported source reliably matches the exact item/mod combination.

If automatic pricing is unavailable:

```text
use user-entered acquisition price
```

---

## 13. Price provenance

Every price used in ranking must expose:

```text
source
input amount/currency
normalized amount/currency
conversion rate if used
economy snapshot timestamp/version if available
```

Keep candidate acquisition price separate from currency-conversion data.

---

## 14. Price confidence

Recommended categorical states:

```text
exact-input
normalized
estimated
unavailable
```

Do not create a numeric confidence score.

`estimated` may only be used if a future supported provider actually supplies an estimate.

---

## 15. Budget input

Add:

```text
budget amount
budget currency
```

Normalize budget and candidate prices through the same conversion snapshot.

If conversion is unavailable:

```text
cross-currency budget comparison unavailable
```

Do not guess.

---

## 16. Canonical comparison currency

Preferred MVP:

```text
chaos-equivalent
```

if existing economy data can reliably normalize supported currencies.

Otherwise restrict a comparison to one common currency.

Document whichever rule is implemented.

---

## 17. One economy snapshot per comparison

All conversions in one comparison must use one consistent economy snapshot.

Do not convert candidates against different exchange-rate snapshots.

Record the snapshot provenance.

---

## 18. Economy failure behavior

Economy failure must not break PoB2 delta calculation.

Possible behavior:

```text
same-currency candidates can still compare
cross-currency ranking unavailable
```

Calculator and economy readiness stay separate.

---

## 19. Primary ranking metric

The user explicitly chooses the metric.

Initial candidate metrics may include:

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

Only expose metrics supported by the calculator catalog.

---

## 20. No hidden objective inference

Do not automatically infer:

```text
offensive build → rank by TotalDPS
```

from CharacterContext.

The selected metric for ranking must be explicit.

---

## 21. Initial rankable metric allowlist

Recommended:

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

Keep resistance/chance metrics visible but not initially rankable.

Reason: cap mechanics and percentage-point semantics make simple price efficiency misleading.

---

## 22. Metric validity

A candidate is rankable for the selected metric only when:

```text
baseline value exists
candidate value exists
delta exists
price can be normalized
```

Missing values remain unavailable, not zero.

---

## 23. Metric direction

For MVP, support only metrics where:

```text
higher = better
```

Document that restriction.

Do not add generic minimize/inversion logic until a real supported metric needs it.

---

## 24. Metric delta used for efficiency

For percent-enabled metrics:

```text
use percentDelta
```

For absolute-only supported ranking metrics:

```text
use absoluteDelta
```

Do not manufacture percentages the calculator deliberately omitted.

---

## 25. Budget eligibility

Candidate status:

```text
within-budget
over-budget
price-unavailable
```

Do not hide over-budget candidates by default.

A candidate may be highly effective but over budget; both facts should remain visible.

---

## 26. Efficiency formula

For percent-enabled metrics and a positive normalized price:

```text
efficiency =
percentDelta / normalizedPrice
```

Display may scale this to:

```text
% gain per 10 chaos
```

For absolute metrics:

```text
efficiency =
absoluteDelta / normalizedPrice
```

Example:

```text
Life gained per 10 chaos
```

Never call this an overall item score.

---

## 27. Zero price

If price is zero:

```text
efficiency = not-applicable
```

Do not divide by zero or emit infinity.

Zero can represent an already-owned/test item, but it is not meaningful for cost-efficiency ranking.

---

## 28. Negative price

Reject negative price as invalid.

---

## 29. Zero and negative benefit

If selected metric delta is zero:

```text
efficiency = 0
```

for a valid positive price.

If delta is negative, preserve the negative result.

Do not silently clamp it into a positive or neutral upgrade.

---

## 30. Ranking policy

Recommended ordering:

```text
1. within-budget candidates with valid positive efficiency
2. within-budget candidates with zero/negative selected-metric benefit
3. over-budget candidates
4. candidates missing price or selected metric
```

Within the primary group:

```text
higher selected-metric efficiency first
```

---

## 31. Deterministic tie-breakers

Recommended:

```text
higher selected-metric improvement
lower normalized price
stable candidate id
```

Do not use hidden unrelated metrics as tie-breakers.

---

## 32. Ranking wording

Allowed:

```text
Highest Total-DPS gain per chaos among these supplied candidates.
```

Allowed:

```text
Highest Total-EHP efficiency among the supplied items within this budget.
```

Avoid:

```text
Best item overall.
```

The ordering is conditional on:

```text
candidate set
selected metric
budget
price inputs
calculator/runtime version
```

---

## 33. Candidate comparison result

Conceptually:

```text
BudgetAwareCandidateResult {
  candidate
  price
  normalizedPrice
  deltaResult
  selectedMetric
  selectedMetricDelta
  efficiency
  budgetStatus
  rankability
  warnings
}
```

---

## 34. Comparison result

Conceptually:

```text
BudgetAwareComparison {
  selectedMetric
  budget
  comparisonCurrency
  economySnapshot?
  candidates[]
  ordering
  readiness
  provenance
  warnings
}
```

No universal numeric score.

---

## 35. Provenance domains

Preserve calculator provenance separately from price provenance.

### Calculator

```text
PoB2 version
PoB2 tree key
Buddy tree pin
runtime fingerprint
build checksum
adapter/protocol version
```

### Price

```text
input price
price source
conversion rate
comparison currency
economy snapshot
```

---

## 36. Same baseline requirement

All candidates in one comparison must use the same:

```text
baseline build checksum
runtime fingerprint
PoB2 version/tree
selected active effect
```

Mismatch:

```text
comparison-invalid
```

Do not compare unrelated baselines.

---

## 37. Candidate limit

Set a conservative MVP limit.

Recommended:

```text
10 explicit candidates
```

or another small measured limit.

Do not accept unbounded item lists.

---

## 38. Same-slot comparison

Primary MVP use case:

```text
Helmet A
Helmet B
Helmet C
```

all replacing the same slot.

This should be fully supported.

---

## 39. Cross-slot comparison

May be supported when each candidate is evaluated independently against the same baseline and same selected metric.

Show a warning:

```text
These are one-at-a-time replacement effects, not combined effects.
```

---

## 40. No combination optimizer

Do not solve:

```text
best combination of multiple items under total budget
```

in this step.

Do not sum independent deltas because PoB interactions are nonlinear.

---

## 41. Budget semantics

For MVP:

```text
budget = maximum acquisition cost for one candidate
```

not a multi-item shopping budget.

Make this explicit in UI/documentation.

---

## 42. Price source separation

STEP-018C needs:

```text
candidate acquisition cost
```

It does not need to estimate:

```text
current item resale value
```

Keep those concepts separate.

---

## 43. poe.ninja boundary

Use the existing backend economy adapter.

Do not call poe.ninja from the browser.

Preserve caching, User-Agent/contact, retry/backoff, and non-abusive polling rules from STEP-013.

---

## 44. No exact rare lookup assumption

If the explicit item cannot map to a supported economy entity:

```text
automatic item price = unavailable
```

Use a user-entered candidate price.

Do not derive price from its modifiers.

---

## 45. Economy readiness

Recommended:

```text
ready
partial
unavailable
```

`ready`: all required conversions exist.

`partial`: some candidates cannot be normalized.

`unavailable`: no valid common comparison currency can be established.

Keep separate from calculator readiness.

---

## 46. Comparison readiness

Recommended:

```text
ready
partial
insufficient
```

`ready`: at least two rankable candidates.

`partial`: some can be ranked, others cannot.

`insufficient`: no meaningful ranking can be produced.

---

## 47. Trade-off visibility

Every candidate should preserve other important changed metrics.

Example:

```text
Candidate A
Total DPS +10%
Life -8%

Candidate B
Total DPS +7%
Life +5%
```

If ranking by DPS efficiency, A may rank above B.

That must not hide B's Life improvement or A's Life loss.

---

## 48. Candidate failure independence

One PoB2 candidate failure should not necessarily invalidate the others.

Return a candidate-specific error and continue safely.

Failed candidates do not participate in ranking.

---

## 49. Missing-price behavior

If price is unavailable:

```text
show the PoB2 delta
do not assign budget rank
```

Never use zero as the fallback price.

---

## 50. Cross-currency failure

If prices cannot be normalized into a common currency:

```text
do not cross-rank
```

The user may enter both prices in the same currency instead.

---

## 51. Recommended package boundary

Prefer:

```text
packages/upgrade-engine
```

Responsibilities:

```text
candidate schemas
price normalization
budget rules
metric policy
efficiency math
ordering
comparison readiness
```

Do not put HTTP or PoB process management inside this package.

---

## 52. Dependency flow

```text
data-sources/economy
        ↓
normalized conversion snapshot

pob2-calculator
        ↓
character-aware item delta

server orchestration
        ↓
upgrade-engine
        ↓
budget-aware comparison

web
        ↓
presentation
```

Avoid circular dependencies.

---

## 53. Pure upgrade engine

`upgrade-engine` must not:

```text
spawn PoB2
parse PoB XML
call poe.ninja
mutate items
```

It consumes normalized deltas and normalized price context.

---

## 54. Price normalization context

Conceptually:

```text
PriceNormalizationContext {
  comparisonCurrency
  rates
  source
  fetchedAt
}
```

Be explicit about rate direction, e.g.:

```text
1 Divine = X Chaos
```

Do not invert it accidentally.

---

## 55. Math precision

Use raw numeric values for:

```text
price normalization
efficiency
ordering
```

Round only for display.

---

## 56. Stable ordering

Same inputs must produce the same ordering.

No randomness.

No live fetch inside the pure comparison function.

---

## 57. Stable ids

Candidates need stable ids for deterministic tie-breaking.

Do not tie-break on display label.

---

## 58. Upgrade engine version

Introduce:

```text
UPGRADE_ENGINE_VERSION = 1
```

Increment when identical inputs could produce a different prioritization result.

---

## 59. Comparison provenance

Record:

```text
upgrade engine version
selected metric
budget
comparison currency
candidate ids
calculator provenance per candidate
price provenance per candidate
economy snapshot if used
```

---

## 60. UI flow

MVP:

```text
import PoB2 build
add candidate item
choose slot
paste raw item text
enter acquisition price
repeat for candidate 2+
choose budget
choose ranking metric
Compare
```

No trade URL required.

---

## 61. Candidate editor

Show:

```text
candidate label
slot
raw item text
price amount
price currency
price source
```

Enforce candidate count and item text limits.

---

## 62. Metric selector

Use human-readable supported metrics.

Do not expose internal fields that are not intended ranking metrics.

---

## 63. Comparison table

Suggested columns:

```text
Candidate
Price
Budget status
Selected metric before
Selected metric after
Gain
Efficiency
Key other deltas
Price source
```

No overall score column.

---

## 64. User-facing wording

Preferred:

```text
For Total DPS within a 100-chaos budget,
Candidate A has the highest measured DPS gain per chaos among these supplied items.
```

Avoid:

```text
Buy Candidate A.
Candidate A is the best helmet.
```

---

## 65. Server-side authority

Compute on the server/domain layer:

```text
normalized price
budget eligibility
efficiency
ordering
```

Do not trust browser-computed ranking math.

---

## 66. Testing — pure math

Add tests for:

- same-currency comparison;
- currency normalization;
- rate direction;
- budget exact-boundary;
- over-budget;
- missing price;
- zero price;
- negative price rejection;
- positive efficiency;
- zero delta;
- negative delta;
- missing metric;
- deterministic tie-breaks;
- no composite score.

---

## 67. Testing — ranking semantics

Test:

```text
cheap + smaller improvement
vs
expensive + larger improvement
```

and verify ordering follows the explicit efficiency policy.

Switch the selected metric and verify ordering can change.

---

## 68. Testing — trade-offs

Example:

```text
A:
DPS +10%
Life -10%

B:
DPS +7%
Life +5%
```

Ranking by DPS can prefer A while still exposing Life trade-offs.

Ranking by Life can prefer B.

No overall winner is stored.

---

## 69. Testing — price provenance

Cover:

```text
user-entered chaos
user-entered divine + conversion
missing conversion
```

Verify labels and provenance.

---

## 70. Testing — orchestration

Default tests use fake calculator results and mock economy snapshots.

Cover:

```text
2 successful candidates
1 calculator failure
1 missing metric
1 missing price
```

Only valid candidates participate in ranking.

---

## 71. Opt-in real PoB2 comparison

Add at least one opt-in comparison using:

```text
fixture F
two explicit helmet candidates
fixture/manual prices
```

Prove:

```text
real PoB2 deltas
→ upgrade-engine comparison
```

Do not require live poe.ninja.

---

## 72. Economy tests

Use stored/mock economy responses.

No default test may require live poe.ninja.

---

## 73. Browser verification

Demonstrate:

```text
import build
add 2 candidate items
enter prices
set budget
select TotalDPS or TotalEHP
compare
```

Verify wording remains metric-specific and trade-offs remain visible.

---

## 74. Security/privacy

Do not send raw PoB XML or raw candidate item text to poe.ninja.

Only currency/economy requests may reach the economy adapter.

No AI.

No trade scraping.

---

## 75. Rate/caching behavior

Reuse one conversion snapshot per comparison.

Do not make repeated identical economy calls per candidate.

Preserve STEP-013 caching/backoff behavior.

---

## 76. Failure independence

Examples:

```text
PoB delta works + price unavailable
→ show delta, no rank

price works + PoB delta fails
→ show price, no rank
```

Do not collapse them into one generic error.

---

## 77. Required documentation

Create:

```text
docs/progress/STEP-018C-budget-aware-upgrade-prioritization.md
```

Include:

```text
Why STEP-018C Is Now Safe
Upgrade Candidate Model
Candidate Source Policy
Price Model
User-Entered Price
Economy Data Boundary
No Rare-Item Pricing Rule
Price Provenance
Budget Model
Comparison Currency
Currency Conversion
Primary Metric Policy
Initial Rankable Metrics
Efficiency Formula
Budget Eligibility
Ranking Policy
Tie-Break Rules
Trade-Off Visibility
Comparison Readiness
Upgrade Engine Version
Package Boundaries
PoB2 Delta Integration
Economy Integration
UI Flow
Testing Strategy
Opt-In Real PoB2 Comparison
Security / Privacy
Performance
Known Limitations
Crafting Status
Future Trade/Search Status
```

---

## 78. Decision log

Update `docs/planning/DECISION_LOG.md` for durable decisions:

```text
explicit-candidate-only MVP
user-entered price is valid provenance
no arbitrary rare-item automatic pricing
metric-specific efficiency only
one-item-at-a-time budget meaning
initial rankable metric allowlist
UPGRADE_ENGINE_VERSION = 1
```

---

## 79. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run the opt-in PoB2 comparison command separately.

Run `npm audit` only if dependency files change.

Default tests must not require:

```text
PoB2 executable
live poe.ninja
GGG credentials
AI keys
```

---

## 80. Non-goals

Do not implement:

- automatic rare-item search;
- trade crawling;
- live arbitrary rare-item quotes;
- item generation;
- target-stat item synthesis;
- multi-item combination optimization;
- crafting;
- passive reranking;
- generic gear score;
- universal build score;
- AI upgrade decisions;
- automatic purchasing.

---

## 81. Expected result

Example:

```text
Budget:
100 chaos

Rank by:
Total DPS efficiency

Candidate A
Price: 40 chaos
source: user-entered
Total DPS: +8.0%
Life: -3.0%
Total EHP: -1.5%
Within budget
DPS efficiency: 2.0% per 10 chaos

Candidate B
Price: 80 chaos
source: user-entered
Total DPS: +12.0%
Life: +2.0%
Total EHP: +4.0%
Within budget
DPS efficiency: 1.5% per 10 chaos

Metric-specific ordering:
1. Candidate A
2. Candidate B

Trade-off:
Candidate B has the larger absolute DPS gain and improves Life/EHP.
```

The system must not say:

```text
Candidate A is the better item overall.
Buy Candidate A.
```

---

## 82. Currency-normalization example

```text
Candidate A: 60 chaos
Candidate B: 1 divine

Economy snapshot:
1 divine = X chaos

Normalized:
A = 60 chaos
B = X chaos
```

Clearly distinguish:

```text
candidate price entered by user
```

from:

```text
currency conversion supplied by economy data
```

---

## 83. Readiness target

STEP-018C is complete when Buddy can:

```text
take multiple explicit item candidates
measure each against the same character
attach explicit/trustworthy acquisition costs
apply a one-item budget
rank by one explicitly selected build metric
show other measured trade-offs
preserve calculator and price provenance
```

without:

```text
inventing rare prices
hiding metrics in a universal score
searching undocumented trade endpoints
```

---

## 84. What comes after STEP-018C

After review, choose the next architecture explicitly.

Possible next areas:

```text
A. supported candidate sourcing / trade-integration research
B. crafting data ingestion (original STEP-019)
C. passive PoB2 reranking
D. runtime skill-metadata enrichment for CharacterContext
```

Do not automatically assume the next numbered roadmap item is still the best next dependency.

---

## 85. Stop condition

After explicit-candidate budget comparison, UI verification, tests, provenance, and documentation are complete:

**STOP.**

Do not automatically start:

```text
trade search
crafting
candidate generation
multi-item optimization
passive reranking
```

Wait for explicit review and approval.
