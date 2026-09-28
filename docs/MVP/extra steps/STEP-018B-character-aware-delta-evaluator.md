# STEP-018B — Character-aware delta evaluator

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a production-safe character-aware evaluator that measures how a controlled candidate change affects a real imported PoB2 build.

STEP-018A / STEP-018A.1 proved that PoB2 can be used as a deterministic whole-build calculator when isolated correctly.

STEP-018B must turn that research result into a narrow production-facing calculation boundary.

The desired flow is:

```text
normalized build
    ↓
isolated pinned PoB2 worker
    ↓
baseline calculation
    ↓
candidate mutation
    ↓
recalculate
    ↓
restore
    ↓
named metric deltas
```

STEP-018B must expose:

```text
before
after
absolute delta
percent delta where meaningful
metric provenance
calculator version provenance
warnings/readiness
```

STEP-018B must **not** produce:

```text
overall upgrade score
best/worst item
currency efficiency
buy recommendation
craft recommendation
```

---

## 2. Why this step exists

PoE2 Buddy now has:

```text
passive-tree semantics
gear semantics
character-context relevance
PoB2 calculation feasibility proof
```

The missing layer is:

```text
measure the effect of a candidate on the actual build
```

Relevance answers:

```text
Does this mechanic appear to matter?
```

STEP-018B answers:

```text
What changed when this candidate was applied?
```

It still does not answer:

```text
Is this the best use of the player's budget?
```

That belongs later.

---

## 3. Core invariant

Hard rule:

```text
delta
!=
ranking
```

STEP-018B may say:

```text
TotalDPS: +7.4%
Life: -2.1%
EnergyShield: +35
```

STEP-018B must not say:

```text
This is better overall.
Take this upgrade first.
This item is worth 8.9/10.
```

Do not collapse multiple metrics into one score.

---

## 4. Acceptance criteria

- [ ] A production-facing PoB2 calculator adapter exists behind an explicit interface.
- [ ] The calculator runs outside the Next.js process.
- [ ] The user's live PoB2 installation is never edited per request.
- [ ] The worker uses a pinned isolated runtime copy.
- [ ] Auto-update is disabled.
- [ ] Runtime/network assumptions are explicit.
- [ ] One build is evaluated per worker at a time.
- [ ] Worker lifecycle/recycle policy exists.
- [ ] Version compatibility is checked before calculation.
- [ ] Unknown/mismatched version mappings fail closed.
- [ ] Baseline calculation is supported.
- [ ] Passive candidate mutation is supported.
- [ ] Candidate restore returns to baseline.
- [ ] Named metric extraction is supported.
- [ ] Before/after delta calculation is supported.
- [ ] Percentage deltas are only emitted when mathematically meaningful.
- [ ] No composite score is produced.
- [ ] CharacterContext is not rewritten by calculator output in this step.
- [ ] Passive heuristic remains unchanged.
- [ ] Gear normalization remains unchanged.
- [ ] PoB2 import remains unchanged.
- [ ] UI can display one candidate delta result.
- [ ] Errors are structured.
- [ ] Timeouts are enforced.
- [ ] Default tests do not require a real PoB2 executable.
- [ ] Real-worker integration tests are opt-in/manual.
- [ ] Required repository checks pass.
- [ ] Create:
      `docs/progress/STEP-018B-character-aware-delta-evaluator.md`

---

## 5. Scope

STEP-018B may implement:

```text
calculator interface
isolated worker launcher
worker request/response protocol
runtime version pin
compatibility gate
baseline calculation
passive candidate mutation
metric extraction
delta calculation
structured errors
timeouts
worker recycle
manual integration tests
UI delta display
```

STEP-018B must not implement:

```text
budget ranking
economy integration
item upgrade prioritization
crafting
trade search
AI interpretation
composite score
automatic build optimization via PoB2
```

---

## 6. Recommended package boundary

Prefer a dedicated package:

```text
packages/pob2-calculator
```

or an equivalent isolated package.

Suggested responsibility split:

```text
packages/pob2-calculator
  interface/types
  compatibility
  protocol
  metric normalization
  delta calculation

server-side worker adapter
  process lifecycle
  timeout
  queue
  worker recycle

PoB2 runtime copy
  external/pinned
  not imported into web bundle
```

Do not place PoB2 runtime code inside `apps/web`.

---

## 7. Calculator interface

Define a provider-neutral-ish calculation interface, but allow the implementation to be explicitly PoB2-backed.

Conceptually:

```text
BuildCalculator {
  calculateBaseline(...)
  evaluatePassiveCandidate(...)
}
```

Do not over-generalize to hypothetical providers.

The interface should return normalized calculator results rather than raw Lua tables.

---

## 8. Baseline input

Input should reference the existing normalized/imported build and the original PoB2 document/code needed to reconstruct calculator state.

Conceptually:

```text
CalculatorBuildInput {
  normalizedBuild
  pob2BuildCode or inflated XML reference
  importProvenance
  expectedTreeVersion
  expectedCalculatorVersion
}
```

Do not rebuild the PoB2 build from partial Buddy data if the original PoB2 document is available.

Prefer loading the original build and mutating from there.

---

## 9. Compatibility gate

Before running a calculation:

```text
Buddy passive-tree pin
PoB2 tree key
PoB2 calculator version
```

must pass an explicit compatibility rule.

Example:

```text
PoB2 tree 0_5
→ approved mapping
→ GGG pin 0.5.5
```

Do not compare strings heuristically.

Unknown mapping:

```text
calculation readiness = incompatible
```

and do not evaluate.

---

## 10. Version provenance

Every calculation result must include:

```text
PoB2 version
PoB2 tree key
Buddy passive-tree version
Buddy passive-tree commit/checksum
calculator adapter version
build checksum
```

A future recommendation should always be traceable to the calculator data used.

---

## 11. Isolated runtime requirement

The production calculator must run from:

```text
separate pinned runtime copy
```

not:

```text
the user's normal PoB2 installation
```

Hard prohibition:

```text
do not patch user's live Modules/Build.lua per request
```

The research hook from STEP-018A is not a production mechanism.

---

## 12. Runtime pinning

The worker runtime must have an explicit manifest.

Record at minimum:

```text
PoB2 version
source commit/tag if known
runtime platform
tree-data key
runtime checksum
installation path
```

Do not silently run whatever PoB2 version happens to be installed.

---

## 13. Auto-update disabled

The isolated worker must not auto-update.

Future runtime changes must be explicit and reviewed.

The calculation service must not change behavior because PoB2 downloaded a new version in the background.

---

## 14. Network isolation

The calculator should require no live network access for normal calculation.

Preferred production boundary:

```text
network denied
```

or equivalent sandbox restriction.

If a complete network denial is not practical in this step:

```text
document the exact remaining access
```

and ensure the update path is disabled.

---

## 15. Worker model

Use:

```text
one active build per worker
one calculation at a time
```

Do not share one mutable PoB2 build object across concurrent requests.

A worker may process multiple sequential calculations only within the recycle policy.

---

## 16. Worker queue

Concurrent requests should queue or be assigned to separate isolated workers.

Do not allow:

```text
two candidate mutations
```

to run against the same build state concurrently.

---

## 17. Worker recycle policy

STEP-018A observed heap growth across build reloads.

Define a bounded worker lifetime.

Possible policy:

```text
max builds
max calculations
max process age
max observed memory
```

Choose the simplest deterministic policy for MVP.

Example:

```text
recycle after N loaded builds
```

Do not leave workers unbounded.

---

## 18. Timeout policy

Each worker request must have a hard timeout.

On timeout:

```text
kill worker
discard state
return structured timeout error
```

Do not attempt to reuse a timed-out worker.

---

## 19. Crash recovery

If the worker process exits unexpectedly:

```text
mark current request failed
discard worker
start fresh worker for future request
```

Do not return raw Lua stack traces to users.

Store diagnostic details server-side only where appropriate.

---

## 20. Worker protocol

Use a small explicit protocol.

Possible transport:

```text
stdin/stdout JSON lines
local socket
named pipe
```

Choose the simplest reliable option.

Do not use the filesystem as a request queue unless strongly justified.

---

## 21. Protocol request shape

Conceptually:

```text
{
  requestId,
  action,
  buildPayload,
  candidate,
  versionExpectations
}
```

Actions for STEP-018B should stay narrow:

```text
baseline
evaluate-passive-candidate
health
```

Do not add item/support/config optimization operations unless needed for testing.

---

## 22. Protocol response shape

Conceptually:

```text
{
  requestId,
  ok,
  calculatorVersion,
  buildChecksum,
  baseline?,
  candidate?,
  delta?,
  warnings?,
  error?
}
```

Validate every response before use.

---

## 23. Structured error model

At minimum support:

```text
runtime-unavailable
version-incompatible
build-load-failed
skill-unresolved
candidate-invalid
passive-node-unknown
calculation-failed
restore-failed
timeout
worker-crashed
protocol-invalid
```

Do not expose internal Lua stack traces directly in UI.

---

## 24. Baseline calculation

Load the original build and calculate baseline metrics.

Do not mutate before baseline is captured.

Store baseline in the response.

---

## 25. Selected active skill

The calculation result must preserve the exact selected active effect identity.

At minimum:

```text
skill name
effect id
source gem
main skill flags/types where available
```

This prevents raw-gem/display-effect confusion.

---

## 26. Metric extraction

Normalize a bounded MVP set of metrics.

Candidate categories:

```text
offense:
  AverageDamage
  AverageHit
  TotalDPS
  CombinedDPS
  CritChance
  CritMultiplier
  Speed
  CastRate
  HitChance

defense:
  Life
  Mana
  Spirit
  EnergyShield
  Armour
  Evasion
  DeflectionRating
  DeflectChance
  TotalEHP
  FireResist
  ColdResist
  LightningResist
  ChaosResist
```

Only include metrics actually available from the loaded build.

Do not map missing values to zero unless PoB2 explicitly returns zero.

---

## 27. Preserve metric identity

Do not merge:

```text
TotalDPS
CombinedDPS
FullDPS
```

into a generic:

```text
DPS
```

The spike proved those fields can differ.

Keep exact metric names or normalized identities with original-source labels.

---

## 28. Metric schema

Each metric should include conceptually:

```text
id
label
value
unit
category
sourceField
```

Possible categories:

```text
offense
defense
resource
resistance
utility
```

Do not assign importance weights.

---

## 29. Passive candidate input

The first production candidate type should be:

```text
passive path candidate
```

Input:

```text
ordered node ids
point cost
allocation mode
```

Use Buddy's existing passive engine as the source of legal paths.

PoB2 is primarily the evaluator.

---

## 30. Do not use PoB2 to enumerate paths

Hard boundary:

```text
Buddy passive-engine
→ legal candidate generation

PoB2 calculator
→ candidate evaluation
```

Do not replace graph/path logic with PoB2.

---

## 31. Candidate validation

Before mutation:

```text
all candidate ids exist
version gate passed
allocation mode known
candidate not already fully allocated
```

If not:

```text
candidate-invalid
```

Do not partially apply an invalid candidate.

---

## 32. Mutation application

Apply candidate nodes in deterministic order.

Record:

```text
requested node ids
actually allocated node ids
allocation mode
```

If PoB2 rejects any node:

```text
abort candidate
restore baseline
return structured failure
```

---

## 33. Weapon-set allocation mode

Candidate requests must support:

```text
shared
weaponSet1
weaponSet2
weaponSet3
```

or the exact internal equivalents already normalized by Buddy.

Do not default unknown weapon-set candidates to shared.

---

## 34. Baseline restore

After candidate evaluation:

```text
restore original build state
recalculate baseline
```

Compare against the initial baseline.

If restore does not match:

```text
restore-failed
worker must be discarded
```

Do not continue evaluating more candidates in a contaminated worker.

---

## 35. Baseline equality

Define deterministic equality for restore validation.

For normalized numeric metrics:

```text
exact equality
```

where PoB2 returns stable numbers.

If floating formatting is involved:

```text
compare raw numeric values
```

not UI-formatted strings.

---

## 36. Delta calculation

For each metric present in both baseline and candidate:

```text
absoluteDelta = after - before
```

Percentage:

```text
percentDelta = absoluteDelta / abs(before) * 100
```

only when:

```text
before != 0
and percentage is semantically meaningful
```

Do not produce meaningless percentage changes for categorical or unsupported metrics.

---

## 37. Zero-baseline behavior

If:

```text
before = 0
```

then:

```text
percentDelta = null
```

unless a metric-specific rule is explicitly defined later.

Do not emit:

```text
Infinity
```

or fake `100%`.

---

## 38. Negative baseline behavior

Be careful with metrics such as resistances that may be negative.

Use absolute delta as primary.

Percentage delta for negative baseline resistance values should normally be omitted.

Do not imply:

```text
-50 → -20
= 60% better
```

unless a future metric-specific formatter defines that interpretation.

---

## 39. Metric-specific percent policy

Create a small explicit policy.

Likely percentage-enabled:

```text
AverageDamage
AverageHit
TotalDPS
CombinedDPS
Life
EnergyShield
Armour
Evasion
TotalEHP
CastRate
Speed
```

Likely absolute-only:

```text
resistances
CritChance percentage points
DeflectChance percentage points
HitChance percentage points
Spirit
```

Document exact choices.

---

## 40. Chance/stat-point deltas

For percentage-point stats such as:

```text
CritChance
FireResist
DeflectChance
```

display:

```text
+2.5 percentage points
```

not:

```text
+25%
```

unless separately derived and clearly labelled.

---

## 41. Delta result

Conceptually:

```text
CharacterDeltaResult {
  baseline
  candidate
  metrics[]
  restoreVerified
  provenance
  warnings
}
```

No overall numeric score.

---

## 42. Readiness

Define calculator readiness separately.

Possible:

```text
ready
incompatible
unavailable
partial
```

Do not reuse:

```text
gear readiness
context readiness
passive readiness
```

---

## 43. Warnings

Potential warnings:

```text
metric unavailable
selected skill unresolved
calculator version mismatch
weapon-set candidate
unsupported metric
worker recycled
```

Warnings must not silently alter ranking because no ranking exists yet.

---

## 44. CharacterContext relationship

Do not rewrite CharacterContext from PoB2 runtime metadata in this step.

It is acceptable to expose runtime skill metadata alongside calculation output.

A future small enrichment step may feed trusted runtime tags into CharacterContext.

Keep this boundary explicit.

---

## 45. Passive heuristic relationship

The existing heuristic remains unchanged.

STEP-018B may evaluate:

```text
one candidate
```

or a bounded list passed explicitly.

Do not automatically replace Top-K ordering yet.

---

## 46. No reranking yet

Do not implement:

```text
heuristic Top-K
→ PoB2 reranked Top-K
```

inside STEP-018B.

That can be a follow-up once delta semantics are validated.

This step proves the evaluator API first.

---

## 47. Candidate batch support

A small batch API is acceptable if it simplifies future work.

Example:

```text
evaluatePassiveCandidates(build, candidates)
```

If implemented:

```text
baseline load once
candidate A → restore
candidate B → restore
...
```

must validate restore after every candidate.

---

## 48. Batch limit

Set a conservative maximum.

Example:

```text
50 or 100 candidates
```

based on STEP-018A performance.

Do not allow unbounded requests.

---

## 49. Candidate ordering

Return results corresponding exactly to input candidate ids/order.

Do not sort by delta.

No hidden ranking.

---

## 50. Performance budget

Use the spike numbers as a planning baseline, not a hard guarantee.

Record production measurements for:

```text
worker startup
build load
baseline calculation
single passive candidate
10 candidate batch
50 candidate batch
restore cost
worker recycle
```

---

## 51. Cold-start handling

Cold worker startup was expensive in research.

Prefer:

```text
warm worker pool
```

or:

```text
one prewarmed worker
```

for MVP if operationally simple.

Do not spawn one worker per passive candidate.

---

## 52. Worker pool size

Start small.

Suggested MVP:

```text
1 worker
```

or:

```text
small fixed pool
```

depending on local deployment model.

Do not introduce complex autoscaling.

---

## 53. Local-development mode

Provide an explicit local dev configuration for the isolated runtime path.

Example env:

```text
POB2_CALCULATOR_DIR
POB2_CALCULATOR_ENABLED
```

Do not point by default at the user's normal install.

---

## 54. Feature flag

Calculator-backed evaluation should be feature-gated.

Example:

```text
POB2_CALCULATOR_ENABLED=false
```

by default unless runtime is intentionally configured.

The app must still work without it.

---

## 55. Runtime unavailable behavior

If disabled/unavailable:

```text
passive heuristic still works
gear/context still work
```

The UI may show:

```text
Character-aware calculation unavailable
```

Do not break existing analysis.

---

## 56. Security

Treat build code, XML, item text, and config as untrusted.

Worker must be isolated from:

```text
app secrets
arbitrary filesystem paths
network where possible
```

Do not run the calculator with broader permissions than necessary.

---

## 57. Filesystem isolation

Use a dedicated worker directory.

Do not allow request input to choose arbitrary output paths.

Generated temporary files must stay under the worker temp area.

---

## 58. Process environment

Pass only required environment variables.

Do not inherit sensitive web-app secrets into the worker process if avoidable.

---

## 59. Logging

Log:

```text
request id
calculator version
build checksum
duration
status
structured error code
```

Do not log entire private build XML by default.

---

## 60. Privacy

PoB2 calculation stays local/server-side.

No third-party transmission.

Do not send build data to AI or economy services as part of this step.

---

## 61. Testing strategy

Split tests into:

```text
unit tests
protocol tests
mock-worker integration tests
real PoB2 opt-in integration tests
```

Default `npm test` must use mocks/fixtures only.

---

## 62. Unit tests

Test at minimum:

- compatibility mapping;
- metric normalization;
- percentage policy;
- negative/zero baseline rules;
- delta math;
- structured errors;
- response validation;
- readiness states.

---

## 63. Mock-worker integration tests

Use a deterministic fake worker.

Test:

```text
baseline response
passive candidate response
restore mismatch
timeout
crash
invalid JSON
version mismatch
unknown metric
```

Do not require PoB2.

---

## 64. Real PoB2 integration tests

Provide a separate opt-in command.

Example:

```text
npm run test:pob2-calculator
```

or equivalent.

Use stored non-private fixtures.

Do not run in normal CI unless the runtime is explicitly provisioned later.

---

## 65. Real integration baseline

At minimum validate:

```text
fixture B baseline
node 4739 passive delta
restore
```

Use the known STEP-018A values as regression references only where version pin matches exactly.

Do not hard-code values across calculator versions without provenance.

---

## 66. Real integration weapon-set case

Include one fixture D case proving:

```text
weaponSet1 candidate
```

or reading an existing weapon-set allocation mode.

If actual mutation is not yet safe:

```text
mark the test pending/manual
```

and do not fake support.

---

## 67. Real integration item mutation

Item mutation does not have to be part of the public STEP-018B API.

A regression test may still reuse the research path to ensure the runtime copy behaves consistently.

Do not expose item-evaluation production endpoints yet unless explicitly needed.

---

## 68. UI integration

Add an optional section for one selected candidate:

```text
Character-aware delta
```

Example:

```text
Total DPS
4.46 → 4.90
+0.45
+10.0%

Average Hit
5.35 → 5.89
+0.54
+10.0%

Life
254 → 254
no change

Crit Chance
7.00% → 7.00%
0.00 percentage points
```

No “winner” wording.

---

## 69. UI provenance

Show:

```text
PoB2 0.23.1
tree 0_5
Buddy tree 0.5.5
calculator status
```

or a compact equivalent.

---

## 70. UI error behavior

If calculation fails:

```text
Character-aware calculation unavailable for this candidate.
```

Expose a concise reason category.

Do not replace heuristic results with an error page.

---

## 71. UI loading behavior

Calculation may take longer than heuristic analysis.

Show a separate loading state.

Do not block already-available heuristic results from rendering if architecture allows progressive display.

---

## 72. No UI ranking

Do not:

```text
sort candidates by TotalDPS
highlight "best"
label green/red overall
```

Metric-specific positive/negative formatting is acceptable if neutral and precise.

---

## 73. Documentation

Create:

```text
docs/progress/STEP-018B-character-aware-delta-evaluator.md
```

Follow the normal progress-document protocol.

Also include:

```text
Why STEP-018B Exists
Production Calculator Boundary
Worker Runtime Pin
Worker Isolation
Auto-Update Policy
Network Policy
Compatibility Gate
Build Load Flow
Baseline Calculation
Selected Skill Metadata
Metric Inventory
Metric Normalization
Passive Candidate Model
Weapon-Set Allocation Model
Mutation Flow
Restore Verification
Delta Math
Percentage Policy
Readiness Model
Error Model
Timeout / Crash Recovery
Worker Recycle Policy
Protocol
Feature Flag
UI Integration
Testing Strategy
Real PoB2 Integration Command
Performance Results
Security / Privacy
Passive Heuristic Regression
Gear Regression
Character Context Regression
Known Limitations
STEP-018C Status
```

---

## 74. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
calculator worker boundary
runtime pin policy
no live-install mutation
fail-closed compatibility
one-build-per-worker
worker recycle rule
metric percent policy
no composite score
```

---

## 75. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run:

```text
real PoB2 integration command
```

separately and document the result.

Run `npm audit` only if dependency files change.

---

## 76. Non-goals

Do not implement:

- overall build score;
- passive candidate reranking;
- best passive recommendation by PoB2;
- item upgrade ranking;
- budget-aware prioritization;
- poe.ninja price usage;
- trade search;
- crafting;
- AI explanations;
- support optimization;
- automatic config optimization;
- full build planner.

---

## 77. Expected result

After STEP-018B, PoE2 Buddy should be able to say:

```text
Candidate passive path:
4739

PoB2 calculation:
compatible

Main skill:
Fireball

Total DPS:
4.4583 → 4.9042
+0.4458
+10.0%

Average Hit:
5.35 → 5.885
+0.535
+10.0%

Life:
254 → 254
0

Restore check:
passed

Calculator:
PoB2 0.23.1
tree 0_5
Buddy pin 0.5.5
```

It should not say:

```text
This is the best path.
This candidate scores 93/100.
Take this instead of defense.
This upgrade is worth 2 divines.
```

---

## 78. Readiness target

STEP-018B is complete when:

```text
Buddy can measure one legal candidate
against the actual build
with a pinned isolated PoB2 worker
and return trustworthy named deltas
without changing existing ranking behavior.
```

That is sufficient foundation for later character-aware comparison/ranking.

---

## 79. Relationship to STEP-018C

STEP-018C remains:

```text
Budget-aware upgrade prioritization
```

and must still not start automatically.

A likely future dependency is:

```text
candidate delta
    ↓
benefit interpretation
    ↓
economy estimate
    ↓
opportunity cost
```

STEP-018B only supplies the first part.

---

## 80. Stop condition

After worker integration, delta evaluation, real-runtime validation, UI display, regression checks, and documentation are complete:

**STOP.**

Do not automatically implement:

```text
candidate reranking
STEP-018C budget-aware upgrade prioritization
crafting
```

Wait for explicit review and approval.
