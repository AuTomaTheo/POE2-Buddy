# STEP-017 — PoB2-aware gear normalization and weakness diagnostics

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-017  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the first gear-analysis layer on top of the current PoE2 Buddy architecture.

PoB2 is now the primary practical MVP build-ingestion source. The PoB2 importer can already preserve:

```text
main-tree passives
weapon-set passives
ascendancy context
skill groups
supports
equipment
raw item text
configuration
```

STEP-017 must consume the normalized imported equipment and turn it into a deterministic, source-aware gear model with:

```text
slot normalization
item identity
modifier parsing
modifier coverage
known vs unsupported semantics
factual diagnostics
gear-analysis readiness
```

This step must **not** pretend that imported gear is already character-aware scored.

Do not assign generic 0–100 item scores.

Do not rank equipped items from best to worst.

Do not recommend replacements yet.

Do not implement the PoB2 calculation engine.

---

## 2. Why STEP-017 changed

The original roadmap assumed direct GGG character import would be the primary source.

The current MVP architecture is now:

```text
PoB2 export
    ↓
PoB2 importer
    ↓
CharacterBuildSnapshot
    ├── passives
    ├── weapon-set passives
    ├── ascendancy
    ├── skills/supports
    ├── equipment
    └── configuration
             ↓
          STEP-017
      Gear understanding
```

GGG remains an optional/future provider:

```text
                    normalized build
                         ▲
               ┌─────────┴─────────┐
               │                   │
             PoB2                 GGG
       primary MVP source      future/optional
```

STEP-017 therefore must be **provider-neutral at the domain/gear-analysis boundary** even though PoB2 supplies the real MVP fixtures.

---

## 3. Core design rule

Hard invariant:

```text
item imported
!=
item understood
!=
item good
!=
item good for this build
```

STEP-017 is about understanding and diagnostics.

It is not yet about judging final item quality.

---

## 4. Acceptance criteria

- [ ] Equipped items can be normalized by canonical equipment slot.
- [ ] PoB2 equipment remains the primary real fixture source.
- [ ] Gear analysis accepts normalized build/equipment rather than raw PoB2 XML.
- [ ] Provider-specific PoB2 parsing remains in `data-sources`.
- [ ] Raw item text remains preserved.
- [ ] Item identity fields remain preserved.
- [ ] Modifier sections are parsed deterministically where supported.
- [ ] Unsupported modifier lines remain visible.
- [ ] Unknown modifier semantics are not treated as zero.
- [ ] Local/global/conditional ambiguity is not silently guessed.
- [ ] Each item receives semantic/parser coverage information.
- [ ] Gear-analysis readiness is separate from passive-analysis readiness.
- [ ] Missing or malformed slots produce factual diagnostics.
- [ ] Duplicate-slot/import anomalies produce factual diagnostics.
- [ ] No generic item score is introduced.
- [ ] No "worst item" ranking is introduced.
- [ ] No replacement item recommendations are introduced.
- [ ] No price-based quality judgment is introduced.
- [ ] Existing passive scoring remains unchanged.
- [ ] Existing PoB2 import behavior remains unchanged.
- [ ] Existing GGG/fixture flows remain compatible.
- [ ] Tests use local fixtures and require no network access.
- [ ] Required repository checks pass.
- [ ] Create:
      `docs/progress/STEP-017-pob2-aware-gear-normalization.md`

---

## 5. Scope

STEP-017 may implement:

```text
canonical gear slots
gear/item normalization
gear modifier tokenizer/parser
gear semantic categories
modifier support/coverage reporting
item diagnostics
equipment-set diagnostics
gear-analysis readiness
analysis-screen gear summary
tests
documentation
```

STEP-017 must not implement:

```text
overall item score
slot ranking
upgrade recommendations
crafting recommendations
trade search
poe.ninja price comparison
PoB2 calculation engine
DPS/EHP calculations
AI item interpretation
character-aware passive scoring
```

---

## 6. Recommended package boundary

Prefer a dedicated package such as:

```text
packages/gear-engine
```

with responsibilities like:

```text
slot normalization
modifier parsing
item semantic analysis
coverage/readiness
gear diagnostics
```

Keep responsibilities separated:

```text
packages/data-sources
  → PoB2/GGG provider parsing

packages/domain
  → shared normalized types

packages/gear-engine
  → provider-neutral gear understanding

apps/web
  → rendering / input / UI only
```

Do not place item-parsing logic inside React components.

Do not make `gear-engine` depend on the web app.

---

## 7. Provider neutrality

The gear analyzer must consume normalized item/build objects.

Conceptually:

```text
PoB2
   ↓
NormalizedItem
   ↓
gear-engine

GGG
   ↓
NormalizedItem
   ↓
gear-engine

fixture
   ↓
NormalizedItem
   ↓
gear-engine
```

Do not create separate gear-scoring logic for PoB2.

Provider-specific raw source details may still be retained as provenance.

---

## 8. Canonical equipment slots

Define deterministic canonical slot identifiers.

At minimum support the slots currently emitted by real PoB2 builds where applicable, for example:

```text
main-hand
off-hand
weapon-set-2-main-hand
weapon-set-2-off-hand
helmet
body-armour
gloves
boots
amulet
ring-1
ring-2
belt
```

If PoE2/PoB2 uses additional valid equipment slots, preserve them deliberately.

Do not silently merge:

```text
ring 1
ring 2
```

or:

```text
main hand
weapon-set alternate hand
```

---

## 9. Slot normalization policy

Map provider slot strings to canonical slots through explicit deterministic rules.

Example:

```text
"Weapon 1" → main-hand
"Weapon 2" → off-hand
"Helmet"   → helmet
```

The exact mapping must follow actual provider data.

Unknown slot strings:

```text
must be preserved
must produce a diagnostic
must not be guessed
```

---

## 10. Duplicate-slot handling

If two items normalize to the same canonical slot unexpectedly:

```text
do not choose one silently
```

Return a diagnostic such as:

```text
duplicate-slot
```

Preserve both source items for debugging.

If duplicate occupancy is legitimate for a supported PoE2 structure, model that structure explicitly instead.

---

## 11. Item identity model

Preserve as available:

```text
provider item id if available
name
base type
rarity
slot
item level
quality
corrupted
identified state if available
raw item text
source metadata
```

Do not infer missing identity fields from modifier text unless the parser rule is deterministic and tested.

---

## 12. Item sections

Where source data permits, distinguish item text sections such as:

```text
identity/header
requirements
properties
implicit modifiers
explicit modifiers
crafted modifiers
enchant modifiers
fractured modifiers
rune/socketed modifiers if represented
corruption markers
other/unknown lines
```

Do not force every line into a known category.

Unknown sections remain explicit.

---

## 13. Gear modifier parser

Create a deterministic item-modifier parser.

The parser should return a structured representation, conceptually:

```text
rawText
parsed: true/false
semanticId?
operation?
amount?
unit?
scope?
condition?
locality?
sourceSection?
confidence?
```

Exact fields may differ.

The parser must retain the original raw line.

---

## 14. Do not reuse passive semantics blindly

The existing passive-stat parser may provide reusable primitives or semantic ids, but item modifiers have different semantics.

Examples:

```text
+100 to maximum Life
+30% to Fire Resistance
120% increased Armour
Adds 10 to 20 Fire Damage to Attacks
+2 to Level of all Projectile Skills
```

may require:

```text
flat values
ranges
local item modifiers
global modifiers
skill-specific modifiers
requirements
conditions
```

Do not push item text through the passive parser merely because wording looks similar.

Reuse only abstractions that are semantically correct.

---

## 15. Initial supported modifier families

STEP-017 should support a useful but deliberately bounded set of common deterministic families.

Candidate initial families:

```text
maximum Life
maximum Energy Shield
Armour
Evasion
Deflection
Fire Resistance
Cold Resistance
Lightning Resistance
Chaos Resistance
attributes
movement speed
attack speed
cast speed
critical strike chance
critical strike multiplier / critical damage
accuracy
Spirit
flat physical damage
flat elemental damage
increased physical damage
increased elemental damage
increased projectile damage
skill/gem levels where syntax is deterministic
```

Implement only families actually supported by deterministic real/synthetic fixtures.

Do not claim coverage for families not tested.

---

## 16. Local vs global modifiers

This is critical.

Item modifiers can be local to the item or global to the character.

Example:

```text
120% increased Armour
```

on an armour base may modify the item's armour rather than mean:

```text
character has 120% increased Armour globally
```

Do not aggregate or evaluate a modifier unless locality is understood.

Represent locality explicitly where known:

```text
local
global
unknown
```

If uncertain:

```text
locality = unknown
```

and do not use the modifier for aggregate character conclusions.

---

## 17. Conditional modifiers

Conditional modifiers must remain conditional.

Examples:

```text
while at Full Life
if you've Crit Recently
against Rare or Unique Enemies
while using a specific weapon
```

Do not treat conditional values as always active.

Preserve:

```text
condition text
```

and mark semantic evaluation incomplete unless a later character-context/calculation layer can resolve it.

---

## 18. Ranges and multi-value modifiers

Support deterministic numeric ranges where useful.

Example:

```text
Adds 10 to 20 Fire Damage
```

should not become:

```text
+15 Fire Damage
```

unless a later explicit calculation chooses an averaging rule.

Preserve:

```text
min: 10
max: 20
```

Do not invent a single value.

---

## 19. Unsupported modifiers

Every unsupported line must remain visible.

Conceptually:

```text
unsupportedRawLines:
  - "..."
  - "..."
```

Unsupported does not mean bad.

Unsupported does not mean zero.

Unsupported does not automatically make the item weak.

---

## 20. Modifier coverage

Each item should expose parser/semantic coverage.

Conceptually:

```text
totalModifierLines
parsedModifierLines
semanticallyUnderstoodLines
unsupportedLines

structuralCoverage
semanticCoverage
```

Keep structural and semantic coverage separate where useful.

Do not hide low coverage behind a single success boolean.

---

## 21. Item-analysis confidence

Provide a deterministic item-analysis confidence/readiness label.

Possible categories:

```text
complete
high
partial
low
```

or:

```text
ready
partial
insufficient
```

Exact naming may follow existing project conventions.

Confidence must derive from explicit parser/semantic coverage.

Do not use an LLM confidence score.

---

## 22. Gear-analysis readiness

Add a build-level gear readiness result separate from passive readiness.

Conceptually:

```text
gearReadiness:
  status
  slotsSeen
  missingSlots
  duplicateSlots
  parsedModifierCount
  unsupportedModifierCount
  semanticCoverage
  warnings
```

This must not affect passive path-analysis readiness.

---

## 23. Factual diagnostics only

STEP-017 may emit diagnostics that are true from the imported data itself.

Examples:

```text
missing-equipment-slot
unknown-slot
duplicate-slot
item-missing-identity
item-text-unparseable
low-modifier-coverage
unknown-modifier-lines
unknown-locality
unknown-condition
```

These are data/analysis diagnostics.

They are not subjective item judgments.

---

## 24. Avoid premature "weakness" claims

Do not yet emit:

```text
weak helmet
bad boots
worst ring
replace gloves first
```

unless the statement is objectively tied to a hard invalid condition.

Examples of potentially factual future issues:

```text
item cannot be equipped because character level is below requirement
weapon type incompatible with active skill
```

but only implement such diagnostics if all required facts are deterministically available.

Otherwise defer.

---

## 25. No aggregate resistance claims without totals

Do not say:

```text
Fire Resistance is uncapped
```

merely because gear parsing found a certain amount of Fire Resistance.

Character resistance can come from:

```text
gear
passives
skills
buffs
ascendancy
configuration
other mechanics
```

Until a trusted character-total calculation exists, gear-engine may report:

```text
known Fire Resistance modifiers found on gear
```

but not final character resistance.

---

## 26. No aggregate life/ES/defense claim without scope correctness

Similarly, do not claim:

```text
total life from gear = ...
total character ES = ...
```

unless every included modifier is known to be additive and correctly scoped.

STEP-017 may report known item-level contributions where semantically safe.

It must not pretend those equal final character totals.

---

## 27. Unique/build-enabling items

Unique or special items can be build-enabling even when their ordinary numeric stats look weak.

Therefore:

```text
unique item
```

must not receive a negative diagnostic because:

```text
few supported modifiers parsed
```

Low parser coverage is a parser limitation, not item weakness.

Preserve the item identity and unsupported text for later build-context/PoB calculation.

---

## 28. Gear summary

Expose a concise provider-neutral gear summary.

Example:

```text
Gear

Helmet
  Rare
  5 modifier lines
  4 understood
  1 unsupported
  coverage: high

Boots
  Unique
  7 modifier lines
  3 understood
  4 unsupported
  coverage: partial

Missing slots:
  none

Diagnostics:
  5 unsupported modifier lines across 3 items
```

Do not add:

```text
Helmet score: 82
Boots score: 41
```

---

## 29. Analysis-screen integration

Add a Gear section to the existing analysis screen.

Show at minimum:

```text
equipped slot
item name/base
rarity
modifier coverage
supported modifier summary
unsupported line count
item-analysis confidence
gear-readiness summary
```

Keep raw modifier detail collapsible or compact if the page becomes too long.

Do not visually rank items from best to worst.

Prefer canonical slot order rather than "score order".

---

## 30. Canonical display order

Use a deterministic equipment-slot display order.

Example:

```text
main hand
off hand
helmet
body armour
gloves
boots
amulet
ring 1
ring 2
belt
alternate weapon set
```

Do not sort by:

```text
score
price
number of mods
coverage
```

unless the user explicitly chooses such a diagnostic sort later.

---

## 31. PoB2 real fixtures

Use stored real PoB2 export fixtures where they contain equipment.

If the current A–E fidelity fixtures do not contain sufficient item variety, create additional local PoB2-generated test builds specifically for STEP-017.

Prefer at least:

```text
rare armour item
rare weapon
unique item
item with unsupported mod
item with crafted/enchant/fractured text if easy
two rings
alternate weapon-set item if supported
```

Document fixture provenance.

---

## 32. Gear fixture provenance

For real PoB2 gear fixtures record:

```text
PoB2 version/commit
how item was created/entered
expected slot
expected name/base/rarity
raw modifier lines
expected parsed modifier subset
```

Expected parser behavior must come from the source item text, not from the implementation under test.

---

## 33. Synthetic fixtures remain useful

Use synthetic item lines for targeted parser cases such as:

```text
numeric ranges
negative values
percentages
conditional clauses
unknown wording
crafted marker
fractured marker
corrupted item
malformed line
```

Real fixtures validate format fidelity.

Synthetic fixtures validate grammar edges.

---

## 34. Determinism

The same normalized build and gear parser version must produce the same:

```text
canonical slots
parsed modifiers
unsupported lines
coverage
confidence
diagnostics
readiness
```

Do not use:

```text
AI
randomness
external prices
live APIs
```

for STEP-017 gear interpretation.

---

## 35. Gear normalization version

Introduce an explicit gear-normalization/parser version if useful.

Conceptually:

```text
GEAR_NORMALIZATION_VERSION = 1
```

This should change when the same raw item text can normalize differently due to parser semantics.

Do not tie this version to:

```text
PoB2 normalization version
passive scoring profile version
GGG tree version
```

These are separate concerns.

---

## 36. Reproducibility metadata

A gear analysis result should identify enough context to reproduce it.

Conceptually:

```text
gearNormalizationVersion
source build checksum if available
source provider
item raw text/checksum if useful
analysis timestamp only if needed for display
```

Do not include access tokens or credentials.

---

## 37. Relationship to poe.ninja

STEP-013 economy data remains separate.

Do not use price as a quality signal.

Hard invariant:

```text
market price
!=
build value
```

Future flow may be:

```text
understand current item
        ↓
determine useful improvement
        ↓
search/price alternatives
```

not:

```text
price item
→ assume expensive is better
```

---

## 38. Relationship to future PoB2 calculation engine

STEP-017 should make later PoB integration easier by preserving:

```text
exact item identity
raw item text
slot
modifier semantics where known
unsupported text
skills/build source context
```

But do not duplicate PoB2's full calculation logic.

If a modifier would require PoB calculations to understand correctly:

```text
preserve it
mark it unsupported/conditional
defer
```

---

## 39. Relationship to future character-context layer

A later character-context step may answer:

```text
which stats actually matter to this build?
which defenses are used?
what is the active skill?
is the build crit?
is projectile speed meaningful?
```

STEP-017 should provide the structured gear inputs for that future layer.

Do not hard-code one personal build's priorities into the generic parser.

---

## 40. No generic gear weights

Do not introduce tables such as:

```text
Life = 2 points
Resistance = 1 point
Movement Speed = 3 points
```

in STEP-017.

That would recreate the same limitation we intentionally avoided by switching toward richer PoB2 context.

Any future weighting must be build-aware or explicitly heuristic and reliability-aware.

---

## 41. No "worst slot" API

Do not expose a public function like:

```text
findWorstItem(...)
rankGear(...)
scoreEquipment(...)
```

in this step.

Allowed APIs are closer to:

```text
analyzeItem(...)
analyzeEquipment(...)
parseGearModifier(...)
assessGearReadiness(...)
```

Names may differ.

---

## 42. Diagnostics must not imply ranking

If the UI shows:

```text
Boots: partial coverage
Helmet: complete coverage
```

that means:

```text
we understand Helmet better
```

not:

```text
Helmet is better than Boots
```

Use wording that keeps that distinction explicit.

---

## 43. Parser families should be inventory-driven

Maintain an inventory of supported gear semantic families.

Conceptually:

```text
semantic id
supported syntax
operation
scope support
local/global support
conditional support
fixture coverage
```

This should make it obvious what the parser can and cannot understand.

Do not add silent one-off regex behavior without recording it.

---

## 44. Required parser tests

Add tests for at minimum:

- flat maximum Life;
- flat Energy Shield if represented;
- elemental resistance;
- chaos resistance;
- attributes;
- movement speed;
- attack/cast speed;
- crit-related modifier;
- flat damage range;
- percent increased damage;
- skill/gem level syntax if implemented;
- conditional modifier stays conditional;
- local/global ambiguity stays unresolved;
- unsupported line remains visible;
- malformed line fails safely;
- raw line is preserved.

Only claim support for families actually implemented.

---

## 45. Required equipment tests

Add tests for at minimum:

- canonical slot mapping;
- two distinct ring slots;
- main/off-hand distinction;
- weapon-set distinction where represented;
- unknown slot diagnostic;
- duplicate slot diagnostic;
- empty/missing equipment;
- rare item;
- unique item;
- item with no supported modifier;
- mixed supported/unsupported item;
- deterministic slot order.

---

## 46. Required integration tests

Add tests proving:

- PoB2 normalized equipment enters gear-engine;
- fixture build equipment enters the same gear-engine path;
- GGG-normalized item objects remain type-compatible where possible;
- passive analysis result is unchanged;
- PoB2 import readiness is unchanged;
- gear readiness is independent from passive readiness;
- no economy API call occurs;
- no network access occurs.

---

## 47. Security

Treat all item text as untrusted user/provider text.

Do not:

```text
render raw item text as HTML
execute embedded content
send item text to third parties
evaluate expressions
```

Escape user-visible text normally.

Keep existing PoB2 XML/decompression protections unchanged.

---

## 48. Performance

Gear parsing runs after import and should be cheap relative to passive path search.

Avoid:

```text
network calls
PoB calculation execution
large combinatorial searches
```

Cache parsed item results by stable raw-text checksum only if useful; not required for MVP.

---

## 49. Documentation

Create:

```text
docs/progress/STEP-017-pob2-aware-gear-normalization.md
```

Follow the normal progress-document protocol.

Also explicitly include:

```text
Current Character Source Architecture
Provider-Neutral Gear Boundary
Canonical Slot Model
Item Identity Model
Item Section Parsing
Modifier Grammar
Supported Modifier Families
Local vs Global Policy
Conditional Modifier Policy
Range Policy
Unsupported Modifier Policy
Coverage Model
Item Confidence
Gear Readiness
Factual Diagnostics
No-Ranking Rule
PoB2 Fixture Provenance
UI Integration
Passive-Scoring Regression
poe.ninja Separation
PoB2 Calculation-Engine Status
Character-Aware Scoring Status
Known Gear-Parser Limitations
```

---

## 50. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
PoB2 as primary MVP gear source
provider-neutral gear-engine boundary
canonical slot ids
gear normalization version
local/global ambiguity policy
conditional-mod policy
unsupported != zero
no generic gear scoring
no worst-slot ranking
price != build value
```

---

## 51. Required commands

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

Default tests must not require:

```text
network access
GGG credentials
poe.ninja
running PoB2
AI keys
```

---

## 52. Non-goals

Do not implement in STEP-017:

- item quality score;
- best/worst slot ranking;
- gear upgrade recommendations;
- replacement item generation;
- trade searches;
- crafting advice;
- price/value ranking;
- exact DPS;
- exact EHP;
- PoB2 calculation engine;
- character-aware passive scoring;
- support applicability calculations;
- AI gear interpretation.

---

## 53. Expected result

After STEP-017, PoE2 Buddy should be able to say:

```text
I imported your equipped gear.

Helmet
  item identified
  5 modifier lines
  4 semantically understood
  1 unsupported
  analysis confidence: high

Boots
  item identified
  6 modifier lines
  3 understood
  3 unsupported
  analysis confidence: partial

Gear diagnostics
  no missing required source slots detected
  4 unsupported modifier lines
  1 unknown-scope modifier

Gear-analysis readiness
  partial
```

It should **not** yet say:

```text
Your boots are bad.
Your helmet scores 87/100.
Replace your gloves first.
Buy this item.
```

---

## 54. Roadmap impact after STEP-017

After STEP-017 is validated, the next architecture decision should be made explicitly.

Likely options are:

```text
A. Character-context relevance layer
   → determine which imported stats matter to the build

B. PoB2 calculation-engine spike
   → evaluate real whole-build stat deltas

C. A small readiness step connecting A and B
```

Do not automatically assume that generic gear scoring is the next step.

The long-term target is:

```text
import build
    ↓
understand build context
    ↓
understand gear
    ↓
evaluate changes with real build context / PoB calculations
    ↓
recommend meaningful upgrades
    ↓
price them
    ↓
craft them
```

---

## 55. Stop condition

After implementation, tests, browser verification, and documentation are complete:

**STOP.**

Do not automatically begin:

```text
character-aware gear scoring
PoB2 calculation engine
upgrade recommendations
crafting
```

Wait for explicit review and approval.
