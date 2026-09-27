# STEP-017B — Locality rule corrections and canonical test stability

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-017B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the remaining blockers from STEP-017A before freezing the deterministic gear-normalization layer.

STEP-017A successfully made modifier locality item-context-aware, but review identified three remaining issues:

```text
1. Cast Speed is incorrectly treated as local on weapon slots.

2. Bare increased Elemental Damage is incorrectly treated as local
   merely because the item is a weapon.

3. The canonical repository command:
   npm test
   still times out under default parallel execution.
```

STEP-017B must correct those rules and restore a reliable canonical test command.

Do not expand scope beyond these issues unless a directly related regression is exposed.

Do not implement:

```text
gear scoring
character totals
PoB2 calculation engine
character-aware scoring
upgrade recommendations
```

---

## 2. Why this step exists

The current STEP-017A locality inventory still contains rules that are too broad.

A deterministic gear parser must prefer:

```text
known global
known local
unknown
```

over:

```text
weapon slot
→ therefore local
```

when the wording/mod domain does not justify that conclusion.

The test suite must also have a single reliable canonical command. A passing alternative serial command is useful for diagnosis but is not a substitute for:

```bash
npm test
```

passing normally.

---

## 3. Acceptance criteria

- [ ] Ordinary supported `increased Cast Speed` grammar is no longer classified local merely because the item is a weapon.
- [ ] Supported normal Cast Speed grammar is classified global when deterministic.
- [ ] Bare `increased Elemental Damage` is no longer classified local merely because the item is a weapon.
- [ ] Explicitly scoped elemental-damage grammar remains correctly classified.
- [ ] Unknown elemental-damage locality remains `unknown` where deterministic evidence is insufficient.
- [ ] Existing local weapon physical-damage behavior remains unchanged.
- [ ] Existing local weapon attack-speed behavior remains unchanged where supported.
- [ ] Existing crit/accuracy contextual rules remain conservative.
- [ ] Locality inventory is updated to reflect the corrected policies.
- [ ] Real/synthetic locality tests cover the corrected cases.
- [ ] `GEAR_NORMALIZATION_VERSION` changes only if normalized semantics require it.
- [ ] Passive scoring remains unchanged.
- [ ] No gear score/ranking API is introduced.
- [ ] `npm test` passes using the canonical command.
- [ ] Typecheck, lint, format, and format check pass.
- [ ] Default tests require no network access.
- [ ] Create:
      `docs/progress/STEP-017B-locality-rule-corrections-and-test-stability.md`

---

## 4. Scope

STEP-017B may change:

```text
gear locality rule inventory
Cast Speed locality rule
Elemental Damage locality rule
related tests/fixtures
test runner configuration
root npm test script if necessary
Vitest worker/parallelism configuration
documentation
```

STEP-017B must not change:

```text
passive path search
passive weights
Top-K ranking
gear quality scoring
gear ranking
upgrade advice
pricing
crafting
PoB2 calculation engine
character-aware scoring
```

---

## 5. Cast Speed correction

The current STEP-017A inventory classifies:

```text
cast-speed
→ contextual
→ local on weapon slot
```

That rule is too broad.

For the supported ordinary grammar:

```text
X% increased Cast Speed
```

treat locality as:

```text
global
```

unless a different explicitly supported syntax is independently proven to be local.

Do not classify Cast Speed as local solely because the item is:

```text
wand
staff
focus
weapon slot
```

---

## 6. Cast Speed hard rule

For the grammar supported by the current parser:

```text
ordinary increased Cast Speed
→ global
```

If a future variant cannot be safely interpreted:

```text
locality = unknown
```

Do not create a contextual weapon rule unless real deterministic data supports it.

---

## 7. Cast Speed regression examples

Add tests for at least:

```text
Wand:
10% increased Cast Speed
→ global

Focus:
12% increased Cast Speed
→ global

Ring:
8% increased Cast Speed
→ global
```

If item/slot syntax differs in the current fixture system, use equivalent normalized contexts.

---

## 8. Increased Elemental Damage correction

The current STEP-017A inventory classifies:

```text
increased-elemental-damage
→ contextual
→ local on weapon slot
```

That is unsafe.

Weapon slot alone is not enough to classify:

```text
X% increased Elemental Damage
```

as local.

---

## 9. Elemental Damage policy

Use grammar/scope evidence first.

Examples:

### Explicit global scope

```text
X% increased Elemental Damage with Attacks
```

or equivalent already-supported explicit attack/spell scope:

```text
locality = global
```

### Deterministically global bare grammar

If the current supported bare grammar is verified as character-wide:

```text
X% increased Elemental Damage
→ global
```

### Ambiguous grammar

If the project does not have enough deterministic evidence:

```text
locality = unknown
```

Do not default to local just because the item is a weapon.

---

## 10. Prefer evidence over coverage

If correcting elemental-damage locality reduces semantic coverage:

```text
that is acceptable
```

Do not retain an unsafe `local` classification to keep confidence high.

The parser should report uncertainty honestly.

---

## 11. Existing physical weapon damage rule

Do not accidentally remove valid local behavior for supported weapon physical-damage grammar.

Preserve where already proven:

```text
Adds X to Y Physical Damage
on main-hand weapon
→ local

X% increased Physical Damage
on supported weapon context
→ local
```

If a specific physical-damage syntax is actually ambiguous, keep it conservative.

Do not broaden this step into a full weapon-mod-domain rewrite.

---

## 12. Attack Speed policy

Preserve existing supported behavior where deterministic:

```text
weapon attack-speed modifier
→ local
```

Do not change glove attack speed to global/local unless the existing rule already supports it safely.

Current conservative behavior for non-weapon contexts should remain.

---

## 13. Critical Strike Chance policy

Keep the rule order safe:

```text
explicit attack/spell/global scope
→ honor explicit scope first

contextual weapon-local grammar
→ local only when deterministic

otherwise
→ unknown
```

Do not make all weapon crit modifiers local simply from slot alone.

Only change this family if a regression test exposes a direct issue while fixing STEP-017B.

---

## 14. Accuracy policy

Preserve the same conservative rule:

```text
weapon-local grammar
→ local where deterministic

otherwise
→ unknown/global only with explicit evidence
```

Do not broaden this step unnecessarily.

---

## 15. Updated locality inventory

Update the inventory so it no longer states:

```text
cast-speed
→ contextual/local on weapon
```

or:

```text
increased-elemental-damage
→ contextual/local on weapon
```

unless a narrower explicitly supported grammar justifies it.

The inventory should clearly distinguish:

```text
semantic family
grammar variant
locality mode
required context
evidence/test coverage
```

---

## 16. Grammar variants over family-wide assumptions

If one semantic family contains multiple locality behaviors, split the grammar or rule representation.

Prefer:

```text
elemental-damage
  bare/global-or-unknown
  with-attacks/global
  with-spells/global
```

over:

```text
elemental-damage
  contextual by slot
```

Likewise, avoid family-wide locality when wording variants differ.

---

## 17. Semantic coverage

After corrections:

```text
known locality
→ may count as semantically understood

unknown locality
→ parsed but not semantically understood
```

Do not special-case Cast Speed or Elemental Damage to preserve old confidence.

---

## 18. Confidence/readiness regression

Recalculate affected item confidence normally.

If an item moves:

```text
complete → high
high → partial
```

because an unsafe locality classification was removed, that is correct.

Document any real fixture whose confidence changes.

---

## 19. Real fixture coverage

Use existing real PoB2 fixture F where possible.

If fixture F does not contain the required Cast Speed or Elemental Damage cases, add the smallest additional real PoB2 fixture needed.

Preferred cases:

```text
real caster item with increased Cast Speed

real item with increased Elemental Damage
```

If a new export is generated, record:

```text
PoB2 version
commit
slot
base
raw line
expected locality
truth provenance
```

Do not copy private player builds.

---

## 20. Synthetic tests

Synthetic locality tests must cover at minimum:

```text
Cast Speed on weapon → global
Cast Speed on non-weapon → global
bare increased Elemental Damage on weapon → global or unknown according to verified rule
explicit Elemental Damage with Attacks → global
weapon physical damage → still local
weapon attack speed → still local
unknown locality → still reduces semantic completeness
```

Keep raw modifier lines preserved in every test.

---

## 21. No regression to Energy Shield

Preserve STEP-017A Energy Shield rules:

```text
ES-bearing armour/off-hand + supported ES grammar
→ local where deterministic

jewellery flat max ES
→ global where deterministic

insufficient context
→ unknown
```

STEP-017B must not reopen that logic unless a direct failing regression requires it.

---

## 22. No regression to Armour/Evasion/Deflection

Preserve:

```text
Armour
Evasion
Deflection
→ unknown
```

where STEP-017A intentionally left them unresolved.

Do not mark them local just because this step touches the locality inventory.

---

## 23. Gear normalization version

Evaluate whether the corrected rules change normalized output for the same raw item/context.

They likely do.

If so, increment:

```text
GEAR_NORMALIZATION_VERSION
2 → 3
```

If no actual normalized result changes because the affected grammar was never emitted, document why the version remains 2.

Do not change the version mechanically without justification.

---

## 24. Canonical `npm test` requirement

This step must restore:

```bash
npm test
```

as the reliable canonical test command.

Do not finish the step with:

```text
npm test failed
but another custom command passed
```

The canonical command itself must pass.

---

## 25. Diagnose test timeouts

The STEP-017A failure was:

```text
11 snapshot-heavy tests timed out
under parallel file execution
```

while:

```bash
npx vitest run --maxWorkers=1 --no-file-parallelism
```

passed.

Treat that as a test-runner stability issue unless assertions prove otherwise.

Do not change production logic to make tests faster unless a real performance bug exists.

---

## 26. Preferred test-stability fix

Prefer a repository-level deterministic configuration.

Potential solutions include:

```text
reasonable maxWorkers
reduced file parallelism for heavy snapshot suites
Vitest config pool settings
canonical npm test script using stable worker limits
```

Choose the smallest approach that:

```text
keeps useful parallelism where possible
makes npm test reliable
does not hide assertion failures
```

---

## 27. Avoid scattered timeout inflation

Do not solve this by increasing many individual test timeouts unless a specific test truly needs longer.

A systemic parallel-load problem should be fixed systemically.

One or two intentionally expensive tests may still have explicit timeouts when justified.

Document the decision.

---

## 28. Do not weaken assertions

Test stability fixes must not:

```text
skip tests
mark tests flaky
disable suites
remove snapshot validation
swallow failures
retry indefinitely
```

All current assertions must continue to execute.

---

## 29. Canonical test command

After the fix, run exactly:

```bash
npm test
```

and record:

```text
files passed
tests passed
duration
worker/parallel configuration
```

Do not rely on a second command to establish success.

---

## 30. Required full checks

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

only if dependency/package-lock changes require it.

If package scripts or Vitest config change without external dependency changes, explain whether `npm audit` was necessary.

---

## 31. Default test environment

Default tests must continue to require no:

```text
network access
PoB2 executable
GGG credentials
poe.ninja
AI key
```

Real PoB2 fixture generation may remain a manual/development action.

Committed tests must use stored fixture data.

---

## 32. Passive regression

Verify that:

```text
Witch fixture
first offensive candidate
[1755, 41965]
heuristicScore 32
profile version 1
```

remains unchanged.

STEP-017B must not touch passive weights, Top-K, or path enumeration.

---

## 33. Gear ranking guardrail

Confirm there is still no public API such as:

```text
scoreEquipment
rankGear
findWorstItem
recommendReplacement
```

This step remains semantics/test hardening only.

---

## 34. Security

No new network access.

No external mod database calls at runtime.

No evaluation of item text.

Raw item lines remain React-escaped text.

Existing PoB2 import protections remain unchanged.

---

## 35. Documentation

Create:

```text
docs/progress/STEP-017B-locality-rule-corrections-and-test-stability.md
```

Follow the normal progress-document protocol.

Also explicitly include:

```text
Remaining STEP-017A Blockers
Cast Speed Correction
Elemental Damage Correction
Locality Inventory Changes
Regression Rules Preserved
Fixture Evidence
Semantic Coverage Impact
Confidence Changes
Gear Normalization Version Decision
Original npm test Failure
Test Runner Root Cause
Canonical Test Configuration
Canonical npm test Result
Passive Regression
Remaining Gear-Locality Risks
PoB2 Calculation-Engine Status
Character-Aware Scoring Status
```

---

## 36. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions such as:

```text
Cast Speed supported grammar is global
Elemental Damage locality must be grammar/scope-driven
weapon slot alone does not imply local
canonical test worker/parallelism policy
GEAR_NORMALIZATION_VERSION change if applicable
```

---

## 37. Non-goals

Do not implement:

- item score;
- worst-slot ranking;
- upgrade recommendations;
- trade search;
- price comparison;
- crafting;
- character resistance totals;
- Life/ES totals;
- item defence calculation;
- weapon DPS;
- exact DPS/EHP;
- PoB2 calculation engine;
- character-aware scoring;
- AI gear interpretation.

---

## 38. Expected locality result

After STEP-017B, behavior should conceptually be:

```text
Wand:
10% increased Cast Speed
→ global

Wand:
80% increased Elemental Damage
→ global or unknown according to verified supported grammar
→ never local solely because it is a weapon

Wand:
Adds 10 to 20 Physical Damage
→ local where supported

Weapon:
12% increased Attack Speed
→ local where supported

Body armour:
+100 maximum Energy Shield
with ES property
→ local

Helmet:
50% increased Armour
→ unknown
```

---

## 39. Expected test result

The completion report must be able to state:

```text
npm test
PASS

npm run typecheck
PASS

npm run lint
PASS

npm run format:check
PASS
```

without requiring a substitute serial test invocation.

---

## 40. Readiness target

After STEP-017B, the deterministic gear-normalization layer should be considered ready to freeze for MVP use if no new blocker is found.

That means:

```text
locality rules are conservative
known global/local rules are evidence-based
unknown remains unknown
coverage reflects real understanding
canonical test suite is stable
```

This still does not mean:

```text
gear is character-aware scored
```

---

## 41. Stop condition

After rule corrections, test-stability fix, regression suite, browser verification if needed, and documentation are complete:

**STOP.**

Do not automatically begin:

```text
character-context scoring
PoB2 calculation-engine integration
gear upgrades
crafting
```

Wait for explicit review and approval.
