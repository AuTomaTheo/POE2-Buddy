# STEP-016.5C — Real-export normalization corrections

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 4 / STEP-016.5C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Correct the normalization discrepancies exposed by real Path of Building 2 exports in STEP-016.5B.

The real PoB2 0.23.1 fixtures proved that the import pipeline is faithful enough to expose several semantic mismatches in our own normalization layer.

STEP-016.5C must fix all currently known real-export normalization discrepancies:

```text
1. Ascendancy nodes must not remain inside shared/main-tree allocation.

2. Real user configuration stored under:
   Config
     -> ConfigSet
       -> Input
   must be parsed and preserved.

3. PoB treeVersion and the active GGG snapshot version must not be treated
   as equivalent version strings or cause misleading partial-readiness
   merely because their textual formats differ.
```

This is a normalization-correction step.

Do not implement PoB2 calculations.

Do not implement character-aware scoring.

Do not change passive heuristic weights or ranking behavior.

---

## 2. Why this step exists

STEP-016.5B validated the importer against actual PoB2 0.23.1 export strings.

That validation surfaced concrete discrepancies:

### Discrepancy A — Ascendancy nodes

A real Witch/Infernalist export includes node:

```text
32699
```

alongside the Witch start and shared passive ids.

That node is an Infernalist ascendancy start and must not be treated as a normal/shared main-tree allocation.

### Discrepancy B — Configuration shape

Real PoB2 saves user-edited configuration as:

```text
Config
  -> ConfigSet
    -> Input
```

while the importer currently looks for:

```text
Config
  -> Input
```

and therefore misses real user configuration.

### Discrepancy C — Version semantics

Real PoB2 emits a tree key such as:

```text
0_5
```

while PoE2 Buddy's active official GGG tree pin is:

```text
0.5.5
```

These are different version namespaces/representations.

Direct text comparison is not a valid compatibility rule.

Passive-id compatibility must remain authoritative.

---

## 3. Acceptance criteria

- [ ] Ascendancy passive ids are separated from shared/main-tree allocations.
- [ ] Ascendancy ids are preserved rather than discarded.
- [ ] Shared/main-tree allocation contains only nodes valid for the main tree.
- [ ] Weapon-set allocation remains separate and unchanged.
- [ ] Existing ascendancy name/class context remains preserved.
- [ ] Real fixture A no longer places Infernalist start node 32699 in `allocatedPassiveIds`.
- [ ] Real fixture D still keeps set1/set2/set3 allocations separate.
- [ ] `ConfigSet/Input` values from real PoB2 exports are parsed.
- [ ] Existing direct `Config/Input` parsing remains supported only if it is still a legitimate supported shape.
- [ ] Placeholder/default entries are not mistaken for user-entered configuration.
- [ ] Configuration values retain raw key/value/source information.
- [ ] PoB treeVersion is preserved exactly as emitted.
- [ ] Active GGG snapshot version is preserved independently.
- [ ] PoB treeVersion textual mismatch alone does not make an otherwise compatible import partial.
- [ ] Unknown passive ids still make the import incompatible.
- [ ] Tree-version/source information remains visible in diagnostics.
- [ ] The import readiness model remains deterministic.
- [ ] Normalization version is incremented because normalized semantics change.
- [ ] Existing passive heuristic outputs remain unchanged for equivalent main-tree allocations.
- [ ] Existing PoB2 security behavior remains unchanged.
- [ ] Existing real fixtures continue to pass.
- [ ] Add a real or faithful configuration fixture that exercises `ConfigSet/Input`.
- [ ] Required repository checks pass.
- [ ] Create:
      `docs/progress/STEP-016-5C-real-export-normalization-corrections.md`

---

## 4. Scope

STEP-016.5C may change:

```text
PoB2 normalization
ascendancy allocation separation
configuration parsing
import readiness rules
tree-version diagnostics
PoB2 normalization version
real/synthetic fixtures
analysis summary text
documentation
```

STEP-016.5C must not change:

```text
path search
heuristic scoring weights
Top-K ordering
PoB2 calculation engine
gear scoring
GGG OAuth
poe.ninja adapter
AI interpretation
```

---

## 5. Ascendancy allocation correction

The importer must not treat ascendancy nodes as ordinary shared/main-tree allocations.

Conceptually normalize PoB2 passive ids into:

```text
mainTreeAllocatedPassiveIds
weaponSetSpecialisations
ascendancyPassiveIds
```

The exact domain representation may differ.

The key invariant is:

```text
ascendancy node
!=
main-tree allocated node
```

---

## 6. How to identify ascendancy nodes

Use the already loaded official GGG passive-tree snapshot and its normalized node metadata.

Prefer deterministic metadata such as:

```text
isAscendancyStart
ascendancy-related node kinds/flags already represented by the domain
```

Do not classify ascendancy nodes by:

```text
name text
position
id ranges
hard-coded node ids
class name guessing
```

Reuse existing tree metadata and engine/domain rules.

---

## 7. Preserve ascendancy ids

Do not drop ascendancy ids merely because the current main-tree optimizer does not use them.

Preserve them in provider/domain context when practical.

Conceptually:

```text
ascendancy:
  name: Infernalist
  allocatedPassiveIds:
    - 32699
    - ...
```

If the existing domain schema does not have a safe field for ascendancy allocation:

```text
extend it deliberately
```

or preserve the ids in PoB2 provider/import metadata until a justified shared domain field exists.

Do not silently discard them.

---

## 8. Main-tree optimizer boundary

The current passive optimizer remains main-tree-only.

Therefore:

```text
recommendMainTreePaths
```

must receive only valid main-tree/shared allocation.

Ascendancy ids must not affect:

```text
connectivity checks
origin allocation
candidate path enumeration
point budget
heuristic scoring
```

Add a regression test proving this.

---

## 9. Real-fixture ascendancy correction

Fixture A currently contains:

```text
54447 Witch class start
32699 Infernalist ascendancy start
```

After STEP-016.5C, expected normalization should be conceptually:

```text
shared/main tree:
  54447

ascendancy:
  32699
```

Fixture D shared nodes should similarly exclude ascendancy-only ids.

Do not modify the original real export codes.

Only correct normalization.

---

## 10. Ascendancy compatibility

Validate preserved ascendancy ids against the active snapshot.

If an ascendancy id is unknown:

```text
preserve id
report it
mark import incompatible or incomplete according to existing unknown-node policy
```

Do not ignore unknown ascendancy ids simply because the main-tree optimizer does not score them.

Unknown imported passive ids remain a compatibility concern.

---

## 11. Real PoB2 configuration shape

STEP-016.5B observed that real PoB2 0.23.1 stores configuration under:

```text
Config
  -> ConfigSet
    -> Placeholder
    -> Input
```

Update the provider parser to traverse real `ConfigSet` structures.

Do not assume `Input` is a direct child of `Config`.

---

## 12. Configuration parsing

For each real user `Input`, preserve as available:

```text
name/key
string value
boolean value
numeric value
source section / ConfigSet identity if useful
```

Do not interpret game meaning in this step.

Configuration remains raw deterministic context.

---

## 13. Placeholder policy

Do not treat:

```text
Placeholder
```

as an active user configuration value unless PoB2 semantics clearly require that.

Preserve placeholder/default metadata only if useful for debugging.

The user configuration summary should distinguish:

```text
actual Input values
placeholder/default entries
```

Do not inflate configuration counts using placeholders.

---

## 14. Multiple ConfigSets

If PoB2 can save multiple `ConfigSet` elements, preserve enough identity to avoid merging unrelated configuration blindly.

Conceptually:

```text
configSets:
  - id/name
    inputs: [...]
```

If only one active set is semantically relevant and PoB2 provides an active selector, use that deterministic selector.

If selection is ambiguous:

```text
preserve sets
mark selection unresolved
```

Do not guess.

---

## 15. Backward compatibility for configuration shape

If existing valid PoB2 exports legitimately use:

```text
Config/Input
```

keep support where justified.

Do not preserve an obsolete path merely because synthetic fixtures used it.

Use evidence from:

```text
real current export
current/known older supported save shape
```

Document whichever shapes remain supported.

---

## 16. Add a configuration fidelity fixture

Add at least one PoB2 fixture with actual user-edited configuration.

Preferred:

```text
create small build in PoB2
change one or more configuration inputs
Generate export
record truth values
```

Use the real PoB2 Generate path if practical.

The test should prove:

```text
ConfigSet/Input
→ importer configuration result
```

without synthetic XML assumptions.

---

## 17. Configuration truth record

For the configuration fixture, record manually:

```text
PoB2 version
ConfigSet identity if present
input names
input values
input types where visible
```

Expected importer output must be derived from PoB2, not from current importer behavior.

---

## 18. Configuration readiness impact

Missing configuration must not make tree-only passive analysis incompatible.

Configuration availability may affect contextual readiness only.

Conceptually:

```text
tree compatible
configuration unavailable
→ partial contextual import
→ passive analysis still allowed
```

Do not alter passive heuristic score based on config in this step.

---

## 19. Tree-version semantics correction

Treat:

```text
PoB treeVersion
```

and:

```text
GGG snapshot version
```

as distinct provenance fields.

Do not compare them as if they belong to the same semantic version namespace.

Example:

```text
PoB tree key:
  0_5

GGG pin:
  0.5.5
```

This should not automatically create a compatibility warning solely due to string inequality.

---

## 20. Authoritative compatibility signal

Passive-id validation is authoritative.

Conceptually:

```text
all imported node ids recognized
→ structurally compatible with active pin

unknown imported node ids
→ incompatible
```

PoB treeVersion may still be shown for provenance and diagnostics.

Do not rewrite:

```text
0_5
```

into:

```text
0.5.5
```

and do not claim they are equal.

---

## 21. Tree-version diagnostic model

Recommended diagnostic shape:

```text
pobTreeVersion: "0_5"
activeGggTreeVersion: "0.5.5"

nodeCompatibility:
  known: true

versionRelationship:
  namespace: different
  comparedDirectly: false
```

Exact type names may differ.

The important rule is:

```text
version provenance visible
without fake equivalence
```

---

## 22. Import readiness correction

Update readiness so an import is not `partial` merely because:

```text
pobTreeVersion !== activeGggTreeVersion
```

when all passive ids are known.

A build may still be partial for other reasons:

```text
missing equipment
missing config
unresolved main skill
unknown skill roles
missing ascendancy context
```

Keep those rules explicit.

---

## 23. Real-fixture readiness regression

After the version comparison correction, reassess fixtures A–D.

Document why each becomes:

```text
compatible
partial
incompatible
```

Do not force all fixtures to compatible.

For example, fixture A may still be partial due to:

```text
no equipment
no configuration
```

but no longer because `0_5` differs textually from `0.5.5`.

---

## 24. Normalization version

Increment:

```text
POB2_NORMALIZATION_VERSION
```

because the same PoB2 source will now normalize differently:

```text
ascendancy separation
configuration shape
version/readiness semantics
```

Recommended:

```text
2 → 3
```

unless the repository's versioning convention requires another value.

Document the reason.

---

## 25. Source checksum remains unchanged

Do not change source checksum semantics.

The same real PoB2 export must retain the same:

```text
sha256(decoded/inflated source)
```

before and after normalization version 3.

This distinguishes:

```text
source identity
```

from:

```text
normalization interpretation
```

---

## 26. Domain-model changes

Use the smallest justified domain change.

Potential additions may include:

```text
ascendancyAllocatedPassiveIds
configurationSets
providerTreeVersion metadata
```

Do not create fields merely for convenience.

If data is provider-specific and not yet useful globally, it may remain in the PoB2 import result rather than polluting shared domain types.

Document the chosen boundary.

---

## 27. Existing weapon-set behavior

Do not alter the already validated mapping:

```text
WeaponSet1 → set1
WeaponSet2 → set2
WeaponSet3 → set3
```

Shared/main-tree allocation after ascendancy removal must still exclude all weapon-set ids.

Add regression coverage using real Fixture D.

---

## 28. Existing skill-role behavior

Do not alter STEP-016.5A display-list semantics unless a new real fixture proves a bug.

Preserve:

```text
mainActiveSkill → display-list index
support only from deterministic checked facts
unknown skill ids → unresolved
```

This step is not a skill-role refactor.

---

## 29. Existing item behavior

Do not alter item normalization unless required by the configuration fixture or another real-export correction directly related to this step.

Raw item modifier preservation remains unchanged.

---

## 30. Security guarantees remain unchanged

Preserve:

```text
raw-code-only import
no remote URL fetch
1 MiB decompression cap
DOCTYPE rejection
ENTITY rejection
server-side parsing
no raw XML HTML rendering
```

Configuration parsing must not introduce dynamic code execution.

Treat config names/values as untrusted text.

---

## 31. Required tests — ascendancy

Add tests for at least:

- real Fixture A removes 32699 from shared/main-tree allocation;
- 32699 remains preserved in ascendancy context;
- main-tree optimizer no longer receives 32699;
- unknown ascendancy id is reported;
- Fixture D still preserves shared/set1/set2/set3 separation;
- class start remains in shared allocation when appropriate;
- passive heuristic result reflects only main-tree allocation.

---

## 32. Required tests — configuration

Add tests for at least:

- real `ConfigSet/Input` string value;
- boolean value if supported by PoB2;
- numeric value if supported by PoB2;
- placeholder is not counted as active user config;
- multiple ConfigSets preserved or selected deterministically;
- direct `Config/Input` supported only if intentionally retained;
- malformed Input does not crash import;
- configuration does not affect passive heuristic.

---

## 33. Required tests — version semantics

Add tests for at least:

- PoB `0_5` + GGG `0.5.5` + all ids known does not warn solely for text mismatch;
- PoB version is still preserved;
- GGG pin version is still preserved;
- unknown passive id still makes import incompatible;
- same source checksum before/after normalization version change;
- readiness no longer depends on direct version-string equality.

---

## 34. Full regression suite

Preserve and rerun:

```text
real export A–D
skill-role tests
synthetic decode/security tests
fixture analysis
GGG provider tests
passive-engine tests
scoring-engine tests
```

Current scoring results for equivalent main-tree allocations must remain unchanged.

---

## 35. Browser verification

Use at least one real PoB2 export in the analysis screen.

Verify the summary now shows provenance clearly, for example:

```text
PoB tree key: 0_5
Active GGG tree: 0.5.5
Passive ids: compatible
```

without implying a false version mismatch.

Also verify:

```text
ascendancy context shown/preserved
main-tree analysis still runs
configuration summary reflects real Input values when present
```

---

## 36. UI wording

Avoid wording such as:

```text
Tree version mismatch
```

when the only difference is:

```text
0_5
vs
0.5.5
```

Prefer:

```text
PoB tree key: 0_5
Active GGG data version: 0.5.5
All imported passive ids recognized
```

Only use incompatibility language when actual passive ids fail validation or another real incompatibility exists.

---

## 37. Documentation correction

Correct the STEP-016.5B progress header if it still says:

```text
Phase 2 / STEP-016.5B
```

to:

```text
Phase 4 / STEP-016.5B
```

This is a documentation-only correction.

Do not rewrite historical technical results.

---

## 38. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions:

```text
ascendancy ids separated from main-tree allocation
ConfigSet/Input is the real current configuration path
placeholder/default policy
PoB treeVersion and GGG version are distinct namespaces
node-id validation is authoritative for tree compatibility
normalization version 3
```

---

## 39. Completion document

Create:

```text
docs/progress/STEP-016-5C-real-export-normalization-corrections.md
```

In addition to normal progress sections, explicitly include:

```text
Ascendancy Allocation Problem
Ascendancy Identification Rule
Domain / Provider Storage Decision
Real Fixture A Before / After
Weapon-Set Regression
Real ConfigSet Shape
Configuration Parsing Rules
Configuration Fixture Truth Record
Placeholder Policy
Tree-Version Namespace Decision
Node-ID Compatibility Rule
Readiness Changes
Normalization Version
Checksum Stability
Browser Verification
Scoring Regression
Remaining PoB2 Import Risks
PoB2 Calculation-Engine Status
```

---

## 40. Non-goals

Do not implement:

- PoB2 calculation engine;
- character-aware scoring;
- exact DPS/EHP;
- gear upgrade ranking;
- crafting;
- support applicability calculations;
- broad gem-data ingestion;
- pobb.in fetching;
- GGG changes;
- poe.ninja changes;
- AI interpretation;
- automatic passive migration between game versions.

---

## 41. Expected result

After STEP-016.5C, a real PoB2 import should normalize conceptually like:

```text
source:
  pob2

PoB tree key:
  0_5

active GGG tree:
  0.5.5

main-tree passives:
  [...]

weapon-set passives:
  set1 [...]
  set2 [...]
  set3 [...]

ascendancy:
  Infernalist
  passives [...]

configuration:
  actual ConfigSet/Input values [...]

passive compatibility:
  all ids known / unknown ids listed

readiness:
  based on actual data completeness
  NOT direct version-string equality
```

The current passive optimizer should receive only:

```text
main-tree allocation
```

plus its existing valid weapon-set context where applicable.

It must not receive ascendancy nodes as ordinary shared allocations.

---

## 42. MVP readiness target

After this step, the PoB2 importer should be considered ready to freeze as the MVP build-ingestion layer for:

```text
real PoB2 code import
tree-only passive analysis
future character-context work
```

provided no new blocker is found during review.

This does not mean:

```text
PoB2 exact calculations are implemented
```

or:

```text
character-aware scoring is implemented
```

Those remain separate future work.

---

## 43. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run:

```bash
npm audit
```

only if dependency files changed.

Default tests must not require:

```text
network access
GGG credentials
running PoB2 application
```

Real fixture generation may be a manual/development-only action, but committed tests must use stored fixtures.

---

## 44. Stop condition

After implementation, regression tests, real-config validation, browser verification, and documentation are complete:

**STOP.**

Do not automatically start:

```text
PoB2 calculation engine
character-aware scoring
STEP-017
```

Wait for explicit review and approval.
