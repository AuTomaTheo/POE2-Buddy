# STEP-017A — Gear modifier locality fidelity

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-017A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Correct and harden item-modifier locality handling introduced in STEP-017.

STEP-017 correctly separated:

```text
item imported
!=
item understood
!=
item good
```

but one semantic rule is currently unsafe:

```text
flat maximum Energy Shield
→ global
```

Item modifier locality can depend on:

```text
modifier wording
item slot
item/base category
mod domain
```

STEP-017A must make locality resolution **item-context-aware** and conservative.

Hard rule:

```text
when locality is not deterministically known
→ locality = unknown
```

Do not guess. Do not add gear scoring. Do not add character totals. Do not implement the PoB2 calculation engine.

---

## 2. Why this step exists

A modifier such as:

```text
+100 to maximum Energy Shield
```

can be local to an Energy Shield item.

Treating it as globally applied character Energy Shield can incorrectly mark the modifier as fully understood and inflate semantic coverage, item confidence, and gear readiness.

STEP-017A must fix that semantic boundary before the gear model is used downstream.

---

## 3. Acceptance criteria

- [ ] Modifier locality resolution receives item context.
- [ ] Flat Energy Shield is no longer globally classified from wording alone.
- [ ] Local Energy Shield modifiers on appropriate defensive items are recognized as local where deterministic.
- [ ] Global Energy Shield modifiers remain global where deterministic.
- [ ] Unknown locality remains `unknown`.
- [ ] Semantic coverage only counts locality-sensitive lines as fully understood when locality is resolved.
- [ ] Item confidence/readiness updates accordingly.
- [ ] Existing raw modifier text is unchanged.
- [ ] Existing unsupported lines remain visible.
- [ ] Passive scoring remains unchanged.
- [ ] No item score is introduced.
- [ ] No "worst item" ranking is introduced.
- [ ] No final character Life/ES/Armour/Evasion totals are introduced.
- [ ] Locality-sensitive families are audited.
- [ ] Real PoB2 item fixtures cover local and global cases.
- [ ] Required repository checks pass.
- [ ] Create `docs/progress/STEP-017A-gear-modifier-locality-fidelity.md`.

---

## 4. Scope

STEP-017A may change:

```text
gear modifier locality resolver
item-context representation
semantic coverage
confidence/readiness derived from locality
locality-specific tests
real/synthetic gear fixtures
gear analysis UI wording if required
```

STEP-017A must not change:

```text
passive heuristic weights
Top-K ranking
gear quality scoring
gear ranking
price integration
crafting
PoB2 calculation engine
character-aware scoring
```

---

## 5. Core locality contract

Separate semantic parsing from locality resolution.

Conceptually:

```text
raw modifier line
      ↓
parse semantic shape
      ↓
semantic id
operation
amount/range
scope
condition
      ↓
resolve locality using item context
      ↓
local | global | unknown
```

Do not make locality a pure text-regex decision when item context is required.

---

## 6. Item context available to locality resolution

Pass enough deterministic item information to locality resolution.

Conceptually:

```text
canonical slot
base type
rarity
item category if known
weapon vs armour vs jewellery
defence-bearing base if deterministically known
raw item properties when useful
source provider
```

Do not invent item category from names using fuzzy matching.

Use deterministic mappings only.

---

## 7. Energy Shield locality correction

At minimum distinguish:

### Local item Energy Shield

Examples conceptually like:

```text
+X to maximum Energy Shield
X% increased Energy Shield
```

on an appropriate Energy Shield-bearing equipment base where the mod is known to modify the item's local defence.

Expected:

```text
locality = local
```

### Global character Energy Shield

Examples where syntax/domain explicitly means character-wide Energy Shield.

Expected:

```text
locality = global
```

### Ambiguous

If the importer/parser lacks enough item-domain information:

```text
locality = unknown
```

Do not default to global.

---

## 8. Do not infer final character Energy Shield

Even when an item ES modifier is correctly recognized as local, STEP-017A must not calculate final item ES or final character ES.

That requires a later calculation layer that understands base defence, quality, local flat/increased mods, global modifiers, and other mechanics.

STEP-017A only fixes semantic locality.

---

## 9. Locality-sensitive family audit

Audit all currently supported modifier families for the same class of mistake.

At minimum review:

```text
maximum Energy Shield
Armour
Evasion
Deflection
flat weapon damage
increased weapon damage
attack speed
critical strike chance
accuracy
```

Also inspect any other supported family whose locality may depend on item domain.

For each family, record one of:

```text
always-global for supported grammar
always-local for supported grammar/context
context-dependent
unsupported for locality
```

Do not assume uniform semantics across families.

---

## 10. Conservative default

For every audited family:

```text
insufficient evidence
→ unknown
```

This is mandatory.

Never use probabilistic labels such as `likely local` or `probably global`.

---

## 11. Armour / Evasion / Deflection

If STEP-017 already leaves these `unknown`, keep them conservative unless deterministic item-context rules are added.

Do not reduce safety merely to improve coverage.

Coverage may decrease after this step if previous assumptions were wrong. That is acceptable.

---

## 12. Weapon damage

For weapon modifiers such as:

```text
Adds X to Y Physical Damage
X% increased Physical Damage
```

do not treat them as global character damage unless syntax/domain explicitly establishes that.

When they modify the weapon itself:

```text
locality = local
```

If the current grammar cannot distinguish:

```text
locality = unknown
```

Do not calculate weapon DPS in this step.

---

## 13. Attack speed / critical strike chance / accuracy

These may be local on weapons or global depending on wording/domain.

Do not classify based on semantic family alone.

Example policy:

```text
weapon item + deterministic local modifier
→ local

explicit global wording
→ global

otherwise
→ unknown
```

---

## 14. Clearly global stats

Common modifiers such as resistances and attributes may remain global where wording and item semantics are deterministic.

Do not intentionally degrade clearly understood global modifiers merely because other families are context-sensitive.

---

## 15. Semantic coverage correction

A parsed modifier should count as semantically understood only when all required dimensions are known:

```text
known semantic family
AND known operation/value
AND known scope where required
AND known locality where required
AND no unresolved condition
```

If locality is required but unknown:

```text
parsed = true
semantically understood = false
```

---

## 16. Confidence/readiness impact

Recalculate item confidence after locality correction.

An item may legitimately change:

```text
complete → high
high → partial
partial → low
```

if prior confidence depended on unsafe locality assumptions.

Do not preserve old confidence just to avoid regression.

---

## 17. Diagnostic behavior

Use factual diagnostics such as:

```text
unknown-locality
```

when a parsed line cannot be assigned safe locality.

Do not emit quality judgments.

---

## 18. Item-category model

If STEP-017 does not expose sufficient item category/base-domain context, introduce the smallest justified representation.

Possible categories:

```text
weapon
shield/focus
helmet
body-armour
gloves
boots
jewellery
belt
other
unknown
```

Use provider/base metadata where possible.

Do not infer category through fuzzy name matching.

---

## 19. Base defence awareness

It is acceptable to track whether an item has base Armour, Evasion, Energy Shield, or Deflection if this can be read deterministically from real item properties.

This may help locality decisions.

Do not calculate final defence values.

---

## 20. Provider neutrality

Locality rules must remain provider-neutral after normalization.

```text
PoB2 item
GGG item
fixture item
    ↓
NormalizedItem + item context
    ↓
gear-engine locality resolver
```

Provider-specific extraction belongs in `data-sources`.

---

## 21. Real fixture requirement

Add or extend real PoB2 gear fixtures.

At minimum include:

### Fixture L1 — Local Energy Shield

An actual PoB2 item on an ES-bearing slot with a flat or increased Energy Shield modifier known to be local.

Expected:

```text
semantic family recognized
locality = local
```

### Fixture L2 — Clearly global modifier

An actual item containing a clearly global modifier such as elemental resistance, attribute, or maximum Life.

Expected:

```text
locality = global
```

### Fixture L3 — Ambiguous case

A modifier the deterministic data cannot safely classify.

Expected:

```text
locality = unknown
semantic completeness = false
```

---

## 22. Fixture provenance

Real fixtures must record:

```text
PoB2 version/commit
slot
base type
raw item text
expected modifier line
expected locality
why the locality expectation is trusted
```

Truth must not come from current parser output.

Do not copy private player builds.

---

## 23. Synthetic locality fixtures

Add focused synthetic cases for:

```text
flat ES on defensive item
flat ES on ambiguous item
global resistance
weapon increased physical damage
weapon attack speed
conditional modifier
unsupported wording
```

Synthetic cases should isolate locality rules cleanly.

---

## 24. Locality rule inventory

Extend the gear family inventory to record locality behavior.

Conceptually:

```text
semantic id
supported grammar
locality mode:
  global
  local
  contextual
  unknown
required item context
fixture coverage
```

Do not hide locality rules in scattered regex callbacks.

---

## 25. No character-total aggregation

Do not add:

```text
sumCharacterEnergyShield(...)
calculateTotalArmour(...)
calculateWeaponDps(...)
```

This step determines semantics/locality only.

Whole-character aggregation belongs to a later context/calculation layer.

---

## 26. No build-value inference

Do not infer item quality from locality.

No score or ranking is allowed.

---

## 27. No PoB calculation duplication

Do not recreate PoB's item calculation pipeline.

If accurate interpretation would require base defence math, quality scaling, complex mod-domain data, or full PoB calculations and that data is not safely available:

```text
preserve raw modifier
mark unknown/partial
defer
```

---

## 28. UI behavior

The Gear section may show locality where useful.

Example:

```text
+100 to maximum Energy Shield
semantic: maximum-energy-shield
locality: local
```

or:

```text
120% increased Armour
semantic: increased-armour
locality: unknown
```

A details/debug section is acceptable if this is too verbose for the normal view.

---

## 29. User-facing wording

Keep the distinction:

```text
coverage/confidence
!=
item quality
```

For unknown locality, use parser-uncertainty wording such as:

```text
Parsed modifier; item/global scope unresolved.
```

---

## 30. Required automated tests

Add tests for at minimum:

- flat ES on an appropriate ES item is not globally classified;
- deterministic local ES becomes `local`;
- deterministic global ES syntax, if supported, becomes `global`;
- ambiguous ES becomes `unknown`;
- resistance remains global;
- attributes remain global where deterministic;
- weapon local damage does not become global;
- attack speed/crit/accuracy follow contextual rules;
- conditional modifier does not become semantically complete;
- unknown locality lowers semantic coverage;
- unknown locality affects confidence deterministically;
- raw line remains preserved;
- no item score/ranking API appears;
- passive scoring regression remains unchanged;
- real PoB2 item fixture passes;
- GGG/fixture normalized items remain compatible.

---

## 31. Existing STEP-017 regressions

Preserve:

```text
canonical slot mapping
duplicate-slot diagnostics
unknown-slot diagnostics
range parsing
conditional parsing
unsupported lines
gear readiness separation
provider neutrality
real PoB2 fixture F
passive score regressions
```

---

## 32. Gear normalization version

Because identical raw item text may now normalize to a different locality and semantic-completeness result, increment:

```text
GEAR_NORMALIZATION_VERSION
```

Recommended:

```text
1 → 2
```

Document the reason.

---

## 33. Source/build checksums

Do not change PoB2 source checksum semantics.

Keep source identity separate from gear normalization version.

---

## 34. Documentation

Create:

```text
docs/progress/STEP-017A-gear-modifier-locality-fidelity.md
```

Include the normal progress sections plus:

```text
Original Locality Problem
Energy Shield Correction
Item Context Model
Locality Resolver Design
Locality-Sensitive Family Audit
Armour / Evasion / Deflection Policy
Weapon Damage Policy
Attack Speed / Crit / Accuracy Policy
Global Stat Policy
Semantic Coverage Change
Confidence / Readiness Change
Real PoB2 Locality Fixtures
Locality Rule Inventory
Provider-Neutral Boundary
Normalization Version
Passive-Scoring Regression
Remaining Locality Risks
Character-Total Status
PoB2 Calculation-Engine Status
```

---

## 35. Decision log

Update `docs/planning/DECISION_LOG.md` for material decisions including:

```text
locality requires item context
unknown preferred to guessed locality
Energy Shield locality policy
weapon local-mod policy
semantic completeness requires known locality
GEAR_NORMALIZATION_VERSION = 2
```

---

## 36. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run `npm audit` only if dependency files change.

Default tests must not require network access, running PoB2, GGG credentials, poe.ninja, or AI.

---

## 37. Non-goals

Do not implement:

- item quality score;
- best/worst gear ranking;
- upgrade recommendations;
- gear replacement search;
- market-value comparison;
- crafting;
- character Life/ES/Armour/Evasion totals;
- weapon DPS;
- exact DPS/EHP;
- PoB2 calculation engine;
- character-aware scoring;
- AI item interpretation.

---

## 38. Expected result

After STEP-017A, the gear engine should behave like:

```text
Body Armour

+100 to maximum Energy Shield
  parsed: yes
  semantic: maximum-energy-shield
  locality: local
  understood: yes

+35% Fire Resistance
  parsed: yes
  semantic: fire-resistance
  locality: global
  understood: yes

120% increased Armour
  parsed: yes
  semantic: increased-armour
  locality: unknown
  understood: no
```

rather than incorrectly treating all defensive item modifiers as character-wide globals.

---

## 39. Readiness target

After STEP-017A, the gear engine should be safe to freeze as the MVP deterministic gear-normalization layer:

```text
understand what can be proved
expose what cannot be proved
unknown != zero
parser confidence != item quality
```

This does not mean gear is character-aware scored.

---

## 40. Stop condition

After implementation, locality audit, real-fixture validation, tests, browser verification, and documentation are complete:

**STOP.**

Do not automatically start character-context scoring, the PoB2 calculation engine, or gear upgrade recommendations.

Wait for explicit review and approval.
