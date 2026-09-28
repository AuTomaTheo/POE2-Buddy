# STEP-020.8 — Craft of Exile / PoE2DB differential validation and community-model closure

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.8  
**Authoring context:** Cursor-assisted development

## 1. Objective

Perform the deeper Craft of Exile + PoE2DB investigation that STEP-020.7 did not complete.

STEP-020.7 correctly concluded that the currently pinned RePoE data and Path of Building implementation do not prove the exact Orb of Augmentation outcome pool or selection formula.

However, STEP-020.7 only used the public weighting/documentation pages from Craft of Exile and PoE2DB as evidence summaries. It did **not** deeply validate the current Craft of Exile PoE2 emulator/calculator/simulator behavior, inspect its publicly delivered client logic where technically and legally appropriate, or compare controlled Craft of Exile outcomes against Buddy's RePoE/PoE2DB modifier universe.

STEP-020.8 must determine whether Buddy can safely support a **transparent community-derived crafting model** for Orb of Augmentation.

The goal is not to claim official Grinding Gear Games mechanics.

The goal is to decide whether Buddy can reproduce and validate the same community model used by current PoE2 crafting tools with enough fidelity and provenance to enable STEP-021 under an explicitly labeled model.

---

## 2. Why STEP-020.8 exists

Current Augmentation status after STEP-020.7:

```text
high-level transition:
ready

mechanic-specific candidate pool:
partial

conflict rules:
blocked

selection rule:
unproven

probability:
blocked
```

STEP-020.7 also found:

```text
PoE2DB:
community weighting data exists

Craft of Exile:
community weighting data exists

pyoe2-craftpath:
uses Craft of Exile weights but is for an older version
```

That was enough to reject an unsupported "official" probability model.

It was **not** enough to answer a different product question:

```text
Can Buddy intentionally implement a versioned,
community-derived model that reproduces
current Craft of Exile behavior?
```

STEP-020.8 answers that question.

---

## 3. Core policy change under investigation

Previous strict policy:

```text
mechanic probability requires direct proof of the game's internal formula
```

STEP-020.8 may approve an additional model class:

```text
community-derived
```

only if it is:

```text
current-version scoped
reproducible
independently cross-checked
behaviorally validated
clearly labeled
versioned
not presented as official GGG truth
```

This is a deliberate product-policy decision and must be explicit.

---

## 4. Hard invariants

Never label a community model as:

```text
official
exact GGG probability
game-internal formula
guaranteed true
```

Allowed wording, if validated:

```text
Community-derived estimate
Validated against Craft of Exile for patch 0.5.5.3
Uses community-estimated PoE2 modifier weights
```

Hard rule:

```text
community-derived model
!=
official mechanic truth
```

---

## 5. Scope

This step is focused first on:

```text
Orb of Augmentation
mechanic id: add-random-explicit
```

and the minimum item states needed to validate it.

Do not broaden into a universal crafting simulator.

May investigate:

```text
Craft of Exile current PoE2 data
Craft of Exile current emulator behavior
Craft of Exile current calculator behavior
Craft of Exile current simulator behavior
publicly delivered client-side worker/assets
PoE2DB modifier and weighting pages
Buddy/RePoE modifier data
controlled cross-tool examples
```

Must not:

```text
scrape private/authenticated APIs
bypass access controls
copy substantial proprietary source code
depend on Craft of Exile at Buddy runtime
automate abusive requests
claim unofficial estimates are exact
```

---

## 6. Current external evidence

At the time this step was authored, Craft of Exile's current PoE2 beta publicly identifies:

```text
patch:
0.5.5.3

internal patch:
4.5.5.3
```

and publicly exposes PoE2 calculator/simulator worker asset references.

Craft of Exile also provides:

```text
emulator
calculator
simulator
data browser
patch comparison
```

for PoE2.

Its public weighting documentation says PoE2 modifier weights are community-derived rather than present in the client data.

PoE2DB likewise exposes modifier data and community weighting information.

STEP-020.8 must re-check current values during implementation and record exact observation dates.

---

## 7. Source roles

Use each source for a specific role.

### RePoE / Buddy snapshot

Primary role:

```text
stable ids
base records
modifier records
generation types
stat ranges
tags
item-level requirements
```

### PoE2DB

Cross-check role:

```text
modifier availability
displayed weightings
tier/item-level information
base-specific modifier pages
currency behavior descriptions
```

### Craft of Exile

Behavioral/community-model role:

```text
mod pool presented for a controlled base
modifier blocking behavior
open prefix/suffix behavior
crafting action behavior
weight computations
calculator probabilities
emulator outcomes
simulator model
```

Do not silently merge conflicting facts.

---

## 8. Source classification

Record:

```text
RePoE:
community / derived game-data export

PoE2DB:
community database

Craft of Exile:
community crafting model/tool
```

None is an official GGG mechanic specification.

---

## 9. Current-patch binding

Every Craft of Exile comparison must record:

```text
site generation/version if available
PoE2 patch
date checked
relevant asset version/hash/url where available
```

Do not compare Buddy's current snapshot against a stale Craft of Exile patch without marking the mismatch.

---

## 10. Patch compatibility decision

Buddy's RePoE export label currently differs from Craft of Exile's user-facing patch namespace.

Do not compare version strings literally.

Instead verify compatibility through controlled records:

```text
same base ids/names
same modifier ids or stable mapping
same item-level gates
same stat ranges
same modifier universe for selected examples
```

If the controlled data materially differs:

```text
do not use Craft of Exile as the reference model for that snapshot
```

---

## 11. Research method A — public data comparison

For selected bases, compare:

```text
Buddy/RePoE modifier records
PoE2DB modifier rows
Craft of Exile data browser rows
```

Record:

```text
modifier identity
prefix/suffix
required level
range
displayed weight
special flags where visible
```

Build an explicit mapping table.

---

## 12. Research method B — controlled Craft of Exile UI behavior

Use Craft of Exile's current PoE2 interface with fixed test cases.

At minimum:

```text
Rusted Cuirass, chosen item level
Iron Ring, chosen item level
one weapon base
```

For each case, record:

```text
base
item level
rarity
existing modifiers
selected crafting method
visible mod pool before craft
blocked modifiers
open affix indicators
weight computations
calculator output
emulator result behavior
```

Use screenshots or structured notes where useful.

---

## 13. Research method C — public client behavior inspection

Where publicly accessible without bypassing controls, inspect:

```text
browser-delivered JavaScript bundles
calculator worker
simulator worker
data structures sent to workers
public page state/config
```

The purpose is to understand behavior, not copy implementation.

Record only:

```text
function/behavior summary
input fields
pool-filter stages
weight computation shape
conflict handling behavior
```

Do not copy substantial source code into Buddy.

---

## 14. Licensing / use boundary

Before using a Craft of Exile implementation detail in Buddy:

```text
inspect publicly available license/terms information
```

If no reusable source license is provided:

```text
do not copy code
```

Behavioral reimplementation based on independently observed inputs/outputs may still be documented as a separate engineering decision, subject to project policy.

Do not make unsupported legal claims.

---

## 15. No runtime dependency

Even if Craft of Exile is used as research/reference:

```text
Buddy runtime must not call Craft of Exile
```

unless a documented public API and permission model is later intentionally adopted.

STEP-020.8 should produce local/versioned model data, not a live dependency.

---

## 16. Controlled baseline case

Start with:

```text
base:
Rusted Cuirass

item level:
82

rarity:
Magic

explicit modifiers:
none

action:
Orb of Augmentation
```

Compare:

```text
Buddy inspection candidates
Craft of Exile visible candidate pool
PoE2DB base modifier universe
```

Record exact counts and identities.

---

## 17. Candidate-set comparison

Compute set relationships:

```text
Buddy ∩ CraftOfExile
Buddy - CraftOfExile
CraftOfExile - Buddy
```

For every difference classify reason:

```text
weight unavailable
special generation type
essence-only
item-level gate
base tag
hidden/special mod
Craft of Exile-specific exclusion
unknown
```

Do not stop at count equality.

---

## 18. Candidate identity mapping

Prefer exact stable modifier ids.

If Craft of Exile exposes a different identifier namespace:

```text
create explicit mapping
```

using:

```text
stat ids
generation type
required level
ranges
source name
```

Ambiguous mapping:

```text
unresolved
```

not best guess.

---

## 19. Weight comparison

For every mapped candidate in the controlled pool, record:

```text
Buddy/RePoE spawn weight
PoE2DB displayed weight
Craft of Exile displayed/computed weight
```

Possible statuses:

```text
match
scaled-equivalent
mismatch
unavailable
```

---

## 20. Scale-equivalent weights

If Craft of Exile weights differ only by a common normalization factor:

```text
recognize scale equivalence
```

because:

```text
weights 10,20,30
```

and:

```text
weights 100,200,300
```

produce the same normalized probability.

Prove the ratio, do not assume it.

---

## 21. Community-weight provenance

If Craft of Exile/PoE2DB weights are adopted, the normalized model must record:

```text
weightSource
sourcePatch
sourceObservationDate
confidence/provenance note
```

Suggested:

```text
weightModel: community-derived
```

---

## 22. Pool-model provenance

Likewise candidate inclusion/exclusion must record:

```text
poolModelSource
validationCases
knownUnsupportedCases
```

Do not imply RePoE alone proved the mechanic pool.

---

## 23. Prefix/suffix structure validation

Create controlled cases:

```text
Magic item with zero explicits
Magic item with one known prefix
Magic item with one known suffix
```

Observe Craft of Exile:

```text
available pool
open affix side
blocked candidate classes
```

Determine whether the model behaves as:

```text
one prefix + one suffix
```

for normal magic items.

Cross-check with other available current sources.

---

## 24. Existing-modifier conflict validation

For known existing modifier X:

```text
add X to the item in Craft of Exile
```

and record what disappears from the candidate pool.

Classify exclusions by:

```text
same id
same family/group
same stat family
affix-side capacity
other
```

Compare to Buddy/RePoE group data.

---

## 25. Group disagreement resolution

STEP-019A found group disagreements such as:

```text
BaseLocalDefences
```

Do not globally overwrite RePoE groups.

Instead build, if justified:

```text
communityModelConflictRule
```

separate from normalized source group identity.

This may be based on observed Craft of Exile blocking behavior.

---

## 26. Conflict model scope

A conflict rule can be approved only for cases actually validated.

Example:

```text
normal item prefix/suffix families
for approved item classes
```

Do not extrapolate to:

```text
all special mods
all league mechanics
all item domains
```

---

## 27. Essence-only handling

Create at least one controlled case involving an essence-only mod if the target base exposes one.

Determine whether Craft of Exile:

```text
excludes it from normal Augmentation
includes it
marks it separately
```

Cross-check with PoE2DB.

---

## 28. Special generation types

Validate whether normal Augmentation candidate pools exclude:

```text
unique
corrupted
essence/special
other non-prefix/suffix generation types
```

Do not infer universal rules from labels alone.

---

## 29. Craft of Exile weight computation

Determine whether the current Craft of Exile model selects Augmentation outcomes using:

```text
displayed modifier weight
normalized displayed weight
another hidden multiplier
two-stage prefix/suffix selection
other method
```

Use both:

```text
client behavior
calculator result
public worker logic where inspectable
```

---

## 30. One-stage vs two-stage selection

Test whether probability appears to be:

```text
all eligible affixes in one weighted pool
```

or:

```text
select affix side first
then select modifier
```

This distinction is critical.

Use controlled asymmetric pools where possible.

---

## 31. Probability reproduction

For a small controlled case, independently calculate probabilities from the inferred model.

Compare against Craft of Exile calculator output.

Required:

```text
same candidate identities
same normalized probabilities
within stated tolerance
```

---

## 32. Probability tolerance

Define a strict comparison tolerance appropriate to displayed rounding.

Compare raw values if available.

Do not accept "looks close."

---

## 33. Multiple controlled cases

Do not approve from one item.

Minimum recommended matrix:

```text
Body Armour
Ring
Weapon

0 explicit modifiers
1 prefix
1 suffix
```

where supported.

Also include different item levels if they alter tier eligibility.

---

## 34. Low/high item-level validation

Use at least one base at two item levels.

Verify:

```text
required-level filtering
candidate count change
weight/probability change
```

matches Craft of Exile.

---

## 35. Weight-zero validation

Identify a known:

```text
weight = 0
```

record.

Confirm it does not enter Craft of Exile's normal Augmentation outcomes.

---

## 36. Unknown-weight validation

If Craft of Exile marks a modifier weight unknown/unavailable:

```text
record how its calculator treats it
```

Do not silently treat unknown as:

```text
0
1
average
```

unless the model explicitly does so and Buddy chooses to reproduce that model with a warning.

---

## 37. Model classes

Introduce explicit model kind:

```text
CraftingModelKind =
  "official"
  | "community-derived"
  | "experimental"
```

Current expected Augmentation model, if approved:

```text
community-derived
```

Do not use `official` unless actual official evidence exists.

---

## 38. Model confidence

Do not create a fake numeric confidence score.

Use structured evidence state:

```text
validated
partially-validated
blocked
```

and list:

```text
validation cases
known mismatches
unsupported classes
```

---

## 39. Community-model approval gate

Approve Augmentation for STEP-021 only if:

```text
candidate pool can be reproduced
conflict/slot behavior can be reproduced
weight/selection model can be reproduced
probabilities match Craft of Exile controlled cases
source patch is compatible
limitations are explicitly scoped
```

---

## 40. Model mismatch gate

If Buddy cannot reproduce Craft of Exile on controlled cases:

```text
do not average the models
do not choose whichever result seems plausible
```

Mark:

```text
community model unresolved
```

and keep STEP-021 blocked.

---

## 41. PoE2DB disagreement

If PoE2DB and Craft of Exile disagree on a weight:

```text
record the mismatch
```

Do not silently pick one.

Possible policy:

```text
Craft of Exile = behavioral model source
PoE2DB = independent cross-check
```

only if documented and justified.

---

## 42. Community-model snapshot

If approved, create a versioned local artifact such as:

```text
docs/data-snapshots/crafting/community-models/
augmentation-0.5.5.3.json
```

or equivalent.

It should contain:

```text
model kind
mechanic id
source patch
observation date
base/mod mapping rules
pool rules
conflict rules
selection rule
weight provenance
validation cases
known limitations
checksum
```

Do not store copied full Craft of Exile datasets unless redistribution is explicitly approved.

---

## 43. Model checksum

Hash the semantic model content.

Exclude volatile timestamps from the semantic checksum.

Same model facts:

```text
same checksum
```

---

## 44. Mechanic semantics version

If a community-derived Augmentation model becomes usable:

```text
increment the Augmentation semantics version
```

Recommended:

```text
CRAFTING_MECHANIC_SEMANTICS_VERSION = 2
```

or migrate to mechanic-specific semantic versions.

---

## 45. Existing strict model preservation

Do not delete the STEP-020.6 conclusion.

Preserve distinction:

```text
official/direct-evidence model:
blocked

community-derived model:
possibly validated
```

This is important provenance.

---

## 46. Mechanic readiness shape

Conceptually:

```text
MechanicReadiness {
  mechanicId
  modelKind
  modelVersion
  stateTransition
  candidatePool
  conflictRules
  selectionRule
  probability
  supportedScope
  provenance
  limitations
}
```

---

## 47. STEP-021 scope if approved

If the community model passes validation, STEP-021 may simulate only:

```text
Orb of Augmentation
within the exact validated item classes/states
using the community-derived model
```

The simulator UI/result must display:

```text
Community-derived PoE2 crafting model
```

---

## 48. No universal "exact" wording

Forbidden user-facing wording:

```text
Exact chance
Official chance
GGG chance
True game probability
```

Preferred:

```text
Estimated chance using the validated community model
```

unless future official evidence changes the status.

---

## 49. Runtime independence

Buddy must use its own local normalized model.

Do not send each simulation to Craft of Exile.

Do not scrape Craft of Exile at runtime.

Refresh/revalidation should be an explicit developer process.

---

## 50. Refresh policy

Community model refresh must be manual/reviewed.

Conceptually:

```text
observe current CoE patch
run differential validation
review mismatches
promote model
```

No silent automatic promotion.

---

## 51. Patch drift

If Craft of Exile updates from:

```text
0.5.5.3
```

to another patch:

```text
existing model remains pinned
new model requires revalidation
```

Do not silently apply old probabilities to new data.

---

## 52. Craft of Exile bug risk

Craft of Exile itself can have bugs.

Use:

```text
changelog
multiple controlled cases
PoE2DB cross-check
Buddy/RePoE data cross-check
```

to reduce single-tool dependence.

A Craft of Exile result is evidence, not unquestionable truth.

---

## 53. Changelog review

Record relevant current Craft of Exile changes involving:

```text
PoE2 crafting
affix handling
essences
chaos/exalted/augmentation-like behavior
modifier imports
weight computation
```

If a recent bug affects the tested behavior:

```text
include it in limitations
```

---

## 54. Test fixtures

Default repository tests remain synthetic.

Add community-model fixtures that reproduce the **derived rules**, not copied Craft of Exile code/data dumps.

---

## 55. Test — candidate pool parity

Synthetic test:

```text
expected community-model pool
=
Buddy computed pool
```

for approved rules.

---

## 56. Test — conflict parity

Existing prefix/suffix/conflicting-mod fixtures should produce the expected exclusions.

---

## 57. Test — probability parity

If approved, use small known-weight fixtures.

Verify:

```text
expected normalized probabilities
```

from the derived community rule.

---

## 58. Test — unknown weight

Unknown/unvalidated weight must:

```text
block probability
```

unless the approved model defines a transparent fallback.

Prefer blocking.

---

## 59. Test — model provenance

A community-model result must contain:

```text
modelKind = community-derived
model version
source patch
model checksum
```

---

## 60. Test — patch mismatch

Community model patch A + crafting snapshot incompatible with A:

```text
fail closed
```

---

## 61. Test — strict-vs-community separation

Verify:

```text
official/direct evidence readiness remains blocked
community model may be ready
```

Do not overwrite one with the other.

---

## 62. Real differential validation command

Add an explicit developer command such as:

```text
npm run crafting:community-validate
```

or:

```text
npm run crafting:coe-validate
```

It should consume locally recorded observations/artifacts.

Do not make default tests depend on live Craft of Exile.

---

## 63. Live research script boundary

If a research script accesses public Craft of Exile pages:

```text
manual/explicit invocation only
reasonable request rate
cache responses
identify source
```

Do not build an undocumented production API dependency.

---

## 64. Browser/manual validation record

For each controlled Craft of Exile case, record at minimum:

```text
date
patch shown
base
item level
rarity
existing modifiers
method
visible candidate set/count
calculated chance(s)
notes
```

Screenshots may be retained as local research evidence if appropriate.

---

## 65. Public client asset inspection record

If public JS/worker assets are inspected, record:

```text
asset path
version query/hash
date
behavioral conclusion
```

Do not commit the whole asset.

---

## 66. No minified-code copying

Do not paste/minify-derived code into Buddy.

Reimplement only independently described rules.

---

## 67. Security/privacy

No user builds or credentials are sent to Craft of Exile/PoE2DB during research.

Use synthetic/research item configurations only.

---

## 68. Performance

No user-request performance target for this step.

Correctness and reproducibility first.

---

## 69. Automated checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run live/differential research commands separately.

Run `npm audit` only if dependencies change.

---

## 70. Default-test rules

Default tests must not require:

```text
network
Craft of Exile
PoE2DB
RePoE live fetch
PoB2 executable
poe.ninja
GGG credentials
AI
```

---

## 71. Required documentation

Create:

```text
docs/progress/STEP-020-8-community-model-validation.md
```

Include:

```text
Why STEP-020.8 Exists
Why STEP-020.7 Was Not Enough
Community-Model Policy
Sources and Roles
Craft of Exile Current Patch
PoE2DB Cross-Check
RePoE/Buddy Baseline
Public Client Behavior Investigation
Controlled Test Matrix
Candidate Mapping
Candidate-Set Differences
Prefix/Suffix Behavior
Conflict/Blocking Behavior
Essence-Only Behavior
Special Generation Types
Weight Comparison
Weight Normalization
One-Stage vs Two-Stage Selection
Probability Reproduction
Validation Tolerance
Known Mismatches
Model Kind
Model Version
Model Checksum
Supported Scope
Runtime Independence
Refresh Policy
Patch Drift
Licensing / Code-Copy Boundary
Synthetic Tests
Real Differential Validation
Known Limitations
STEP-021 Decision
```

---

## 72. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for durable decisions:

```text
community-derived model policy
Craft of Exile role
PoE2DB role
model labeling
Augmentation pool rule if validated
Augmentation conflict rule if validated
Augmentation selection rule if validated
probability model if validated
community-model version/checksum policy
STEP-021 readiness
```

---

## 73. Successful outcome A — community model validated

```text
Direct/official evidence:
still incomplete

Community-derived model:
validated

Orb of Augmentation:
candidate pool ready for approved scope
conflict model ready for approved scope
selection model ready
probability model ready

STEP-021:
READY FOR AUGMENTATION USING COMMUNITY-DERIVED MODEL
```

This is a valid success.

---

## 74. Successful outcome B — partially validated

```text
Candidate pool:
validated

Conflict rules:
partial

Probability:
validated only for zero-mod magic items

STEP-021:
READY FOR ZERO-MOD AUGMENTATION
USING COMMUNITY-DERIVED MODEL
```

Also valid if strictly scoped.

---

## 75. Successful outcome C — model mismatch

```text
Craft of Exile and Buddy cannot be reproduced consistently
or
source mapping is ambiguous

community model:
blocked

STEP-021:
BLOCKED
```

Do not force a model.

---

## 76. No endless substep loop

If this deeper differential validation still cannot establish a reproducible model:

```text
stop pursuing Augmentation for now
```

Do not create another Augmentation evidence step immediately.

Choose either:

```text
a deterministic mechanic
or
defer crafting simulation
```

---

## 77. STEP-020 overall status

STEP-020 remains:

```text
COMPLETE / FROZEN
```

STEP-020.5–020.8 are pre-simulation mechanic research/closure steps.

They do not reopen the craft-target planner.

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
scoped craft target planner
COMPLETE / FROZEN

STEP-020.5
first mechanic semantics
COMPLETE

STEP-020.6
Augmentation pool/selection closure
COMPLETE

STEP-020.7
simulator go/no-go
COMPLETE

STEP-020.8
Craft of Exile / PoE2DB differential validation
NEXT

STEP-021
craft simulation
BLOCKED pending STEP-020.8
```

---

## 79. Stop condition

After controlled Craft of Exile/PoE2DB/RePoE comparison, public-client behavioral investigation where permitted, probability reproduction attempts, provenance/versioning, tests, and documentation:

**STOP.**

Do not automatically implement STEP-021.

Return exactly one:

```text
STEP-021 READY FOR AUGMENTATION
USING COMMUNITY-DERIVED MODEL
<scope>
```

or:

```text
STEP-021 BLOCKED
```

with exact reasons.
