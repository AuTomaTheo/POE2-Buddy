# STEP-016.5A — PoB2 skill-role fidelity

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 4 / STEP-016.5A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Correct and validate PoB2 skill-role interpretation introduced in STEP-016.5.

The importer currently preserves PoB2 skill groups, but its interpretation of:

```text
Skill@mainActiveSkill
```

must not assume that value is a 1-based index into the raw `<Gem>` list.

STEP-016.5A must align the importer with PoB2's actual skill-selection model and ensure that:

```text
main skill
active skill
support relationships
```

are either:

```text
deterministically resolved
```

or:

```text
explicitly unresolved
```

Never guessed.

This is a narrow fidelity/hardening step.

Do not implement the PoB2 calculation engine.

Do not implement character-aware scoring.

---

## 2. Why this step exists

STEP-016.5 currently treats the selected PoB2 active skill too simplistically.

PoB2 stores:

```text
mainActiveSkill
mainActiveSkillCalcs
```

on a skill group, but `mainActiveSkill` represents an entry in PoB2's active/display skill list, not necessarily the same position as the raw `<Gem>` list.

Therefore this assumption is unsafe:

```text
mainActiveSkill = raw gem index
```

Likewise, this assumption is unsafe:

```text
all other gems = supports
```

A wrong main-skill or support classification would contaminate future character-aware scoring.

---

## 3. Acceptance criteria

- [ ] `mainActiveSkill` is no longer interpreted as a raw `<Gem>` index unless proven equivalent for that group.
- [ ] The importer preserves PoB2's raw skill-group data needed for later resolution.
- [ ] The importer distinguishes raw gems from resolved active-skill entries.
- [ ] Main skill is resolved only when deterministic evidence exists.
- [ ] Otherwise `mainSkill.resolved` remains false.
- [ ] Supports are marked as supports only when deterministically supported by PoB2 data/metadata.
- [ ] A non-selected gem is not automatically classified as a support.
- [ ] Unknown/ambiguous gem roles remain explicit.
- [ ] Existing skill-group ordering is preserved.
- [ ] Existing passive-tree import behavior is unchanged.
- [ ] Existing item/config import behavior is unchanged.
- [ ] Existing scoring behavior is unchanged.
- [ ] At least several real current PoB2 exports are used as fidelity fixtures.
- [ ] Real fixtures include at least one multi-skill or ambiguous-active-skill case.
- [ ] Tests compare importer interpretation against what PoB2 itself displays for those fixtures.
- [ ] Synthetic fixtures remain allowed for edge/error cases.
- [ ] Required repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-016-5A-pob2-skill-role-fidelity.md`

---

## 4. Scope

STEP-016.5A may change:

```text
PoB2 skill-group provider model
main-skill resolution
active-skill representation
support-role representation
skill-related normalization
skill-related tests
real PoB2 fixture coverage
import diagnostics
```

STEP-016.5A must not change:

```text
passive path search
heuristic score formula
weight profiles
Top-K ranking
PoB2 item scoring
PoB2 calculation engine
GGG OAuth
poe.ninja integration
```

---

## 5. Preserve raw skill-group structure

The provider-specific PoB2 model must preserve enough source information to avoid lossy role inference.

At minimum retain, where present:

```text
Skill group id
label
slot
enabled state
mainActiveSkill
mainActiveSkillCalcs
raw ordered Gem entries
active SkillSet identity
weapon-set association
```

Each raw gem should preserve at least:

```text
name
skill id
level
quality
enabled state
any role/type metadata explicitly available
```

Do not throw away fields needed to understand PoB2's own active-skill selection.

---

## 6. Separate raw gems from active-skill entries

Conceptually distinguish:

```text
raw gems
```

from:

```text
resolved active/display skills
```

Do not model them as the same list unless the implementation can prove a 1:1 relationship for the specific input.

A skill group may therefore contain:

```text
rawGems: [...]
activeSkills: [...]
```

or an equivalent representation.

The exact TypeScript shape may differ.

---

## 7. `mainActiveSkill` policy

Do not interpret:

```text
mainActiveSkill = N
```

as:

```text
Gem[N]
```

by default.

Instead:

```text
mainActiveSkill
→ identify active/display-skill entry N
→ resolve its source gem/effect only if deterministically possible
```

If the importer cannot reconstruct PoB2's active/display skill list from available export data:

```text
main skill = unresolved
```

That is preferable to guessing.

---

## 8. `mainActiveSkillCalcs`

Preserve `mainActiveSkillCalcs` if present.

Do not assume it has the same meaning as `mainActiveSkill`.

If its exact semantics are not required for current import:

```text
preserve raw value
mark unsupported for interpretation
```

Do not invent meaning.

---

## 9. Support-role policy

Do not classify a gem as a support solely because:

```text
it is not the selected active gem
```

A gem may be:

```text
active
support
meta
trigger
unknown
other
```

depending on PoB2/game metadata.

Only classify:

```text
support
```

when deterministic evidence exists.

If proper metadata is not yet available:

```text
role = unknown
```

Preserve the gem in its skill group.

---

## 10. No character-wide support flattening

Do not create a global list that loses group relationships.

Support information must remain tied to the group/active skill it modifies.

Conceptually:

```text
SkillGroup
  activeSkill(s)
  supportGems
  unknownRoleGems
```

If the active skill is unresolved, the relationship may also remain unresolved.

---

## 11. Main-skill resolution result

Expose an explicit result.

Conceptually:

```text
mainSkill:
  resolved: boolean
  skillId?: string
  name?: string
  groupId?: string
  sourceGemIndex?: number
  reason?: string
```

Possible unresolved reasons:

```text
missing-main-socket-group
missing-main-active-skill
active-skill-index-out-of-range
active-display-list-not-reconstructable
ambiguous-active-effect
unsupported-skill-shape
```

Exact enum names may differ.

---

## 12. Build readiness impact

STEP-016.5 currently uses:

```text
compatible
partial
incompatible
```

for PoB2 import readiness.

Preserve that model unless a concrete bug requires change.

A build whose tree is compatible but whose main skill is unresolved should generally be:

```text
partial
```

not:

```text
incompatible
```

because tree-only analysis may still run.

Do not block passive-tree analysis merely because skill roles are unresolved.

---

## 13. Existing tree analysis must remain unchanged

Hard invariant:

```text
PoB2 skill-role hardening
must not change
passive-only heuristic results
```

For an equivalent passive allocation, the same:

```text
candidate paths
heuristicScore
Top-K split
search completeness
```

must remain unchanged.

Add a regression test.

---

## 14. Real PoB2 fixture requirement

STEP-016.5 used synthetic XML fixtures.

STEP-016.5A must add **real current PoB2-generated exports**.

Create/import builds directly in current Path of Building 2 and save their generated export codes as test fixtures.

Do not use private player/account data.

Fixtures may be deliberately small test builds.

Document:

```text
PoB2 version/commit if known
build purpose
expected skill-group interpretation
expected selected main skill
expected support relationships
```

---

## 15. Required real fixture cases

Add at minimum:

### Fixture A — Simple active + supports

A build with:

```text
one active skill
multiple true support gems
```

Expected:

```text
main skill resolved
supports resolved
```

### Fixture B — Multiple skill groups

A build with:

```text
multiple enabled groups
explicit main socket group
```

Expected:

```text
correct group selected
other groups preserved
```

### Fixture C — Multiple active effects or non-trivial mainActiveSkill

A build where PoB2's active/display skill list is not trivially equivalent to raw gem order.

Expected:

```text
importer does not use raw gem index blindly
```

This fixture is mandatory because it validates the bug this step exists to fix.

### Fixture D — Ambiguous/unresolved role

A valid PoB2 build where the importer cannot safely reconstruct active/support roles.

Expected:

```text
tree import succeeds
main skill unresolved
role ambiguity preserved
status partial
```

---

## 16. Fixture provenance

For every real PoB2 fixture, document provenance.

Example:

```text
Generated locally with Path of Building 2
No account data
No copied community build
Created only for parser validation
```

Do not include secrets or unrelated personal information.

---

## 17. Compare against PoB2 itself

For each real fixture, manually verify in PoB2:

```text
selected main skill
skill group
support gems
enabled/disabled state
```

Tests should lock the importer result to that verified interpretation.

The expected result must come from PoB2's visible behavior/data, not from the importer implementation.

---

## 18. Optional PoB2 source inspection

It is acceptable to inspect current PoB2 source code to understand save/load semantics.

If used:

```text
document file/module
document commit/version if available
document the specific field behavior relied upon
```

Do not copy large PoB2 code sections into this project.

Implement only the minimum deterministic behavior needed for import fidelity.

---

## 19. Do not recreate PoB2 calculation logic

This step may inspect PoB2's skill-list construction enough to interpret export fields.

It must not grow into:

```text
skill DPS calculations
support-effect calculations
damage conversion
trigger execution
buff simulation
PoB calculation engine
```

If full active-skill reconstruction requires the calculation engine, stop and leave the skill unresolved.

---

## 20. Domain normalization

Do not force ambiguous PoB2 roles into current domain fields if that would lie.

If `NormalizedSkill.supportNames` requires confidently known supports, populate it only with confidently identified supports.

Unknown-role gems should stay in provider/import diagnostics or a justified domain extension.

Do not silently discard them.

---

## 21. Import diagnostics

Add skill-role diagnostics to the PoB2 analysis summary.

Example:

```text
Skills:
  groups: 3
  main skill: Twister
  supports resolved: 5
  unresolved-role gems: 0
```

or:

```text
Skills:
  groups: 4
  main skill: unresolved
  unresolved-role gems: 3

Context status:
  partial
```

Keep this concise in the UI.

---

## 22. Error vs ambiguity

Do not confuse malformed data with unresolved semantics.

Examples:

```text
invalid mainActiveSkill value
→ provider/format problem or unresolved

valid but non-reconstructable displaySkillList
→ partial / unresolved

invalid XML
→ import error
```

The importer should distinguish these cases.

---

## 23. Determinism

The same:

```text
PoB2 export
active tree pin
normalization version
```

must produce the same:

```text
skill groups
main-skill resolution
support roles
warnings
readiness status
```

No LLM or random heuristic may influence role resolution.

---

## 24. Tests

Add tests covering at minimum:

- `mainActiveSkill` is not assumed to equal raw gem index;
- a real simple active+support export resolves correctly;
- a real multi-group export selects the correct main group;
- a non-trivial active/display skill case resolves correctly or remains unresolved;
- non-selected active gems are not automatically labeled support;
- ambiguous roles remain unknown;
- support relationships remain group-local;
- unresolved main skill makes contextual readiness partial, not tree-incompatible;
- passive ids and tree compatibility remain unchanged;
- scoring output remains unchanged;
- malformed skill metadata fails or warns deterministically;
- existing synthetic decode/security tests still pass.

---

## 25. Keep security guarantees

Do not weaken STEP-016.5 security protections.

Preserve:

```text
raw-code-only import
no remote fetching
1 MiB inflated limit
DOCTYPE rejection
ENTITY rejection
server-side parsing
no raw XML HTML rendering
```

This step should not add new network access.

---

## 26. No new external service

Do not require:

```text
GGG
pobb.in
poe.ninja
AI
```

to interpret skill roles.

Real PoB2 fixtures should be checked into the test fixture area in a safe form.

---

## 27. Normalization version

If this correction changes the normalized meaning of imported builds, increment the PoB2 normalization version.

Example:

```text
normalizationVersion: 1 → 2
```

This is recommended because the same export may now produce a more accurate skill interpretation.

Document the decision.

---

## 28. Source checksum

Do not change checksum semantics unless necessary.

The same raw/inflated PoB2 source should retain the same source checksum.

Normalization-version changes should distinguish interpretation changes from source changes.

---

## 29. Documentation

After implementation create:

```text
docs/progress/STEP-016-5A-pob2-skill-role-fidelity.md
```

Follow the normal progress-document protocol.

Also explicitly document:

```text
Original Skill-Role Problem
PoB2 mainActiveSkill Semantics
Raw Gems vs Active/Display Skills
Main-Skill Resolution Policy
mainActiveSkillCalcs Handling
Support Classification Policy
Unknown-Role Policy
Real PoB2 Fixture Provenance
Fixture-by-Fixture Expected Results
Normalization Version
Import Readiness Impact
Tree-Analysis Regression
Remaining Skill-Model Limitations
PoB2 Calculation-Engine Status
```

---

## 30. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
mainActiveSkill interpretation
support-role policy
unknown-role preservation
real-fixture provenance policy
normalization-version bump
criteria for leaving main skill unresolved
```

---

## 31. Non-goals

Do not implement:

- PoB2 calculation engine;
- character-aware scoring;
- exact DPS/EHP;
- gear scoring;
- skill-damage formulas;
- support-effect math;
- automatic skill-tag inference from names;
- pobb.in import;
- GGG changes;
- AI skill classification.

---

## 32. Expected result

After STEP-016.5A:

```text
PoB2 export
   ↓
skill groups preserved
   ↓
active/display skill semantics respected
   ↓
main skill resolved only when safe
   ↓
supports classified only when safe
   ↓
ambiguous roles remain explicit
```

The importer should be able to say:

```text
Main skill: resolved
Supports: resolved
```

only when that statement is genuinely supported.

Otherwise:

```text
Main skill: unresolved
Support roles: partial/unknown
```

while still allowing compatible passive-tree analysis.

---

## 33. Stop condition

After implementation, real-fixture validation, tests, and documentation are complete:

**STOP.**

Do not automatically begin:

```text
PoB2 calculation engine
character-aware scoring
```

Wait for explicit review and approval.
