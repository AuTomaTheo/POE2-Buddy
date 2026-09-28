# STEP-007B — Structured PoE stat grammar

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-007B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Replace the growing collection of isolated whole-line stat templates with a more scalable, deterministic parser for PoE2 passive-tree stat text.

STEP-007A improved extraction coverage from 30.5% to 43.9%, but 3,347 of 5,963 passive stat-line occurrences remain unrecognized. The largest unresolved family is `multiple-markup-tokens`, with 1,859 remaining occurrences.

This step must introduce a structured parsing pipeline that can understand reusable language components such as:

- numbers;
- percentages;
- PoE markup tokens;
- operations;
- stat subjects;
- scopes;
- conditions;
- source/target damage types;
- multi-part expressions.

The goal is to safely increase structural parsing coverage without guessing gameplay semantics and without assigning scores.

Do **not** begin STEP-008 scoring in this task.

---

## 2. Acceptance criteria

- [ ] A deterministic tokenizer exists for passive stat text.
- [ ] PoE markup tokens are parsed structurally rather than treated as opaque text.
- [ ] Multiple markup tokens in one line can be represented when the grammar supports the line.
- [ ] Numeric values, percentages, and supported ranges are tokenized explicitly.
- [ ] Core operations such as `increased`, `reduced`, `more`, `less`, `penetration`, `conversion`, and `gain as extra` are structurally distinguishable where safely supported.
- [ ] Conditions such as `while`, `if`, `when`, `against`, `per`, `with`, and `for` are preserved rather than stripped.
- [ ] Scope information is preserved when represented.
- [ ] Multi-effect lines are either represented as multiple structured effects or left unrecognized.
- [ ] No parser rule silently discards qualifiers, conditions, or a second effect.
- [ ] Existing raw stat strings remain available unchanged.
- [ ] Existing STEP-007/007A semantic IDs are preserved unless there is a documented migration reason.
- [ ] The parser remains deterministic and side-effect free.
- [ ] Coverage is recalculated on the pinned PoE2 `0.5.5` tree.
- [ ] Before/after extraction and semantic coverage are documented.
- [ ] Remaining unrecognized families are inventoried again.
- [ ] Scoring readiness is reassessed after the grammar work.
- [ ] STEP-008 remains blocked if important stat families still cannot be represented safely.
- [ ] Required tests and repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-007B-structured-stat-grammar.md`

---

## 3. Current baseline

Use the STEP-007A measurements:

```text
PoE2 version:              0.5.5
Skill nodes:               5,152
Total stat lines:          5,963
Recognized extraction:     2,616 (43.9%)
Semantically normalized:   1,845 (30.9%)
Unrecognized:              3,347 (56.1%)
```

Important unresolved families include:

```text
multiple-markup-tokens
more-damage
less-damage
damage-reduction
gain-as-extra
damage-conversion
conditional-damage
elemental-resistance-penetration
maximum-resistance
reservation
```

The same passive-tree pin must be used:

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

Do not update the tree pin in this step.

---

## 4. Parser architecture

Introduce an explicit pipeline conceptually like:

```text
raw stat string
    ↓
tokenizer
    ↓
token stream
    ↓
grammar/parser
    ↓
structured stat expression
    ↓
semantic normalization
```

Do not remove the existing raw stat representation.

Existing whole-line templates may remain temporarily as compatibility/fallback rules if useful, but new parsing should be designed around reusable grammar components rather than adding dozens of unrelated regexes.

---

## 5. Tokenizer

Create a deterministic tokenizer for passive-stat strings.

The tokenizer should recognize, where applicable:

### Numeric tokens

Examples:

```text
10
+10
-10
10%
+10%
10.5
10-20
```

Do not support numeric formats that do not actually appear in the pinned corpus unless needed for clean implementation.

### PoE markup tokens

Support source text such as:

```text
[Spell]
[Projectile]
[EnergyShield|Energy Shield]
[Resistances|Cold Resistance]
```

Represent these structurally.

Conceptually:

```ts
type MarkupToken = {
  sourceId: string;
  displayText?: string;
};
```

The exact type may differ.

Do not discard either the internal/source id or display text when both exist.

### Words / literals

Examples:

```text
increased
reduced
more
less
Damage
Speed
Maximum
Resistance
```

### Separators / punctuation

Preserve punctuation when it affects parsing.

The tokenizer must be testable independently from semantic interpretation.

---

## 6. Structured expression model

Introduce a parser-level representation separate from final semantic families.

Conceptually:

```ts
type ParsedPassiveStatExpression = {
  raw: string;
  effects: ParsedPassiveEffect[];
};

type ParsedPassiveEffect = {
  amount?: number;
  unit?: "flat" | "percent";
  operation?: PassiveOperation;
  subject?: StatSubject;
  scope?: StatScope[];
  conditions?: StatCondition[];
};
```

This is an example only.

The implementation may use a different model if cleaner.

The important distinction is:

```text
text parsing
!=
semantic scoring
```

---

## 7. Operation grammar

Where supported by actual pinned lines, distinguish:

```text
added / flat
increased
reduced
more
less
chance
maximum
minimum
penetration
conversion
gain-as-extra
regeneration
recovery
```

Do not map these operations onto the same meaning.

For example:

```text
20% increased Damage
20% more Damage
20% reduced Damage
20% less Damage
```

must remain structurally distinct.

No damage math is performed in STEP-007B.

---

## 8. Multi-markup-token support

This is a primary goal of STEP-007B.

The parser must be able to handle lines that contain more than one markup token when the relationship is structurally understandable.

Example conceptually:

```text
20% increased [Projectile] Damage with [Spears]
```

should be representable as something equivalent to:

```ts
{
  amount: 20,
  unit: "percent",
  operation: "increased",
  subject: {
    family: "damage",
    tags: ["projectile"]
  },
  scope: [
    {
      type: "with",
      value: "spears"
    }
  ]
}
```

Do not hardcode this specific sentence unless it actually appears in the pin.

Use the real pinned corpus to define supported grammatical forms.

Multiple tokens must not automatically mean one semantic effect.

If the relationship between tokens is ambiguous, leave the line unsupported.

---

## 9. Conditions

Support structural preservation of common condition markers where safely parseable:

```text
while
if
when
against
per
with
for
```

Example:

```text
20% increased Damage while on Full Life
```

must not become unconditional damage.

A structured result should preserve the condition conceptually:

```ts
{
  operation: "increased",
  amount: 20,
  subject: "damage",
  conditions: [
    {
      type: "while",
      value: "on-full-life"
    }
  ]
}
```

If the condition cannot be understood safely, leave the line unrecognized.

Parsing a condition does **not** imply that STEP-007B can determine whether that condition is active for a build.

---

## 10. Scopes

Preserve scopes such as:

```text
with attacks
with spells
with projectiles
with a weapon type
for minions
for allies
against rare enemies
against unique enemies
```

Do not collapse scoped stats into generic stats.

For example:

```text
Critical Hit Chance for Spells
```

must remain distinct from:

```text
Critical Hit Chance
```

unless a later explicitly documented semantic rule says otherwise.

---

## 11. Damage transformation grammar

Investigate and support, where safely represented:

### Conversion

Conceptually:

```text
Convert X% of Physical Damage to Cold Damage
```

Represent:

```ts
{
  operation: "conversion",
  amount: X,
  sourceDamageType: "physical",
  targetDamageType: "cold"
}
```

### Gain as extra

Conceptually:

```text
Gain X% of Physical Damage as Extra Cold Damage
```

Represent separately from conversion.

### Penetration

Represent elemental-specific penetration and generic elemental penetration separately where the source text differs.

Do not calculate final DPS impact.

---

## 12. Incoming vs outgoing effects

The grammar must distinguish stats that modify damage dealt from stats that modify damage taken.

Example:

```text
30% less Damage
```

is not necessarily equivalent to:

```text
Take 30% less Damage
```

The parser should preserve direction/context when the wording provides it.

Conceptually:

```ts
direction: "dealt" | "taken" | "unspecified";
```

if needed.

Do not strip leading words such as `Take`.

---

## 13. Multi-effect lines

Some lines may encode more than one effect.

If the line can be safely decomposed:

```text
one raw line
    ↓
effect A
effect B
```

then return multiple structured effects.

If safe decomposition is not possible, keep the line unrecognized.

Never parse only the first half of a line and silently discard the rest.

---

## 14. Semantic normalization

The semantic layer from STEP-007A should consume structured parser output where appropriate.

Do not make the tokenizer or grammar directly assign scoring weights.

Existing semantic families should remain stable unless a change is necessary.

Possible semantic families include:

```text
damage
spell-damage
attack-damage
melee-damage
projectile-damage
physical-damage
fire-damage
cold-damage
lightning-damage
chaos-damage
elemental-damage
critical-hit-chance
critical-damage-bonus
attack-speed
cast-speed
projectile-speed
accuracy
maximum-life
maximum-energy-shield
armour
evasion
deflection
block-chance
strength
dexterity
intelligence
resistance
penetration
movement-speed
mana-regeneration
life-regeneration
```

Do not merge scoped or conditional forms unless the semantic model preserves the scope/condition.

---

## 15. Parser confidence / support status

Consider an explicit support status for structured lines.

Conceptually:

```ts
type ParseStatus =
  | "recognized"
  | "recognized-conditional"
  | "recognized-multi-effect"
  | "unsupported";
```

This is optional.

The important requirement is that downstream code can distinguish:

```text
fully understood structure
```

from:

```text
still unsupported
```

without inferring support from partial fields.

---

## 16. Coverage goals

After implementation, rerun the parser against all 5,963 pinned stat-line occurrences.

Report:

```text
total lines
structurally parsed
semantically normalized
unrecognized
```

Also report the remaining unrecognized-family inventory.

### Working target

Aim for:

```text
>= 70% structural extraction coverage
```

without guessing or dropping qualifiers.

This is a target, not permission to write unsafe parser rules.

If safe coverage remains below 70%:

- do not force it;
- report the actual result;
- list the largest remaining blockers;
- keep scoring readiness `not-ready` if the missing families materially affect scoring.

Correctness takes priority over percentage.

---

## 17. Scoring readiness

Re-run `assessStatScoringReadiness` or its evolved equivalent after the grammar changes.

Readiness must consider:

1. extraction coverage;
2. semantic coverage;
3. support for high-priority MVP families;
4. whether important conditions/scopes can be preserved;
5. whether major damage operations such as `more`, `less`, `conversion`, and `gain-as-extra` are at least structurally represented.

Do not mark scoring ready merely because a numeric threshold was crossed.

---

## 18. High-priority families to revisit

At minimum, revisit the STEP-007A blocking list:

```text
more-damage
less-damage
damage-reduction
gain-as-extra
damage-conversion
conditional-damage
elemental-resistance-penetration
maximum-resistance
reservation
```

For each, the completion document must state one of:

```text
supported structurally
supported semantically
partially supported
still unsupported
```

with a reason.

---

## 19. Unknown stat inventory

Re-run the unknown inventory after grammar parsing.

The report should include:

```text
family id
occurrences
distinct lines
examples
```

Compare against STEP-007A.

Pay special attention to:

```text
multiple-markup-tokens
multiple-numeric-values
while
with
for
against
per
when
if
more
less
conversion
```

The completion document should clearly show which categories shrank and which remain large.

---

## 20. Tests

Add tests at multiple layers.

### Tokenizer tests

Cover:

- integers;
- signed values;
- percentages;
- markup with source id only;
- markup with source id + display name;
- multiple markup tokens;
- punctuation where present.

### Grammar tests

Cover representative pinned examples for:

- increased;
- reduced;
- more;
- less;
- flat/added;
- penetration;
- conversion;
- gain-as-extra;
- conditional clauses;
- scoped clauses;
- multiple markup tokens;
- incoming/taken effects;
- multi-effect lines.

### Safety tests

Verify that:

- qualifiers are preserved;
- conditions are not removed;
- extra trailing effects cause failure unless represented;
- ambiguous lines remain unsupported;
- unsupported lines retain their raw text;
- no partial parse silently drops information.

### Semantic tests

Verify that:

- structured stats map to expected semantic families;
- operations remain distinct;
- scopes remain available;
- conditions remain available;
- different semantic meanings are not merged.

### Corpus tests

Lock the measured pinned totals after implementation:

```text
total
parsed
semantic
unrecognized
```

Do not choose the expected numbers in advance.

Measure them after implementation and document them.

### Regression tests

All STEP-007 and STEP-007A tests must continue to pass unless a deliberate parser migration requires a documented update.

---

## 21. Performance

The parser will process only 5,963 passive stat-line occurrences on the current pin.

Clarity and correctness are more important than micro-optimization.

However:

- tokenize each line once per parse;
- avoid nested full-corpus scans;
- keep parser functions deterministic and side-effect free;
- avoid LLM/network calls.

---

## 22. Package boundaries

### `packages/passive-engine`

May own:

- tokenizer;
- grammar/parser;
- stat extraction;
- semantic normalization;
- unknown inventory;
- coverage analysis;
- scoring-readiness analysis.

### `packages/domain`

Only move parser output types into domain if they are genuinely stable cross-package domain concepts.

Do not move provider-specific text grammar into domain.

### `packages/data-sources`

Must remain responsible only for obtaining/normalizing source data.

Do not place grammar logic there.

---

## 23. External APIs / credentials

No new external credentials are required.

### Official GGG passive-tree export

Status:

```text
AVAILABLE
NO AUTH REQUIRED
```

Use the existing pinned snapshot only.

### GGG OAuth

Status:

```text
NOT AVAILABLE YET
REQUIRES GGG APPLICATION REGISTRATION / APPROVAL
NOT REQUIRED FOR STEP-007B
```

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-007B
```

### AI provider

Status:

```text
NOT REQUIRED FOR STEP-007B
```

An LLM must not be used to interpret stat lines at runtime.

---

## 24. Non-goals

Do **not** implement:

- scoring weights;
- path ranking;
- DPS calculation;
- defence calculation;
- PoB integration;
- gear analysis;
- crafting simulation;
- GGG OAuth;
- live character import;
- poe.ninja pricing;
- AI recommendations;
- recommendation UI.

This step only improves the stat-understanding foundation.

---

## 25. Decision-log requirements

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions such as:

- tokenizer token model;
- grammar architecture;
- condition representation;
- scope representation;
- multi-effect representation;
- conversion representation;
- gain-as-extra representation;
- incoming-vs-outgoing direction;
- any semantic migrations;
- revised scoring-readiness rule.

Do not introduce silent semantic changes.

---

## 26. Required commands

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

Document failures and resolutions.

---

## 27. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-007B-structured-stat-grammar.md
```

Follow the repository documentation protocol in full.

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
Tokenizer Design
Grammar Design
Coverage Before vs After
Remaining Unknown Stat Inventory
High-Priority Family Status
Semantic Coverage
STEP-008 Scoring Readiness
```

---

## 28. Expected result

At completion, the stat pipeline should resemble:

```text
PassiveNode.rawStats
        ↓
tokenizer
        ↓
token stream
        ↓
structured grammar
        ↓
ParsedPassiveStatExpression
        ↓
semantic normalization
        ↓
SemanticPassiveStat
        ↓
coverage + unknown inventory
        ↓
StatScoringReadiness
```

The system must still retain every raw stat line.

---

## 29. Stop condition

After implementation and documentation:

**STOP.**

Do not automatically begin STEP-008.

If scoring readiness remains:

```text
not-ready
```

document the remaining blockers and stop.

If scoring readiness becomes:

```text
ready
```

the next planned step is:

```text
STEP-008 — Configurable heuristic scoring
```

Wait for explicit approval before starting it.
