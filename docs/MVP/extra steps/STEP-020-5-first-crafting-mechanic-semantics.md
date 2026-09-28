# STEP-020.5 — First crafting-mechanic semantics spike

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.5  
**Authoring context:** Cursor-assisted development

## 1. Objective

Research, formalize, and validate the semantics of **one real Path of Exile 2 crafting action** before STEP-021 introduces any crafting simulation.

STEP-020 already provides:

```text
supported base
+
item level
+
explicit target stat/modifier
+
source-pool eligible candidate modifiers
```

What is still missing is:

```text
What does a crafting action actually do to an item?
```

STEP-020.5 must answer that question for exactly one mechanic.

The result should be a deterministic, source-backed mechanic specification that future STEP-021 code can implement without guessing.

This step should **not** yet become a general crafting simulator.

---

## 2. Why STEP-020.5 is required

STEP-020 deliberately stops at target eligibility.

It does not know:

```text
which crafting action selects from which pool
what item states the action accepts
what affixes it preserves
what it adds/removes/replaces
whether it can fail
how many affixes can exist
how modifier groups/conflicts matter
how spawn weights are applied
whether special mods are eligible
whether rarity matters
```

Without those semantics, a simulator could produce plausible-looking but wrong probabilities.

STEP-020.5 exists to prevent that.

---

## 3. Core rule

Hard invariant:

```text
crafting mechanic semantics
must be proven before
crafting probability is computed
```

Another hard invariant:

```text
generic mod pool
!=
mechanic-specific mod pool
```

STEP-020 source-pool eligibility is only an input.

The mechanic may impose additional rules.

---

## 4. Scope

STEP-020.5 must research and specify **one** crafting mechanic only.

Potential first mechanic candidates may include:

```text
Exalted Orb-style add modifier action
Chaos-style reroll action
Essence-style deterministic/additive action
another simple PoE2 currency action
```

Do not pick a mechanic merely because it sounds simple.

Choose the one with the best combination of:

```text
clear current semantics
reliable source evidence
smallest state space
minimal dependence on unresolved STEP-019 capabilities
```

---

## 5. Mechanic selection gate

Before implementation, create a short candidate comparison.

For each candidate mechanic, record:

```text
source quality
rule clarity
required blocked capabilities
affix-count dependency
mod-group dependency
special-pool dependency
probability feasibility
testability
```

Then choose exactly one.

The selection itself is part of STEP-020.5.

---

## 6. Preferred first-mechanic characteristics

Prefer a mechanic that:

```text
operates on normal explicit modifiers
has clear preconditions
has one obvious state transition
does not require hidden crafting tables
does not require multiple sequential sub-actions
does not depend on unsupported mod-group semantics if avoidable
```

Do not force this preference if source evidence points elsewhere.

---

## 7. Acceptance criteria

- [ ] Candidate crafting mechanics are compared.
- [ ] Exactly one first mechanic is selected.
- [ ] The selected mechanic is identified by a stable mechanic id.
- [ ] Current mechanic behavior is researched from reliable sources.
- [ ] Source type is documented as official/community/derived.
- [ ] Exact source version/commit/date is recorded where possible.
- [ ] Conflicting source claims are explicitly recorded.
- [ ] Preconditions are modeled.
- [ ] Valid input item states are modeled.
- [ ] Invalid input states are modeled.
- [ ] The mechanic's state transition is modeled.
- [ ] The mechanic's candidate modifier pool is defined.
- [ ] The relationship to STEP-020 source-pool eligibility is explicit.
- [ ] Rarity requirements are modeled if relevant.
- [ ] Existing-affix handling is modeled.
- [ ] Affix-count limits are researched if relevant.
- [ ] Modifier-group/conflict behavior is researched if relevant.
- [ ] Blocked capabilities remain blocked if evidence is insufficient.
- [ ] Special generation types are handled explicitly.
- [ ] Essence-only/special-only mods are handled explicitly where relevant.
- [ ] Spawn-weight usage is researched for this mechanic.
- [ ] Generation-weight usage is researched for this mechanic.
- [ ] Weight-zero behavior is explicit.
- [ ] No-match/empty-pool behavior is explicit.
- [ ] Outcome determinism vs randomness is explicit.
- [ ] Probability may be modeled only if all required mechanic semantics are proven.
- [ ] If probability is not yet safe, the result states that clearly.
- [ ] No expected cost is added unless probability and cost semantics are both proven.
- [ ] No multi-mechanic planner is added.
- [ ] No AI interpretation is used.
- [ ] Default tests remain offline.
- [ ] Create:
      `docs/progress/STEP-020-5-first-crafting-mechanic-semantics.md`

---

## 8. Source hierarchy

Prefer evidence in this order where available:

```text
1. official GGG game/API/data/documentation
2. current game data with documented interpretation
3. current Path of Building Community PoE2 implementation/data
4. current high-quality community technical references
```

Do not treat:

```text
forum memory
old PoE1 behavior
old beta behavior
Reddit anecdote
wiki wording without source
```

as sufficient mechanic authority by itself.

---

## 9. Current-version requirement

Crafting behavior can change across patches.

Record:

```text
game version context
source date
source commit/version
```

Do not reuse PoE1 mechanics by analogy.

Do not use older PoE2 behavior without confirming it still applies.

---

## 10. Mechanic id

Introduce a stable mechanic identifier.

Conceptually:

```text
CraftingMechanicId
```

Example style:

```text
add-random-explicit
reroll-explicits
essence-forced-mod
```

Do not encode marketing/display names as the only identity.

---

## 11. Mechanic definition model

Conceptually:

```text
CraftingMechanicDefinition {
  id
  displayName
  version
  preconditions
  inputStateRules
  transition
  candidatePoolRules
  conflictRules
  weightRules
  outcomeRules
  unsupportedRules
  provenance
}
```

Exact schema may differ.

---

## 12. Item state model

Before simulating a mechanic, define the minimum item state it needs.

Potential fields:

```text
baseId
itemClass
itemLevel
rarity
explicitModifiers[]
implicitModifiers[]
specialModifiers[]
affixCounts
flags/tags
```

Only include fields proven necessary.

---

## 13. Existing modifier identity

Existing modifiers should be represented by stable modifier ids where possible.

Do not model them only as rendered text.

A current item with unresolved modifier ids must not silently enter a mechanic that requires exact conflict checks.

---

## 14. Rarity semantics

If the mechanic accepts only certain rarities:

```text
normal
magic
rare
unique
```

model that explicitly.

Do not infer rarity restrictions from PoE1.

---

## 15. Affix-count semantics

Research whether the selected mechanic depends on:

```text
maximum prefix count
maximum suffix count
maximum explicit count
rarity-specific affix limits
```

If yes, those limits become required mechanic data.

If they cannot be proven:

```text
simulation blocked
```

for states where they matter.

---

## 16. Existing-affix handling

Define exactly whether the mechanic:

```text
preserves all existing affixes
removes some
rerolls all
replaces one
adds one
adds multiple
```

No vague wording.

---

## 17. Existing-modifier conflict behavior

If the mechanic can add a modifier, research whether candidate mods are excluded by:

```text
same modifier id
same mod group
same stat family
other exclusivity rules
tags
```

This is important because STEP-019A currently does **not** approve generic mod-group exclusivity.

---

## 18. Mod-group blocker policy

If the selected mechanic requires reliable group-conflict semantics and those semantics remain incompatible between sources:

```text
do not implement random candidate selection yet
```

Instead complete the semantics spike with:

```text
mechanic partially specified
simulation blocked by conflict model
```

A blocked result is valid.

---

## 19. Capability-specific research

Do not try to “fix all mod groups.”

Research only the exact conflict semantics needed by the selected mechanic.

If the mechanic can safely operate in a narrower subset:

```text
scope it
```

rather than expanding globally.

---

## 20. Candidate pool construction

Define the exact pipeline conceptually:

```text
STEP-020 source-pool candidates
        ↓
mechanic-specific filters
        ↓
existing-item conflict filters
        ↓
rarity/affix-count constraints
        ↓
special-generation exclusions
        ↓
final mechanic candidate pool
```

Each filter must have evidence.

---

## 21. Source-pool relationship

STEP-020's:

```text
source-pool eligible
```

must not automatically mean:

```text
selected mechanic can roll this
```

The mechanic definition must say how it narrows that pool.

---

## 22. Prefix/suffix handling

Research whether the mechanic:

```text
selects any available explicit mod
selects a prefix only
selects a suffix only
depends on open affix slots
```

Do not infer from item state heuristics.

---

## 23. Special generation types

Explicitly decide how the mechanic treats:

```text
implicit
unique
corrupted
enchantment
special
essence-only
grants-effect
other generation types
```

Default should be:

```text
unsupported/excluded
```

unless source evidence says otherwise.

---

## 24. Essence-only mods

If the first mechanic is not an Essence mechanic:

```text
essence-only mods should normally be excluded
```

but confirm this from current source semantics.

Do not assume the flag's behavior without verification.

---

## 25. Weight semantics

Research whether this mechanic uses:

```text
spawn weights
generation weights
another weight table
uniform selection
deterministic selection
```

Do not assume all random crafting uses STEP-019 spawn weights directly.

---

## 26. Spawn-weight use

If the mechanic uses spawn weight:

```text
document exact candidate weight
document which tag context determines it
document when weight 0 excludes a candidate
```

Still do not compute probability until the entire final pool is proven.

---

## 27. Generation weights

STEP-019A left generation weights `unknown`.

If the selected mechanic requires them:

```text
simulation remains blocked
```

unless this step finds reliable current semantics.

Do not reinterpret absence as multiplier 1 without evidence.

---

## 28. Weight multiplication

If multiple weight systems combine:

```text
document exact formula
```

Examples conceptually:

```text
finalWeight = spawnWeight
finalWeight = spawnWeight * generationWeight
```

Do not implement a guessed formula.

---

## 29. Final pool completeness

Before any probability is exposed, prove that the final candidate pool is complete for the supported scope.

If some candidate categories remain unresolved:

```text
probability unavailable
```

---

## 30. Empty-pool behavior

Research what happens if no valid candidate remains.

Possible outcomes:

```text
action cannot be used
action consumes currency and does nothing
game prevents action
other
```

Do not guess.

---

## 31. Deterministic vs random outcome

Classify the mechanic:

```text
deterministic
weighted-random
uniform-random
mixed
```

with evidence.

---

## 32. Probability gate

Probability may be implemented in STEP-020.5 only if all of these are proven:

```text
complete candidate pool
candidate exclusion/conflict rules
weight formula
zero-weight semantics
final selection rule
special-mod exclusions
affix-count restrictions
```

Otherwise:

```text
probabilityStatus = blocked
```

---

## 33. No fake probability

Do not return:

```text
weight / sum(weights)
```

unless the selected mechanic is proven to use exactly that model over the proven final pool.

---

## 34. Probability provenance

If probability becomes safe:

```text
mechanic id/version
snapshot checksum
compatibility policy version
mechanic semantics version
pool size
candidate weights
formula
sources
```

must be recorded.

---

## 35. No expected cost yet by default

Even if single-use probability is proven, STEP-020.5 should not automatically calculate:

```text
expected currency cost
```

unless:

```text
currency unit cost
repeatability
failure-state reset semantics
```

are also proven.

Expected cost can wait for STEP-021.

---

## 36. Mechanic semantics version

Introduce:

```text
CRAFTING_MECHANIC_SEMANTICS_VERSION = 1
```

or a mechanic-specific equivalent.

Increment when identical item states could produce a different modeled outcome.

---

## 37. Mechanic readiness

Define:

```text
ready-for-state-transition
ready-for-probability
blocked
```

A mechanic can be:

```text
ready-for-state-transition
```

while:

```text
probability = blocked
```

This distinction is important.

---

## 38. Mechanic capability report

Conceptually:

```text
CraftingMechanicReadiness {
  mechanicId
  stateTransitionStatus
  poolStatus
  conflictStatus
  weightStatus
  probabilityStatus
  blockers[]
  provenance
}
```

---

## 39. Research artifact

Create a deterministic machine-readable artifact such as:

```text
docs/data-snapshots/crafting/mechanics/<mechanic-id>.json
```

or equivalent.

It should include:

```text
mechanic id
version
current-game scope
evidence checks
supported rules
blocked rules
provenance
```

---

## 40. Mechanic evidence table

The progress document should contain a table:

```text
Rule
Source
Observed behavior
Status
```

Example rows:

```text
rarity requirement
open-affix requirement
modifier count
candidate pool
weight selection
special mods
conflicts
failure behavior
```

---

## 41. Conflicting evidence

If two sources disagree:

```text
record both
mark capability unresolved
```

Do not pick the more convenient one silently.

---

## 42. Source-code interpretation

If PoB2 code is used as evidence:

```text
record exact file
exact version/commit
relevant function
```

Do not copy large upstream code blocks.

Summarize behavior.

---

## 43. Game-data interpretation

If RePoE or another export supplies mechanic-related data:

```text
record exact fields
```

Do not infer mechanic behavior from field names alone.

---

## 44. Official description limitations

Official item/currency text may describe user-facing behavior but omit implementation details.

Treat it as evidence for:

```text
high-level transition
```

not necessarily:

```text
weight formula
conflict algorithm
```

unless explicitly documented.

---

## 45. Mechanic fixture model

Create synthetic unit fixtures covering the selected mechanic.

At minimum:

```text
valid item state
invalid rarity/state
one available candidate
multiple candidates
zero-weight candidate
blocked/special candidate
full-affix or no-space state if relevant
```

---

## 46. Real local validation

Use the local crafting snapshot for at least:

```text
one armour item
one weapon or jewellery item
```

if the selected mechanic supports both.

Do not require local validation in default `npm test`.

---

## 47. Existing affix fixtures

Where exact mod identity is required, synthetic fixtures should encode:

```text
existing prefix ids
existing suffix ids
groups only if approved
```

Do not use text-only fake mods.

---

## 48. State-transition model

If the mechanic transition is proven, expose a pure deterministic function conceptually like:

```text
validateMechanicInput(...)
buildMechanicCandidatePool(...)
applyDeterministicOutcome(...)
```

For random outcomes, do not randomly choose in STEP-020.5 unless probability semantics are fully ready.

---

## 49. Candidate-pool output

Even when probability is blocked, it is useful to expose:

```text
candidate modifier ids
exclusion reasons
unresolved candidates
```

for debugging and future STEP-021 work.

---

## 50. No Monte Carlo

Do not add random simulation in STEP-020.5.

The purpose is semantics research and model validation.

---

## 51. No multi-step sequence

Do not model:

```text
orb A
then orb B
then annul
then exalt
```

One mechanic, one action only.

---

## 52. No crafting strategy

Do not say:

```text
use this action first
this is optimal
this is cheapest
```

---

## 53. No build-aware crafting advice

Do not use CharacterContext or PoB2 delta to choose the mechanic.

This step is mechanic semantics only.

---

## 54. No economy dependency

No poe.ninja is required.

The cost of the currency is irrelevant to mechanic correctness.

---

## 55. Planner integration boundary

STEP-020 may supply:

```text
base
item level
desired modifier ids
```

to future mechanic code.

STEP-020.5 should define how the selected mechanic accepts that item state.

Do not modify STEP-020 ranking/target semantics unless necessary for exact item-state representation.

---

## 56. Existing item state gap

STEP-020 currently plans against:

```text
base + item level + targets
```

not full current affixes.

If the selected mechanic depends on current affixes, STEP-020.5 must define the additional item-state model required for STEP-021.

Do not force it into STEP-020 target planning UI yet.

---

## 57. Rarity/item-state schema

Recommended separate domain type:

```text
CraftingItemState
```

rather than reusing `NormalizedItem` directly.

Conceptually:

```text
CraftingItemState {
  baseId
  itemLevel
  rarity
  explicitModifierIds[]
  implicitModifierIds[]
}
```

Only add fields proven necessary.

---

## 58. NormalizedItem adapter

If useful, create a deterministic adapter:

```text
NormalizedItem
→ CraftingItemState
```

only where:

```text
base resolved
item level known
modifier ids known
rarity known
```

If required information is missing:

```text
state-unresolved
```

Do not guess.

---

## 59. PoB2 imported-item limitation

If current PoB2 normalization does not preserve enough modifier identity/item-level data to build `CraftingItemState`:

```text
document the gap
```

This may become a later import-enrichment step.

Do not block semantic research itself.

---

## 60. State validation errors

Structured examples:

```text
mechanic-not-ready
unsupported-item-state
unsupported-rarity
item-level-missing
base-unresolved
modifier-identity-unresolved
no-open-affix-slot
candidate-pool-empty
conflict-model-unavailable
weight-model-unavailable
```

Only include errors relevant to the selected mechanic.

---

## 61. Mechanic-specific package

Recommended package:

```text
packages/crafting-mechanics
```

or:

```text
packages/crafting-mechanics/<mechanic>
```

Responsibilities:

```text
mechanic schemas
state validation
pool construction
evidence-backed transition rules
readiness/provenance
```

No network.

---

## 62. Dependency boundary

Recommended:

```text
crafting-data
      ↓
crafting-planner
      ↓
crafting-mechanics
```

or:

```text
crafting-data
      ↓
crafting-mechanics
```

depending on whether the mechanic consumes target plans.

Avoid:

```text
crafting-mechanics → web
```

---

## 63. No hidden planner dependency

Mechanic correctness must not depend on UI ordering or user-facing target labels.

Use stable ids.

---

## 64. Test — valid state

A valid synthetic item should:

```text
pass mechanic preconditions
```

and produce the expected candidate pool/transition readiness.

---

## 65. Test — invalid rarity/state

If the mechanic has rarity restrictions:

```text
invalid rarity
→ structured rejection
```

No silent conversion.

---

## 66. Test — full item

If the mechanic requires an open affix slot:

```text
full item
→ blocked/rejected
```

only if the affix-count rule is proven.

---

## 67. Test — special mod excluded

A special/essence-only/implicit candidate should be excluded when the mechanic cannot access it.

The exclusion reason must be visible.

---

## 68. Test — zero weight

Weight zero should not enter the final random candidate pool if the mechanic uses spawn weight.

---

## 69. Test — unresolved conflict model

If an existing modifier creates a conflict that cannot be safely resolved:

```text
candidate resolution = unresolved
```

or:

```text
mechanic blocked
```

Do not choose a candidate anyway.

---

## 70. Test — deterministic pool

Reversing source fixture insertion order must not change the final candidate set.

If order matters semantically, preserve source-defined order explicitly.

---

## 71. Test — no probability when blocked

When any required probability capability is unresolved:

```text
probability field absent
or
probabilityStatus = blocked
```

No numeric placeholder.

---

## 72. Test — probability math if approved

Only if probability becomes approved:

```text
known synthetic pool
known weights
expected exact probabilities
sum = 1 within numeric tolerance
```

Also test zero-weight exclusion.

---

## 73. Test — snapshot binding

Mechanic readiness/results must be tied to:

```text
crafting snapshot checksum
compatibility policy version
mechanic semantics version
```

A stale snapshot/report must fail closed.

---

## 74. Default test requirements

Default `npm test` must not require:

```text
network
PoB2 executable
GGG credentials
poe.ninja
live RePoE
AI
local full snapshot
```

Use synthetic fixtures.

---

## 75. Explicit research command

Add an explicit command such as:

```text
npm run crafting:mechanic:research
```

or a mechanic-specific command.

It may read:

```text
local snapshot
installed PoB2 data
stored source observations
```

but must not run in default tests.

---

## 76. Optional inspect command

Useful:

```text
npm run crafting:mechanic:inspect -- <mechanic-id>
```

showing:

```text
readiness
supported item states
blocked capabilities
provenance
```

---

## 77. No production UI required

STEP-020.5 does not require a user-facing crafting-action UI.

A developer/readiness page is optional.

Avoid creating buttons that imply the mechanic can already be simulated.

---

## 78. Documentation

Create:

```text
docs/progress/STEP-020-5-first-crafting-mechanic-semantics.md
```

Include:

```text
Why STEP-020.5 Exists
Mechanic Candidates Considered
Selected Mechanic
Selection Rationale
Current-Version Evidence
Source Hierarchy
Mechanic Identity
Input Item State
Rarity Rules
Existing Affix Rules
Affix Count Rules
Candidate Pool Construction
STEP-020 Source-Pool Relationship
Special Generation Types
Essence-Only Handling
Modifier Conflict Rules
Spawn Weight Usage
Generation Weight Usage
Weight Formula
Empty Pool Behavior
State Transition
Randomness Model
Probability Gate
Expected Cost Status
Mechanic Readiness
CraftingItemState Model
NormalizedItem Adapter Status
Synthetic Tests
Real Local Validation
Snapshot Binding
Security / Privacy
Known Limitations
STEP-021 Readiness
```

---

## 79. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only with proven durable decisions:

```text
selected first mechanic
mechanic semantics source(s)
state-transition rule
candidate-pool rule
affix-count rule if proven
conflict rule if proven
weight rule if proven
probability readiness
CRAFTING_MECHANIC_SEMANTICS_VERSION
```

Do not record hypotheses as facts.

---

## 80. Security/privacy

No user data should be sent to research sources.

If local PoB2 data is read:

```text
do not modify the live install
```

No arbitrary downloaded code execution.

---

## 81. Licensing

If mechanic implementation requires copying current PoB2 or other upstream code/data:

```text
review licensing before committing it
```

Prefer:

```text
behavioral reimplementation
+
source attribution
```

over copying source code.

---

## 82. Performance

No performance optimization is required beyond deterministic local queries.

This is a semantics spike.

Correctness is the priority.

---

## 83. Successful outcome A — fully ready

Ideal:

```text
Mechanic:
<selected mechanic>

State transition:
ready

Candidate pool:
ready

Conflict rules:
ready

Weight rules:
ready

Probability:
ready

STEP-021:
ready to implement this one mechanic
```

---

## 84. Successful outcome B — transition ready, probability blocked

Also valid:

```text
Mechanic:
<selected mechanic>

State transition:
ready

Candidate pool:
ready

Conflict rules:
partial

Weight rules:
partial

Probability:
blocked

STEP-021:
may implement deterministic state/pool inspection,
but not random simulation yet
```

---

## 85. Successful outcome C — mechanic blocked

Also valid:

```text
Mechanic:
<selected mechanic>

State transition:
partially known

Blocking capability:
modifier conflict semantics

Probability:
blocked

STEP-021:
do not implement this mechanic yet
```

A blocked result is better than a guessed simulator.

---

## 86. Recommended first mechanic candidate

Do not hard-code the choice in advance.

However, the research should first consider a simple:

```text
add-one-random-explicit-modifier
```

style action if current PoE2 evidence supports it.

Reasons to investigate it first:

```text
single state transition
small outcome surface
direct connection to STEP-020 modifier pool
clear future probability model if affix/conflict semantics are proven
```

This is a research preference, not an approved mechanic assumption.

---

## 87. No PoE1 carry-over

Explicitly verify:

```text
rarity restrictions
affix limits
candidate pool
currency consumption behavior
```

for current PoE2.

Do not copy PoE1 rules merely because names are similar.

---

## 88. STEP-021 gate

STEP-021 may begin for the selected mechanic only if:

```text
stateTransitionStatus = ready
candidatePoolStatus = ready
```

Random simulation additionally requires:

```text
probabilityStatus = ready
```

If probability remains blocked, STEP-021 must not generate random outcomes for that mechanic.

---

## 89. Roadmap state

Current sequence:

```text
STEP-019
crafting data ingestion
COMPLETE

STEP-019A
planner readiness
COMPLETE

STEP-020
scoped craft target planner
COMPLETE

STEP-020.5
first mechanic semantics spike
NEXT

STEP-021
craft simulation
BLOCKED until STEP-020.5
```

---

## 90. Stop condition

After selecting one mechanic, researching its current semantics, encoding readiness, validating synthetic/local cases, and documenting exact blockers:

**STOP.**

Do not automatically implement STEP-021.

Return one explicit final status:

```text
STEP-021 READY FOR THIS MECHANIC
```

or:

```text
STEP-021 PARTIALLY READY
```

or:

```text
STEP-021 BLOCKED
```

with exact capability reasons.
