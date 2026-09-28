# STEP-020.9 — Community weight dataset ingestion and current-patch validation

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.9  
**Authoring context:** Cursor-assisted development

## 1. Objective

Build the missing **community-derived modifier-weight layer** required for reliable PoE2 crafting probabilities.

The project already understands most of the validated Augmentation model:

```text
eligible modifier pool
item-level filtering
prefix/suffix structure
Magic-item side closure
single weighted draw across currently open affixes
```

The remaining blocker is that Buddy does not yet own a validated, current-patch modifier-weight dataset.

STEP-020.9 must:

```text
ingest the historical Prohibited Library weight source
map it deterministically to Buddy modifier ids
compare it against current Craft of Exile 4.5.5.3 data/behavior
cross-check PoE2DB where possible
build a versioned current community-weight snapshot
re-run Augmentation probability validation
```

If a useful scope reaches complete current weight coverage, STEP-021 may begin for that exact scope.

---

## 2. Product reason

Crafting is a core part of the intended PoE2 Buddy product.

Long term, Buddy should support:

```text
build analysis
upgrade recommendations
craft target planning
craft outcome probabilities
expected attempts / expected currency cost
step-by-step crafting routes
```

Without weights, Buddy can list possible modifiers but cannot reliably answer:

```text
How likely is T1 Life?
Is this craft realistic?
Which craft route is better?
How many attempts should I expect?
What should I do after each success/failure state?
```

This step establishes the missing data layer required for later user-facing crafting guidance.

---

## 3. Current state

Completed/frozen:

```text
STEP-019
crafting data ingestion

STEP-019A
planner readiness

STEP-020
scoped craft target planner

STEP-020.5
Augmentation transition semantics

STEP-020.6
direct-evidence closure

STEP-020.7
simulation go/no-go

STEP-020.8
Craft of Exile / PoE2DB static differential

STEP-020.8A
Craft of Exile behavioral reconstruction
```

STEP-020.8A established, for the current community model:

```text
Magic + 0 explicits:
both prefix and suffix sides open

Magic + 1 prefix:
prefix side closed
suffixes remain

Magic + 1 suffix:
suffix side closed
prefixes remain

selection:
one weighted draw across the combined currently open pool
```

It also established that the eligible modifier identities match Buddy's local inspection pool for controlled Body Armour, Ring, Wand, and low-item-level cases.

The unresolved issue is:

```text
Craft of Exile class weight
!=
RePoE spawn weight
```

---

## 4. Newly identified historical source

The connected Google Sheet:

```text
poe2 (0.4) recombinator
```

contains hidden backend tabs including:

```text
WEIGHTS
SPAWNLVLS
ILVLS
W+I
AFFIX_SELECTOR
W_P_*
W_S_*
I_P_*
I_S_*
```

The `WEIGHTS` tab contains:

```text
base category
prefix/suffix
modifier family
per-tier weight
```

Observed examples for `BODY ARMOUR (STR)` include:

```text
# to maximum Life
1000 / 1000 / 1000 / ...

# to Spirit
100 / 200 / 300 / 400 / 500 ...

#% to Chaos Resistance
250 / 250 / ...

# to Stun Threshold
800 / 800 / ...

#% reduced Attribute Requirements
900 / 900 / ...
```

The `W+I` tab combines:

```text
required item level | weight
```

for each tier.

Example:

```text
BODY ARMOUR (STR)
# to maximum Life

80|1000
75|1000
70|1000
...
```

This historical sheet is treated as a Prohibited Library / Krakenbul community-research source.

---

## 5. Critical caveat

The Google Sheet is historical.

It must **not** be promoted directly as current truth.

Treat it as:

```text
historical seed/reference dataset
```

not:

```text
current patch authority
```

Current promotion requires current-patch validation.

---

## 6. Source roles

### Buddy/RePoE snapshot

Use for:

```text
stable modifier ids
base compatibility
generation type
stat ids
item-level requirements
ranges
source-pool eligibility
```

### Historical Prohibited Library Google Sheet

Use for:

```text
weight provenance lineage
historical per-base/per-family weights
historical tier weights
historical item-level + weight pairings
```

### Craft of Exile 4.5.5.3

Use as the current community behavioral/model source for:

```text
current class weights where observable
candidate pool behavior
current Augmentation probability model
```

### PoE2DB

Use as an independent community cross-check for:

```text
modifier/base/tier identity
weight provenance
numeric weight information where exposed
```

---

## 7. Model classification

All promoted weights from this step must be labeled:

```text
modelKind = "community-derived"
```

Never:

```text
official
GGG-internal
exact game-file weight
```

Suggested provenance label:

```text
weightModelSource = "Prohibited Library lineage"
```

---

## 8. Main deliverable

Create a community-weight layer, either inside `@poe2-helper/crafting-data` or as a narrowly scoped companion package if cleaner.

Conceptual shape:

```text
CommunityModifierWeight {
  modifierId
  itemClass
  baseScope
  affixKind
  tier
  requiredItemLevel
  weight
  source
  sourcePatch
  validationStatus
  provenance
}
```

---

## 9. Stable identity rule

Do not use display text as the final key.

Map historical sheet rows to Buddy modifier ids using as many of:

```text
item class / base category
prefix/suffix
stat ids
display family
tier ordering
required item level
stat range
generation type
```

Final weight records must be keyed by Buddy's canonical modifier id.

---

## 10. Ambiguous mapping rule

If more than one current modifier can match one historical row:

```text
mapping = unresolved
```

Record:

```text
candidate ids
reason for ambiguity
```

Do not guess.

---

## 11. Historical ingestion workflow

Use an explicit developer-only workflow:

```text
Google Sheet
→ reviewed export / connector read
→ normalized historical-weight artifact
→ deterministic importer
```

Default tests must not require Google Drive.

---

## 12. Runtime independence

Buddy production must not query:

```text
Google Sheets
Craft of Exile
PoE2DB
```

for every user craft.

External sources are used only during explicit refresh/validation.

Production uses the promoted local snapshot.

---

## 13. Licensing / distribution review

Before committing a full copied dataset from the Google Sheet or Craft of Exile:

```text
record source ownership
record visible sharing/license information
decide whether redistribution is permitted
```

If unclear:

```text
keep full source local/gitignored
commit only manifests, checksums, derived mappings, and compact validation facts
```

Follow the conservative precedent used in STEP-019.

---

## 14. Historical artifact

Create a normalized historical artifact conceptually like:

```text
var/crafting-community-weights/
historical-prohibited-library.json
```

If redistribution is blocked/unclear, keep it gitignored.

Commit a manifest containing:

```text
source title
spreadsheet id
observed date
observed version/title
schema version
checksum
row counts
mapping counts
```

---

## 15. Historical schema

Suggested normalized row:

```text
{
  baseCategory,
  affixKind,
  displayFamily,
  tierIndex,
  requiredItemLevel,
  weight
}
```

---

## 16. Current Craft of Exile extraction

STEP-020.8A reconstructed current class weights for controlled examples.

STEP-020.9 must extract enough current weight data to compare historical weights systematically.

For each current row record:

```text
modifier id
current class weight
item-level range
affix kind
base/class scope
source patch
```

---

## 17. No code copying

Do not copy Craft of Exile implementation code.

Only extract/reconstruct:

```text
small factual weight observations
behavioral rules
mapping facts
current weight values needed for validation
```

---

## 18. Minimum current validation classes

Required:

```text
Body Armour (STR)
Ring
Wand
```

Strongly preferred if feasible:

```text
Boots
Helmet
Gloves
Amulet
Bow
Crossbow
Spear
Shield
```

Do not block a narrow useful promotion on every class being complete.

---

## 19. Historical vs current comparison

Classify every mapped record:

```text
unchanged
changed
current-only
historical-only
unresolved
```

---

## 20. Exact-match rule

Example:

```text
historical Chaos Resistance tier:
250

current mapped modifier:
250
```

→

```text
unchanged
```

---

## 21. Tier-order safety

Do not assume:

```text
historical tier 1
=
current tier 1
```

Map tiers by:

```text
modifier id
required item level
stat range
```

Ordinal tier number is supporting evidence only.

---

## 22. Changed weights

Example:

```text
historical:
1000

current:
800
```

The promoted current value must be:

```text
800
```

and the row status:

```text
changed
```

---

## 23. New modifiers

If a modifier exists only in current data:

```text
historical = absent
current = known
```

it may be promoted only with exact current mapping/provenance.

Do not infer its weight from neighboring tiers.

---

## 24. Removed modifiers

Historical records no longer present in the current eligible model must not be included in the promoted current snapshot.

Keep them only in the diff report.

---

## 25. Community weight authority policy

For Buddy's **community-derived** probability model:

```text
current Craft of Exile class weight
```

may be used as the current behavioral model source when:

```text
modifier mapping is exact
patch is current/compatible
candidate pool behavior is already validated
weight is available
```

The historical Google Sheet is primarily used to:

```text
establish provenance lineage
cross-check stability
identify historical changes
```

---

## 26. PoE2DB policy

Where PoE2DB exposes a usable numeric weight:

```text
cross-check it
```

Where it does not:

```text
status = unavailable
```

Absence is not disagreement.

---

## 27. Validation status per weight

Use:

```text
validated-current
validated-historical-unchanged
current-only
historical-only
mismatch
unresolved
```

---

## 28. Promotion gate

A weight can enter the current promoted snapshot only when:

```text
modifier id mapping is exact
current weight is known
patch binding is known
base/class scope is known
affix kind is known
```

---

## 29. Current community snapshot

Create a versioned snapshot conceptually like:

```text
docs/data-snapshots/crafting/community-weights/
poe2-4.5.5.3.json
```

or a gitignored full snapshot plus committed manifest if redistribution is not approved.

---

## 30. Snapshot metadata

Include:

```text
modelKind: community-derived
patch
weight schema version
source lineage
weight count
class coverage
validation report checksum
known limitations
```

---

## 31. Weight schema version

Add:

```text
COMMUNITY_WEIGHT_SCHEMA_VERSION = 1
```

---

## 32. Semantic checksum

Generate a deterministic checksum from semantic content only.

Include:

```text
modifier id
scope
weight
patch
validation state
```

Exclude volatile observation/download timestamps.

---

## 33. Refresh command

Add an opt-in command such as:

```text
npm run crafting:weights:inspect
```

or:

```text
npm run crafting:weights:refresh
```

It should:

```text
load historical source
load current observed source
map modifier ids
diff weights
write a report
```

It must not auto-promote.

---

## 34. Promotion command

Add a separate explicit command such as:

```text
npm run crafting:weights:promote
```

Promotion fails closed on:

```text
patch mismatch
unresolved required mappings
missing provenance
invalid semantic checksum
```

---

## 35. No silent current-patch reuse

When Craft of Exile moves to another patch:

```text
4.5.5.3 snapshot remains pinned
```

A new patch requires:

```text
new diff
new validation
new promotion
```

---

## 36. Augmentation probability revalidation

After current weights are built, re-run the controlled STEP-020.8A cases.

Minimum:

```text
Rusted Cuirass
ilvl 82
Magic
0 explicit modifiers
```

---

## 37. Candidate-set gate

For the pinned Rusted Cuirass observation, previous research found:

```text
59 prefixes
85 suffixes
144 total
```

Verify the current promoted snapshot against the current data.

Do not hardcode the counts if the patch source has changed.

---

## 38. Total-weight gate

Recompute:

```text
sum(weight for every eligible candidate)
```

The previous reconstructed Rusted Cuirass case produced:

```text
124500
```

Confirm or explicitly record a current-source change.

---

## 39. Known sample probabilities

Revalidate the previously reconstructed sample modifiers:

```text
ChaosResist1
IncreasedSpirit8
Strength1
```

Using:

```text
P(mod)
=
weight(mod)
/ total eligible weight
```

---

## 40. T1 Life validation

Add a user-relevant test:

```text
T1 maximum Life
```

For a selected supported base:

```text
resolve exact T1 Life modifier id
resolve current weight
resolve candidate-pool total
calculate probability
record provenance
```

---

## 41. T2 Life validation

Repeat for:

```text
T2 maximum Life
```

and report:

```text
T1 weight
T1 probability

T2 weight
T2 probability
```

This directly proves Buddy can answer the practical tier-chance question.

---

## 42. Variable-tier family validation

Validate at least one family whose weights vary by tier.

Preferred example:

```text
Spirit
```

because the historical Body Armour STR table visibly contains tier-dependent weights:

```text
100
200
300
400
500
...
```

Buddy must not assume every tier in a family has equal weight.

---

## 43. Selection rule

Use the approved STEP-020.8A community rule:

```text
single weighted draw
across all currently open eligible affixes
```

---

## 44. One-prefix Magic item

Existing prefix:

```text
prefix side closed
suffix pool only
```

Probability denominator:

```text
sum(current weights of eligible suffixes only)
```

---

## 45. One-suffix Magic item

Existing suffix:

```text
suffix side closed
prefix pool only
```

Probability denominator:

```text
sum(current weights of eligible prefixes only)
```

---

## 46. Zero-mod readiness

If a class has:

```text
complete candidate pool
100% current weight coverage
validated one-stage draw
```

then zero-mod Augmentation can be promoted even if unrelated advanced conflict semantics remain unresolved.

---

## 47. One-mod readiness

For Magic Augmentation, one-prefix/one-suffix states may also be promoted where side closure fully determines the remaining pool.

Do not generalize this to Rare crafting mechanics.

---

## 48. Deterministic probability API

Add a calculation API conceptually like:

```text
calculateCommunityAugmentationProbabilities(
  itemState,
  weightSnapshot
)
```

Return per candidate:

```text
modifierId
weight
probability
modelKind
snapshot checksum
patch
provenance
```

---

## 49. No simulation yet

STEP-020.9 may compute exact community-model probabilities.

It must not:

```text
sample a random outcome
run Monte Carlo
calculate expected attempts
calculate expected cost
build craft routes
```

Those follow after probability readiness.

---

## 50. Probability-sum invariant

For a complete pool:

```text
sum(candidate probabilities) = 1
```

within deterministic numeric tolerance.

---

## 51. Missing-weight rule

If any eligible candidate lacks a validated current weight:

```text
probability set = blocked
```

Do not remove the unknown candidate and renormalize.

---

## 52. Unknown is not zero

Never convert:

```text
unknown weight
```

into:

```text
0
1
default weight
```

---

## 53. Weight coverage report

For each tested class report:

```text
eligible candidate count
validated current weights
missing weights
historical-only
current-only
mismatches
coverage percentage
```

---

## 54. Promotion threshold

For a scope to be probability-ready:

```text
100% weight coverage
```

is required for its eligible candidate pool.

---

## 55. Scope-specific promotion

It is acceptable for:

```text
Body Armour STR
```

to become ready before:

```text
Ring
Wand
other classes
```

Do not require universal class coverage before STEP-021.

---

## 56. Preferred first promoted scope

Prefer:

```text
normal Magic STR Body Armour
zero or one explicit modifier
```

if it becomes the first scope with:

```text
complete candidate pool
100% current weight coverage
complete side rule
validated weighted draw
reproducible probabilities
```

Then extend class coverage incrementally.

---

## 57. Test — historical parser

Use a small synthetic fixture:

```text
base
affix
family
tier
ilvl
weight
```

Verify normalized output.

---

## 58. Test — exact modifier mapping

Exact historical/current match:

```text
→ canonical modifier id
```

Ambiguous match:

```text
→ unresolved
```

---

## 59. Test — changed weight

Historical:

```text
1000
```

Current:

```text
800
```

Expected:

```text
status = changed
promoted weight = 800
```

---

## 60. Test — current-only modifier

A current-only modifier may enter the snapshot only when current mapping and provenance are complete.

---

## 61. Test — stale patch

Using a 4.5.5.3 weight snapshot against an incompatible requested patch must fail closed.

---

## 62. Test — basic probability

Synthetic pool:

```text
A = 100
B = 300
C = 600
```

Expected:

```text
A = 0.10
B = 0.30
C = 0.60
```

---

## 63. Test — side closure

Existing prefix:

```text
only suffix weights enter denominator
```

Existing suffix:

```text
only prefix weights enter denominator
```

---

## 64. Test — missing weight

One missing weight in an otherwise eligible pool:

```text
whole probability result = blocked
```

---

## 65. Test — provenance

Every probability result includes:

```text
COMMUNITY_WEIGHT_SCHEMA_VERSION
weight snapshot checksum
community patch
modelKind = community-derived
```

---

## 66. Real validation matrix

Minimum:

```text
Rusted Cuirass ilvl 82
Rusted Cuirass lower ilvl
Iron Ring ilvl 82
Withered Wand ilvl 82
```

---

## 67. Current-vs-historical report

Produce a human-readable report showing examples of:

```text
unchanged weight
changed weight
new current mod
historical-only mod
unresolved mapping
```

---

## 68. User-facing provenance requirement

Future UI must be able to show wording such as:

```text
Community-derived crafting probability
Validated against Craft of Exile patch 4.5.5.3
Weight research lineage: Prohibited Library
```

Never imply official GGG probability.

---

## 69. Direct/community separation

Preserve:

```text
directEvidenceProbabilityModel:
blocked

communityDerivedProbabilityModel:
may become ready
```

Do not rewrite historical decisions.

---

## 70. STEP-021 readiness gate

STEP-021 becomes ready when at least one useful real scope has:

```text
candidate pool complete
current weight coverage 100%
side/conflict rule complete for that scope
selection rule complete
probabilities reproduced
patch/provenance valid
```

---

## 71. STEP-021 does not require universal coverage

If only:

```text
STR Body Armour Augmentation
```

passes:

```text
STEP-021 may start for STR Body Armour Augmentation only
```

Everything else remains fail-closed.

---

## 72. Long-term crafting roadmap

After this data closure, retain the intended progression:

```text
STEP-021
single-action crafting simulator

STEP-021A+
additional crafting currencies/mechanics

later
multi-step craft state search

later
craft route planner

later
budget-aware route optimization

later
step-by-step crafting guides
```

---

## 73. Step-by-step guide target

The eventual product should be able to produce deterministic guides such as:

```text
Target:
T1 Life
T1 Fire Resistance
T2+ Strength

Route:

1. Start with an ilvl X base.
2. Apply mechanic A.
3. If outcome condition B is met, continue.
4. Otherwise restart / use recovery mechanic C.
5. Apply mechanic D.
6. Current step success chance: ...
7. Expected attempts: ...
8. Expected currency cost: ...
```

Those steps must come from the crafting engine, not from AI guesses.

---

## 74. AI role later

AI may explain:

```text
why a route is recommended
what each currency does
what the stop/restart conditions mean
```

AI must never invent:

```text
modifier weights
probabilities
state transitions
crafting mechanics
```

---

## 75. Future route-engine prerequisites

A trustworthy craft-route engine eventually requires:

```text
item-state representation
mechanic transition model
candidate pool
modifier weights
probability model
target-satisfaction model
currency/economy cost
search/optimization
```

STEP-020.9 closes the modifier-weight prerequisite.

---

## 76. Economy integration later

After simulator probabilities are stable, existing poe.ninja economy support can feed:

```text
currency price
expected attempts
expected cost
cost per success
budget-aware route ranking
```

Not in this step.

---

## 77. Required documentation

Create:

```text
docs/progress/STEP-020-9-community-weight-ingestion.md
```

Include:

```text
Why STEP-020.9 Exists
Product Importance
Historical Weight Source
Google Sheet Structure
Licensing / Distribution Decision
Historical Import
Historical Schema
Modifier Mapping
Current Craft of Exile Weight Extraction
PoE2DB Cross-Check
Historical vs Current Diff
Unchanged Weights
Changed Weights
Current-Only Modifiers
Historical-Only Modifiers
Current Snapshot
Schema Version
Checksum
Coverage by Item Class
Rusted Cuirass Validation
Iron Ring Validation
Wand Validation
T1 Life Probability
T2 Life Probability
Variable-Tier Weight Validation
Probability Sum Validation
Missing-Weight Behavior
Patch Binding
Runtime Independence
Known Limitations
STEP-021 Decision
```

---

## 78. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for durable conclusions about:

```text
community weight source hierarchy
historical Google Sheet role
current Craft of Exile weight role
PoE2DB cross-check role
weight schema/versioning
promotion rules
missing-weight fail-closed behavior
scope-specific readiness
STEP-021 readiness
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

Add explicit commands as appropriate, for example:

```text
npm run crafting:weights:inspect
npm run crafting:weights:diff
npm run crafting:weights:validate
```

Run any live/source-refresh command separately from default tests.

---

## 80. Default-test constraints

Default tests must not require:

```text
Google Drive
Craft of Exile
PoE2DB
network
PoB2
GGG credentials
AI
```

---

## 81. Security/privacy

No user build data is sent externally.

No credentials are stored.

No authenticated scraping.

---

## 82. Successful outcome A — useful current scope ready

Example:

```text
Body Armour STR:
100% current weight coverage

candidate pool:
validated

selection rule:
validated

probability reproduction:
passed

STEP-021 READY FOR:
STR BODY ARMOUR AUGMENTATION
USING COMMUNITY-DERIVED WEIGHTS
```

---

## 83. Successful outcome B — broader coverage ready

Example:

```text
Body Armour STR:
100%

Ring:
100%

Wand:
100%

STEP-021 READY FOR:
AUGMENTATION
WITHIN VALIDATED CLASSES
USING COMMUNITY-DERIVED WEIGHTS
```

---

## 84. Successful outcome C — infrastructure complete but coverage insufficient

Example:

```text
historical source:
ingested

current mapping:
partial

Body Armour STR:
98%

Ring:
96%

STEP-021:
BLOCKED
```

Report exact missing modifier ids and mappings.

Do not discard the weight infrastructure.

---

## 85. No return to basic Augmentation research

Do not reopen already validated community-model behavior unless contradictory current evidence appears.

Preserve:

```text
Magic:
one prefix + one suffix

0 explicit:
both sides open

1 prefix:
suffixes only

1 suffix:
prefixes only

selection:
single weighted draw over current open pool
```

---

## 86. Roadmap state

```text
STEP-019
crafting data ingestion
COMPLETE

STEP-019A
planner readiness
COMPLETE

STEP-020
craft target planner
COMPLETE / FROZEN

STEP-020.5
Augmentation semantics
COMPLETE

STEP-020.6
direct-evidence closure
COMPLETE

STEP-020.7
simulation go/no-go
COMPLETE

STEP-020.8
community differential
COMPLETE

STEP-020.8A
behavioral reconstruction
COMPLETE

STEP-020.9
community weight ingestion + current-patch validation
NEXT

STEP-021
craft simulation
BLOCKED pending STEP-020.9
```

---

## 87. Stop condition

After historical weight ingestion, deterministic modifier mapping, current Craft of Exile comparison, PoE2DB cross-check, current snapshot generation, coverage reporting, and Augmentation probability validation:

**STOP.**

Do not automatically implement STEP-021.

Return exactly one:

```text
STEP-021 READY FOR AUGMENTATION
USING COMMUNITY-DERIVED WEIGHTS
<validated scope>
```

or:

```text
STEP-021 BLOCKED
```

with exact remaining coverage gaps and mismatches.
