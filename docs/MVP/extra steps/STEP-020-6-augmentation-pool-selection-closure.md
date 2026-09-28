# STEP-020.6 — Orb of Augmentation pool and selection-rule closure

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.6  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the exact blockers that remain after STEP-020.5 for the first selected crafting mechanic:

```text
Orb of Augmentation
mechanic id: add-random-explicit
```

STEP-020.5 already proved the high-level state transition for a narrowly scoped item state:

```text
Magic item
+ fewer than two random explicit modifiers
→ adds one random modifier
```

However, STEP-020.5 deliberately did **not** prove:

```text
which modifier ids are valid Augmentation outcomes
how existing explicit modifiers exclude candidates
whether mod-group rules apply
whether prefix/suffix slot state constrains the pool
which weight model selects among valid outcomes
whether spawn weights are the final weights
whether generation weights matter
what exact probability formula is valid
```

STEP-020.6 must research and formalize those missing rules.

The purpose of this step is to decide whether STEP-021 can safely simulate Orb of Augmentation.

---

## 2. Starting point

Current STEP-020.5 mechanic readiness:

```text
State transition:
ready for Magic item with zero explicit modifiers

Candidate pool:
partial

Conflict rules:
unavailable once an explicit modifier exists

Weights:
unknown

Probability:
blocked
```

The current implementation intentionally exposes:

```text
source-pool inspection ids
```

but:

```text
finalMechanicCandidateIds = []
```

That must remain unchanged until this step proves the mechanic-specific pool.

---

## 3. Core invariant

Hard rule:

```text
STEP-020 source-pool eligible
!=
Orb of Augmentation outcome
```

Another hard rule:

```text
probability
requires
complete mechanic-specific candidate pool
+
proven exclusion/conflict rules
+
proven weight formula
```

No numeric probability may appear before all three are proven.

---

## 4. Scope

STEP-020.6 is only about:

```text
Orb of Augmentation
add-random-explicit
```

Do not research or implement:

```text
Exalted Orb
Regal Orb
Chaos Orb
Essence
Transmutation
Annulment
multi-step crafting
```

unless needed strictly as comparison evidence.

---

## 5. Acceptance criteria

- [ ] Current Augmentation semantics from STEP-020.5 remain intact.
- [ ] A mechanic-specific candidate-pool rule is researched.
- [ ] Candidate-pool source evidence is documented.
- [ ] Normal prefix/suffix inclusion rules are explicit.
- [ ] Special generation-type handling is explicit.
- [ ] Essence-only handling is explicit.
- [ ] Existing modifier conflict rules are researched.
- [ ] Same-id conflict behavior is explicit.
- [ ] Mod-group conflict behavior is either proven or remains blocked.
- [ ] Prefix/suffix slot occupancy behavior is explicit.
- [ ] Total explicit cap behavior remains distinct from prefix/suffix slot rules.
- [ ] The one-existing-modifier state is re-evaluated using proven conflict semantics.
- [ ] Source spawn-weight use is researched for Augmentation.
- [ ] Generation-weight use is researched for Augmentation.
- [ ] Final candidate weight formula is either proven or remains blocked.
- [ ] Weight `0` behavior is explicit.
- [ ] Empty candidate pool behavior is explicit if source evidence exists.
- [ ] The final mechanic candidate list is populated only if the pool is proven.
- [ ] Probability is computed only if the pool and weight model are fully proven.
- [ ] If probability remains blocked, no numeric placeholder is returned.
- [ ] Real local snapshot validation covers at least one armour and one jewellery item.
- [ ] Default tests remain synthetic and offline.
- [ ] No currency cost model is added.
- [ ] No expected attempts or expected cost is added.
- [ ] No Monte Carlo simulation is added.
- [ ] No trade search is added.
- [ ] No AI is used.
- [ ] Create:
      `docs/progress/STEP-020-6-augmentation-pool-selection-closure.md`

---

## 6. Primary research questions

Answer these exact questions.

### Pool

```text
What source/modifier records may Orb of Augmentation select from?
```

### Existing affixes

```text
Which candidates are excluded because of the item's existing explicit modifiers?
```

### Slot state

```text
Does Augmentation choose only a prefix when no prefix slot is occupied?
Does it choose only a suffix when no suffix slot is occupied?
What happens when one side is full and the other is open?
```

Do not assume PoE1 behavior.

### Weighting

```text
How is one candidate selected from the final pool?
```

---

## 7. Source hierarchy

Prefer evidence in this order:

```text
1. official GGG game data / authoritative current implementation where available
2. current PoE2 exported game data with verified semantics
3. current Path of Building Community PoE2 implementation
4. high-quality current technical community source
```

Do not use:

```text
PoE1 analogy
old beta behavior
forum memory
unsourced wiki assumptions
```

as sufficient proof.

---

## 8. Current-version requirement

All evidence must be tied to the current project context.

Record:

```text
source version
commit/tag
file/function
date checked
```

Do not mix old and current crafting behavior silently.

---

## 9. Mechanic evidence artifact

Update or replace:

```text
docs/data-snapshots/crafting/mechanics/add-random-explicit.json
```

to include:

```text
candidatePoolStatus
conflictRuleStatus
slotRuleStatus
spawnWeightStatus
generationWeightStatus
selectionRuleStatus
probabilityStatus
evidence[]
blockers[]
```

Bind it to:

```text
crafting snapshot checksum
compatibility policy version
mechanic semantics version
```

---

## 10. Mechanic semantics version

Increment the semantics version if STEP-020.6 changes the modeled behavior.

Recommended:

```text
CRAFTING_MECHANIC_SEMANTICS_VERSION = 2
```

if the candidate pool/conflict/selection rules become more complete.

Do not bump only for documentation wording.

---

## 11. Candidate-pool construction

Define the exact mechanic pipeline.

Conceptually:

```text
all modifier records
        ↓
supported item domain
        ↓
base/source-pool eligibility
        ↓
mechanic-accessible generation types
        ↓
mechanic-specific special-mod exclusions
        ↓
existing-affix conflicts
        ↓
available prefix/suffix capacity
        ↓
weight eligibility
        ↓
finalMechanicCandidateIds
```

Every stage needs evidence.

---

## 12. Normal explicit generation types

Research whether Orb of Augmentation can select:

```text
prefix
suffix
```

as the normal candidate set.

Do not infer that every `prefix`/`suffix` source-pool mod is automatically Augmentation-accessible.

---

## 13. Special generation types

Explicitly investigate/exclude:

```text
implicit
unique
corrupted
enchantment
scourge/special
special grants-effect records
other observed generation types
```

A type may be excluded only with evidence or remain unresolved.

Do not silently drop it because it is inconvenient.

---

## 14. Essence-only modifiers

STEP-020.5 left essence-only prefix/suffix mods unresolved.

Resolve whether Orb of Augmentation:

```text
cannot select them
can select them
or remains unknown
```

If no reliable evidence exists:

```text
mechanic candidate pool remains partial
```

unless the supported simulation scope explicitly excludes every affected category and proves completeness within that scope.

---

## 15. Current-item affix state

Expand `CraftingItemState` only as required.

Potentially required fields:

```text
explicitModifierIds[]
prefixModifierIds[]
suffixModifierIds[]
```

Prefer deriving prefix/suffix identity from known modifier ids rather than duplicating source truth.

---

## 16. Prefix/suffix occupancy

For each existing modifier id:

```text
lookup generation type
classify prefix/suffix/other
```

Do not infer affix kind from rendered text.

---

## 17. Magic-item affix structure

STEP-020.5 proved only:

```text
up to two random modifiers
```

Research whether current PoE2 magic items specifically allow:

```text
one prefix + one suffix
```

or another structure.

This rule is required before simulating a one-modifier magic item if pool availability depends on affix side.

---

## 18. Existing-modifier conflict model

Research candidate exclusion against existing mods.

Potential conflict mechanisms:

```text
same modifier id
same modifier group
same stat-family restriction
generation type/slot capacity
source-specific exclusivity
```

Do not use any mechanism unless proven.

---

## 19. Same-id exclusion

Determine whether an item already containing modifier id X may receive:

```text
X again
```

If the answer is no, record the source/proof.

Do not infer solely from common crafting expectations.

---

## 20. Mod-group conflict

STEP-019A found group disagreements between RePoE and PoB2.

Therefore generic use of:

```text
modifier.group
```

remains blocked.

STEP-020.6 must either:

```text
prove the exact group-conflict semantics required by Augmentation
```

or:

```text
keep one-existing-modifier simulation blocked
```

Do not globally "fix" group mappings without evidence.

---

## 21. Capability-scoped conflict model

If conflict semantics can be proven only for a subset:

```text
support that subset explicitly
```

Example:

```text
supported conflict classes
supported modifier families
```

Everything else:

```text
conflict-unresolved
```

---

## 22. No false coexistence assumption

If conflict rules are incomplete:

```text
do not include potentially conflicting candidates
```

as final probabilistic outcomes unless the scope proves they cannot occur.

A partial inspection list may remain available.

---

## 23. One-existing-modifier state

Revisit the state:

```text
Magic item
1 known explicit modifier
```

A successful result requires proven:

```text
remaining affix capacity
candidate conflict filtering
mechanic pool
selection rule
```

Otherwise keep:

```text
conflict-model-unavailable
```

---

## 24. Zero-existing-modifier state

Even with no existing modifier, the mechanic-specific pool must still be proven before final candidate selection or probability.

Do not assume this state is probability-ready just because conflicts are absent.

---

## 25. Spawn-weight semantics

Research whether Augmentation uses the STEP-019 source spawn weights directly.

Required evidence must establish:

```text
candidate's relevant tag
resolved spawn weight
whether weight 0 excludes
whether positive value is the selection weight
```

Do not infer from `GetModSpawnWeight` alone unless the crafting selection code/model links that value to Augmentation.

---

## 26. Generation weights

STEP-019A currently marks generation weights unknown.

Determine whether Augmentation requires:

```text
generationWeights
weightMultiplierKey
another mechanic-specific multiplier
```

If required but unavailable:

```text
probability remains blocked
```

---

## 27. Empty generation-weight list

Do not interpret:

```text
no generation-weight records
```

as:

```text
multiplier = 1
```

unless source semantics prove that default.

---

## 28. Weight formula

If proven, encode the exact formula.

Conceptually:

```text
finalWeight = spawnWeight
```

or:

```text
finalWeight = spawnWeight * generationMultiplier
```

or another source-backed formula.

Do not invent one.

---

## 29. Candidate pool completeness gate

A final Augmentation candidate pool is `ready` only if:

```text
all mechanic-accessible generation types are known
all special-only exclusions are known
existing-mod conflicts are resolved for the supported item state
slot capacity is resolved
weight eligibility is resolved
```

Otherwise:

```text
candidatePoolStatus = partial
```

---

## 30. Final candidate list

Only when candidate pool readiness is `ready` may:

```text
finalMechanicCandidateIds
```

be non-empty as authoritative Augmentation outcomes.

Before that, retain:

```text
inspectionCandidateIds
```

separately.

---

## 31. Candidate exclusion reasons

For every excluded or unresolved candidate, retain structured reason where practical:

```text
wrong-generation-type
essence-only-unresolved
source-pool-ineligible
zero-weight
existing-mod-conflict
slot-unavailable
group-conflict-unresolved
generation-weight-unresolved
```

---

## 32. Probability readiness

Probability may be `ready` only if:

```text
candidate pool is complete
final weight for every candidate is known
selection is proven weighted/random over that exact pool
```

If any candidate has unknown final weight:

```text
probability blocked
```

---

## 33. Probability formula

Only if fully proven:

```text
P(candidate i) =
finalWeight(i) / sum(finalWeight(all candidates))
```

or the verified current mechanic formula.

Do not use this formula merely because it is common.

---

## 34. Numeric precision

If probability becomes approved:

```text
use exact/raw weights
calculate with sufficient numeric precision
round only for display
```

Store the raw numerator/denominator in the result where practical.

---

## 35. Probability result shape

Conceptually:

```text
MechanicOutcomeProbability {
  modifierId
  finalWeight
  probability
}
```

Only include when:

```text
probabilityStatus = ready
```

No nullable fake probability rows when blocked.

---

## 36. Sum check

If probability is implemented:

```text
sum(probabilities) ≈ 1
```

within defined numeric tolerance.

Test this.

---

## 37. Empty-pool behavior

Research what happens when:

```text
the action is otherwise valid
but final candidate pool is empty
```

Possible:

```text
game prevents use
action fails without consumption
action consumes
state impossible by game rules
```

If not proven:

```text
emptyPoolBehavior = unknown
```

and do not simulate currency consumption.

---

## 38. Full-item behavior

STEP-020.5 already treats two explicit ids as no open slot.

Do not change:

```text
currency consumed?
```

unless current evidence explicitly proves it.

---

## 39. Greater/Perfect Augmentation

STEP-020.5 observed Greater/Perfect records with similar text.

Keep them outside the supported mechanic unless this step intentionally researches tier-specific semantics.

Recommended:

```text
remain unsupported
```

to keep scope focused.

---

## 40. CraftingItemState enrichment

If one-existing-modifier simulation becomes supported, `CraftingItemState` may remain:

```text
baseId
itemLevel
rarity
explicitModifierIds
```

because prefix/suffix/group data can be looked up by id.

Avoid storing redundant derived data unless necessary.

---

## 41. Unknown modifier ids

If any existing explicit id cannot be resolved:

```text
modifier-identity-unresolved
```

The mechanic must fail closed.

---

## 42. Adapter from real gear

Do not require full PoB/gear integration for this closure.

But document what is still missing for:

```text
real imported item
→ CraftingItemState
```

If explicit modifier ids remain unavailable, STEP-021 may initially use manually specified/synthetic item states.

---

## 43. Mechanic API

Recommended pure interfaces:

```text
validateAddRandomExplicitState(...)
buildAddRandomExplicitPool(...)
explainAddRandomExplicitSelection(...)
```

Only add:

```text
computeAddRandomExplicitProbabilities(...)
```

if probability readiness becomes fully approved.

---

## 44. No random draw yet

Even if probabilities become approved, STEP-020.6 does **not** need to perform a random craft.

Its goal is pool/selection semantics closure.

Actual random simulation belongs to STEP-021.

---

## 45. No Monte Carlo

Do not add seeded simulation in this step.

---

## 46. No expected cost

No:

```text
expected attempts
expected currency cost
cost per success
```

even if probability is proven.

STEP-021 or later owns that.

---

## 47. Synthetic test matrix

Add tests covering at minimum:

```text
magic 0-mod item
magic 1-prefix item
magic 1-suffix item
magic 2-mod full item
same-id candidate
same-group candidate if conflict semantics are modeled
prefix-only remaining capacity
suffix-only remaining capacity
essence-only candidate
special generation type
zero spawn weight
unknown generation weight
empty candidate pool
stale compatibility report
```

---

## 48. Test — no group guessing

If group conflict remains unresolved:

```text
one-existing-modifier item
→ probability not ready
```

Do not silently ignore group conflicts.

---

## 49. Test — final pool separation

Verify:

```text
inspectionCandidateIds
```

may contain records while:

```text
finalMechanicCandidateIds
```

remains empty when readiness is partial.

---

## 50. Test — pool readiness

When synthetic evidence/model is fully complete:

```text
finalMechanicCandidateIds
```

contains exactly the proven candidates.

No unresolved candidate may enter the final pool.

---

## 51. Test — zero weight

If spawn weight is part of final selection:

```text
weight 0
→ not in final weighted candidate set
```

---

## 52. Test — special generation type

Non-mechanic-accessible generation type:

```text
excluded
```

with explicit reason.

---

## 53. Test — essence-only

Behavior must match the conclusion reached by this step:

```text
excluded
included
or unresolved
```

No silent assumption.

---

## 54. Test — one existing prefix

If current semantics prove magic items are one-prefix/one-suffix:

```text
existing prefix
→ final pool contains only allowed suffix outcomes
```

only if conflict rules are otherwise complete.

---

## 55. Test — one existing suffix

Likewise:

```text
existing suffix
→ only allowed prefix outcomes
```

only if proven.

---

## 56. Test — probability blocked

Any unresolved required capability:

```text
probabilityStatus = blocked
```

and:

```text
probabilities absent
```

---

## 57. Test — probability ready

Only if approved:

Use a tiny synthetic pool with known final weights.

Verify exact expected ratios.

---

## 58. Test — deterministic pool order

Same item state + same snapshot:

```text
same candidate ids
same order
same exclusion reasons
```

independent of source insertion order where semantic order is irrelevant.

---

## 59. Real local validation

Validate on current local snapshot with at least:

```text
Rusted Cuirass
Iron Ring
```

and, if one-existing-modifier rules become approved:

```text
0-mod magic state
1-prefix magic state
1-suffix magic state
```

Use known modifier ids.

---

## 60. Real local output

Report:

```text
inspection candidate count
final mechanic candidate count
unresolved candidate count
probability status
snapshot checksum
mechanic semantics version
```

Do not print thousands of rows by default.

---

## 61. Explicit research command

Add or extend:

```text
npm run crafting:mechanic:research
```

to validate the new evidence.

It may read:

```text
local crafting source files
local snapshot
local PoB2 code/data
```

No default-test dependency.

---

## 62. Inspect command

Extend:

```text
npm run crafting:mechanic:inspect -- add-random-explicit
```

to show:

```text
pool readiness
conflict readiness
weight readiness
probability readiness
candidate counts
blockers
```

---

## 63. Evidence provenance

Every newly approved rule must record:

```text
source
version/commit
file/function/record
summary of observed behavior
```

Do not write:

```text
known from PoE
```

without a source.

---

## 64. Conflicting evidence policy

If RePoE and PoB2 disagree:

```text
record mismatch
scope feature down
or
keep capability blocked
```

Do not choose one silently.

---

## 65. STEP-019A group mismatch

The known `BaseLocalDefences` disagreement must remain visible in this step.

If Augmentation conflict semantics rely on that family:

```text
the affected item state remains blocked
```

unless better evidence resolves it.

---

## 66. No global mod-group rewrite

Do not mutate the STEP-019 normalized group ids to make Augmentation work.

Any mechanic-specific compatibility mapping must be:

```text
separate
versioned
evidence-backed
```

---

## 67. Security/privacy

No user data leaves the process.

Do not modify the live PoB2 install.

No arbitrary downloaded code execution.

---

## 68. Licensing

Prefer behavior summaries and small evidence metadata.

Do not copy substantial upstream source code or full datasets.

If new copied data becomes necessary, apply the same conservative review used in STEP-019/019A.

---

## 69. Performance

This step is not performance-sensitive.

Correctness first.

Pool construction should still use existing indexes rather than unnecessary full rescans where practical.

---

## 70. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run research/inspect commands separately.

Run `npm audit` only if dependency files change.

---

## 71. Default-test rules

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

---

## 72. Documentation

Create:

```text
docs/progress/STEP-020-6-augmentation-pool-selection-closure.md
```

Include:

```text
Why STEP-020.6 Exists
STEP-020.5 Starting State
Primary Research Questions
Current-Version Evidence
Candidate Pool Rule
Normal Prefix/Suffix Pool
Special Generation Types
Essence-Only Handling
Magic Affix Structure
Existing-Modifier Conflict Rules
Same-ID Handling
Mod-Group Handling
Slot Capacity
Spawn-Weight Use
Generation-Weight Use
Final Weight Formula
Pool Completeness
Empty-Pool Behavior
Probability Gate
Probability Formula
Mechanic Semantics Version
CraftingItemState
Synthetic Tests
Real Local Validation
Snapshot Binding
Known Limitations
STEP-021 Readiness
```

---

## 73. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only for durable conclusions such as:

```text
Augmentation mechanic-specific candidate-pool rule
magic affix-structure rule
existing-mod conflict rule
essence-only treatment
spawn-weight treatment
generation-weight treatment
selection formula
probability readiness
mechanic semantics version
```

Do not log unresolved hypotheses as facts.

---

## 74. Successful outcome A — STEP-021 ready

Ideal result:

```text
State transition:
ready

Candidate pool:
ready

Existing-mod conflict rules:
ready for supported scope

Weight model:
ready

Probability:
ready

STEP-021:
READY FOR ORB OF AUGMENTATION
```

STEP-021 may then implement deterministic seeded simulation for this one mechanic.

---

## 75. Successful outcome B — zero-mod simulation only

A valid narrower result:

```text
State transition:
ready

0-mod candidate pool:
ready

1-mod conflict model:
blocked

Weight model:
ready

Probability:
ready for 0-mod state only

STEP-021:
READY FOR ZERO-MOD AUGMENTATION ONLY
```

This is acceptable if explicitly scoped.

---

## 76. Successful outcome C — still blocked

Also valid:

```text
Candidate pool:
partial

Conflict rules:
blocked

Weight model:
unknown

Probability:
blocked

STEP-021:
BLOCKED
```

Do not force a ready result.

---

## 77. STEP-021 gate

STEP-021 may simulate Orb of Augmentation only for item states where:

```text
state transition = ready
candidate pool = ready
weight model = ready
probability = ready
```

If readiness is narrower than all magic items:

```text
simulation must preserve that same narrow scope
```

---

## 78. Roadmap state

```text
STEP-019
crafting data ingestion
COMPLETE

STEP-019A
planner readiness
COMPLETE

STEP-020
craft target planner
COMPLETE

STEP-020.5
first mechanic semantics
COMPLETE

STEP-020.6
Augmentation pool / conflict / selection closure
NEXT

STEP-021
craft simulation
BLOCKED pending STEP-020.6
```

---

## 79. Stop condition

After researching and encoding the mechanic-specific candidate pool, conflict model, slot rules, and selection/weight semantics:

**STOP.**

Do not automatically implement random simulation.

Return one explicit final status:

```text
STEP-021 READY FOR ORB OF AUGMENTATION
```

or:

```text
STEP-021 READY FOR ZERO-MOD AUGMENTATION ONLY
```

or:

```text
STEP-021 BLOCKED
```

with exact blockers.
