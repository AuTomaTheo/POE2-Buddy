# STEP-020.7 — Simulator go/no-go and mechanic evidence expansion

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.7  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether the project can safely proceed to STEP-021 simulation by doing **one of two things**:

```text
A. obtain new, sufficiently strong evidence that closes the remaining
   Orb of Augmentation pool / conflict / selection-rule gaps;

or

B. deliberately pivot the first simulated mechanic to a different
   crafting action whose full transition + pool + selection semantics
   can actually be proven.
```

This step exists because STEP-020.6 reached the limit of the currently inspected RePoE + PoB2 evidence for Orb of Augmentation.

STEP-020.7 must not repeat the same research loop and then infer missing rules.

It must either:

```text
produce new evidence
```

or:

```text
choose a better first simulation candidate
```

with an explicit go/no-go decision.

## 2. Current state

STEP-020 is complete as the scoped craft-target planner.

STEP-020.5 and STEP-020.6 also completed successfully as semantics/research closures.

Current Augmentation status:

```text
State transition:
ready for Magic item with zero explicit modifiers

Candidate pool:
partial

Existing-mod conflict rules:
blocked

Prefix/suffix slot split:
unproven

Spawn-weight use:
unproven

Generation-weight use:
unknown

Selection formula:
unproven

Probability:
blocked

STEP-021:
blocked for Augmentation
```

The next step must not treat the previous blockers as implementation bugs.

They are evidence gaps.

## 3. Core invariant

Hard rule:

```text
STEP-021 may simulate only a mechanic whose
state transition
+
candidate pool
+
selection rule
+
required conflict/slot rules
are all proven for the supported scope.
```

Another hard rule:

```text
lack of evidence
must not be converted into
a "reasonable" crafting rule.
```

## 4. Why another substep is required

STEP-021 is a simulator.

Simulation is qualitatively different from:

```text
listing possible modifiers
describing item-state transitions
showing source-pool eligibility
```

A simulator creates concrete outcomes.

Therefore it must not begin while the project still cannot answer:

```text
What exactly can the action choose?
Which candidates are excluded?
How is one outcome selected?
```

STEP-020.7 closes that decision gap.

## 5. Scope

STEP-020.7 may:

```text
research new evidence sources
inspect current open-source crafting implementations
inspect additional game-data fields
compare multiple candidate mechanics
build evidence reports
formalize a pivot to a different first mechanic
update mechanic readiness artifacts
```

STEP-020.7 must not:

```text
perform random simulation
implement Monte Carlo
calculate expected cost
build a multi-step crafting strategy
add trade search
use AI to infer missing mechanics
```

## 6. Acceptance criteria

- [ ] STEP-020 remains frozen and unchanged in behavior.
- [ ] STEP-020.5/020.6 findings remain preserved.
- [ ] The Augmentation blockers are treated as evidence gaps, not implementation bugs.
- [ ] At least one genuinely new evidence path is investigated.
- [ ] The same RePoE/PoB evidence is not merely re-read and re-labeled.
- [ ] Candidate mechanics for first simulation are compared by provability, not convenience.
- [ ] Orb of Augmentation is retained only if new evidence closes its required gaps.
- [ ] A pivot mechanic may be selected if it has stronger complete semantics.
- [ ] The chosen mechanic has a stable mechanic id.
- [ ] The chosen mechanic has a proven state transition.
- [ ] The chosen mechanic has a proven mechanic-specific candidate pool for the intended scope.
- [ ] The chosen mechanic has proven required conflict/slot rules.
- [ ] The chosen mechanic has a proven selection rule if random.
- [ ] If deterministic, randomness is explicitly absent.
- [ ] Probability is approved only if the random-selection model is complete.
- [ ] Mechanic readiness is bound to source/version/provenance.
- [ ] Conflicting evidence remains explicit.
- [ ] No probability number is produced for any still-blocked mechanic.
- [ ] No simulator is implemented in this step.
- [ ] Default tests remain offline.
- [ ] Create `docs/progress/STEP-020-7-simulator-go-no-go.md`.

## 7. New evidence requirement

STEP-020.7 must investigate **new evidence**, not just the same two sources already exhausted.

Potential new evidence classes:

```text
official GGG patch notes / currency descriptions / public data
current open-source PoE2 crafting implementations
current simulator/crafting-tool code with inspectable semantics
current game-data fields not yet ingested
reliable technical community repositories
controlled in-game observations, if reproducible and documented
```

Do not pre-approve any source merely because it exists.

## 8. Source-quality classification

For every new source, record:

```text
source name
source type
official/community/derived
current version/date
stable URL/repository
commit/tag if available
what exact mechanic fact it supports
confidence limitations
```

## 9. Source evidence categories

Separate evidence into:

```text
transition evidence
pool evidence
conflict evidence
slot/affix-capacity evidence
weight/selection evidence
failure/consumption evidence
```

A source supporting one category does not automatically support all categories.

## 10. No transitive authority

Example:

```text
Tool X says Augmentation adds a suffix here
```

does not prove:

```text
Tool X's weighting formula is also correct
```

Each rule needs its own evidence.

## 11. First decision branch — keep Augmentation

Augmentation remains the first simulation candidate only if new evidence closes the minimum required scope.

Minimum for zero-mod Augmentation:

```text
mechanic-specific candidate pool = ready
selection rule = ready
weight model = ready if random
special/essence exclusions = ready
```

Minimum for one-mod Augmentation additionally requires:

```text
prefix/suffix slot structure = ready
existing-mod conflict rule = ready
same-id/group exclusion semantics = ready where relevant
```

## 12. Zero-mod-only scope is acceptable

A valid outcome may be:

```text
Orb of Augmentation
Magic item
0 existing explicit modifiers
only
```

if:

```text
pool
+
selection rule
```

are fully proven for that narrow state.

Do not require one-mod support to begin STEP-021 if zero-mod simulation is independently complete.

## 13. Second decision branch — pivot mechanic

If Augmentation still lacks enough evidence, compare alternative mechanics again.

Candidate examples:

```text
Orb of Transmutation
Regal Orb
Exalted Orb
Chaos Orb
Essence
another deterministic/sufficiently documented action
```

The best first simulated mechanic is the one with the smallest **proven** semantic surface.

## 14. Pivot criteria

Prefer a mechanic with:

```text
clear input rarity/state
clear deterministic transition
explicit target/mod outcome where possible
minimal conflict dependence
minimal hidden weight dependence
clear failure behavior
strong current evidence
```

A deterministic mechanic may be better than a random one for the first STEP-021 implementation.

## 15. Mechanic candidate comparison

Create a comparison table with:

```text
Mechanic
Transition readiness
Pool readiness
Conflict readiness
Weight readiness
Probability readiness
Real-item state requirements
Source quality
Simulation difficulty
Decision
```

Do not score with an arbitrary hidden composite.

Use factual states.

## 16. Deterministic mechanic preference

If a current crafting action has:

```text
deterministic output
```

and its behavior is fully evidenced, it may become the first STEP-021 mechanic even if it is less interesting than Augmentation.

The first simulator should establish architecture correctness.

It does not need to be the most complex mechanic.

## 17. Essence research boundary

If Essence becomes a candidate, determine:

```text
which exact modifier is forced
how the forced modifier id is mapped
what rarity transition occurs
what happens to existing modifiers
what additional random mods, if any, are added
```

Do not infer the forced modifier from text alone without stable mapping.

## 18. Transmutation research boundary

If Orb of Transmutation becomes a candidate, determine:

```text
normal → magic transition
number of modifiers added
whether random modifier pool is defined
whether one or multiple outcomes are possible
selection rule
```

Do not treat user-facing text alone as a complete pool definition.

## 19. Regal research boundary

If Regal becomes a candidate, determine:

```text
magic → rare transition
preservation of existing modifiers
number of modifiers added
pool/conflict/weight semantics
```

It likely inherits the same random-add blockers unless stronger evidence exists.

## 20. Exalted research boundary

If Exalted becomes a candidate, determine:

```text
rare-state preconditions
maximum explicit count
pool/conflict/weight semantics
slot capacity
```

Do not assume Augmentation rules transfer.

## 21. Chaos research boundary

If Chaos becomes a candidate, determine:

```text
what is removed
what is added
how removal is selected
how addition is selected
whether the action is one-for-one
how conflicts are handled
```

Do not select Chaos first if two independent random stages remain unresolved.

## 22. Source-backed mechanic registry

Create or extend a mechanic registry conceptually:

```text
CraftingMechanicRegistry {
  mechanicId
  semanticsVersion
  readiness
  supportedScopes[]
  provenance
}
```

This should allow STEP-021 to ask:

```text
Which mechanics are actually simulatable?
```

## 23. Readiness states

Use:

```text
ready-for-simulation
ready-for-transition-only
partial
blocked
```

Do not use vague states such as:

```text
mostly-ready
probably-ready
```

## 24. Supported scope

Every ready mechanic must define an exact scope.

Examples:

```text
Magic + 0 explicit modifiers only
Rare item with <6 known explicits
Normal item only
Body Armour and Jewellery only
```

The scope is part of mechanic identity/readiness.

## 25. State completeness

Before a mechanic is marked `ready-for-simulation`, verify that `CraftingItemState` contains every field its transition needs.

Possible required fields:

```text
baseId
itemLevel
rarity
explicitModifierIds
implicitModifierIds
special flags
```

Do not mark ready if the state model itself cannot express a required rule.

## 26. Real imported item compatibility

Document separately:

```text
Can current imported gear construct this CraftingItemState?
```

Possible statuses:

```text
ready
manual-input-only
blocked
```

This does not necessarily block STEP-021 architecture.

A first simulator may use explicit/manual item states.

## 27. Mechanic-specific pool proof

For random-add mechanics, pool proof must establish:

```text
all accessible generation types
all relevant special exclusions
item/base restrictions
conflict exclusions
slot restrictions
weight eligibility
```

No incomplete category can remain hidden.

## 28. Selection-rule proof

For random mechanics, selection proof must establish:

```text
uniform
weighted
deterministic
two-stage
other
```

and, if weighted:

```text
exact final weight source/formula
```

## 29. Probability gate

A mechanic can be:

```text
ready-for-simulation
```

without probability only if the action is deterministic.

For a random mechanic:

```text
probability model must be ready
```

before STEP-021 draws outcomes.

## 30. No Monte Carlo in STEP-020.7

Even when probability becomes ready:

```text
do not simulate yet
```

Only prove the model and record it.

## 31. Evidence artifact

Create:

```text
docs/data-snapshots/crafting/mechanics/simulator-readiness.json
```

or equivalent.

Include:

```text
candidate mechanics
readiness per capability
selected first simulation mechanic
supported scope
provenance
blockers
decision
```

## 32. Existing Augmentation artifact

Do not erase:

```text
add-random-explicit.json
```

if a pivot occurs.

Keep it as:

```text
blocked/partial historical mechanic evidence
```

## 33. Semantics versioning

Each mechanic should own or reference:

```text
mechanic semantics version
```

Do not use one global version to imply every mechanic shares the same semantic completeness.

## 34. Test strategy

Default tests remain synthetic.

Add tests for:

```text
registry readiness
supported scope matching
blocked mechanic refusal
ready mechanic acceptance
stale provenance
mechanic pivot selection artifact
```

## 35. Test — blocked Augmentation remains blocked

Unless new evidence genuinely closes it:

```text
Augmentation
→ not ready-for-simulation
```

A refactor must not accidentally upgrade it.

## 36. Test — ready mechanic gate

For the finally selected ready mechanic:

```text
supported item state
→ mechanic ready
```

and:

```text
outside supported scope
→ mechanic-not-ready / unsupported-state
```

## 37. Test — provenance mismatch

A mechanic readiness artifact bound to another:

```text
snapshot checksum
source commit
semantics version
```

must fail closed.

## 38. Test — no probability leakage

Blocked/partial mechanics must expose no numeric probability fields.

## 39. Test — deterministic mechanic

If the chosen mechanic is deterministic:

```text
outcome definition is exact
probability model is not required
```

Do not invent probability `1.0` unless the result schema deliberately models deterministic outcomes that way.

Prefer:

```text
selectionModel = deterministic
```

## 40. Test — random mechanic

If the chosen mechanic is random and becomes approved:

use a tiny synthetic fixture with a fully proven model and verify:

```text
candidate set
weights
normalized probabilities
sum
```

Still do not sample.

## 41. Real local validation

Run the selected mechanic readiness on at least:

```text
one armour base
one jewellery or weapon base
```

where the mechanic supports them.

Report:

```text
state readiness
pool readiness
selection readiness
probability readiness
supported scope
```

## 42. New source investigation report

The progress document must explicitly state:

```text
what new source/evidence was investigated
what it added that STEP-020.6 did not already know
```

If nothing new was found:

```text
say so
```

and pivot if another mechanic is more provable.

## 43. No repeated dead-end loop

If Augmentation remains blocked after genuinely new research:

```text
do not create STEP-020.8 just to search the same question again
```

At that point either:

```text
pivot mechanic
```

or:

```text
accept that crafting simulation must wait for better upstream data
```

## 44. Optional game-observation evidence

If controlled in-game observation is used:

```text
record exact starting item state
exact action
observed result
sample count
patch/version
```

Observation may support:

```text
transition/failure behavior
```

but finite samples do not by themselves prove:

```text
complete candidate pool
exact probabilities
```

## 45. No reverse engineering requirement

Do not require invasive reverse engineering.

The project can remain blocked rather than violating source/tooling boundaries.

## 46. No AI inference

AI may summarize evidence later, but must not determine:

```text
pool
conflict rule
weight formula
probability
```

## 47. No economy

No:

```text
currency prices
expected cost
budget
```

in this step.

## 48. No user-facing simulator UI

Do not create a craft button yet.

A developer readiness page/CLI is acceptable.

## 49. Recommended command

Add:

```text
npm run crafting:sim-readiness
```

or equivalent.

Output example:

```text
Augmentation:
blocked

Transmutation:
partial

Selected first simulation mechanic:
<mechanic id>

Simulation readiness:
ready-for-simulation

Supported scope:
...
```

## 50. Mechanic-selection result

The step must end with exactly one of:

```text
FIRST SIMULATION MECHANIC SELECTED:
<mechanic id>
```

or:

```text
NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE
```

Do not leave the decision implicit.

## 51. STEP-021 readiness result

If a mechanic is selected and fully ready:

```text
STEP-021 READY FOR:
<mechanic id>
<supported scope>
```

Otherwise:

```text
STEP-021 BLOCKED
```

with exact blockers.

## 52. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for:

```text
new evidence source(s)
Augmentation retain/pivot decision
selected first simulation mechanic
supported simulation scope
mechanic readiness criteria
probability readiness
```

## 53. Documentation

Create:

```text
docs/progress/STEP-020-7-simulator-go-no-go.md
```

Include:

```text
Why STEP-020.7 Exists
STEP-020 Overall Status
STEP-020.6 Blockers
New Evidence Investigated
Evidence Source Quality
Mechanic Candidates
Augmentation Reassessment
Alternative Mechanic Assessment
Selected First Simulation Mechanic
Supported Scope
State Model
Pool Readiness
Conflict Readiness
Slot Readiness
Selection Readiness
Probability Readiness
Mechanic Registry
Provenance Binding
Synthetic Tests
Real Local Validation
Known Limitations
STEP-021 Decision
```

## 54. Required repository checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run explicit research/readiness commands separately.

Run `npm audit` only if dependency files change.

## 55. Default test rules

Default tests must not require:

```text
network
live RePoE
PoB2 executable
poe.ninja
GGG credentials
AI
local full crafting snapshot
```

Use synthetic fixtures.

## 56. Security/privacy

No user data should be sent to research sources.

Do not modify the installed PoB2 runtime.

No arbitrary downloaded code execution.

## 57. Licensing

If a new community implementation is inspected:

```text
record its license
do not copy substantial code
```

Prefer behavioral summaries and small metadata.

## 58. Successful outcome A — Augmentation becomes ready

```text
Augmentation
pool: ready
conflicts: ready for supported scope
selection: ready
probability: ready

FIRST SIMULATION MECHANIC SELECTED:
add-random-explicit

STEP-021:
READY FOR AUGMENTATION
```

## 59. Successful outcome B — pivot

```text
Augmentation:
blocked

Alternative mechanic:
ready-for-simulation

FIRST SIMULATION MECHANIC SELECTED:
<new mechanic id>

STEP-021:
READY FOR <new mechanic>
```

This is a fully successful step.

## 60. Successful outcome C — no mechanic ready

```text
Augmentation:
blocked

Alternatives:
partial/blocked

NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE

STEP-021:
BLOCKED
```

This is also valid.

Do not force progress by inventing semantics.

## 61. Roadmap state

```text
STEP-019
crafting data ingestion
COMPLETE

STEP-019A
planner readiness
COMPLETE

STEP-020
scoped craft target planner
COMPLETE / FROZEN

STEP-020.5
first mechanic semantics spike
COMPLETE

STEP-020.6
Augmentation pool/selection closure
COMPLETE

STEP-020.7
simulator go/no-go and evidence expansion
NEXT

STEP-021
craft simulation
BLOCKED pending STEP-020.7
```

## 62. Stop condition

After new evidence investigation, Augmentation reassessment, alternative-mechanic comparison, registry/readiness updates, tests, and documentation:

**STOP.**

Do not implement STEP-021 automatically.

Return exactly one final project decision:

```text
STEP-021 READY FOR <mechanic id> / <scope>
```

or:

```text
STEP-021 BLOCKED
```

with the exact evidence-backed reason.
