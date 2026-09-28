# STEP-019 — Crafting data ingestion and deterministic mod-pool foundation

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-019  
**Authoring context:** Cursor-assisted development

## 1. Objective

Build the deterministic, versioned crafting-data foundation required by future craft planning and simulation.

STEP-019 must ingest and normalize enough Path of Exile 2 crafting data to answer factual questions such as:

```text
What base item is this?
What item class/domain/tags does the source assign to it?
Which modifier records exist?
Is a modifier a prefix, suffix, implicit, or another generation type?
What item level does the modifier require?
What stats and numeric ranges does the modifier contain?
Which mod group does it belong to?
What spawn-weight rules does the source provide?
Which source tags/conditions affect those rules?
Which translation records describe its stats?
```

STEP-019 must **not** yet answer:

```text
What should I craft?
What is the cheapest craft?
What is the probability of hitting this exact item?
Which currency should I use next?
How many attempts will this take?
```

Those belong to STEP-020 / STEP-021 after the underlying data and mechanic semantics are proven.

---

## 2. Why STEP-019 follows the completed STEP-018 chain

The completed STEP-018 → STEP-018C.1 chain now provides:

```text
PoB2 import
character context
normalized gear
exact candidate measurement
item replacement deltas
explicit acquisition cost
budget-aware metric-specific comparison
visible trade-offs
```

That layer evaluates **existing explicit items**.

The next missing capability is to understand the space of items that can exist and, later, how crafting mechanics can produce them.

The dependency order is now:

```text
existing build/item understanding
        ↓
STEP-019 crafting data
        ↓
STEP-020 craft target planner
        ↓
STEP-021 mechanic-by-mechanic simulation
```

---

## 3. Core design rule

Hard invariant:

```text
source crafting data
!=
crafting probability model
```

A spawn weight is not automatically a probability.

A modifier being eligible for a base does not mean every crafting mechanic can roll it.

A modifier existing in the dataset does not mean it belongs to the normal rare-item affix pool.

STEP-019 must preserve those distinctions.

---

## 4. Acceptance criteria

- [ ] A normalized crafting-data package/model exists.
- [ ] Data sources are explicitly selected and documented.
- [ ] Every source is identified as official/community/derived correctly.
- [ ] Exact source version/commit/tag is pinned where available.
- [ ] Source licensing/redistribution status is inspected before committing copied data.
- [ ] Dataset schema version is separate from source snapshot version.
- [ ] Snapshot checksum/provenance is recorded.
- [ ] Base-item records are ingested.
- [ ] Base item classes/domains/tags are preserved where supported.
- [ ] Base level/requirements are preserved where supported.
- [ ] Modifier records are ingested.
- [ ] Modifier id is preserved.
- [ ] Modifier domain is preserved.
- [ ] Modifier generation type is preserved.
- [ ] Prefix/suffix classification is explicit only when source semantics justify it.
- [ ] Modifier group/exclusivity identity is preserved where available.
- [ ] Modifier required item level is preserved.
- [ ] Modifier stat ids and numeric ranges are preserved.
- [ ] Ordered spawn-weight rules are preserved without collapsing them to one number.
- [ ] Weight `0` is distinct from missing/unknown weight.
- [ ] Source tag conditions are preserved.
- [ ] Stat definitions are ingested.
- [ ] Translation data is ingested or indexed.
- [ ] Multi-stat translations preserve stat order/identity.
- [ ] Unsupported translation semantics remain unresolved rather than guessed.
- [ ] A deterministic base lookup exists.
- [ ] A deterministic modifier lookup exists.
- [ ] A deterministic mod-pool/eligibility query exists only to the level supported by proven source semantics.
- [ ] Eligibility supports `eligible | ineligible | unresolved`.
- [ ] Spawn weight is never exposed as direct probability.
- [ ] No crafting recommendation is produced.
- [ ] No expected-cost calculation is produced.
- [ ] No simulation is produced.
- [ ] No AI interpretation is used.
- [ ] Runtime application uses local pinned data, not live network calls.
- [ ] Default tests are offline and deterministic.
- [ ] Dataset validation and representative source spot-checks exist.
- [ ] Create `docs/progress/STEP-019-crafting-data-ingestion.md`.

---

## 5. Source-selection rule

Do not assume a source is authoritative merely because it contains the fields we need.

For each required fact, document the selected source and why it is suitable.

Required fact families:

```text
base items
item classes/domains
base tags
base requirements
mods
mod groups
generation types
required item level
mod stats/ranges
spawn weights
weight tags/conditions
stat definitions
translations
```

A single source may cover all of them, or multiple sources may be required.

---

## 6. Candidate source investigation

Investigate the current PoE2-capable machine-readable sources already compatible with the project ecosystem.

Potential candidates may include:

```text
RePoE / PoE2 datasets
Path of Building Community PoE2 data
other source repositories already used by those projects
```

Do not treat this list as a pre-approved authority decision.

The implementation must inspect:

```text
coverage
field semantics
version provenance
licensing
update cadence
stable identifiers
redistribution terms
```

before selecting.

---

## 7. Source classification

Every source in the manifest must state:

```text
official
community
derived
```

Do not call community-mined game data official.

If one source is used only as a cross-check, record that separately.

---

## 8. Preferred source policy

Prefer:

```text
machine-readable
stable ids
version/commit pinning
documented field meaning
reproducible fetch
```

over:

```text
HTML scraping
wiki text scraping
manually copied values
```

Do not make a website page parser a critical dependency if a structured upstream exists.

---

## 9. Licensing gate

Before copying a source dataset or substantial derived data into this repository:

```text
inspect the current license/notice
record it
```

If redistribution rights for the required dataset are unclear:

```text
STOP
document the blocker
do not silently commit the copied dataset
```

A valid outcome may be:

```text
ingestion script works locally
but normalized snapshot cannot yet be redistributed
```

Do not provide unsupported legal conclusions.

---

## 10. Source provenance manifest

Create a manifest for every promoted crafting snapshot.

Conceptually:

```text
CraftingSourceManifest {
  sourceName
  sourceKind
  repositoryOrOrigin
  sourceCommit?
  sourceTag?
  sourceVersion?
  sourceGameVersion?
  fetchedAt
  sourceFiles[]
  sourceChecksums[]
  licenseSummary
  normalizationVersion
  snapshotChecksum
}
```

Exact schema may differ.

---

## 11. Version namespaces

Do not assume:

```text
source game version
PoB2 tree version
GGG passive-tree version
```

use the same namespace.

The current project already learned that:

```text
PoB2 0_5
!=
literal string GGG 0.5.5
```

Crafting data needs its own explicit compatibility mapping.

---

## 12. Compatibility model

Add an explicit compatibility record such as:

```text
CraftingDataCompatibility {
  craftingSnapshotId
  sourceVersion
  supportedBuddyGamePin
  status
  evidence
}
```

Possible status:

```text
compatible
incompatible
unknown
```

Fail closed on `unknown` when a future craft planner depends on version-specific eligibility.

---

## 13. Snapshot location

Use a deterministic project location such as:

```text
docs/data-snapshots/crafting/
```

for provenance/manifest reports and/or:

```text
packages/crafting-data/data/
```

for runtime normalized data.

Choose one coherent layout and document it.

Do not scatter generated source files across packages.

---

## 14. Package boundary

Recommended new package:

```text
packages/crafting-data
```

Responsibilities:

```text
normalized crafting schemas
snapshot loader
indexes
base lookup
mod lookup
eligibility facts
translation lookup
dataset readiness/provenance
```

Source fetching/downloading may remain under:

```text
packages/data-sources
```

or explicit scripts.

Avoid circular dependencies.

---

## 15. Suggested dependency flow

```text
external source
    ↓
data-sources / ingestion script
    ↓
normalized crafting snapshot
    ↓
crafting-data
    ↓
future crafting-engine / planner
```

`crafting-data` should not perform network requests at runtime.

---

## 16. Schema version

Introduce:

```text
CRAFTING_DATA_SCHEMA_VERSION = 1
```

This is the Buddy normalization schema version.

It is not the upstream source version.

---

## 17. Snapshot identity

Each normalized snapshot must have a deterministic identity.

Recommended:

```text
sha256:<normalized-content-hash>
```

The snapshot checksum should change whenever calculation-relevant crafting data changes.

---

## 18. Normalized base item

Conceptually:

```text
CraftingBaseItem {
  id
  name
  itemClass
  domain?
  tags[]
  dropLevel?
  requiredLevel?
  requirements?
  properties?
  source
}
```

Only include fields supported by the chosen source.

Do not invent missing values.

---

## 19. Stable base identity

Prefer source-stable ids.

Do not use display name as the sole identity when a stable id exists.

Names may change with translations; ids should remain the primary key.

---

## 20. Base tags

Preserve source tags as raw identifiers.

Do not prematurely translate them into broad Buddy categories only.

Example conceptually:

```text
sourceTags[]
normalizedTags[]
```

A normalized tag is allowed only when the mapping is explicit and tested.

---

## 21. Base requirements

Preserve source-supported requirements such as:

```text
required level
attribute requirements
```

when available.

Do not confuse:

```text
character equip requirement
```

with:

```text
modifier required item level
```

They are different concepts.

---

## 22. Item level

STEP-019 must model item level as an input to modifier eligibility.

Do not assign a base one universal item level.

The base definition and an item instance are separate.

Future query shape:

```text
base + itemLevel
```

---

## 23. Normalized modifier

Conceptually:

```text
CraftingModifier {
  id
  name?
  domain
  generationType
  affixKind?
  group?
  requiredItemLevel?
  tags[]
  stats[]
  spawnWeights[]
  generationWeights?
  sourceFlags?
  source
}
```

Only normalize fields whose semantics are supported.

---

## 24. Modifier id

Preserve exact source modifier id.

Do not use rendered mod text as identity.

---

## 25. Modifier domain

Preserve the source domain exactly.

Do not assume domain equals item class.

If domain → item-class semantics require a mapping:

```text
model that mapping explicitly
```

and test it.

---

## 26. Generation type

Preserve source generation type.

Examples may conceptually include:

```text
prefix
suffix
implicit
corrupted
unique
enchantment
other/special
```

Do not invent categories the source does not have.

---

## 27. Affix kind

A convenience field:

```text
prefix | suffix | other | unresolved
```

may be derived only from a verified generation-type mapping.

Store enough provenance to explain the derivation.

---

## 28. Special-pool warning

Do not interpret:

```text
modifier exists
```

as:

```text
modifier belongs to normal alteration/exalt-style pool
```

Special generation types or mechanic-specific mods must remain distinguishable.

STEP-020/021 will decide which crafting mechanics can access which pools.

---

## 29. Modifier group

Preserve the source's group/exclusivity identifier where available.

This is important for future:

```text
mutual exclusivity
same-family blocking
```

Do not derive a group from text similarity.

---

## 30. Tier

If the upstream source explicitly supplies a tier:

```text
preserve it
```

If tier is derived:

```text
document the exact derivation
```

Do not guess:

```text
T1 / T2 / T3
```

from display order or required level alone.

A valid STEP-019 implementation may leave `tier` absent.

---

## 31. Required item level

Preserve modifier minimum item level exactly.

Do not reinterpret:

```text
requiredItemLevel
```

as character level.

---

## 32. Modifier stats

Preserve an ordered list:

```text
ModifierStat {
  statId
  min
  max
  index/order
}
```

Do not flatten multi-stat modifiers into one text string.

---

## 33. Numeric range fidelity

Preserve:

```text
min
max
```

as source values.

Do not convert a range into average value.

Do not roll a random value in STEP-019.

---

## 34. Stat definitions

Create a stat index keyed by stable stat id.

Conceptually:

```text
CraftingStatDefinition {
  id
  metadata?
  source
}
```

Translation is separate from identity.

---

## 35. Translation data

Ingest or index source translation records required to render modifier stats.

Preserve:

```text
stat id tuple/order
conditions
format
text/template
locale
source
```

as supported.

Do not assume one stat id maps to exactly one English sentence.

---

## 36. Multi-stat translations

Many modifier lines may depend on multiple stat ids.

The translation lookup must support:

```text
ordered stat-id combinations
```

not only:

```text
single stat id → text
```

If a translation cannot be safely resolved:

```text
translationStatus = unresolved
```

rather than guessed wording.

---

## 37. Locale scope

English-only rendering is acceptable for MVP if that is the validated source coverage.

If so, document:

```text
locale = en
```

Do not claim multilingual translation support.

---

## 38. Raw source preservation

For fields with unclear semantics, preserve the raw source fragment or normalized raw fields where practical.

Do not discard information merely because STEP-019 does not yet interpret it.

---

## 39. Spawn-weight records

Do not collapse source spawn weights to:

```text
one weight number
```

Model the ordered source records.

Conceptually:

```text
SpawnWeightRule {
  tag
  weight
  order
}
```

or the exact structure supported by the source.

---

## 40. Weight zero

Hard rule:

```text
weight = 0
```

is a real source value.

It must not become:

```text
missing
unknown
falsey omitted
```

---

## 41. Missing weight

Represent missing source information separately:

```text
weight = unavailable
```

or through optional/union schema.

Never convert missing weight into zero.

---

## 42. Spawn-weight semantics investigation

Before implementing an eligibility evaluator, determine from upstream source/code how spawn-weight rules are applied.

Investigate:

```text
rule order
first-match vs aggregate semantics
tag precedence
default/fallback behavior
zero-weight behavior
missing matching tag behavior
```

Do not infer this from field names.

---

## 43. If spawn-weight semantics are not proven

Still ingest the raw ordered rules.

But eligibility dependent on those semantics must return:

```text
unresolved
```

with a reason such as:

```text
spawn-weight precedence not proven
```

This is preferable to a false eligible/ineligible answer.

---

## 44. Spawn weight is not probability

Hard invariant:

```text
spawnWeight
!=
craft chance
```

Do not compute:

```text
weight / total weights
```

as a user-facing crafting probability in STEP-019.

The correct candidate pool and mechanic-specific selection process must first be modeled in later steps.

---

## 45. Generation weights

If the selected source exposes a separate concept such as:

```text
generation weights
```

preserve it separately from spawn weights.

Do not merge different weight systems into one field.

---

## 46. Tags and conditions

Preserve all source tags/conditions that can affect:

```text
eligibility
weight
generation
```

Do not reduce them to only:

```text
weapon
armour
jewellery
```

unless that is an explicit secondary index.

---

## 47. Source order

When source rule order can affect semantics:

```text
preserve order
```

Do not sort rules alphabetically merely for normalization aesthetics.

Canonical snapshot hashing may sort records only where semantic order is irrelevant.

---

## 48. Base lookup

Provide deterministic lookups:

```text
by source id
by exact normalized name
by item class + name
```

No fuzzy matching in STEP-019.

Ambiguous name:

```text
ambiguous
```

not first match.

---

## 49. Gear-to-base resolution

Provide a small adapter/helper so a `NormalizedItem` base identity can be resolved to crafting data when exact information is available.

Preferred:

```text
exact base type
+ canonical item class if available
```

Do not infer a base from modifier text.

---

## 50. Base resolution states

Use:

```text
resolved
ambiguous
not-found
```

Do not silently treat `not-found` as unsupported item class without evidence.

---

## 51. Modifier lookup

Provide deterministic lookup by:

```text
modifier id
```

Optional indexes:

```text
group
domain
generation type
stat id
```

Indexes must not change source semantics.

---

## 52. Minimal eligibility API

STEP-019 may expose:

```text
evaluateModifierEligibility({
  base,
  itemLevel,
  modifier
})
```

Result:

```text
eligible
ineligible
unresolved
```

with structured reasons.

This API is factual only.

It is not a craft recommendation.

---

## 53. Eligibility evidence

Possible evidence/reasons:

```text
required item level
domain mismatch
base/item tag rule
spawn weight rule
generation type
unsupported source condition
missing mapping
```

Only use reasons backed by normalized source data and proven semantics.

---

## 54. Eligibility vs craft accessibility

Hard distinction:

```text
eligible for source pool
!=
reachable by every crafting mechanic
```

STEP-019 should use wording such as:

```text
source-pool eligible
```

rather than:

```text
craftable
```

unless a later mechanic model proves that.

---

## 55. Eligibility and zero weight

If proven source semantics say a matching rule has:

```text
weight = 0
```

the modifier may be:

```text
ineligible in that context
```

But only apply this after the rule-selection semantics are verified.

---

## 56. Item-level eligibility

If:

```text
itemLevel < modifier.requiredItemLevel
```

then:

```text
ineligible
```

where the source meaning is clear.

This rule should have a direct test.

---

## 57. Domain eligibility

Do not hard-code broad domain assumptions without a verified mapping.

Create an explicit source-domain compatibility map if required.

Unknown mapping:

```text
unresolved
```

---

## 58. Group/exclusivity query

A factual helper may answer:

```text
sameGroup(modA, modB)
```

when both have a source group id.

Do not yet claim every same-group relation means every crafting mechanic can never produce both unless the source semantics support that exact conclusion.

Preserve the group fact first.

---

## 59. Mod-pool query

A deterministic query may return:

```text
all modifiers whose eligibility is eligible
all unresolved modifiers separately
```

for:

```text
base
itemLevel
optional affix kind
```

Do not compute probability.

---

## 60. Query result shape

Conceptually:

```text
ModifierPoolResult {
  eligible[]
  unresolved[]
  excludedCount
  snapshot
  warnings[]
}
```

Keep unresolved visible.

---

## 61. Pool filtering

Safe filters may include:

```text
prefix
suffix
stat id
group
domain
```

only when the relevant normalized field exists.

Do not filter by guessed semantic categories.

---

## 62. Crafting-data readiness

Define separate readiness:

```text
ready
partial
incompatible
```

Possible reasons for `partial`:

```text
translation unresolved
spawn-weight semantics unresolved
domain mapping incomplete
source field missing
```

This readiness is not gear readiness and not calculator readiness.

---

## 63. Coverage report

Generate deterministic coverage counts such as:

```text
base count
mod count
stat count
translation count
mods with generation type
mods with group
mods with required level
mods with stats
mods with spawn weights
mods with unresolved translations
domains encountered
generation types encountered
```

Do not present percentage coverage as semantic correctness by itself.

---

## 64. Unknown inventory

Produce an inventory of values the normalizer does not recognize:

```text
unknown domains
unknown generation types
unknown tag rule shapes
unknown stat structures
unknown translation forms
```

Unknown source values should fail normalization or be preserved explicitly according to a documented policy.

Do not silently drop them.

---

## 65. Strict-schema policy

For structure that affects crafting correctness:

```text
unknown enum/value
```

should normally:

```text
fail snapshot promotion
```

unless a safe raw/unknown variant is deliberately supported.

Avoid permissive parsing that hides upstream changes.

---

## 66. Snapshot promotion

Use an explicit pipeline:

```text
download/fetch
→ checksum raw source
→ parse
→ normalize
→ validate
→ coverage report
→ compatibility check
→ promote
```

Do not overwrite the approved snapshot before validation succeeds.

---

## 67. Failed promotion

If the candidate snapshot fails:

```text
schema
compatibility
license gate
semantic validation
```

leave the current snapshot unchanged.

Record the rejection reason.

---

## 68. Rollback

Keep enough metadata to restore the previous approved crafting snapshot.

Follow the same philosophy as STEP-012 / STEP-012A.

---

## 69. Refresh command

Add an explicit script/command such as:

```text
npm run refresh:crafting-data
```

or equivalent.

Do not refresh automatically when the web app starts.

---

## 70. Network boundary

Network access is allowed only during explicit source refresh/fetch.

Runtime crafting-data queries must use the local approved snapshot.

Default tests must not fetch external data.

---

## 71. Download safety

For source fetch scripts:

```text
HTTPS only where available
size limits
expected content type/format
checksum
timeouts
structured failure
```

Do not execute downloaded code as part of ingestion.

---

## 72. Data size

If the normalized source is large:

```text
do not ship the entire raw dataset to the browser
```

Keep queries server-side or expose only necessary derived data.

Do not optimize prematurely, but avoid putting multi-megabyte crafting tables in client bundles.

---

## 73. Runtime indexes

Precompute or build efficient maps for:

```text
baseById
baseByName
modById
modsByDomain
modsByGenerationType
modsByGroup
translationsByStatKey
```

as appropriate.

Indexes are implementation details and must not alter normalized data.

---

## 74. No item-value scoring

Do not add:

```text
modifier score
tier score
base score
craft desirability score
```

STEP-019 is data foundation only.

---

## 75. No build relevance in crafting data

Do not bake CharacterContext into crafting records.

Crafting data should remain:

```text
build-independent
```

Future planner can combine:

```text
crafting facts
+
character context
+
PoB2 delta evaluator
```

later.

---

## 76. No economy in crafting data

Do not put:

```text
currency price
craft cost
market value
```

inside the crafting-data package.

STEP-019 does not need poe.ninja.

---

## 77. No crafting currency mechanics yet

Do not model the behavioral effect of:

```text
Exalted Orb
Chaos Orb
Essence
Omen
etc.
```

unless the data is required merely as source metadata.

Actual mechanic behavior belongs to STEP-020/021 and must be implemented one mechanic at a time.

---

## 78. No probability engine

Do not implement:

```text
chance to hit prefix X
chance to roll T1
chance to hit 3 desired mods
expected number of attempts
```

in STEP-019.

---

## 79. No Monte Carlo

Do not add random simulation.

STEP-021 owns simulation after mechanics are validated.

---

## 80. No AI

Do not use an LLM to:

```text
classify mods
infer tag meaning
guess translation
guess crafting eligibility
guess weights
```

All normalized facts must be source-derived and deterministic.

---

## 81. Representative fixture subset

Create a small checked fixture subset derived from the selected source for tests.

Include at minimum:

```text
one armour base
one weapon base
one jewellery base if supported
one prefix
one suffix
one multi-stat modifier
one modifier with item-level gating
one modifier with multiple spawn-weight rules
one zero-weight rule
one group/exclusivity example
one translation example
```

Use real source ids and record provenance.

---

## 82. Existing real item integration

Where possible, take one existing PoB2 gear fixture and resolve its base type against the new crafting base dataset.

The purpose is:

```text
gear base identity
→ crafting base identity
```

not crafting advice.

If the fixture cannot resolve:

```text
document why
```

rather than fuzzy-match.

---

## 83. Source spot checks

For representative records, compare normalized output against the exact upstream source.

Record examples for:

```text
base
prefix
suffix
item-level requirement
stat range
spawn-weight rules
mod group
translation
```

Do not validate only against your own generated snapshot.

---

## 84. Test — item-level gating

Example structure:

```text
base + itemLevel below required
→ ineligible

same base + sufficient itemLevel
→ eligibility continues to other rules
```

Do not assume it becomes eligible if another rule remains unresolved.

---

## 85. Test — zero weight

Preserve:

```text
weight = 0
```

through:

```text
source
→ normalized snapshot
→ query
```

No falsey loss.

---

## 86. Test — missing weight

Prove:

```text
missing
```

does not normalize to:

```text
0
```

---

## 87. Test — ordered weight rules

Verify normalized output preserves source order.

If eligibility semantics use first-match or another precedence rule, add a direct test from source-backed semantics.

---

## 88. Test — multi-stat modifier

Verify:

```text
stat ids
ranges
order
translation lookup
```

remain aligned.

Do not allow translation rendering to swap values.

---

## 89. Test — group identity

Two known same-group records should retain the same group id.

Two unrelated records should not become same-group because of similar text.

---

## 90. Test — ambiguous base name

If the dataset has or a synthetic fixture models an ambiguous name:

```text
name-only lookup
→ ambiguous
```

not first match.

---

## 91. Test — unknown enum

A source fixture with an unknown correctness-relevant generation/domain value should:

```text
fail
```

or enter an explicitly documented `unknown` variant.

Do not silently omit the record.

---

## 92. Test — snapshot determinism

Same raw source + same normalization version:

```text
same normalized checksum
```

independent of filesystem enumeration order.

---

## 93. Test — source change

A meaningful source record change must change:

```text
snapshot checksum
```

and ideally appear in a generated diff/report.

---

## 94. Test — offline runtime

After the snapshot exists:

```text
base lookup
mod lookup
eligibility query
translation lookup
```

must work with no network.

---

## 95. Dataset diff

Generate a simple refresh diff:

```text
bases added/removed/changed
mods added/removed/changed
stat definitions changed
domains added
generation types added
unknown values added
```

Do not auto-classify a changed mod as safe.

---

## 96. Compatibility report

Each candidate refresh should report:

```text
source snapshot
Buddy game pin
compatibility status
evidence/mapping
```

Unknown compatibility prevents automatic promotion for production use.

---

## 97. UI scope

No production crafting planner UI is required in STEP-019.

Optional developer/debug output may show:

```text
base lookup
mod record
eligibility reason
snapshot provenance
```

but do not present it as crafting advice.

---

## 98. CLI/debug query

A small deterministic development command is encouraged, for example:

```text
npm run crafting:inspect -- <base-id>
npm run crafting:mod -- <mod-id>
```

or equivalent.

This is optional but useful for validation.

---

## 99. Error model

Structured errors should distinguish cases such as:

```text
snapshot-unavailable
snapshot-incompatible
source-fetch-failed
source-schema-invalid
normalization-failed
base-not-found
base-ambiguous
modifier-not-found
eligibility-unresolved
translation-unresolved
```

Do not throw generic strings from public package APIs.

---

## 100. Security/privacy

Crafting source ingestion contains public game/community data, not user secrets.

Still:

```text
validate downloaded input
do not execute source files
do not allow arbitrary filesystem writes from source paths
```

No user PoB build should be uploaded to the source provider.

---

## 101. Logging

Refresh logs may contain:

```text
source name
source commit/tag
checksums
record counts
warnings
```

Do not dump entire datasets into normal application logs.

---

## 102. Performance target

Runtime lookups should be local indexed operations.

Avoid scanning every modifier for simple `modById` or `baseById` lookups.

A full pool query may scan/index by domain/tag as appropriate.

Do not optimize with lossy precomputation.

---

## 103. Documentation

Create:

```text
docs/progress/STEP-019-crafting-data-ingestion.md
```

Follow the normal progress-document protocol.

Also include:

```text
Why STEP-019 Starts Now
Selected Data Sources
Source Classification
Source Version / Commit
Licensing / Redistribution
Source Files Used
Raw Source Checksums
Normalized Snapshot Checksum
Crafting Data Schema Version
Compatibility Mapping
Base Item Model
Base Tags / Requirements
Modifier Model
Generation Types
Affix Kind Mapping
Modifier Groups
Item-Level Requirements
Modifier Stats / Ranges
Stat Definitions
Translation Model
Spawn-Weight Model
Spawn-Weight Semantics
Generation Weights
Eligibility Model
Eligibility Limitations
No-Probability Rule
Base Resolution
Gear-to-Base Resolution
Coverage Report
Unknown Inventory
Snapshot Promotion
Rollback
Refresh Command
Dataset Diff
Fixture Provenance
Source Spot Checks
Offline Tests
Security
Performance
Known Limitations
STEP-020 Readiness
```

---

## 104. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only for durable decisions such as:

```text
selected crafting source(s)
source priority
license/redistribution constraint
crafting snapshot/version policy
spawn-weight semantic interpretation
eligibility tri-state
spawn weight != probability
crafting data runtime is offline/pinned
CRAFTING_DATA_SCHEMA_VERSION = 1
```

Do not log unverified assumptions.

---

## 105. Required repository checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run explicit crafting-data refresh/validation commands separately.

Run `npm audit` if dependency files change.

---

## 106. Test environment rules

Default `npm test` must not require:

```text
live crafting-data source
PoB2 executable
poe.ninja
GGG credentials
AI keys
```

Tests should use:

```text
stored source fixtures
normalized fixture snapshots
```

---

## 107. Refresh command validation

Document the exact commands used to:

```text
fetch
normalize
validate
diff
promote
```

If fetching from a git repository:

```text
record exact commit
```

If fetching release artifacts:

```text
record exact release/tag/checksum
```

---

## 108. No silent source fallback

If the preferred source is unavailable:

```text
do not silently substitute a different provider
```

Fail with a clear message or require explicit source selection.

Different sources may have different semantics.

---

## 109. Multiple-source reconciliation

If two sources are used:

```text
do not merge conflicting values silently
```

Record:

```text
primary source
secondary/cross-check source
conflict policy
```

Conflict:

```text
warning
or
snapshot blocker
```

depending on whether it affects correctness.

---

## 110. Source-field lineage

Where practical, normalized records should be traceable back to:

```text
source file
source record/id
```

This makes future debugging possible when a mod behaves incorrectly.

---

## 111. Normalization purity

Normalization must be deterministic.

No:

```text
current time inside content hash
random ordering
network-derived unstored lookup
AI
```

Timestamps belong in provenance, not semantic content used for the normalized snapshot checksum.

---

## 112. Translation rendering boundary

A future planner needs readable mod names/text.

STEP-019 may provide deterministic rendering only where the source translation format is correctly implemented.

If not:

```text
show stable mod id + stat ranges
translation unresolved
```

Do not fabricate English mod text.

---

## 113. Crafting planner boundary

STEP-020 may consume STEP-019 to answer:

```text
which desired modifiers are source-pool eligible
on this base
at this item level
```

STEP-019 should make that possible without adding strategy.

---

## 114. Crafting simulation boundary

STEP-021 will require mechanic-specific knowledge such as:

```text
what the currency changes
which pool it samples
whether existing affixes block outcomes
how many affixes can exist
how weights are applied
```

STEP-019 must not pretend generic mod data is enough to simulate those mechanics.

---

## 115. Expected successful result

Conceptually:

```text
Crafting snapshot:
compatible
schema v1
source commit: ...
snapshot sha256: ...

Base:
<stable id>
<name>
<class>
tags: [...]

Item level:
82

Modifier:
<stable mod id>
generation type: prefix
group: ...
required item level: 75
stats:
  <stat id> [min,max]

Spawn-weight rules:
  ordered source rules preserved

Translation:
resolved

Source-pool eligibility:
eligible

Probability:
not calculated
```

---

## 116. Expected partial result

A valid STEP-019 outcome may also be:

```text
base/mod/stat ingestion complete
translations partial
spawn-weight precedence not proven
eligibility partial/unresolved
```

provided:

```text
the uncertainty is explicit
no false crafting probability is produced
STEP-020 readiness is marked partial
```

Do not force a false `ready` result.

---

## 117. STEP-020 readiness

STEP-019 is ready for STEP-020 only when at minimum:

```text
base identity works
modifier identity works
item-level requirements are trustworthy
generation type is trustworthy
mod groups are available where required
stat ranges are preserved
source-pool eligibility can be determined or explicitly unresolved
spawn-weight rules are preserved
dataset provenance/versioning is trustworthy
```

Full probability semantics are **not** required yet.

---

## 118. Roadmap note

The revised project sequence is now:

```text
Phase 5
STEP-018 through STEP-018C.1
COMPLETE / FROZEN

Phase 6
STEP-019
crafting data ingestion

STEP-020
craft target planner

STEP-021
craft simulation
```

Do not create STEP-018D unless a real requirement reopens Phase 5.

---

## 119. Stop condition

After source selection, licensing review, ingestion, normalization, validation, snapshot promotion, representative source checks, tests, and documentation:

**STOP.**

Do not automatically begin:

```text
STEP-020 craft target planner
STEP-021 simulation
trade search
AI crafting advice
```

Wait for explicit review and approval.
