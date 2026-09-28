# STEP-007A — Stat coverage expansion and semantic inventory

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-007A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Expand the passive-stat extraction layer created in STEP-007 so that future scoring is based on a substantially broader and better-understood portion of the PoE2 passive tree.

STEP-007 correctly preserved every raw stat line and reported that only 1,821 of 5,963 passive stat lines were recognized on the pinned PoE2 `0.5.5` tree. The remaining 4,142 lines must not be silently treated as zero-value input.

This step must:

1. inventory the currently unrecognized stat families;
2. group unknown lines by structural pattern;
3. expand parsing only for stat families whose meaning can be represented without guessing;
4. introduce a semantic-normalization layer separate from raw extraction;
5. measure coverage after the expansion;
6. define whether the parser is sufficiently complete for the first heuristic scorer.

Do **not** begin STEP-008 scoring in this task.

---

## 2. Acceptance criteria

- [ ] The 4,142 unrecognized lines from STEP-007 are grouped into meaningful structural/stat families.
- [ ] The inventory records both total line count and distinct raw-string count per family.
- [ ] High-value quantitative families needed for an MVP optimizer are identified and prioritized.
- [ ] Parsing coverage is expanded using explicit whole-line or otherwise safely bounded templates.
- [ ] No parser rule silently drops conditions, qualifiers, scopes, or secondary effects.
- [ ] Every raw stat line remains available even when recognized.
- [ ] Every unrecognized line remains visible and explicitly flagged.
- [ ] A semantic-normalization layer exists separately from raw text extraction.
- [ ] Semantic normalization does not merge stats unless their meaning is verified.
- [ ] Coverage is recalculated against the same pinned PoE2 `0.5.5` snapshot.
- [ ] Coverage improvement is documented numerically.
- [ ] A scoring-readiness report explains which stat families are supported and which remain unsupported.
- [ ] STEP-008 is blocked if coverage/semantic support is still insufficient for honest heuristic scoring.
- [ ] Regression tests cover all newly supported stat families.
- [ ] Required checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-007A-stat-coverage-expansion.md`

---

## 3. Current baseline

Use the STEP-007 pinned baseline:

```text
PoE2 version:       0.5.5
Skill nodes:        5,152
Stat lines:         5,963
Recognized lines:   1,821
Unrecognized lines: 4,142
Recognition rate:   ~30.5%
```

Do not change the passive-tree pin during this step.

Source provenance must remain:

```text
Repository:
https://github.com/grindinggear/poe2-skilltree-export

Commit:
bd87e6512c92b868542eddfb1ba4ea8b6dc2da36

Version:
0.5.5

Checksum:
sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642
```

---

## 4. Phase A — Inventory the unrecognized stat lines

Before adding parser rules, analyze the 4,142 unrecognized stat lines.

Create a deterministic inventory that groups unknown lines by structural family.

Possible families may include, but must be derived from the actual pinned data:

```text
more
less
reduced
increased with condition
while ...
if ...
when ...
against ...
with ...
for ...
per ...
minion
projectile
critical
damage type
attack speed
cast speed
movement speed
life
energy shield
armour
evasion
resistance
attributes
multiple markup tokens
multiple numeric values
ranges
chance
duration
conversion
penetration
gain/as extra
maximum/minimum
special mechanic
granted skill
unclassified
```

These names are examples only.

Do not force a line into one of these categories if the actual structure does not fit.

The inventory must record, at minimum:

```ts
type UnrecognizedStatFamily = {
  familyId: string;
  totalOccurrences: number;
  distinctLines: number;
  examples: string[];
};
```

The exact type may differ if a cleaner structure is preferable.

The inventory must be reproducible from the pinned tree.

---

## 5. Phase B — Prioritize MVP-relevant stat families

Identify which stat families are most important for the first build optimizer.

At minimum, investigate support for common quantitative stats involving:

### Offensive

- generic damage;
- attack damage;
- spell damage;
- projectile damage;
- melee damage;
- elemental damage;
- physical damage;
- fire damage;
- cold damage;
- lightning damage;
- chaos damage;
- critical strike chance;
- critical damage / critical damage bonus;
- attack speed;
- cast speed;
- projectile speed;
- accuracy;
- penetration;
- conversion;
- gain as extra damage;
- `more`;
- `less`.

### Defensive

- maximum life;
- energy shield;
- armour;
- evasion;
- deflection, if represented in the tree;
- block;
- resistances;
- maximum resistances;
- recovery/regeneration;
- avoidance;
- damage reduction.

### Utility / requirements

- Strength;
- Dexterity;
- Intelligence;
- generic attributes;
- movement speed;
- resource/mana stats;
- reservation-related stats;
- flask-related stats where safely interpretable.

This does **not** mean all of these must be fully supported in STEP-007A.

The completion document must show:

```text
family
→ supported / partially supported / intentionally unsupported
→ reason
```

---

## 6. Parser expansion rules

### 6.1 Preserve conservative parsing

Do not replace STEP-007's safe approach with broad substring matching.

Bad example:

```ts
if (raw.includes("Projectile Damage")) {
  // assume generic projectile damage
}
```

This could incorrectly parse conditional or scoped stats.

Prefer:

- exact whole-line templates;
- anchored regular expressions;
- token-aware parsing;
- explicit optional clauses whose semantics are preserved.

### 6.2 Never discard qualifiers

For example, a line conceptually like:

```text
20% increased Damage while on Full Life
```

must **not** become simply:

```text
20% increased Damage
```

unless the condition is also represented.

A recognized conditional stat should preserve the condition structurally, for example conceptually:

```ts
{
  statId: "...",
  amount: 20,
  operation: "increased",
  condition: {
    kind: "while",
    value: "on-full-life"
  }
}
```

The exact model may differ.

If the condition cannot be represented safely, leave the line unrecognized.

### 6.3 Preserve multiple effects

A stat line containing two effects or two markup tokens must not be collapsed into one effect unless both are represented.

If safe decomposition is possible:

```text
one raw line
→ multiple normalized stat components
```

may be supported.

If not, keep the entire line unrecognized.

---

## 7. Semantic normalization layer

STEP-007 extraction produced deterministic raw/canonical IDs.

STEP-007A must introduce a **separate semantic layer**.

Conceptually:

```text
raw PoE2 stat line
        ↓
extraction
        ↓
ExtractedPassiveStat
        ↓
semantic normalization
        ↓
SemanticPassiveStat
```

Do not replace or remove the extracted/raw representation.

The semantic layer exists so later scoring can reason about categories such as:

```text
SPELL_DAMAGE
PROJECTILE_DAMAGE
CRITICAL_STRIKE_CHANCE
CRITICAL_DAMAGE_BONUS
ATTACK_SPEED
CAST_SPEED
PROJECTILE_SPEED
MAXIMUM_LIFE
ENERGY_SHIELD
ARMOUR
EVASION
FIRE_RESISTANCE
COLD_RESISTANCE
LIGHTNING_RESISTANCE
CHAOS_RESISTANCE
STRENGTH
DEXTERITY
INTELLIGENCE
```

These identifiers are conceptual examples.

Use names that fit the codebase.

---

## 8. Do not merge semantic meaning without evidence

Two extracted stats that look similar must remain distinct unless equivalence is established.

For example, do not automatically merge:

```text
Critical Damage Bonus
Critical Spell Damage Bonus
```

merely because they share a markup id.

Likewise, do not merge:

```text
Projectile Damage
Projectile Attack Damage
```

unless the actual PoE2 semantics justify it.

A semantic alias/merge must be:

1. deliberate;
2. documented;
3. tested;
4. recorded in the decision log when material.

---

## 9. Operation model

The semantic representation should distinguish, where safely parseable:

```text
flat / added
increased
reduced
more
less
chance
maximum
minimum
conversion
penetration
gain-as-extra
```

Do not treat:

```text
20% increased Damage
```

and:

```text
20% more Damage
```

as equivalent.

STEP-007A still does **not** perform PoE damage calculations.

It only preserves the operation accurately enough for later scoring/calculation layers.

---

## 10. Conditions and scopes

Where safely recognized, preserve semantic scope such as:

```text
with attacks
with spells
with projectiles
with melee
while ...
if ...
against ...
for minions
for allies
for a specific damage type
for a specific weapon type
```

Do not strip these qualifiers.

If a qualifier is not understood well enough to model:

```text
status: "unrecognized"
```

is preferable to an incorrect generic stat.

---

## 11. Coverage reporting

Extend `passiveStatCoverage` or add a new report that provides:

```text
total lines
recognized extraction lines
semantically normalized lines
unrecognized lines

coverage percentages
```

Also provide coverage by important semantic family where practical.

Conceptually:

```text
Overall extraction coverage:  XX%
Semantic normalization:       YY%

Offensive common stats:       ZZ%
Defensive common stats:       AA%
Attributes/basic utility:     BB%
Conditional/special mechanics: CC%
```

Do not invent a percentage category if it cannot be measured objectively.

---

## 12. Scoring readiness report

Create a deterministic report that answers:

```text
Is the stat layer ready for STEP-008 heuristic scoring?
```

Conceptually:

```ts
type StatScoringReadiness = {
  status: "ready" | "not-ready";
  extractionCoverage: number;
  semanticCoverage: number;
  supportedFamilies: string[];
  unsupportedHighPriorityFamilies: string[];
  reasons: string[];
};
```

The exact structure may differ.

The decision must not be based on an arbitrary number alone.

For example:

```text
80% overall coverage
```

is not sufficient if critical families such as:

```text
more damage
critical strike
attack speed
life
evasion
```

are still invisible.

Readiness must consider both:

1. coverage quantity;
2. coverage quality for MVP-important families.

---

## 13. Initial readiness target

Do not hardcode this as a permanent product rule, but use the following as a working target for STEP-007A:

The first scorer should ideally have:

```text
>= 70% overall passive-stat line extraction coverage
```

**and**

strong support for the common offensive/defensive/attribute families needed by the MVP.

If the implementation cannot safely reach that level without guessing:

- do not force coverage;
- return `not-ready`;
- document which families remain blocking;
- stop before STEP-008.

Correctness is more important than hitting the percentage.

---

## 14. Unknown stats remain first-class data

Even after expanded support:

```text
unrecognized != zero
```

Downstream code must remain able to see:

```text
raw unrecognized line
node id
node name
count/frequency
```

Do not replace unknown lines with:

```ts
amount: 0;
```

Do not silently discard them.

---

## 15. Tests

Add tests covering at minimum:

### Inventory

- unknown lines are deterministically grouped;
- family counts match the pinned snapshot;
- repeated runs produce the same inventory;
- examples come from actual lines in the group.

### Parser expansion

Add representative tests for every newly supported pattern.

Where relevant, include:

- positive amounts;
- percentages;
- flat values;
- `increased`;
- `reduced`;
- `more`;
- `less`;
- conditions;
- multiple tokens;
- operation distinctions.

### Semantic normalization

Verify that:

- extracted stats normalize into the correct semantic family;
- two semantically different stats remain separate;
- aliases only merge when explicitly supported;
- conditions/scopes survive normalization;
- operation type survives normalization.

### Unknown safety

Verify that:

- unsupported conditional lines remain unrecognized;
- unsupported multi-effect lines remain unrecognized;
- nothing disappears from the node's original stat list.

### Coverage

Verify the exact pinned-tree totals after STEP-007A:

```text
total
recognized
semantic
unrecognized
```

Do not write expected numbers until the parser expansion has actually been implemented and the values are measured.

### Readiness

Test:

- readiness is `ready` only when required MVP families are supported;
- missing a required high-priority family makes readiness `not-ready`;
- raw unknown lines do not become zero-value semantic stats.

---

## 16. Performance

Coverage/inventory analysis may scan all 5,963 stat lines.

That is acceptable.

Do not optimize prematurely, but avoid obvious repeated full-tree rescans inside inner parsing loops.

The parser and semantic normalization should remain deterministic and side-effect free.

---

## 17. Package boundaries

Keep current architecture boundaries intact.

### `packages/domain`

May contain stable generic types if they are genuinely domain-level.

Must not contain:

- filesystem access;
- tree loading;
- UI;
- network calls;
- provider-specific parsing logic.

### `packages/passive-engine`

May contain:

- passive stat parsing;
- semantic normalization;
- coverage analysis;
- stat-family inventory;
- scoring-readiness analysis.

Do not add scoring weights yet.

### `packages/data-sources`

Must not become responsible for stat semantics.

It should continue providing normalized passive-tree source data.

---

## 18. External APIs / credentials

No new credentials are required.

### Official GGG passive-tree export

Status:

```text
AVAILABLE
NO AUTH REQUIRED
```

Continue using the existing STEP-003 pin.

### GGG OAuth

Status:

```text
NOT AVAILABLE YET
REQUIRES GGG APPLICATION REGISTRATION / APPROVAL
NOT REQUIRED FOR STEP-007A
```

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-007A
```

### AI provider

Status:

```text
NOT REQUIRED FOR STEP-007A
```

Do not use an LLM to decide stat semantics at runtime.

---

## 19. Non-goals

Do **not** implement:

- stat scoring weights;
- build scoring;
- path ranking;
- DPS calculations;
- effective-health calculations;
- PoB calculations;
- character OAuth;
- live character import;
- poe.ninja pricing;
- gear scoring;
- crafting simulation;
- AI explanations;
- UI recommendation screens.

This step prepares reliable structured input for those later systems.

---

## 20. Decision-log requirements

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

- semantic stat ID strategy;
- aliases/merges;
- conditional-stat representation;
- multi-effect stat representation;
- scoring-readiness criteria;
- any deliberately unsupported high-priority family.

Do not silently introduce semantic equivalence.

---

## 21. Required commands

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

only if dependency files change.

Document all failures and resolutions.

---

## 22. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-007A-stat-coverage-expansion.md
```

Follow the full repository documentation protocol.

The completion document must include at minimum:

1. Objective
2. Acceptance criteria
3. Implementation summary
4. Files created
5. Files changed
6. Files deleted
7. Important code paths / responsibilities
8. External APIs / data sources involved
9. Credentials / environment variables
10. Data model / schema changes
11. Commands executed
12. Automated test results
13. Manual verification
14. Errors/issues encountered
15. Security/privacy impact
16. Performance impact
17. Data provenance / reproducibility impact
18. Known limitations
19. Decisions made
20. Deviations from planning docs
21. Remaining risks
22. Rollback notes
23. Recommended next step
24. Completion statement

Additionally include dedicated sections:

```text
Unknown Stat Inventory
Coverage Before vs After
Supported Semantic Families
Unsupported High-Priority Families
STEP-008 Scoring Readiness
```

---

## 23. Expected result

At completion, the stat pipeline should resemble:

```text
PassiveNode.rawStats
        ↓
safe extraction
        ↓
ExtractedPassiveStat
        ↓
semantic normalization
        ↓
SemanticPassiveStat
        ↓
coverage / family inventory
        ↓
StatScoringReadiness
        │
        ├── ready
        │      ↓
        │   STEP-008
        │
        └── not-ready
               ↓
        expand verified support first
```

The system must still retain every original raw stat line.

---

## 24. Stop condition

After all acceptance criteria pass and:

```text
docs/progress/STEP-007A-stat-coverage-expansion.md
```

has been completed:

**STOP.**

Do not automatically begin STEP-008.

If `StatScoringReadiness.status` is:

```text
not-ready
```

document the blocking families and stop.

If it is:

```text
ready
```

the next planned step is:

```text
STEP-008 — Configurable heuristic scoring
```

Wait for explicit approval before starting it.
