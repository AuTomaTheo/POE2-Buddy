# STEP-020 — Scoped craft target planner

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-020  
**Authoring context:** Cursor-assisted development

## 1. Objective

Build the first deterministic craft-target planner on top of the planner-approved subset of STEP-019 / STEP-019A.

The planner must help a user answer:

```text
Given this supported base and item level,
which individual modifiers can satisfy the target I explicitly asked for?
```

It may also explain:

```text
why a modifier is eligible
why another modifier is unavailable
what item level is required
what stat range the modifier provides
whether the display text is resolved or using the deterministic fallback
```

STEP-020 must **not** yet answer:

```text
Which crafting currency should I use?
What is the chance to hit this mod?
What is the expected number of attempts?
What is the expected cost?
Can all of these desired mods coexist?
What is the cheapest crafting path?
What should I craft for my build automatically?
```

Those require mechanics and probability work beyond the currently approved capabilities.

---

## 2. Starting foundation

STEP-019 / STEP-019A provide an approved local planner scope with:

```text
base identity
modifier identity
stat ranges
required item level
generation type
affix kind
source-pool eligibility
translation fallback
snapshot provenance
25 supported item classes
```

Current planner-readiness constraints:

```text
modGroupExclusivity = incompatible / blocked
generationWeights = unknown
public distribution = blocked
presentation = partial but fallback-safe
planner runtime = local/self-prepared snapshot only
```

STEP-020 must consume these constraints rather than bypass them.

---

## 3. Core invariant

Hard rule:

```text
target planner
!=
crafting strategy engine
```

STEP-020 selects and explains **candidate target modifiers**.

It does not model the process used to obtain them.

---

## 4. User intent rule

Hard rule:

```text
user-selected target
!=
automatically recommended target
```

The user must explicitly choose the stat/modifier goal.

STEP-020 must not infer:

```text
your build needs Life
your build should prioritize Crit
this is the best mod
```

from CharacterContext, PoB2, AI, or generic heuristics.

Future steps may add optional build-aware suggestions, but this step remains deterministic and user-directed.

---

## 5. Acceptance criteria

- [ ] A `crafting-planner` or equivalent deterministic package exists.
- [ ] Planner consumes only planner-approved crafting-data capabilities.
- [ ] Planner calls the STEP-019A readiness gate before planning.
- [ ] Planner fails closed when the snapshot/readiness report is missing or incompatible.
- [ ] Planner supports only approved item classes.
- [ ] Unsupported classes return structured unsupported results.
- [ ] User can select or resolve a supported base.
- [ ] User provides an explicit item level.
- [ ] User can define one or more desired stat/modifier targets.
- [ ] Target resolution is deterministic.
- [ ] Modifier candidates are based on stable ids/stat ids, not fuzzy AI interpretation.
- [ ] Each candidate reports source-pool eligibility.
- [ ] Each candidate reports required item level.
- [ ] Each candidate reports generation type / affix kind.
- [ ] Each candidate reports exact stat ranges.
- [ ] Translation fallback from STEP-019A is used when needed.
- [ ] Candidate reasons/evidence are structured.
- [ ] Ineligible candidates can explain why.
- [ ] Unresolved candidates remain unresolved.
- [ ] Individual-target planning works without mod-group exclusivity.
- [ ] Multi-target plans explicitly refuse to claim coexistence.
- [ ] No hidden use of mod-group exclusivity occurs.
- [ ] Generation weights are not used.
- [ ] Spawn weights are not converted to probability.
- [ ] No currency mechanic is simulated.
- [ ] No expected-cost calculation is produced.
- [ ] No Monte Carlo is produced.
- [ ] No trade search is introduced.
- [ ] No AI is used.
- [ ] Default tests are offline.
- [ ] Required repository checks pass.
- [ ] Create:
      `docs/progress/STEP-020-scoped-craft-target-planner.md`

---

## 6. Scope

STEP-020 may implement:

```text
base selection
item-level input
target definition
target-to-modifier matching
individual source-pool eligibility
modifier presentation
target coverage
candidate ordering by deterministic factual policy
planner readiness
planner provenance
limited UI
```

STEP-020 must not implement:

```text
craft currency actions
mod coexistence validation
probability
expected attempts
expected cost
craft sequence generation
multi-step crafting
trade search
automatic build optimization
AI target selection
```

---

## 7. Recommended package

Create:

```text
packages/crafting-planner
```

Responsibilities:

```text
planner schemas
target schemas
target resolution
candidate matching
candidate factual ordering
coverage/readiness
planner result provenance
```

Dependencies may include:

```text
@poe2-helper/crafting-data
zod
```

Avoid dependencies on:

```text
pob2-calculator
upgrade-engine
gear-engine
data-sources network adapters
AI providers
```

---

## 8. Dependency flow

```text
local approved crafting snapshot
        ↓
crafting-data
        ↓
planner readiness gate
        ↓
crafting-planner
        ↓
web/server UI
```

No network call belongs in the planner package.

---

## 9. Planner version

Introduce:

```text
CRAFTING_PLANNER_VERSION = 1
```

Increment when identical planner inputs could produce different target results or ordering.

---

## 10. Planner input

Conceptually:

```text
CraftTargetPlanInput {
  base
  itemLevel
  targets[]
  options?
}
```

Where:

```text
base
```

must resolve through the approved crafting-data base model.

---

## 11. Base selection

Support at minimum:

```text
base id
```

Optionally:

```text
exact base name + item class
```

using the existing deterministic resolver.

Do not use fuzzy matching.

---

## 12. Supported item classes

Use only the STEP-019A approved list.

Current supported scope:

```text
Amulet
Belt
Body Armour
Boots
Bow
Claw
Crossbow
Flail
Focus
Gloves
Helmet
One Hand Axe
One Hand Mace
One Hand Sword
Quiver
Ring
Sceptre
Shield
Spear
Staff
Talisman
TrapTool
Two Hand Axe
Two Hand Mace
Wand
```

Do not silently add:

```text
Buckler
FishingRod
Warstaff
```

or any future class without compatibility-policy review.

---

## 13. Unsupported class behavior

Return:

```text
unsupported-item-class
```

with:

```text
item class
base id/name
planner policy version
```

Do not reinterpret the class into a nearby supported one.

---

## 14. Item level input

Require:

```text
itemLevel >= 1
```

and apply an appropriate upper validation bound if the source/game model exposes one.

Do not infer item level from:

```text
required character level
base drop level
modifier level
```

---

## 15. Item level is part of planner identity

The same base at:

```text
ilvl 60
```

and:

```text
ilvl 82
```

may produce different candidate target mods.

Therefore item level must be included in:

```text
input
result
cache key if caching is added
provenance
```

---

## 16. Target model

Start with explicit deterministic target types.

Recommended:

```text
StatTarget
ModifierTarget
```

Conceptually:

```text
StatTarget {
  kind: "stat"
  statId
  desiredDirection?
  minimumValue?
}
```

```text
ModifierTarget {
  kind: "modifier"
  modifierId
}
```

Do not start with free-text semantic interpretation.

---

## 17. Stat-id target

Primary target form:

```text
stable stat id
```

Example conceptually:

```text
maximum_life
increased_armour
added_fire_damage
```

Use actual source stat ids from the snapshot.

---

## 18. Modifier-id target

Allow exact modifier id targeting.

This is useful for:

```text
advanced/debug workflows
tests
future UI deep links
```

Exact id means exact target record.

---

## 19. Human-readable target picker

The UI may expose resolved translation labels for convenience.

Internally, selection must resolve to:

```text
stat id
or
modifier id
```

before planning.

Do not send arbitrary label text as semantic identity.

---

## 20. No fuzzy target matching

Do not implement:

```text
"more tanky"
"good life"
"crit stuff"
"better damage"
```

in STEP-020.

No embedding search.

No LLM interpretation.

No fuzzy text-to-stat mapping.

---

## 21. Target resolution result

Conceptually:

```text
ResolvedTarget {
  targetId
  kind
  stableId
  display
  status
}
```

Possible statuses:

```text
resolved
not-found
ambiguous
unsupported
```

---

## 22. Stat-target matching

For a stat target:

```text
find modifiers containing that stat id
```

Then evaluate each modifier against:

```text
supported planner scope
item level
base/domain/tag source-pool eligibility
generation type
```

Do not use display text matching if stable stat ids exist.

---

## 23. Modifier-target matching

For exact modifier target:

```text
lookup modifier id
evaluate it against base + itemLevel
```

Return its factual eligibility result.

---

## 24. Candidate result

Conceptually:

```text
CraftTargetCandidate {
  modifierId
  targetIds[]
  eligibility
  generationType
  affixKind
  requiredItemLevel
  stats[]
  presentation
  evidence[]
  warnings[]
}
```

No probability field.

No score field.

---

## 25. Eligibility values

Reuse:

```text
eligible
ineligible
unresolved
```

from crafting-data semantics.

Do not convert `unresolved` into `ineligible`.

---

## 26. Candidate evidence

Expose structured reasons such as:

```text
item-level requirement satisfied
item-level requirement failed
supported item domain
spawn rule matched tag X
spawn rule weight positive
spawn rule weight zero
spawn rule unavailable
translation fallback used
unsupported capability
```

Do not expose internal implementation stack traces.

---

## 27. Eligibility wording

Preferred:

```text
Source-pool eligible
Source-pool ineligible
Eligibility unresolved
```

Avoid:

```text
Craftable
Impossible
Guaranteed
```

because mechanic accessibility is not yet modeled.

---

## 28. Spawn-weight display

The planner may optionally expose the source weight as factual metadata.

If shown, label:

```text
Source spawn weight
```

and include:

```text
Not a crafting probability
```

Do not rank candidates by raw spawn weight in STEP-020.

---

## 29. No probability

Hard rule:

```text
spawn weight
!=
chance
```

No function may return:

```text
probability
chance
odds
expected attempts
```

---

## 30. Required level presentation

Each candidate should expose:

```text
required item level
```

and whether the supplied item level passes it.

---

## 31. Generation type presentation

Show:

```text
prefix
suffix
other
```

plus raw generation type if needed.

Do not present `other` as a normal craftable affix category.

---

## 32. Affix kind filter

The user may optionally filter:

```text
prefix
suffix
```

when selecting candidates.

Do not silently discard `other`; keep it visible as unsupported/special where relevant.

---

## 33. Special generation types

Modifiers with generation types outside normal prefix/suffix should:

```text
remain visible when directly targeted
```

but may be excluded from the default normal-affix candidate view.

Explain:

```text
special generation type
not part of default normal-affix target pool
```

---

## 34. Essence-only flag

If STEP-019 preserved:

```text
essence-only
```

the planner may display it.

Do not infer:

```text
which Essence creates it
```

unless a later mechanic source proves that.

---

## 35. Grants-effects records

Modifiers that grant effects and are not interpreted by current data should remain:

```text
unsupported / unresolved
```

for planner semantics requiring those effects.

Do not guess their value.

---

## 36. Modifier stat ranges

Show exact source ranges.

For multi-stat modifiers preserve:

```text
stat order
min
max
```

Do not average ranges.

---

## 37. Translation behavior

Use STEP-019A presentation policy.

### Resolved

Show validated source translation/template.

### Fallback

Show:

```text
source modifier name if trustworthy
modifier id
stat ids/ranges
translation unresolved
```

No guessed wording.

---

## 38. Translation does not control eligibility

A fallback presentation must not change:

```text
eligible
ineligible
unresolved
```

Eligibility uses stable ids/source facts.

---

## 39. Target coverage

For each explicit target, report:

```text
eligible candidate count
ineligible candidate count
unresolved candidate count
```

This is factual coverage.

Do not call low candidate count:

```text
hard
rare
expensive
```

without mechanics/probability.

---

## 40. Single-target result

Example:

```text
Base:
Wrapped Greathelm

Item level:
82

Target:
<maximum-life stat id>

Eligible candidates:
3

Candidate:
<mod id>
Prefix
Required ilvl: 75
Range: +X–Y maximum Life
Source-pool eligible
```

No strategy yet.

---

## 41. Multiple targets

Allow multiple explicit targets for convenience.

Example:

```text
Life
Fire Resistance
Armour
```

But evaluate them independently.

---

## 42. No coexistence claim

Hard rule:

```text
candidate A eligible
+
candidate B eligible
!=
A and B can coexist
```

Because mod-group exclusivity is not approved.

Every multi-target plan must include:

```text
Individual target eligibility only.
Modifier coexistence has not been validated.
```

---

## 43. No affix-count feasibility

Do not conclude:

```text
3 prefixes + 3 suffixes fit
```

unless affix-count rules are explicitly modeled and approved in a later step.

STEP-020 does not need them.

---

## 44. No target-set feasibility verdict

Do not output:

```text
valid craft target
invalid craft target
```

for the full target set.

Instead:

```text
individual targets resolved
combination feasibility unresolved
```

---

## 45. Duplicate target handling

Duplicate identical stat/modifier targets should:

```text
deduplicate deterministically
```

or fail validation with a clear message.

Choose one policy and test it.

---

## 46. Candidate deduplication

A single modifier may satisfy multiple requested stat targets.

Return the modifier once with:

```text
targetIds[]
```

listing every target it satisfies.

Do not duplicate the same modifier row.

---

## 47. Multi-stat candidate behavior

If one modifier has:

```text
stat A
stat B
```

and the user targets both:

```text
record coverage for both targets
```

but do not infer that it is superior to two separate modifiers.

---

## 48. Minimum value target

Optional STEP-020 capability:

```text
minimumValue
```

for stat targets.

If implemented, a modifier candidate qualifies when its source range can reach the requested value.

Be explicit about semantics:

```text
max >= requestedMinimum
```

does not guarantee the rolled value will meet it.

---

## 49. Minimum value wording

If a source range is:

```text
60–80
```

and target is:

```text
at least 75
```

the planner may say:

```text
This modifier can roll a value that meets the target.
```

Do not say:

```text
This modifier will meet the target.
```

---

## 50. Exact-value targets

Do not model exact roll probability.

If exact value filters are offered, they are only range-containment checks.

---

## 51. Candidate ordering

Use deterministic factual ordering only.

Recommended default:

```text
eligible first
then unresolved
then ineligible
```

Within eligible candidates:

```text
affix kind
required item level
modifier id
```

or another documented deterministic order.

Do not call this ranking by quality.

---

## 52. Optional range ordering

If the UI wants:

```text
highest possible target value first
```

this may be a user-selected sort mode.

Label it clearly:

```text
Sort by maximum source range
```

Do not make it the hidden definition of "best".

---

## 53. No universal candidate score

Do not add:

```text
craft score
target score
tier score
desirability score
```

---

## 54. Tier handling

If STEP-019 did not prove an upstream tier field, STEP-020 must not display guessed:

```text
T1
T2
T3
```

Use:

```text
required item level
range
modifier id
```

instead.

---

## 55. CharacterContext boundary

Do not automatically consume CharacterContext to select targets.

Optional future feature:

```text
suggest target stats
```

belongs to a separate reviewed step.

STEP-020 is user-directed.

---

## 56. PoB2 boundary

STEP-020 does not need to run PoB2 for target selection.

PoB2 may become useful later to measure a hypothetical completed target item, but that requires item synthesis and is outside this step.

---

## 57. Upgrade-engine boundary

Do not reuse STEP-018C upgrade efficiency to rank crafting targets.

An eligible modifier is not an item candidate with a known acquisition cost.

---

## 58. Economy boundary

No poe.ninja lookup is required.

No budget-efficiency calculation.

No currency conversion.

---

## 59. Budget from original roadmap

The original roadmap mentioned a budget input for craft target planning.

For this scoped STEP-020:

```text
budget is intentionally deferred
```

because the project has not yet implemented:

```text
craft mechanics
success probabilities
expected attempts
crafting costs
```

A budget would therefore create false precision.

Document this as an intentional scoped deviation.

---

## 60. Future budget integration

Budget becomes meaningful only when later steps can answer:

```text
which mechanic
cost per attempt
success chance / outcome distribution
expected attempts
```

Do not add a decorative budget field in STEP-020.

---

## 61. Planner readiness gate

Every public planner call must first invoke:

```text
assessPlannerReadiness
```

or the approved equivalent.

Do not bypass it in production code.

---

## 62. Snapshot binding

Planner result must include:

```text
snapshot checksum
crafting schema version
source commit
compatibility policy version
planner version
supported scope
```

---

## 63. Changed snapshot behavior

If a new local snapshot appears with a different checksum and no approved compatibility report:

```text
planner blocked
```

Do not continue with stale compatibility approval.

---

## 64. Missing local snapshot

Return:

```text
snapshot-unavailable
```

with setup guidance:

```text
Run:
npm run refresh:crafting-data
npm run crafting:readiness
```

Do not auto-download.

---

## 65. Distribution constraint

STEP-020 remains:

```text
local scoped development
```

because distribution readiness is blocked.

Do not package the full crafting snapshot into the public/client bundle.

---

## 66. Server-side loading

Load/query the local crafting snapshot server-side.

Do not serialize all:

```text
5k+ bases
16k+ modifiers
```

to the browser.

---

## 67. Browser data minimization

The browser should receive only:

```text
supported base options needed for current UI
target picker data as needed
result candidates
provenance summary
```

Do not expose the full raw dataset unnecessarily.

---

## 68. UI scope

Add a simple planner UI.

Suggested flow:

```text
Craft target planner

1. choose supported base
2. choose item level
3. add target
4. select stat/modifier
5. Plan targets
```

No crafting action buttons.

---

## 69. Current-item entry point

Optionally allow:

```text
Use current item's base
```

when an imported PoB2 item's base resolves exactly to a supported crafting base.

This is a convenience only.

---

## 70. Current-item constraint

Using current item base must not automatically copy:

```text
current modifiers
current item level
```

unless those values are deterministically available and validated.

Do not infer missing item level.

---

## 71. Planner result UI

For each target show:

```text
Target
Candidate modifier
Affix kind
Required item level
Source range
Eligibility
Presentation status
Evidence / reason
```

---

## 72. Multi-target banner

When more than one target exists, show:

```text
Targets are evaluated independently.
Modifier coexistence and full craft feasibility are not validated yet.
```

This warning is mandatory.

---

## 73. Probability warning

Where source spawn weight is shown:

```text
Spawn weight is source-pool metadata, not a crafting probability.
```

---

## 74. Special-mod warning

For non-prefix/suffix modifiers:

```text
Special generation type.
This planner does not model how to obtain this modifier.
```

---

## 75. Planner result statuses

Conceptually:

```text
ready
partial
blocked
```

### ready

All requested targets resolve and have at least one eligible candidate.

### partial

At least one target is unresolved, unsupported, or has no eligible candidate.

### blocked

Planner readiness/snapshot/base scope fails.

---

## 76. Target result statuses

Recommended:

```text
resolved-with-eligible-candidates
resolved-no-eligible-candidates
unresolved
unsupported
```

---

## 77. No-candidate result

If a target resolves but no eligible modifier exists:

```text
No source-pool eligible modifier was found for this base and item level.
```

Do not conclude:

```text
This stat can never exist on this item
```

beyond the approved source scope.

---

## 78. Ineligible evidence

Optional details may show:

```text
candidate exists but requires ilvl 75
candidate spawn rule weight 0 on this base
unsupported domain/generation condition
```

Keep wording factual.

---

## 79. Search/index for target picker

A target picker may need a local index.

Safe index fields:

```text
stat id
resolved label
modifier id
modifier source name
```

Search remains deterministic string filtering.

No semantic embeddings.

---

## 80. Target picker ambiguity

If multiple stat ids share similar text:

```text
show stable ids
```

and require explicit selection.

Do not merge them based on label similarity.

---

## 81. Planner schema

Use strict Zod schemas or equivalent for:

```text
input
resolved targets
candidate results
planner result
provenance
errors
```

Unknown correctness-relevant values should fail validation or enter explicit unsupported variants.

---

## 82. Structured errors

Examples:

```text
planner-not-ready
snapshot-unavailable
snapshot-incompatible
unsupported-item-class
base-not-found
base-ambiguous
invalid-item-level
target-not-found
target-ambiguous
unsupported-target
```

Avoid generic public error strings.

---

## 83. Determinism

Same:

```text
snapshot
planner version
base
item level
targets
```

must produce identical:

```text
candidate ids
eligibility states
ordering
provenance
```

---

## 84. Optional cache key

If caching is added:

```text
snapshotChecksum
compatibilityPolicyVersion
plannerVersion
baseId
itemLevel
normalizedTargetIds
```

No caching is required for MVP.

---

## 85. Test fixtures

Default tests should remain synthetic.

Cover at minimum:

```text
supported armour base
supported weapon base
supported jewellery base
eligible prefix
eligible suffix
item-level-gated modifier
zero-weight ineligible modifier
multi-stat modifier
fallback translation
special generation type
unsupported item class
```

---

## 86. Test — supported base

Input:

```text
supported base
valid item level
known stat target
```

Expected:

```text
planner passes readiness
target resolves
eligible candidates returned
```

---

## 87. Test — item-level gate

Use a candidate requiring a higher item level.

Expected:

```text
below threshold → ineligible
at threshold → continues to source-pool rules
```

---

## 88. Test — zero spawn weight

Expected:

```text
source-pool ineligible
```

No probability field.

---

## 89. Test — unresolved eligibility

A synthetic case with missing/unknown required semantics should return:

```text
unresolved
```

not ineligible.

---

## 90. Test — fallback translation

Use an unresolved translation.

Expected:

```text
stable modifier id
stat ids/ranges
translation unresolved
```

No guessed English.

---

## 91. Test — multi-stat modifier

One modifier satisfies two stat targets.

Expected:

```text
one candidate row
targetIds contains both target ids
```

---

## 92. Test — no coexistence

Two independently eligible target candidates.

Expected result must include:

```text
combination feasibility unresolved
```

No claim that both can coexist.

---

## 93. Test — group data not used

Construct a case where two modifiers share the same source group.

STEP-020 result must **not** use that fact to:

```text
exclude one
claim conflict
claim coexistence
```

This regression is required because group exclusivity is currently blocked.

---

## 94. Test — generation weights not used

Synthetic generation-weight metadata must not alter STEP-020 candidate eligibility/order unless that capability is explicitly approved in a later version.

Current planner should ignore/block its use consistently.

---

## 95. Test — unsupported class

Example:

```text
Warstaff
```

Expected:

```text
unsupported-item-class
```

No conversion to Staff.

---

## 96. Test — stale compatibility report

Use:

```text
snapshot checksum A
compatibility report checksum B
```

Expected:

```text
planner-not-ready
```

---

## 97. Test — missing snapshot

Expected:

```text
snapshot-unavailable
```

with setup command.

No live fetch.

---

## 98. Test — deterministic ordering

Randomized source fixture insertion order must not change candidate ordering.

---

## 99. Test — budget absent

Planner schema/result should contain no misleading:

```text
expectedCost
budgetEfficiency
affordable
```

fields.

This confirms the scoped roadmap deviation.

---

## 100. Integration with real local snapshot

Add an explicit opt-in/local integration test or validation command.

Use at least:

```text
one armour base
one weapon base
one jewellery base
```

from the approved scope.

Verify:

```text
base resolves
target resolves
eligible candidate ids are stable
provenance matches current snapshot/readiness report
```

Do not require this in default `npm test`.

---

## 101. Real-source regression targets

Prefer representative records already cross-checked during STEP-019A.

Do not broaden planner support based solely on one new observed record.

---

## 102. Optional inspect command

Add:

```text
npm run crafting:plan -- ...
```

or equivalent developer command.

Example:

```text
npm run crafting:plan -- --base <id> --ilvl 82 --stat <stat-id>
```

Optional but useful.

---

## 103. No mechanic naming

Do not say:

```text
use Exalted Orb
use Essence
use Chaos Orb
```

in planner result.

Even if a modifier is essence-only, only show the factual source flag.

---

## 104. Essence-only wording

Allowed:

```text
Source marks this modifier as essence-only.
The current planner does not model the mechanic that grants it.
```

Not allowed:

```text
Use Essence X to get this mod.
```

unless later mechanic data proves it.

---

## 105. No rarity assumptions

Do not infer:

```text
rare item can have N prefixes/suffixes
```

unless a later step explicitly models rarity/affix-count rules.

---

## 106. No existing-affix blocking

STEP-020 plans against:

```text
base + item level + target
```

It does not yet model the current item's existing affixes as blockers.

A future mechanic-aware planner may.

---

## 107. Planner naming

User-facing name:

```text
Craft target planner
```

Avoid:

```text
Craft optimizer
Best craft
Craft simulator
```

---

## 108. Explanation wording

Preferred:

```text
This modifier is source-pool eligible on the selected base at item level 82.
```

Avoid:

```text
You can roll this with X% chance.
```

---

## 109. Provenance UI

Show a compact technical details section:

```text
Crafting snapshot
Source commit
Planner policy version
Local planner scope
```

Do not overwhelm the main target view.

---

## 110. Security/privacy

No new external service.

No user build data needs to leave the process.

The planner reads:

```text
local crafting snapshot
user-selected planner inputs
```

---

## 111. Performance

Target planning should use existing indexes.

Avoid scanning all 16k+ modifiers for every keystroke in the browser.

Server-side planning may use indexed stat/domain/generation lookups.

---

## 112. Client search performance

If a target picker needs searchable labels:

```text
send a compact target index
```

not the full modifier dataset.

---

## 113. Data provenance

Each result should carry:

```text
CRAFTING_DATA_SCHEMA_VERSION
CRAFTING_COMPATIBILITY_POLICY_VERSION
CRAFTING_PLANNER_VERSION
snapshot checksum
source commit
supported scope id/list
```

---

## 114. Progress documentation

Create:

```text
docs/progress/STEP-020-scoped-craft-target-planner.md
```

Include:

```text
Why STEP-020 Is Scoped
Approved STEP-019A Capabilities
Planner Package Boundary
Planner Version
Planner Input
Supported Item Classes
Base Resolution
Item-Level Policy
Target Model
Stat Target
Modifier Target
Target Resolution
Candidate Model
Eligibility Model
Generation-Type Handling
Translation Fallback
Target Coverage
Multi-Target Behavior
No-Coexistence Rule
No-Probability Rule
No-Budget Rule
No-Mechanics Rule
Candidate Ordering
Planner Readiness
Snapshot Binding
Local Runtime Requirement
UI Flow
Default Tests
Real Local Snapshot Validation
Security / Privacy
Performance
Known Limitations
STEP-021 Readiness
```

---

## 115. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for durable decisions:

```text
STEP-020 is explicit-target only
no CharacterContext automatic target selection
no budget until mechanic/cost model exists
no coexistence validation while mod groups are blocked
no probability
no mechanic sequence
supported class scope inherited from STEP-019A
CRAFTING_PLANNER_VERSION = 1
```

---

## 116. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run explicit local planner validation separately.

Run `npm audit` only if dependency files change.

---

## 117. Default-test requirements

Default tests must not require:

```text
network
RePoE
PoB2 executable
poe.ninja
GGG credentials
AI key
local full crafting snapshot
```

Use synthetic fixtures.

---

## 118. Real local validation

A separate command may require:

```text
var/crafting-data/snapshot.json
docs/data-snapshots/crafting/compatibility.json
```

This is allowed.

If unavailable, fail with setup instructions.

---

## 119. Known limitations to preserve

At STEP-020 completion, it is acceptable and expected that:

```text
mod coexistence is unresolved
generation weights are unused
craft mechanics are absent
probabilities are absent
expected cost is absent
budget is absent
public distribution is blocked
translations may use fallback
some item classes are unsupported
```

Do not treat these as implementation failures.

---

## 120. STEP-021 boundary

STEP-021 should not immediately become a universal simulator.

Before simulation, it will need mechanic-specific specifications for:

```text
what each crafting action changes
which modifier pool it samples
how existing affixes affect outcomes
whether groups/conflicts matter
affix-count limits
weight application
special tags
currency-specific constraints
```

Implement one mechanic at a time.

---

## 121. STEP-021 readiness from STEP-020

STEP-020 can finish without STEP-021 being ready.

A successful STEP-020 provides:

```text
base
item level
explicit desired targets
candidate source-pool modifiers
stable ids
factual eligibility
```

That is the input foundation for future mechanic modeling.

---

## 122. Example successful planner result

```text
Craft target planner

Base:
Wrapped Greathelm

Item level:
82

Target:
<maximum-life stat id>

Candidate:
<modifier id>

Affix:
Prefix

Required item level:
75

Range:
+X–Y maximum Life

Eligibility:
Source-pool eligible

Reason:
item level requirement satisfied
matching base tag has positive source spawn weight

Translation:
resolved

Crafting probability:
not calculated

Crafting method:
not modeled
```

---

## 123. Example fallback result

```text
Target:
<stat id>

Candidate:
<modifier id>

Stats:
<stat id> 20–30

translation unresolved

Eligibility:
Source-pool eligible

Crafting method:
not modeled
```

This is still a valid planner result.

---

## 124. Example multi-target result

```text
Targets:
Life
Fire Resistance

Life:
2 eligible candidates

Fire Resistance:
3 eligible candidates

Combination feasibility:
unresolved

Reason:
modifier coexistence is not approved in the current crafting compatibility policy.
```

Do not claim the full target item is feasible.

---

## 125. Example unsupported result

```text
Base:
Warstaff

Status:
unsupported-item-class

Reason:
Warstaff is outside the STEP-019A planner-approved class scope.

No fallback mapping was applied.
```

---

## 126. Expected completion state

STEP-020 is complete when Buddy can deterministically:

```text
take a supported base
take an explicit item level
take explicit user targets
resolve stable target ids
list individual source-pool candidate modifiers
show item-level/range/generation facts
show resolved/fallback presentation
preserve unresolved states
preserve snapshot/readiness provenance
```

without:

```text
strategy
probability
cost
budget
mechanics
coexistence claims
AI
```

---

## 127. Roadmap after STEP-020

Do not assume STEP-021 should start immediately.

After STEP-020 review, likely next choices are:

```text
A. STEP-020A — affix-count / coexistence compatibility research
B. STEP-021A — first crafting-mechanic research spike
C. public crafting-data distribution architecture
D. build-aware craft-target suggestion layer
```

Choose based on the next desired product capability.

---

## 128. Stop condition

After planner implementation, tests, real local validation, UI verification, provenance, and progress documentation:

**STOP.**

Do not automatically implement:

```text
crafting mechanics
probability
simulation
expected cost
budget optimization
trade search
AI craft advice
```

Wait for explicit review and approval.
