# STEP-018 — Character-context relevance model

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a deterministic character-context layer that explains **which stat families appear relevant to the imported build** without assigning arbitrary numerical values to those stats.

The current architecture already provides:

```text
PoB2 build import
passive-tree allocation
weapon-set allocation
ascendancy context
skill groups
main skill resolution where deterministic
support-role preservation
equipment normalization
gear modifier parsing
gear semantic coverage/locality
configuration preservation
```

STEP-018 must combine those normalized sources into a provider-neutral `CharacterContext` that answers questions such as:

```text
What is the primary skill?
Which offensive mechanics are clearly present?
Which defensive mechanics are clearly present?
Which gear/passive stat families have evidence of relevance?
Which mechanics are unresolved?
How confident are we in those conclusions?
```

This step must **not** calculate exact DPS/EHP, assign build-value weights, rank upgrades, or call the PoB2 calculation engine.

---

## 2. Why STEP-018 changed

The original roadmap used STEP-018 for budget-aware upgrade prioritization. That assumed STEP-017 would already assign slot-specific gear scores and target-stat values.

The current architecture deliberately avoided that because:

```text
item imported
!=
item understood
!=
item relevant to this build
!=
item valuable to this build
```

PoB2 is now the primary MVP build source and provides richer context than the original GGG-first plan.

The correct dependency order is now:

```text
import build
    ↓
understand passives / skills / gear / config
    ↓
STEP-018: understand build context
    ↓
future PoB2 calculation spike
    ↓
measure candidate deltas
    ↓
future budget-aware upgrade prioritization
```

---

## 3. Core design rule

Hard invariant:

```text
relevance
!=
value
```

STEP-018 may conclude:

```text
Projectile Damage appears relevant.
Critical Strike appears relevant.
Minion Damage has no supporting evidence.
Energy Shield appears to be part of the defensive setup.
```

STEP-018 must not conclude:

```text
Projectile Damage weight = 8.7
Crit is worth more than Attack Speed
Helmet is the weakest item
Buy projectile damage before life
```

Those require a later evaluation/calculation layer.

---

## 4. Acceptance criteria

- [ ] Character context is built from normalized provider-neutral data.
- [ ] PoB2 remains the primary real MVP source.
- [ ] The context layer does not parse PoB2 XML directly.
- [ ] Primary/main skill context is consumed when resolved.
- [ ] Multiple skill groups are preserved in context.
- [ ] Support relationships are consumed only when deterministic.
- [ ] Ascendancy context is included.
- [ ] Main-tree/passive evidence can contribute to relevance.
- [ ] Gear modifier evidence can contribute to relevance.
- [ ] Configuration can contribute only when meaning is deterministic.
- [ ] Offensive mechanic families are represented explicitly.
- [ ] Defensive mechanic families are represented explicitly.
- [ ] Build relevance uses explicit evidence rather than generic weights.
- [ ] Unknown/unsupported mechanics remain unresolved.
- [ ] Absence of evidence is not silently converted into negative evidence.
- [ ] Relevance confidence/readiness is explicit.
- [ ] No numerical stat-value weights are introduced.
- [ ] No exact DPS/EHP calculations are introduced.
- [ ] No gear ranking is introduced.
- [ ] No upgrade recommendations are introduced.
- [ ] No economy/price logic is introduced.
- [ ] Passive heuristic scoring remains unchanged.
- [ ] Gear-normalization semantics remain unchanged.
- [ ] Tests require no network access.
- [ ] Required repository checks pass.
- [ ] Create `docs/progress/STEP-018-character-context-relevance-model.md`.

---

## 5. Scope

STEP-018 may implement:

```text
character-context package/module
main-skill context
skill-tag/mechanic context
support context
ascendancy context
passive relevance evidence
gear relevance evidence
configuration relevance evidence
offensive mechanic inventory
defensive mechanic inventory
relevance evidence model
relevance confidence/readiness
analysis-screen context summary
tests
documentation
```

STEP-018 must not implement:

```text
PoB2 calculation engine
exact damage
exact EHP
generic build weights
gear score
worst-slot ranking
upgrade recommendations
trade search
price ranking
crafting advice
AI interpretation
```

---

## 6. Recommended package boundary

Prefer a dedicated package such as:

```text
packages/character-context
```

or a clearly isolated equivalent module.

Recommended dependency direction:

```text
domain
   ↑
character-context
   ↑
web

data-sources
   ↓
domain

passive-engine / gear-engine
   ↓
normalized evidence
   ↓
character-context
```

Avoid circular dependencies. The context layer should consume normalized results rather than provider-specific XML/API payloads.

---

## 7. Provider-neutral input

Conceptually:

```text
CharacterContextInput
  character
  skills
  equipment
  passive evidence
  gear analysis
  ascendancy
  configuration
  source metadata
```

The same API should work for PoB2, GGG, and fixtures when those providers supply enough normalized data.

Do not create a separate PoB2-specific relevance engine.

---

## 8. Primary skill context

Use the normalized main-skill result from the PoB2 importer.

Possible states:

```text
resolved
unresolved
missing
```

If resolved, preserve skill name/id, group, source gem/effect, and deterministic support relationships.

If unresolved:

```text
do not guess from first skill group
do not guess from highest-level gem
do not use AI
```

Context readiness should reflect the limitation.

---

## 9. Multiple skill groups

Preserve all meaningful active skill groups.

Distinguish conceptually:

```text
primary skill
secondary active skills
utility skills
unknown-role groups
```

Only apply those labels when deterministic evidence exists.

If a secondary skill may matter but its role cannot be classified, keep its role unresolved rather than dropping it.

---

## 10. Skill mechanics / tags

Create a bounded inventory of supported skill/build mechanic categories, for example:

```text
attack
spell
projectile
melee
area
critical-strike
elemental
physical
fire
cold
lightning
chaos
minion
totem
duration
ailment
channelled
movement
triggered
```

Only include categories derived deterministically from supported data.

Do not infer mechanics from display names unless a checked mapping exists.

---

## 11. Skill fact source

Reuse checked deterministic skill facts where already available.

If STEP-016.5A's small skill fact table is insufficient:

```text
preserve unresolved mechanic tags
```

Do not broadly hand-copy the full PoB2 gem database in this step.

A broader skill-data ingestion layer may be added later if justified.

---

## 12. Support context

Supports may provide evidence that a mechanic matters.

Example:

```text
projectile-focused support
→ evidence for projectile relevance
```

But support presence must not become a numerical value.

Only use deterministic support-role data. Unknown support applicability remains unresolved.

---

## 13. Ascendancy context

Preserve:

```text
class
ascendancy name
ascendancy passive ids where available
```

Ascendancy may provide relevance evidence only when the mechanic is deterministically known.

Do not infer every characteristic of an ascendancy from its name.

Do not score ascendancy nodes in the current main-tree heuristic.

---

## 14. Passive-tree evidence

Use normalized passive allocations and supported passive semantics as evidence.

Examples:

```text
allocated projectile-damage nodes
→ projectile relevance evidence

allocated crit nodes
→ crit relevance evidence

evasion/deflection nodes
→ defensive evidence
```

Important:

```text
allocated stat
→ evidence of build intent/use
```

not:

```text
allocated stat
→ proof it is optimal
```

Do not convert passive heuristic weights into character-context truth.

---

## 15. Gear evidence

Use STEP-017/017A/017B gear semantics only where the semantic family and required locality are known and conditions are not unresolved.

Examples:

```text
global projectile damage modifier
→ projectile relevance evidence

local weapon physical damage
→ weapon/physical evidence

unknown-locality armour modifier
→ does NOT become confirmed character-armour evidence
```

Unsupported gear lines remain unresolved evidence.

---

## 16. Configuration evidence

Configuration values may influence context only when their meaning is deterministic.

STEP-018 must not implement PoB2 calculation semantics.

If a config key's game meaning is not safely mapped:

```text
preserve it
do not use it as relevance evidence
```

---

## 17. Offensive relevance inventory

Represent offensive relevance explicitly.

Conceptually:

```text
offense:
  projectile:
    relevance: relevant | unresolved | no-evidence
    evidence: [...]
  crit:
    relevance: relevant | unresolved | no-evidence
    evidence: [...]
```

Do not use a 0–100 relevance score.

Prefer categorical relevance plus evidence.

---

## 18. Defensive relevance inventory

Represent defensive mechanics separately.

Candidate categories:

```text
life
energy-shield
armour
evasion
deflection
block
resistances
avoidance
recovery
movement/mobility
```

Only mark a category relevant when deterministic evidence exists.

Do not calculate final defensive totals.

---

## 19. Relevance states

Recommended states:

```text
relevant
no-evidence
unresolved
```

### relevant

There is deterministic supporting evidence.

### no-evidence

The available supported data contains no evidence for the mechanic. This must not automatically mean `irrelevant`.

### unresolved

Important source data exists but cannot be interpreted safely.

Do not collapse `no-evidence` and `unresolved`.

---

## 20. Evidence model

Every relevance conclusion should be explainable.

Conceptually:

```text
RelevanceEvidence
  sourceType:
    skill
    support
    passive
    gear
    ascendancy
    configuration

  sourceId
  rawLabel
  semanticFamily
  confidence
```

A conclusion should expose its supporting evidence.

No hidden scoring.

---

## 21. Evidence strength

If useful, classify evidence strength categorically:

```text
direct
supporting
weak
```

Examples:

```text
main skill tag projectile
→ direct

allocated projectile node
→ supporting

single ambiguous parsed item mod
→ weak/unresolved
```

Do not turn evidence strength into disguised build-value ranking.

---

## 22. Context confidence / readiness

Expose a separate context readiness object.

Conceptually:

```text
contextReadiness:
  status:
    ready
    partial
    insufficient

  primarySkillResolved
  skillMechanicsCoverage
  gearSemanticCoverage
  passiveSemanticCoverage
  unresolvedMechanics
  warnings
```

Keep it separate from passive-analysis readiness and gear-analysis readiness.

---

## 23. Primary-skill dependency

If the primary skill is unresolved:

```text
context readiness
→ usually partial
```

but the system may still report defensive, gear, or passive evidence.

Do not make the entire context unusable solely because main skill is unresolved.

---

## 24. No generic weights

Do not introduce:

```text
projectile = 10
crit = 8
life = 7
```

The current passive heuristic remains separate and must not be reused as character-context relevance values.

---

## 25. No automatic upgrade priorities

Do not derive:

```text
crit is more important than life
boots need upgrading before helmet
projectile damage should be bought first
```

from relevance alone.

That belongs after measurable build-delta evaluation.

---

## 26. No economy usage

Do not call poe.ninja, trade endpoints, or market data in STEP-018.

Economy answers what something may cost, not how valuable it is to this build.

---

## 27. Relationship to passive heuristic

The passive heuristic remains unchanged.

STEP-018 may consume passive semantic evidence but must not change scores, weights, or path ranking.

Do not create circular behavior where context feeds back into current heuristic scoring during this step.

---

## 28. Relationship to gear-engine

STEP-018 consumes gear-engine output and must respect:

```text
unsupported != zero
unknown locality != global
parser confidence != item quality
```

Do not reinterpret low parser confidence as low item quality.

---

## 29. Relationship to future PoB2 calculation integration

STEP-018 prepares the vocabulary for the later calculation spike.

Future calculation work may compare metrics such as:

```text
damage
crit chance
attack/cast rate
life
energy shield
evasion
deflection
resistances
other supported outputs
```

STEP-018 should help identify relevant metric families.

It must not execute those calculations.

---

## 30. Character-context result

Suggested shape:

```text
CharacterContext {
  version
  source

  primarySkill
  skillGroups

  offense
  defense

  ascendancy
  weaponContext

  unresolvedMechanics

  readiness
}
```

Exact TypeScript structure may differ.

Keep it deterministic and schema-validated.

---

## 31. Context normalization version

Introduce:

```text
CHARACTER_CONTEXT_VERSION = 1
```

Change it when the same normalized build can produce different relevance semantics.

Do not reuse PoB2 normalization, gear normalization, or passive scoring versions.

---

## 32. Determinism

The same normalized build plus relevant semantic versions must produce the same context result.

No LLM, randomness, live economy data, or network dependency may affect relevance.

---

## 33. Real PoB2 fixture coverage

Use stored real PoB2 fixtures where possible.

Add a new real fixture only if current fixtures do not provide enough context.

Prefer coverage for:

```text
resolved primary skill
supports
offensive passive evidence
defensive gear/passive evidence
ascendancy context
configuration values
```

Do not use private player builds.

---

## 34. Synthetic context fixtures

Use synthetic fixtures for targeted combinations such as:

```text
resolved main skill + no gear
unresolved main skill + defensive passives
projectile skill + projectile support
crit passives + no crit skill evidence
minion stat on non-minion context
unsupported skill mechanics
low gear semantic coverage
```

---

## 35. Required tests — primary skill

Add tests for at least:

- resolved main skill is preserved;
- unresolved main skill remains unresolved;
- main skill is never guessed from raw gem order;
- multiple groups remain distinct;
- unknown support roles do not become evidence.

---

## 36. Required tests — offensive relevance

Add tests for at least:

- direct projectile evidence;
- critical-strike evidence;
- physical/elemental evidence where deterministic;
- unsupported offensive mechanic remains unresolved;
- passive evidence contributes without value weights;
- gear evidence contributes only when semantic/locality confidence permits.

---

## 37. Required tests — defensive relevance

Add tests for at least:

- Energy Shield evidence;
- Evasion evidence;
- Deflection evidence;
- Life evidence;
- unresolved Armour locality does not become confirmed armour relevance from that line alone;
- defensive relevance does not calculate final totals.

---

## 38. Required tests — no-evidence vs unresolved

Explicitly test:

```text
no evidence
!=
unresolved evidence
```

Example:

```text
no minion-related supported data
→ no-evidence

unsupported source data that might involve minions
→ unresolved
```

Do not silently mark both irrelevant.

---

## 39. Required tests — architecture boundaries

Verify:

- no item score API;
- no gear ranking;
- no upgrade prioritization;
- no economy calls;
- no PoB2 calculation execution;
- passive recommendation unchanged;
- gear normalization unchanged;
- provider boundaries remain independent.

---

## 40. Analysis-screen integration

Add a compact Build Context section.

Example:

```text
Build context

Primary skill:
Twister
status: resolved

Offensive mechanics:
Projectile       relevant
Critical Strike  relevant
Physical         unresolved

Defensive mechanics:
Evasion          relevant
Deflection       relevant
Energy Shield    relevant/supporting evidence

Unresolved:
2 mechanics

Context readiness:
partial
```

Every conclusion should be inspectable for evidence.

---

## 41. Evidence details UI

A detail view may show:

```text
Projectile relevance evidence:
- main skill
- support
- allocated passive
- gear modifier
```

Do not display numerical relevance scores.

Keep the default view concise.

---

## 42. User-facing wording

Preferred wording:

```text
Relevant based on imported build evidence
No supported evidence found
Unresolved from current parser/data
```

Avoid:

```text
best
bad
must-have
useless
weak
optimal
```

unless later calculation evidence justifies those terms.

---

## 43. Security/privacy

Do not send build context externally.

No AI provider and no network calls.

Treat imported text as untrusted text.

Existing PoB2 and gear security guarantees remain unchanged.

---

## 44. Performance

Context analysis should be a deterministic small aggregation over already-normalized build data.

Avoid:

```text
tree search
trade search
external calls
PoB execution
combinatorial gear simulation
```

---

## 45. Documentation

Create:

```text
docs/progress/STEP-018-character-context-relevance-model.md
```

Follow the normal progress-document protocol.

Also include:

```text
Why Original STEP-018 Changed
Current Build Source Architecture
Provider-Neutral Context Boundary
Primary Skill Policy
Skill-Mechanic Inventory
Support Evidence Policy
Ascendancy Evidence Policy
Passive Evidence Policy
Gear Evidence Policy
Configuration Evidence Policy
Offensive Relevance Model
Defensive Relevance Model
No-Evidence vs Unresolved
Evidence Model
Context Confidence / Readiness
No-Weight Rule
No-Ranking Rule
Fixture Provenance
UI Integration
Passive Regression
Gear Regression
Context Version
Known Context Limitations
PoB2 Calculation-Engine Status
Budget-Aware Upgrade Status
```

---

## 46. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
original STEP-018 budget prioritization deferred
character context inserted before upgrade valuation
relevance != value
no generic context weights
no-evidence != unresolved
provider-neutral context boundary
CHARACTER_CONTEXT_VERSION = 1
```

---

## 47. Roadmap impact

After STEP-018, the recommended sequence becomes:

```text
STEP-018
Character-context relevance model

STEP-018A
PoB2 calculation-engine integration spike

STEP-018B
Character-aware delta evaluator

STEP-018C
Budget-aware upgrade prioritization
(original STEP-018 goal)
```

Do not implement those automatically. Each requires separate review/approval.

---

## 48. Relationship to future STEP-018A

STEP-018A should investigate whether PoB2 can be used programmatically/headlessly to:

```text
load build
calculate baseline
apply candidate change
recalculate
return deterministic outputs
```

STEP-018 should make that spike easier by giving it a normalized set of relevant metric families.

---

## 49. Relationship to future budget-aware upgrades

The future flow should become:

```text
current build
    ↓
candidate change
    ↓
measured build delta
    ↓
economy estimate
    ↓
opportunity-cost comparison
```

not:

```text
generic stat score
    ↓
price
    ↓
upgrade ranking
```

---

## 50. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run `npm audit` only if dependency files change.

Canonical `npm test` must pass using the repository's standard configuration.

Default tests must require no network access, PoB2 executable, GGG credentials, poe.ninja, or AI keys.

---

## 51. Non-goals

Do not implement:

- numerical build stat weights;
- exact DPS;
- exact EHP;
- character resistance totals;
- character Life/ES totals;
- gear scores;
- best/worst slot ranking;
- upgrade recommendations;
- price-aware upgrade ranking;
- crafting recommendations;
- PoB2 calculation engine;
- AI build classification;
- trade searches.

---

## 52. Expected result

After STEP-018, PoE2 Buddy should be able to say:

```text
Primary skill:
resolved

Offensive build context:
Projectile
  relevant
  evidence:
    main skill
    support
    passive allocation

Critical Strike
  relevant
  evidence:
    passive allocation
    gear modifier

Minion
  no supported evidence

Defensive build context:
Evasion
  relevant

Deflection
  relevant

Energy Shield
  supporting evidence

Unknown mechanics:
2

Context readiness:
partial
```

It should not say:

```text
Projectile Damage is worth 9/10.
Crit is more valuable than Life.
Upgrade your gloves first.
Spend 3 divines on this stat.
```

---

## 53. Readiness target

After STEP-018, PoE2 Buddy should have three trustworthy deterministic layers:

```text
1. passive-tree semantics
2. gear semantics
3. character-context relevance
```

That is the minimum foundation required before evaluating whole-build candidate changes.

---

## 54. Stop condition

After implementation, tests, browser verification, and documentation are complete:

**STOP.**

Do not automatically begin:

```text
STEP-018A
PoB2 calculation-engine integration

STEP-018B
character-aware delta evaluation

STEP-018C
budget-aware upgrade prioritization
```

Wait for explicit review and approval.
