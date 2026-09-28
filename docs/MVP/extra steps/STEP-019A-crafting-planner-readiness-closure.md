# STEP-019A — Crafting planner readiness closure

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 6 / STEP-019A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the remaining readiness gaps between the completed STEP-019 crafting-data ingestion layer and STEP-020 craft target planning.

STEP-019 is already complete as a data-ingestion step.

STEP-019A must **not** redo the crafting dataset.

It must resolve or explicitly gate the issues that currently prevent planner use:

```text
1. crafting snapshot compatibility with the current Buddy game pin is unknown;
2. redistribution/public-repository policy for the full snapshot is blocked/unclear;
3. committed real-record fixtures need an explicit safe policy;
4. translation coverage is partial and the planner needs a defined safe fallback;
5. planner capability/readiness must be expressed as a precise contract.
```

The goal is to determine whether STEP-020 can safely consume the current snapshot.

---

## 2. Current starting point

STEP-019 already provides:

```text
pinned RePoE PoE2 source commit
CRAFTING_DATA_SCHEMA_VERSION = 1
5,496 bases
16,784 modifiers
10,750 English translation rows
base lookup
modifier lookup
gear-to-base resolution
ordered spawn-weight rules
generation-weight separation
item-level gating
tri-state source-pool eligibility
snapshot checksum
refresh/diff/rollback pipeline
offline runtime queries
```

STEP-019 deliberately leaves:

```text
compatibility = unknown
readiness = partial
productionPromoted = false
```

STEP-019A starts from that state.

---

## 3. Core invariant

Hard rule:

```text
planner-ready
!=
dataset-loaded
```

A dataset can be:

```text
parseable
normalized
internally consistent
```

while still being unsafe for a planner because:

```text
game-version compatibility is unproven
source semantics are incomplete
required presentation data is unresolved
redistribution/runtime delivery is unresolved
```

STEP-019A must preserve this distinction.

---

## 4. Acceptance criteria

- [ ] An explicit crafting-snapshot compatibility investigation is completed.
- [ ] Compatibility is decided using evidence, not version-string similarity.
- [ ] The current RePoE snapshot is marked `compatible`, `incompatible`, or remains `unknown` with exact blockers.
- [ ] No mapping is inferred from `4.5.5.2`, `0.5.5`, or PoB2 `0_5` by string resemblance.
- [ ] Representative current-game records are cross-checked against an independent current source where feasible.
- [ ] A planner compatibility gate exists and is tested.
- [ ] The planner gate fails closed for unknown/incompatible snapshots.
- [ ] Redistribution/runtime-delivery policy is explicitly documented.
- [ ] Full upstream exports remain uncommitted unless redistribution is confirmed.
- [ ] Committed fixture policy is reviewed.
- [ ] Real upstream fixture records are either justified/documented or replaced with synthetic/minimal derived fixtures.
- [ ] Tests remain deterministic after any fixture-policy change.
- [ ] Translation readiness is separated from crafting-data correctness.
- [ ] A deterministic fallback for unresolved translations is defined.
- [ ] STEP-020 does not require 100% human-readable translation coverage.
- [ ] Planner-facing readiness is modeled explicitly.
- [ ] STEP-020 required capabilities are enumerated.
- [ ] Unsupported source semantics remain unresolved.
- [ ] Spawn weight remains distinct from probability.
- [ ] No craft recommendation is introduced.
- [ ] No crafting probability is introduced.
- [ ] No craft cost/expected attempts are introduced.
- [ ] No crafting mechanic simulation is introduced.
- [ ] Default tests remain offline.
- [ ] Required repository checks pass.
- [ ] Create:
      `docs/progress/STEP-019A-crafting-planner-readiness-closure.md`

---

## 5. Scope

STEP-019A may change:

```text
crafting-data compatibility metadata
planner compatibility gate
readiness model
fixture policy
test fixtures
translation fallback
source cross-check tooling
manifest/provenance
documentation
decision log
```

STEP-019A must not implement:

```text
craft target optimization
desired-mod scoring
crafting currency behavior
probability math
Monte Carlo
expected cost
trade search
AI crafting advice
```

---

## 6. Compatibility question

The current crafting source identifies itself with:

```text
RePoE export label 4.5.5.2
```

The current Buddy game-data pin is:

```text
GGG passive tree 0.5.5
```

PoB2 uses another namespace:

```text
0_5
```

These are independent version namespaces.

Do not compare them directly.

---

## 7. Compatibility evidence model

Compatibility should be based on concrete evidence such as:

```text
upstream source commit date/version context
game-data identifiers
known current base ids
known current modifier ids
known modifier ranges
known required levels
known tag/spawn-weight records
current PoB2 data references where meaningful
source changelog/release context
```

Version strings may be included as metadata but are not proof.

---

## 8. Compatibility evidence record

Create a structured compatibility record conceptually like:

```text
CraftingCompatibilityEvidence {
  buddyGamePin
  craftingSnapshotId
  sourceCommit
  checkedAt
  checks[]
  conclusion
  unresolved[]
}
```

Each check should state:

```text
subject
expected/current reference
crafting snapshot value
match | mismatch | unresolved
evidence source
```

---

## 9. Compatibility states

Use exactly or conceptually:

```text
compatible
incompatible
unknown
```

### compatible

Sufficient evidence supports planner use for the current Buddy pin.

### incompatible

Concrete mismatch means planner use would be unsafe.

### unknown

Evidence is insufficient.

Do not add:

```text
probably-compatible
likely-current
close-enough
```

as production compatibility states.

---

## 10. Minimum compatibility sample

Cross-check at least a representative sample containing:

```text
one armour base
one weapon base
one jewellery base
one prefix
one suffix
one higher-tier/item-level-gated modifier
one modifier group relation
one spawn-weight example
one zero-weight example
one multi-stat modifier
```

Use stable ids where possible.

---

## 11. Independent cross-check source

Prefer an independent current source already in the project's trusted ecosystem.

Potential evidence sources may include:

```text
current PoB2 data/runtime
another current structured community dataset
GGG-published metadata if available
```

Do not merge independent data into the STEP-019 snapshot merely to make compatibility pass.

This is a cross-check.

---

## 12. Cross-check limitation

If an independent source does not expose:

```text
spawn weights
required item level
mod groups
```

then those dimensions remain unresolved unless another source supports them.

Do not treat:

```text
same mod name exists
```

as proof that all crafting semantics match.

---

## 13. Compatibility decision rule

Define the minimum evidence required to call the snapshot `compatible`.

For example, require:

```text
no sampled hard mismatches
stable-id matches on bases/mods
matching stat identities/ranges for sampled mods
matching required levels where independently available
no evidence the source snapshot predates the current game content
```

Document the exact rule actually adopted.

---

## 14. Compatibility must be scoped

If evidence supports only:

```text
base/mod identity and stat ranges
```

but not:

```text
spawn-weight semantics
```

then compatibility may need to be capability-scoped.

Example:

```text
identityCompatibility = compatible
plannerEligibilityCompatibility = unknown
```

This is preferable to one overly broad `compatible`.

---

## 15. Recommended capability compatibility

Consider a capability matrix:

```text
baseIdentity
modifierIdentity
statRanges
requiredItemLevel
generationType
modGroups
spawnWeightData
translationPresentation
sourcePoolEligibility
```

Each can be:

```text
compatible
incompatible
unknown
```

STEP-020 readiness can then depend only on the capabilities it needs.

---

## 16. Planner compatibility gate

Create a gate conceptually:

```text
requireCraftPlannerReadiness(snapshot)
```

It should verify the exact capability set needed by STEP-020.

Do not reuse a vague generic snapshot-ready boolean.

---

## 17. Fail-closed behavior

If a required planner capability is:

```text
unknown
or
incompatible
```

STEP-020 must not run that feature.

Return a structured readiness result.

Do not silently continue using the dataset.

---

## 18. Planner readiness result

Conceptually:

```text
CraftPlannerReadiness {
  status
  compatibleCapabilities[]
  blockedCapabilities[]
  warnings[]
  snapshotProvenance
}
```

Possible status:

```text
ready
partial
blocked
```

---

## 19. STEP-020 minimum capability set

Define the minimum data STEP-020 requires.

Recommended:

```text
base identity
base class/domain
modifier identity
generation type
affix kind
required item level
modifier groups
stat ids/ranges
source-pool eligibility or explicit unresolved state
deterministic translation fallback
snapshot provenance
```

Spawn-weight numeric probability is not required.

---

## 20. Translation readiness problem

STEP-019 has many unresolved translation rows.

This does not necessarily block planner correctness.

Separate:

```text
semantic identity
```

from:

```text
human-readable rendering
```

A planner can still use stable ids and stat ranges if wording is unresolved.

---

## 21. Translation fallback

Define a deterministic fallback for unresolved translations.

Recommended output:

```text
<modifier source name if trustworthy>
<modifier id>
stat:
  <stat id>: <min>–<max>
translation unresolved
```

For multi-stat mods:

```text
modifier id
stat 1 id/range
stat 2 id/range
...
translation unresolved
```

Do not invent English wording.

---

## 22. Planner display readiness

A modifier may be:

```text
planner-semantic-ready
presentation-partial
```

This should not automatically block STEP-020.

Only block if a planner feature actually requires the missing translation.

---

## 23. Translation capability status

Consider:

```text
resolved
fallback
unrenderable
```

### resolved

Validated source translation exists.

### fallback

Stable id/stat ranges can be shown safely.

### unrenderable

Even stable factual presentation is insufficient.

Do not equate `fallback` with semantic uncertainty.

---

## 24. Fixture redistribution review

STEP-019 correctly blocks committing the full generated export.

Now separately review:

```text
packages/crafting-data/fixtures/source-subset.json
```

because it contains a small selection of real upstream records.

Do not assume:

```text
small fixture
=
automatically safe to redistribute
```

---

## 25. Fixture policy options

Choose and document one policy.

### Option A — synthetic fixtures

Replace raw upstream fixture records with synthetic records that preserve:

```text
schema shapes
zero-weight behavior
ordered rules
multi-stat behavior
ambiguity cases
unknown enum tests
```

Use separate integration/spot-check tooling against the locally downloaded real snapshot.

This is the most conservative repository policy.

### Option B — minimal derived fixture

Commit only the minimal derived normalized facts required for tests, not copied raw source records.

Document derivation and provenance.

### Option C — retain real fixture records

Only if repository policy/licensing review explicitly supports it.

Record the basis.

Do not make unsupported legal claims.

---

## 26. Recommended fixture policy

Prefer:

```text
synthetic/default unit fixtures
+
local real-source validation during refresh
```

This keeps:

```text
normal npm test
```

fully deterministic and repository-safe while preserving real-source verification in explicit refresh validation.

---

## 27. Real-source spot checks

Do not remove real-source validation just because unit fixtures become synthetic.

During:

```text
npm run refresh:crafting-data
```

continue checking selected real records from the downloaded source.

The spot checks can be specified by:

```text
expected ids/fields
```

inside code/config without embedding entire raw source records.

---

## 28. Full-snapshot runtime delivery

The project currently stores the full snapshot locally under:

```text
var/crafting-data/
```

and does not commit it.

Define how development/runtime obtains it.

Recommended MVP policy:

```text
developer explicitly runs refresh command
```

Do not auto-fetch during web startup.

---

## 29. Production delivery decision

STEP-019A must state whether the current architecture supports:

```text
local development only
self-prepared local runtime
server-prepared runtime
redistributed bundled snapshot
```

For any mode not supported, say so explicitly.

Do not leave STEP-020 assuming the dataset magically exists in deployment.

---

## 30. Redistribution block

If redistribution remains blocked/unclear:

```text
production bundle must not contain full upstream snapshot
```

STEP-020 may still proceed for:

```text
local/self-prepared development
```

if that deployment limitation is explicit.

Planner readiness and redistribution readiness are separate dimensions.

---

## 31. Readiness dimensions

Recommended separate fields:

```text
semanticReadiness
plannerReadiness
presentationReadiness
distributionReadiness
```

Do not collapse everything into one `partial`.

---

## 32. Example readiness outcome

A valid result may be:

```text
semanticReadiness: ready
plannerReadiness: ready
presentationReadiness: partial
distributionReadiness: blocked
```

This could allow STEP-020 development while still preventing public bundled deployment.

---

## 33. Spawn-weight semantic review

STEP-019 uses PoB2's first-matching-tag behavior as community evidence.

STEP-019A should explicitly decide whether that is sufficient for STEP-020's planned scope.

STEP-020 only needs:

```text
source-pool eligibility
```

not exact probability.

If first-match semantics are sufficiently supported for that purpose:

```text
mark the capability compatible with evidence
```

Otherwise:

```text
keep sourcePoolEligibility partial/unknown
```

Do not force it.

---

## 34. Generation-weight absence

The current snapshot has zero generation-weight rules.

Determine whether this means:

```text
the current game/source genuinely has none for the relevant item mod pool
```

or:

```text
the source/export does not provide them
```

If this cannot be proven:

```text
generationWeightCapability = unknown
```

Do not interpret absence as universal zero/irrelevance.

---

## 35. Planner effect of generation weights

If STEP-020 does not require generation weights for its initial factual target-planning scope:

```text
document them as non-blocking
```

Do not block STEP-020 on data it does not actually use.

But STEP-021 probability/simulation may require them later.

---

## 36. Domain `undefined` issue

STEP-019 reports many bases with source domain string:

```text
undefined
```

Investigate whether:

```text
undefined
```

is:

```text
a meaningful source value
missing export data
non-craftable base category
or another known source convention
```

Do not mass-map it to `item` without evidence.

---

## 37. Domain capability impact

If `undefined` affects only categories outside STEP-020 MVP target classes:

```text
planner readiness may still be ready for a scoped subset
```

Example:

```text
supported planner classes:
armour
weapons
jewellery
```

If so, define that subset explicitly.

---

## 38. Scoped planner support

STEP-020 does not need to support every PoE2 item class on day one.

A valid planner-ready scope may be:

```text
supported base classes
supported domains
supported generation types
```

Everything else returns:

```text
unsupported / unresolved
```

This is better than blocking the entire planner.

---

## 39. Supported-class manifest

If planner scope is restricted, create a manifest/list such as:

```text
PLANNER_SUPPORTED_ITEM_CLASSES
```

with source-backed reasoning.

Do not derive support from UI convenience.

---

## 40. Planner-safe base resolution

For every planner-supported class, verify:

```text
gear normalized base
→ exact crafting base
```

using representative real examples.

Ambiguous or not-found results remain blocked for that item.

---

## 41. Modifier presentation fallback test

Add tests where:

```text
translation unresolved
```

but:

```text
modifier id
stat ids
ranges
```

exist.

Expected:

```text
planner-safe fallback presentation
```

No guessed text.

---

## 42. Capability matrix tests

Add tests for:

```text
all required capabilities compatible → planner ready
one required capability unknown → blocked/partial
optional presentation capability unknown → planner may remain ready
distribution blocked → planner development still allowed if explicitly configured
```

---

## 43. Version mismatch test

Create a fixture or manifest with:

```text
different crafting snapshot/version mapping
```

Expected:

```text
planner compatibility fails closed
```

Do not rely only on production constants.

---

## 44. Evidence regression tests

Where compatibility evidence is represented structurally, tests should verify:

```text
missing required check prevents compatible status
hard mismatch produces incompatible
all required checks satisfied can produce compatible
```

---

## 45. Fixture policy regression

If switching to synthetic fixtures:

```text
npm test
```

must no longer depend on copied raw upstream records.

Refresh/spot-check tests may still use the local real source snapshot.

---

## 46. Local snapshot missing behavior

If STEP-020 development starts without:

```text
var/crafting-data/snapshot.json
```

return:

```text
snapshot-unavailable
```

with the exact setup command.

Do not auto-download silently.

---

## 47. Setup UX

Provide a concise developer setup message such as:

```text
Crafting data is not prepared.
Run:
npm run refresh:crafting-data
```

No automatic network call from runtime.

---

## 48. Snapshot integrity

Retain:

```text
normalized snapshot checksum
raw source checksums
source commit
schema version
```

and verify the snapshot before planner use.

A modified local snapshot must not silently pass.

---

## 49. Planner provenance

Every future STEP-020 planner result should be able to include:

```text
crafting snapshot checksum
schema version
source commit
compatibility decision/version
supported planner scope
```

STEP-019A should expose this provenance cleanly.

---

## 50. Compatibility decision version

Introduce a version or id for the compatibility mapping/policy.

Conceptually:

```text
CRAFTING_COMPATIBILITY_POLICY_VERSION = 1
```

or embed the mapping version in the manifest.

This allows later compatibility conclusions to change explicitly.

---

## 51. No silent compatibility expansion

If a future source refresh introduces:

```text
new domain
new generation type
new item class
new eligibility rule shape
```

do not automatically extend STEP-020 support.

Require a reviewed mapping update.

---

## 52. Dataset refresh interaction

After STEP-019A, a new crafting-data refresh should produce:

```text
normalized snapshot
compatibility evaluation
planner readiness evaluation
distribution readiness
diff
```

A new snapshot must not inherit the old compatibility result automatically unless the policy explicitly proves equivalence.

---

## 53. Promotion states

Recommended distinction:

```text
normalized
validated
planner-approved
distribution-approved
```

A snapshot can be:

```text
normalized + validated
```

without being:

```text
planner-approved
```

or:

```text
distribution-approved
```

---

## 54. ProductionPromoted meaning

Clarify or replace the existing `productionPromoted` boolean if it conflates:

```text
planner correctness
```

with:

```text
redistribution/deployment permission
```

Prefer separate fields.

---

## 55. Licensing/redistribution documentation

Document facts only:

```text
source repository license metadata
parent RePoE license wording
current project policy
what files are committed
what files are local-only
```

Do not state:

```text
legally allowed
legally prohibited
```

unless the repository/license clearly establishes that.

Use wording such as:

```text
redistribution not approved by project policy
```

where appropriate.

---

## 56. Source attribution

Preserve attribution in:

```text
manifest
documentation
refresh output
```

Do not expose it on every planner row unless product design later requires it.

---

## 57. No source substitution

If RePoE becomes unavailable:

```text
do not silently fetch a different crafting dataset
```

A new provider requires a new compatibility/source decision.

---

## 58. Translation completeness report

Keep counts such as:

```text
resolved
fallback-capable
unrenderable
```

instead of only:

```text
resolved / unresolved
```

This better reflects STEP-020 usability.

---

## 59. Planner-target translation requirement

STEP-020 should be allowed to target a modifier when:

```text
stable id known
stat ids/ranges known
eligibility facts sufficient
presentation fallback safe
```

A polished English translation is optional.

---

## 60. No target intent inference

STEP-019A still must not decide:

```text
which mod the user should want
```

It only determines whether the crafting dataset is safe enough for STEP-020 to make explicit target plans.

---

## 61. No probability math

Do not add:

```text
weight / sum(weights)
```

or any attempt count.

STEP-019A is readiness closure only.

---

## 62. No currency mechanics

Do not implement:

```text
Exalted Orb behavior
Chaos Orb behavior
Essence behavior
Omen behavior
```

STEP-020 may begin with target eligibility before mechanic planning.

Mechanic semantics belong to dedicated later work.

---

## 63. No crafting UI requirement

No production craft planner UI is required in STEP-019A.

A debug/readiness view or CLI is optional.

---

## 64. Optional readiness CLI

A useful command may be:

```text
npm run crafting:readiness
```

Output example:

```text
Snapshot: sha256:...
Semantic readiness: ready
Planner readiness: ready
Presentation readiness: partial
Distribution readiness: blocked

Supported planner classes:
Body Armour
Helmet
Gloves
Boots
Wand
Focus
Ring
Amulet
Belt
...
```

Only print classes actually approved.

---

## 65. Compatibility report artifact

Generate a deterministic report such as:

```text
docs/data-snapshots/crafting/compatibility.json
```

or equivalent.

It should not contain volatile timestamps in semantic hashes if used as a compatibility identity.

---

## 66. Evidence report documentation

The progress doc should include representative compatibility checks with:

```text
id
field
crafting snapshot
comparison source
result
```

No vague statement like:

```text
looks current
```

---

## 67. Planner readiness blockers

If STEP-019A ends blocked, list exact blockers.

Examples:

```text
required item-level semantics cannot be independently verified
spawn-weight first-match behavior insufficiently supported
supported item classes cannot be scoped safely
```

Do not say only:

```text
more research needed
```

---

## 68. Ready outcome

STEP-019A may conclude:

```text
STEP-020 READY FOR SCOPED DEVELOPMENT
```

even if:

```text
translation presentation remains partial
distribution remains blocked
```

provided those limitations do not invalidate local deterministic planner development.

---

## 69. Blocked outcome

STEP-019A must conclude:

```text
STEP-020 BLOCKED
```

if any required semantic capability remains unknown.

Do not create STEP-020 just because the dataset exists.

---

## 70. Required source checks

At minimum verify and document:

```text
source repository/commit still exists
manifest/source checksums match
selected representative ids still match local snapshot
PoB2 cross-check evidence used by spawn-weight interpretation
```

If using web research, cite exact current sources in the progress note.

---

## 71. Offline default tests

`npm test` must not require:

```text
GitHub
RePoE network
PoB2 executable
poe.ninja
GGG credentials
AI
```

Use synthetic/derived fixtures according to the chosen fixture policy.

---

## 72. Explicit research commands

Any live compatibility/source verification command should be separate from:

```text
npm test
```

Document exact commands.

---

## 73. Required repository checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run explicit crafting readiness/source validation separately.

Run:

```bash
npm audit
```

only if dependency files change.

---

## 74. Documentation

Create:

```text
docs/progress/STEP-019A-crafting-planner-readiness-closure.md
```

Include:

```text
Why STEP-019A Exists
Current STEP-019 Snapshot
Compatibility Question
Compatibility Evidence Model
Independent Cross-Checks
Capability Compatibility Matrix
Planner Minimum Capabilities
Planner Compatibility Gate
Supported Planner Scope
Domain Undefined Investigation
Spawn-Weight Semantic Review
Generation-Weight Absence
Translation Readiness
Translation Fallback
Fixture Redistribution Review
Chosen Fixture Policy
Local Snapshot Delivery
Production Distribution Policy
Readiness Dimensions
Snapshot Integrity
Refresh Interaction
Planner Provenance
Compatibility Policy Version
Source Attribution
Security / Privacy
Tests
Known Limitations
Final STEP-020 Readiness
```

---

## 75. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only for durable conclusions such as:

```text
crafting snapshot compatibility decision
capability-scoped compatibility
supported STEP-020 item classes/domains
fixture policy
translation fallback policy
distribution policy
planner readiness gate
compatibility policy version
```

Do not record assumptions as facts.

---

## 76. Security/privacy

No user data is involved in compatibility research.

Do not upload:

```text
user PoB builds
user items
user credentials
```

to source providers.

Source refresh remains public-data only.

---

## 77. Performance

Compatibility evaluation should run:

```text
during explicit refresh/readiness validation
```

not on every planner request.

Runtime STEP-020 should consume the already-approved compatibility/readiness record.

---

## 78. Expected ready result

Conceptually:

```text
Crafting snapshot:
sha256:...

Schema:
v1

Semantic readiness:
ready

Planner readiness:
ready

Presentation readiness:
partial

Distribution readiness:
blocked

Compatibility:
supported for scoped STEP-020 planner classes

Translation:
resolved where available
stable id/stat fallback elsewhere

Probability model:
not implemented

Craft mechanics:
not implemented
```

This is sufficient to begin STEP-020 local/scoped development.

---

## 79. Expected blocked result

Conceptually:

```text
Semantic readiness:
partial

Planner readiness:
blocked

Blocker:
source-pool eligibility compatibility could not be established

Presentation readiness:
partial

Distribution readiness:
blocked

STEP-020:
do not start
```

This is also a valid STEP-019A completion.

---

## 80. STEP-020 gate

Proceed to STEP-020 only if:

```text
plannerReadiness = ready
```

for an explicitly documented scope.

It is acceptable for:

```text
presentationReadiness = partial
distributionReadiness = blocked
```

if STEP-020 is clearly local/development-only and has deterministic fallback output.

---

## 81. Roadmap state

Current roadmap:

```text
Phase 5
STEP-018 → STEP-018C.1
COMPLETE / FROZEN

Phase 6
STEP-019
COMPLETE

STEP-019A
planner readiness closure

STEP-020
craft target planner
BLOCKED until STEP-019A decision

STEP-021
craft simulation
later
```

---

## 82. Stop condition

After compatibility evidence, planner capability gating, fixture/distribution policy, translation fallback, tests, and documentation are complete:

**STOP.**

Do not automatically begin STEP-020.

Return one explicit final status:

```text
STEP-020 READY FOR SCOPED DEVELOPMENT
```

or:

```text
STEP-020 BLOCKED
```

with exact reasons.
