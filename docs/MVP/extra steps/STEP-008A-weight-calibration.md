# STEP-008A — Weight calibration and scoring sanity validation

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-008A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Validate and calibrate the heuristic weight profiles introduced in STEP-008 before the project uses those scores to produce Top-K passive-tree recommendations.

STEP-008 correctly implemented a deterministic, reliability-aware scoring engine. However, the quality of future recommendations now depends on the actual numeric weights in:

```text
offensive
defensive
balanced
```

profiles.

This step must verify that those weights are:

- explicit;
- documented;
- internally consistent;
- sensibly scaled across different stat units;
- different enough between objectives to produce meaningful behavior;
- stable under controlled synthetic comparisons;
- not presented as exact PoE2 power calculations.

Do **not** begin STEP-009 in this task.

---

## 2. Acceptance criteria

- [ ] Every semantic stat weight in every scoring profile is documented.
- [ ] Every supported operation weight is documented.
- [ ] No scoring weight is hidden inside scoring logic.
- [ ] The rationale for major relative weights is documented.
- [ ] Unit-scale differences are reviewed explicitly.
- [ ] Obvious synthetic comparisons produce sensible results.
- [ ] Offensive, defensive, and balanced profiles produce meaningfully different behavior where expected.
- [ ] Profile differences are deterministic and testable.
- [ ] `heuristicScore` remains a heuristic and is not described as DPS, EHP, or exact power.
- [ ] `scorePerPoint` remains secondary unless a deliberate documented decision changes ranking behavior.
- [ ] Current semantic-coverage and search-completeness guardrails remain unchanged.
- [ ] Unsupported effects remain unscored and visible.
- [ ] Calibration does not silently assign values to previously unsupported mechanics.
- [ ] Regression tests cover the calibrated behavior.
- [ ] Required repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-008A-weight-calibration.md`

---

## 3. Scope

STEP-008A validates the heuristic scoring model already implemented in STEP-008.

It may change:

```text
profile weight values
profile structure if needed for clarity
calibration tests
documentation
```

It should not redesign:

```text
path search
semantic parsing
path semantic coverage
search completeness
public reliability contracts
```

unless a concrete bug is discovered.

---

## 4. Baseline

STEP-008 currently uses:

```text
contribution = amount * weight
heuristicScore = sum(supported contributions)
```

Only supported semantic effects with supported operations are added.

Current scored operations:

```text
increased
reduced
added
```

Current unscored operations include:

```text
more
less
penetration
conversion
gain-as-extra
derived-from
chance
regeneration
```

Conditional/scoped effects remain unscored unless explicitly permitted by the STEP-008 policy.

Ranking currently uses:

```text
heuristicScore
```

not:

```text
scorePerPoint
```

Do not change that ranking rule casually.

---

## 5. Weight-table inventory

Create a deterministic report or documentation table showing every active weight.

At minimum include:

```text
semantic id
operation
offensive weight
defensive weight
balanced weight
notes/rationale
```

Example structure:

```text
projectile-damage
  increased:
    offensive: X
    defensive: Y
    balanced: Z
```

Do not omit weights that are zero or null.

The goal is that a developer can inspect the entire scoring philosophy without reading implementation code line-by-line.

---

## 6. Weight rationale

For each major semantic family or group, document why its relative weight exists.

The rationale does not need to claim mathematical correctness.

Acceptable rationale is heuristic and explicit, for example:

```text
Projectile damage receives a higher offensive weight than movement speed
because the offensive profile prioritizes direct damage scaling.
```

Do not write unsupported claims such as:

```text
1% projectile damage is exactly twice as valuable as 1% attack speed.
```

unless that relationship is actually derived from a calculation model.

---

## 7. Unit-scale review

Different PoE stats operate on very different numeric scales.

Explicitly review cases such as:

```text
+10 Strength
10% increased Evasion
10% increased Projectile Damage
1% Maximum Resistance
10% Movement Speed
10% Critical Hit Chance
```

Do not assume that:

```text
amount 10
```

means equal value across all semantic families.

If the current simple:

```text
amount * weight
```

model remains, weight values must compensate for those scale differences where practical.

Document that this is heuristic normalization, not exact combat math.

---

## 8. Offensive profile sanity

The offensive profile should prioritize offensive semantic families.

Create controlled synthetic examples that compare paths such as:

```text
Path A:
projectile damage

Path B:
evasion
```

The offensive profile should generally favor the offensive path when the synthetic values are intentionally chosen to represent comparable-sized nodes.

Also test reasonable comparisons involving:

```text
spell damage
attack damage
projectile damage
critical chance
critical damage
attack speed
cast speed
projectile speed
accuracy
```

Do not force every offensive stat into one universal ordering.

The objective is to detect obviously broken weights.

---

## 9. Defensive profile sanity

The defensive profile should prioritize defensive families such as:

```text
maximum life
energy shield
armour
evasion
deflection
block
resistances
```

Synthetic tests should show meaningful differences from the offensive profile.

For example:

```text
same two candidate paths
offensive profile → favors offense
defensive profile → favors defense
```

when the test is intentionally constructed for that expectation.

---

## 10. Balanced profile sanity

The balanced profile should not simply be an accidental duplicate of offensive or defensive.

Verify that it behaves as a deliberate compromise.

It does not need to be a mathematical average unless that is the documented design.

Test at least one synthetic scenario where:

```text
offensive chooses A
defensive chooses B
balanced produces a deliberate middle-ground result
```

or otherwise demonstrates distinct behavior.

---

## 11. Build-oriented sanity cases

Use small deterministic synthetic cases resembling real build priorities.

At minimum include examples involving:

### Projectile / crit

```text
projectile damage
critical chance
critical damage
projectile speed
```

### Evasion / Deflection

```text
evasion
deflection
```

### Life / defenses

```text
maximum life
energy shield
armour
block
resistance
```

The purpose is not to prove a universally correct build.

The purpose is to ensure the weight system is internally sensible.

---

## 12. Relative-stat sanity checks

Create tests for obvious pathological outcomes.

Examples:

- tiny utility stat should not dominate a large directly relevant offensive stat without documented reason;
- one point of maximum resistance should not accidentally be valued like one point of ordinary increased armour;
- flat attributes should not dominate all specialized offensive stats simply because attribute values are numerically larger;
- a defensive profile should not consistently rank offensive-only nodes highest;
- an offensive profile should not consistently rank defensive-only nodes highest.

These are sanity checks, not universal PoE truths.

---

## 13. Point-cost behavior

Keep:

```text
heuristicScore
pointCost
scorePerPoint
```

separate.

Primary ranking remains:

```text
heuristicScore
```

unless STEP-008A finds a clear reason to change it.

Do not automatically switch ranking to `scorePerPoint`.

Test a case like:

```text
Path A:
1 point
score 20

Path B:
5 points
score 60
```

If the budget allows Path B, the current design should not rank Path A higher merely because its score-per-point is better.

Document this behavior.

---

## 14. Mixed-confidence behavior

Do not weaken STEP-008 reliability rules during calibration.

A partial path with a larger raw score must not become a definitive winner over a complete path solely because calibration changed weights.

Test:

```text
complete path
lower heuristic score

partial path
higher heuristic score
```

Expected:

```text
comparison remains non-definitive
```

---

## 15. Truncated-search behavior

Calibration must not affect search-completeness rules.

A truncated search must still never produce:

```text
global optimum
best possible path
```

Test at least one calibrated candidate comparison using:

```text
searchCompleteness = truncated
```

and verify the claim remains within-search-limits only.

---

## 16. Unsupported-operation policy

Do not add heuristic values for:

```text
more
less
penetration
conversion
gain-as-extra
derived-from
chance
regeneration
conditional effects
```

solely to improve calibration coverage.

Supporting those operations requires a separate deliberate decision.

STEP-008A calibrates existing supported scoring.

It does not increase semantic/scoring coverage by guessing.

---

## 17. Weight normalization strategy

If useful, introduce explicit documentation or helpers for weight-scale categories.

Possible conceptual categories:

```text
percentage scaling
flat attributes
flat defenses
resistance percentages
speed percentages
critical percentages
```

This is optional.

Do not introduce complexity unless it makes the profile easier to understand and maintain.

---

## 18. Calibration source of truth

The calibration source of truth should be:

```text
explicit project heuristic decisions
+
controlled synthetic tests
+
known semantic meaning from the parser
```

Do not use:

```text
LLM guesses
random generated weights
opaque magic numbers without documentation
```

If external PoE2 calculation references are used later, document them separately.

No web/API research is required for this step unless explicitly chosen and documented.

---

## 19. Profile versioning

Consider assigning an explicit version/name to the calibration set.

Conceptually:

```text
offensive-v1
defensive-v1
balanced-v1
```

or a shared:

```text
scoringProfileVersion: 1
```

This is recommended if it can be added cleanly.

The goal is reproducibility:

```text
same tree pin
same build
same profile version
→ same heuristic score
```

Do not overengineer versioning if the existing configuration already provides equivalent reproducibility.

---

## 20. Tests

Add regression tests covering at minimum:

### Weight inventory

- all active semantic ids have intentional profile entries;
- unexpected missing/undefined weight configuration is detected where relevant.

### Objective differentiation

- offensive and defensive profiles make different choices in a controlled offense-vs-defense case;
- balanced behavior is deliberate and documented.

### Scale sanity

- attributes do not dominate solely because of larger raw amounts;
- maximum resistance is not treated like ordinary percentage scaling;
- movement/projectile speed does not accidentally overwhelm core offense or defense unless deliberately weighted that way.

### Point cost

- total score ranking remains distinct from score-per-point.

### Reliability

- partial higher-score candidate remains non-definitive;
- truncated result remains within-search-limits only.

### Determinism

- same input + same profile produces identical score;
- profile changes produce predictable score changes.

### Regression

All existing STEP-008 and prior tests must continue to pass unless an expected numeric score intentionally changes due to calibration.

If a score changes, document:

```text
old value
new value
reason
```

---

## 21. Pinned fixture validation

Re-score the existing pinned fixture examples after calibration.

At minimum:

```text
witch-offensive.json
```

and any other existing fixture suitable for a different objective.

Record:

```text
profile
path
point cost
heuristic score
semantic confidence
search completeness
main contributions
```

Do not claim that the chosen path is globally optimal unless the existing reliability contracts allow that claim.

---

## 22. Calibration report

Create a concise calibration summary in the progress document.

Include:

```text
Weight Table
Weight Rationale
Scale/Unit Review
Synthetic Scenario Results
Profile Differentiation
Pinned Fixture Results
Changed Weights
Remaining Heuristic Limitations
```

If no weights need changing after review, document that outcome explicitly.

---

## 23. Package boundaries

### `packages/scoring-engine`

May own:

- profile weights;
- calibration metadata/version;
- scoring tests;
- controlled comparison tests.

### `packages/passive-engine`

Do not move scoring preferences into the passive engine.

### `packages/domain`

No change unless a stable profile-version type is genuinely necessary.

---

## 24. External APIs / credentials

No credentials are required.

### GGG passive-tree data

Use the existing pinned snapshot.

### GGG OAuth

Not required.

### poe.ninja

Not required.

### AI provider

Not required.

No LLM may choose or modify scoring weights at runtime.

---

## 25. Non-goals

Do **not** implement:

- Top-K recommendation ranking across the full candidate set;
- STEP-009;
- exact DPS;
- exact EHP;
- PoB integration;
- conditional-stat simulation;
- gear scoring;
- crafting;
- trade pricing;
- OAuth;
- AI explanations;
- UI.

This step validates the scoring model only.

---

## 26. Decision-log requirements

Update:

```text
docs/planning/DECISION_LOG.md
```

for material calibration decisions including:

- weight-scale philosophy;
- profile differences;
- any changed weights;
- any profile versioning;
- decision to keep `heuristicScore` as primary ranking metric;
- any intentionally unusual relative weight.

---

## 27. Required commands

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

## 28. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-008A-weight-calibration.md
```

Follow the repository documentation protocol in full.

The completion document must include the normal progress sections plus:

```text
Complete Weight Tables
Weight Rationale
Scale / Unit Review
Synthetic Sanity Cases
Objective Differentiation
Point-Cost Decision
Reliability Regression
Pinned Fixture Results
Changed Weights
Calibration Version
STEP-009 Readiness
```

---

## 29. Expected result

At completion, the scoring pipeline remains:

```text
semantic effects
      ↓
explicit profile weights
      ↓
heuristic contributions
      ↓
heuristicScore
      ↓
reliability-aware comparison
```

but the weight tables are now explicitly validated and documented rather than merely existing.

The project should be able to answer:

```text
Why did this path receive this score?
Why is this stat weighted more or less than another?
Why does offensive differ from defensive?
```

without pretending the answer is exact PoE2 combat math.

---

## 30. Stop condition

After implementation, tests, calibration documentation, and progress documentation are complete:

**STOP.**

Do not automatically begin STEP-009.

If calibration reveals a major flaw in the scoring model, document it and stop.

If calibration is satisfactory, the next planned step is:

```text
STEP-009 — Top-K recommendation engine
```

Wait for explicit review and approval before starting it.
