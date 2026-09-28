# STEP-020.8A — Craft of Exile behavioral capture and probability reproduction

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020.8A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the specific validation gap left by STEP-020.8.

STEP-020.8 successfully established that:

```text
Craft of Exile current PoE2 data is accessible
modifier ids map well to Buddy/RePoE
Craft of Exile exposes Augmentation-related handlers
Craft of Exile exposes open_affix/open_prefix/open_suffix concepts
Craft of Exile community weights are not a simple scale of RePoE spawn weights
```

But STEP-020.8 did **not** capture the actual behavior of the Craft of Exile calculator/emulator for controlled Augmentation cases.

Therefore STEP-020.8A must obtain and validate:

```text
actual Craft of Exile candidate pools
actual modifier blocking behavior
actual prefix/suffix behavior
actual displayed/computed probabilities
```

and attempt to reproduce those results independently in Buddy.

This is the final Augmentation-focused evidence step.

---

## 2. Why STEP-020.8 was insufficient

STEP-020.8 was a valid blocked research attempt, but it stopped because the Craft of Exile calculator could not be driven in the available browser environment.

It did not capture:

```text
a zero-mod Augmentation pool
a one-prefix Augmentation pool
a one-suffix Augmentation pool
a second item-level case
a displayed candidate probability
a probability reproduction
```

Static dictionary presence is not enough.

STEP-020.8A is specifically about **behavioral capture**, not another static-data comparison.

---

## 3. Core invariant

Hard rule:

```text
STEP-020.8A may not conclude that Craft of Exile
does or does not validate Augmentation
without observing actual calculator/emulator behavior
or reconstructing that behavior from public client logic
to an equivalent level of confidence.
```

Another hard rule:

```text
static data presence
!=
mechanic pool
```

---

## 4. Success target

Ideal successful result:

```text
Craft of Exile controlled case captured
        ↓
candidate pool reproduced
        ↓
blocking behavior reproduced
        ↓
selection model inferred
        ↓
probabilities independently reproduced
        ↓
community-derived model validated
        ↓
STEP-021 ready for a narrow Augmentation scope
```

A blocked result remains acceptable if behavioral capture still cannot be achieved.

---

## 5. Acceptance criteria

- [ ] STEP-020 / 020.5 / 020.6 / 020.7 behavior remains unchanged.
- [ ] STEP-020.8 community model remains blocked until new evidence passes.
- [ ] At least one actual Craft of Exile Augmentation case is behaviorally captured.
- [ ] Zero-mod Magic Augmentation is tested.
- [ ] One-prefix Magic Augmentation is tested.
- [ ] One-suffix Magic Augmentation is tested.
- [ ] At least two item levels are tested on one base.
- [ ] At least one Body Armour is tested.
- [ ] At least one Ring or other jewellery item is tested.
- [ ] At least one weapon is tested if Craft of Exile supports the action normally.
- [ ] Actual visible/derived candidate modifier ids are captured or reconstructed.
- [ ] Candidate pool counts are recorded.
- [ ] Existing-modifier blocking behavior is recorded.
- [ ] Prefix/suffix/open-affix behavior is recorded.
- [ ] At least one actual displayed/computed modifier chance is captured.
- [ ] Buddy independently reproduces at least one captured probability or documents why it cannot.
- [ ] One-stage vs two-stage selection is explicitly tested.
- [ ] Craft of Exile `power` semantics are investigated beyond simple field comparison.
- [ ] No Craft of Exile code is copied into Buddy.
- [ ] No live Craft of Exile runtime dependency is added.
- [ ] Default tests remain offline.
- [ ] No Monte Carlo simulator is added.
- [ ] No expected cost model is added.
- [ ] Create:
      `docs/progress/STEP-020-8A-coe-behavioral-capture.md`

---

## 6. Allowed evidence routes

STEP-020.8A may use any of these routes:

```text
A. direct Craft of Exile calculator/emulator interaction

B. browser automation against the public UI

C. public client-side state / worker inspection

D. local reconstruction from publicly delivered client data and logic

E. manually recorded controlled Craft of Exile cases
```

Use the strongest route available.

Do not stop after route A fails if B/C/D/E remain possible.

---

## 7. Manual capture fallback

If Cursor cannot drive the Craft of Exile UI automatically, the step must generate a manual capture checklist for the exact cases needed.

Example:

```text
Open Craft of Exile PoE2
Select Rusted Cuirass
Set ilvl 82
Set rarity Magic
No explicits
Choose Orb of Augmentation
Record:
- visible mod pool
- candidate weights/chances
- open affix state
```

Then repeat with:

```text
one known prefix
one known suffix
```

A manually captured result is valid evidence if:

```text
base
item level
rarity
existing mods
method
candidate list/chance
date
Craft of Exile patch
```

are all recorded.

---

## 8. Controlled case matrix

Minimum matrix:

| Case | Base                            | Item level | Existing explicits |
| ---- | ------------------------------- | ---------: | ------------------ |
| A    | Rusted Cuirass                  |         82 | none               |
| B    | Rusted Cuirass                  |         82 | one known prefix   |
| C    | Rusted Cuirass                  |         82 | one known suffix   |
| D    | Rusted Cuirass                  | lower ilvl | none               |
| E    | Iron Ring                       |         82 | none               |
| F    | Withered Wand or another weapon |         82 | none               |

If Craft of Exile cannot perform one case, record the reason.

---

## 9. Existing modifier selection

For one-prefix and one-suffix cases, choose modifiers that:

```text
exist in both Buddy and Craft of Exile
have exact stable-id mapping
have known generation type
are ordinary non-special affixes
```

Avoid essence-only/special records for the first blocking tests.

---

## 10. Candidate-pool capture

For each controlled case, capture:

```text
candidate modifier ids
candidate display names
prefix/suffix kind
weight/power if shown
probability/chance if shown
```

If the UI does not expose ids, map display rows deterministically to Buddy ids.

Ambiguous mapping:

```text
unresolved
```

Do not force a match.

---

## 11. Candidate-set comparison

For each case compute:

```text
Buddy source-pool inspection set
Craft of Exile observed pool
intersection
Buddy-only
Craft-of-Exile-only
```

Record exact counts.

---

## 12. Difference classification

Every pool mismatch should be classified where possible:

```text
existing-mod conflict
affix-side full
item-level threshold
essence-only
special generation type
weight 0
base tag mismatch
Craft of Exile custom filter
unknown
```

---

## 13. Zero-mod validation

For:

```text
Magic
0 explicit modifiers
```

determine:

```text
Does Craft of Exile allow both prefixes and suffixes?
Are all normal eligible affixes considered?
Are special/essence-only affixes excluded?
```

Do not assume.

---

## 14. One-prefix validation

For:

```text
Magic
1 prefix
```

determine:

```text
Does Craft of Exile offer only suffixes?
Does it offer another prefix?
Does it block same-group mods?
Does it block same-id mods?
```

Record actual behavior.

---

## 15. One-suffix validation

For:

```text
Magic
1 suffix
```

perform the mirror test.

Record whether only prefixes remain or whether the model behaves differently.

---

## 16. Magic affix structure conclusion

Only after controlled cases may the community model conclude:

```text
one prefix + one suffix
```

for normal Magic Augmentation.

If observed behavior differs, record the actual rule.

---

## 17. Conflict behavior

For a known existing mod X, record which candidate ids disappear.

Attempt to explain removals through:

```text
same modifier id
same group
same family
same side capacity
other rule
```

---

## 18. Group mapping policy

Do not rewrite RePoE normalized groups.

If Craft of Exile behavior demonstrates a different conflict grouping:

```text
store a community-model conflict mapping
```

separately.

Suggested concept:

```text
CommunityConflictRule {
  sourceModifierId
  blockedModifierIds[]
  evidenceCaseIds[]
}
```

Only if needed.

---

## 19. `BaseLocalDefences` case

Where practical, include a known defense-family case related to the STEP-019A group mismatch.

Goal:

```text
observe actual Craft of Exile blocking behavior
```

Do not force this case if no clean controlled example is available.

---

## 20. Essence-only validation

Find a base where an essence-only prefix/suffix exists.

Determine whether normal Orb of Augmentation in Craft of Exile:

```text
includes it
excludes it
shows it as special/unavailable
```

Record the actual result.

---

## 21. Special-generation validation

At least confirm whether normal Augmentation visibly excludes non-prefix/suffix special types in the controlled cases.

Do not claim a universal rule beyond tested scope.

---

## 22. Lower item-level case

Repeat one zero-mod case at a lower item level.

Record which high-level modifiers disappear.

Verify the delta against Buddy's:

```text
requiredItemLevel
```

model.

---

## 23. Candidate weight capture

For every visible candidate where possible, capture Craft of Exile:

```text
power
weight
chance
or equivalent field
```

Do not assume field meaning from name.

---

## 24. `power` investigation

STEP-020.8 showed:

```text
Craft of Exile power
!=
constant scale × RePoE spawn weight
```

STEP-020.8A must determine what `power` actually represents in the selected controlled cases.

Investigate whether it is:

```text
raw community weight
normalized weight
tier power
selection score
display-only value
input to another formula
```

Use behavior and client logic.

---

## 25. Public worker inspection

Where public worker code is accessible:

```text
locate Augmentation handler
trace inputs/outputs
identify pool filters
identify side-selection logic
identify weight field used
identify probability normalization
```

Do not copy code into Buddy.

Record behavioral pseudocode only.

---

## 26. Pseudocode evidence format

Allowed:

```text
Observed behavior:
1. filter by X
2. filter by Y
3. sum field Z
4. chance = Z / total
```

Not allowed:

```text
copying large/minified source blocks
```

---

## 27. One-stage vs two-stage selection

Explicitly determine whether Craft of Exile behaves like:

```text
Model A:
all eligible affixes in one weighted pool
```

or:

```text
Model B:
choose prefix/suffix side
then choose modifier within side
```

or another model.

This is a required conclusion.

---

## 28. Asymmetric-pool test

Prefer a case where:

```text
prefix total weight
!=
suffix total weight
```

because it helps distinguish one-stage vs two-stage selection.

If one prefix and one suffix side are not both available, choose a zero-mod case.

---

## 29. Probability capture

Capture at least one actual Craft of Exile chance such as:

```text
Modifier X:
7.43%
```

or the equivalent calculator output.

Record:

```text
case id
modifier id
displayed value
raw value if available
```

---

## 30. Independent probability reproduction

Using only the derived rule and captured/normalized data, independently compute the same candidate chance.

Do not call Craft of Exile during the computation.

---

## 31. Probability comparison

Record:

```text
Craft of Exile chance
Buddy reproduced chance
absolute difference
relative difference
```

---

## 32. Tolerance

Define:

```text
display tolerance
raw tolerance
```

if raw values exist.

Example:

```text
display tolerance:
within one displayed rounding unit
```

Do not accept arbitrary "close enough."

---

## 33. Multi-candidate reproduction

Prefer reproducing more than one modifier probability in the same case.

Minimum recommended:

```text
3 candidates
```

if accessible.

---

## 34. Cross-base reproduction

If practical, reproduce at least one probability on:

```text
Body Armour
```

and one on:

```text
Ring or weapon
```

---

## 35. Community-model rule

If successful, encode only the rule actually demonstrated.

Conceptually:

```text
CommunityAugmentationModelV1 {
  scope
  candidatePoolRule
  conflictRule
  slotRule
  selectionRule
  weightSource
  probabilityRule
}
```

---

## 36. Model kind

Set:

```text
modelKind = "community-derived"
```

Never:

```text
official
```

---

## 37. Model source label

Suggested:

```text
validatedAgainst = [
  "Craft of Exile 4.5.5.3",
  "PoE2DB",
  "Buddy/RePoE snapshot ..."
]
```

---

## 38. Community model version

If validated:

```text
COMMUNITY_AUGMENTATION_MODEL_VERSION = 1
```

Do not overload direct-evidence semantics version.

---

## 39. Strict/direct model remains blocked

Preserve:

```text
directEvidenceAugmentation = blocked
```

even if:

```text
communityDerivedAugmentation = ready
```

This distinction must remain visible in code and docs.

---

## 40. Supported scope

If only these cases validate:

```text
Magic
0 explicit modifiers
selected supported classes
```

then STEP-021 scope is exactly that.

Do not silently generalize to:

```text
all Magic items
```

---

## 41. One-mod scope

Approve one-existing-modifier simulation only if:

```text
prefix/suffix behavior observed
conflicts reproduced
candidate pool reproduced
probabilities reproduced
```

---

## 42. Result labels

If validated, user-facing simulation must later say:

```text
Community-derived estimate
```

not:

```text
Exact chance
```

---

## 43. Model limitations

Record:

```text
tested item classes
tested item levels
tested affix states
special mods not validated
essence-only status
known mismatches
```

---

## 44. No runtime Craft of Exile dependency

Buddy must not query Craft of Exile when simulating.

The model must operate from:

```text
Buddy local data
+
versioned community model rules
```

---

## 45. No copied dataset requirement

Do not commit full Craft of Exile data.

Store only:

```text
derived model metadata
small validation observations
mapping exceptions if needed
```

subject to project distribution policy.

---

## 46. Observation artifact

Create:

```text
docs/data-snapshots/crafting/community-models/
augmentation-behavioral-validation-4.5.5.3.json
```

Include controlled cases such as:

```text
caseId
source patch
base
item level
rarity
existingModifierIds
observed candidate ids/count
observed chances
model conclusion
```

Keep it compact.

---

## 47. Observation provenance

Each case should include:

```text
observation date
Craft of Exile patch
data asset/version if known
worker asset/version if used
capture method
```

---

## 48. Manual evidence screenshots

If manual browser capture is required, screenshots may remain local research artifacts.

Do not require them in the repository unless appropriate.

The JSON/document should preserve the factual observations.

---

## 49. Behavioral validation command

Add:

```text
npm run crafting:coe-behavior-validate
```

or equivalent.

It should:

```text
load local recorded observations
run Buddy's reconstructed community model
compare pools
compare probabilities
report mismatches
```

No network required.

---

## 50. Validation result states

Use:

```text
validated
partial
blocked
```

---

## 51. Required successful gate

`validated` requires:

```text
pool parity
conflict/slot parity for supported scope
selection-model parity
probability parity
patch binding
```

---

## 52. Partial gate

Use `partial` when:

```text
some cases reproduce
but supported scope cannot yet be cleanly bounded
```

Partial does not authorize STEP-021 random simulation unless a strict validated sub-scope can be carved out.

---

## 53. Blocked gate

Use `blocked` when:

```text
no behavioral capture
pool mismatch unexplained
probabilities cannot be reproduced
ambiguous modifier mapping
```

---

## 54. Synthetic tests

Add synthetic tests for:

```text
one-stage weighted pool
two-stage weighted pool
prefix-only remaining side
suffix-only remaining side
conflict exclusion
unknown weight
model patch mismatch
direct-vs-community separation
```

These tests validate implementation, not Craft of Exile truth.

---

## 55. Captured-observation regression tests

For each approved controlled case:

```text
Buddy model output
must match
recorded Craft of Exile observation
```

within defined tolerance.

---

## 56. Offline default tests

Default tests must not access:

```text
Craft of Exile
PoE2DB
network
PoB2 executable
GGG API
AI
```

---

## 57. Real-data validation

Use Buddy's local crafting snapshot for the captured cases.

The observation artifact may be checked into the repository if it contains only compact factual research data and complies with project policy.

---

## 58. Licensing boundary

Do not copy substantial Craft of Exile source.

Behavioral observations and independently written model logic must remain separate from upstream implementation.

Document that boundary.

---

## 59. Security/privacy

Use synthetic/public item setups only.

No personal build/account data.

No authentication.

No automation designed to bypass site restrictions.

---

## 60. Performance

Not performance-sensitive.

Correctness first.

---

## 61. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run research/manual/live-browser work separately.

---

## 62. Progress document

Create:

```text
docs/progress/STEP-020-8A-coe-behavioral-capture.md
```

Include:

```text
Why STEP-020.8A Exists
STEP-020.8 Gap
Evidence Route Used
Craft of Exile Patch
Controlled Case Matrix
Zero-Mod Case
One-Prefix Case
One-Suffix Case
Low-Item-Level Case
Jewellery Case
Weapon Case
Candidate Pool Capture
Candidate Set Diff
Existing-Mod Blocking
Prefix/Suffix Rule
Conflict Rule
Essence-Only Rule
Special Generation Types
Power Field Investigation
One-Stage vs Two-Stage Selection
Captured Probability
Independent Probability Reproduction
Tolerance
Cross-Case Validation
Community Model Rule
Community Model Version
Direct-vs-Community Separation
Supported Scope
Known Limitations
STEP-021 Decision
```

---

## 63. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only if durable conclusions are reached.

Possible decisions:

```text
Craft of Exile behavioral model accepted/rejected
community-derived Augmentation model version
candidate-pool rule
prefix/suffix rule
conflict rule
weight source
selection rule
supported simulation scope
STEP-021 readiness
```

---

## 64. Successful outcome A — zero-mod Augmentation ready

Example:

```text
zero-mod candidate pool:
reproduced

selection rule:
reproduced

probabilities:
reproduced

one-mod conflict behavior:
not yet validated

Community model:
validated for zero-mod Magic items

STEP-021:
READY FOR ZERO-MOD AUGMENTATION
USING COMMUNITY-DERIVED MODEL
```

This is a valid success.

---

## 65. Successful outcome B — zero + one-mod ready

Example:

```text
zero-mod:
validated

one-prefix:
validated

one-suffix:
validated

conflicts:
validated for tested normal affixes

probabilities:
reproduced

STEP-021:
READY FOR AUGMENTATION
WITHIN VALIDATED COMMUNITY-MODEL SCOPE
```

---

## 66. Successful outcome C — still blocked

Example:

```text
Craft of Exile UI/model could not be behaviorally captured
or
pool/probability could not be reproduced

Community model:
blocked

STEP-021:
BLOCKED
```

If this happens:

```text
stop Augmentation research
```

Do not create another Augmentation evidence substep immediately.

---

## 67. Final Augmentation research rule

This is the **last planned Augmentation-only evidence step**.

If STEP-020.8A remains blocked:

```text
do not continue with STEP-020.8B
```

Instead choose one of:

```text
defer crafting simulation
pivot to another mechanic
implement non-simulation crafting features
```

---

## 68. STEP-020 overall status

STEP-020 remains:

```text
COMPLETE / FROZEN
```

STEP-020.8A does not reopen target-planner correctness.

---

## 69. Roadmap state

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
first mechanic semantics
COMPLETE

STEP-020.6
Augmentation direct-evidence closure
COMPLETE

STEP-020.7
simulation go/no-go
COMPLETE

STEP-020.8
static community differential
COMPLETE / BLOCKED

STEP-020.8A
Craft of Exile behavioral capture
NEXT

STEP-021
craft simulation
BLOCKED pending STEP-020.8A
```

---

## 70. Stop condition

After actual behavioral capture or equivalent public-client reconstruction, candidate-pool comparison, conflict/slot validation, probability capture, and independent reproduction:

**STOP.**

Do not automatically implement STEP-021.

Return exactly one:

```text
STEP-021 READY FOR ZERO-MOD AUGMENTATION
USING COMMUNITY-DERIVED MODEL
```

or:

```text
STEP-021 READY FOR AUGMENTATION
WITHIN VALIDATED COMMUNITY-MODEL SCOPE
```

or:

```text
STEP-021 BLOCKED
```

with exact evidence-backed reasons.
