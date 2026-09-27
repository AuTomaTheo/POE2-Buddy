# STEP-008A — Weight calibration

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-008A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Review the STEP-008 heuristic weights, document every cell, adjust only the flat critical-hit-chance scale, and prove the three profiles, the point-cost rule, and the reliability rules still behave as specified. Do not start STEP-009.

## 2. Acceptance criteria

- [x] Every semantic stat weight in every scoring profile is documented
- [x] Every supported operation weight is documented
- [x] No scoring weight is hidden inside scoring logic
- [x] The rationale for major relative weights is documented
- [x] Unit-scale differences are reviewed explicitly
- [x] Obvious synthetic comparisons produce sensible results
- [x] Offensive, defensive, and balanced profiles produce meaningfully different behavior where expected
- [x] Profile differences are deterministic and testable
- [x] `heuristicScore` remains a heuristic and is not described as DPS, EHP, or exact power
- [x] `scorePerPoint` remains secondary
- [x] Semantic-coverage and search-completeness guardrails remain unchanged
- [x] Unsupported effects remain unscored and visible
- [x] Calibration does not assign values to previously unsupported mechanics
- [x] Regression tests cover the calibrated behavior
- [x] Required repository checks pass
- [x] This completion document exists

## 3. Implementation summary

The weight tables stay in `profiles.ts`. `scorePassivePath` still multiplies amount by the looked-up weight and still ranks on `heuristicScore`. Calibration version is 1, copied onto each scored candidate. `weightInventory` lists every semantic id that any profile contains, for `increased`, `reduced`, and `added`, including explicit `null` and ids that a given profile does not contain. The only numeric edit is the `added` weight for flat critical-hit chance. No parser, path-search, coverage, or comparison rule changed.

## 4. Files created

| File                                              | Purpose                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/scoring-engine/src/calibration.test.ts` | Inventory, scale, profile, point-cost, reliability, and fixture checks |
| `docs/progress/STEP-008A-weight-calibration.md`   | This record                                                            |

## 5. Files changed

| File                                      | Change                                                         |
| ----------------------------------------- | -------------------------------------------------------------- |
| `packages/scoring-engine/src/profiles.ts` | Version 1, inventory, flat critical-hit-chance `added` weights |
| `packages/scoring-engine/src/score.ts`    | Copies `profileVersion` onto the result                        |
| `packages/scoring-engine/src/index.ts`    | Exports the version, inventory, and `WeightCell`               |
| `packages/scoring-engine/README.md`       | Mentions version 1 and the inventory                           |
| `docs/planning/DECISION_LOG.md`           | D-053 through D-057                                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`scoringProfile` returns one table. `weightInventory` is the readable form of those tables. `scorePassivePath` still owns the sum and does not contain objective numbers. `compareScoredCandidates` is unchanged. The passive engine still does not choose desirability. Domain types are unchanged. The version lives on the scoring profile.

## 8. External APIs / data sources involved

None. The pinned snapshot and two local fixtures were read and not changed.

- provider: local pin, `witch-offensive.json`, and `warrior-defensive.json`
- official export, no auth
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`ScoringProfile` gained `version`. `ScoredCandidate` gained `profileVersion`. `WeightCell` is the inventory row. No domain type was added. The passive-tree pin is unchanged. No dependency version changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency file changed.

## 12. Automated tests

| Command/Test           | Result | Notes                                  |
| ---------------------- | ------ | -------------------------------------- |
| `npm test`             | PASS   | 17 files, 110 tests                    |
| `npm run typecheck`    | PASS   | includes `@poe2-helper/scoring-engine` |
| `npm run lint`         | PASS   | exit 0                                 |
| `npm run format:check` | PASS   | after this document was formatted      |

## 13. Manual verification

Checked the arithmetic for the synthetic lines in the calibration tests against the tables below. Checked the Witch path is still node `1755`, `8%` increased Spell Damage, score 16. Checked the Warrior path is node `3936`, `10%` increased Melee Damage, score 0 on the defensive profile because that family is absent. No browser UI exists for this step.

## 14. Errors/issues encountered

- symptom: the first cross-profile comparison expected a definitive preferred path.
- root cause: `10%` increased maximum Life is mapped, and the offensive profile has no weight for it, so `valuationComplete` is false. D-052 then leaves `preferred` null.
- resolution: the test checks the score inequality and the incomplete valuation. The balanced pair is complete, ties at 10, and the node-id rule selects node 1.
- regression test: yes.

- symptom: the Warrior fixture's first path scores 0 on the defensive profile.
- root cause: that path is one node of increased melee damage. The defensive table does not contain melee damage. This is the first enumerated path, not a claim about every Warrior path.
- resolution: pinned the measured node, score, confidence, and contribution. The scoring model was not changed to force a defensive number onto an offense node.
- regression test: yes.

- symptom: `npm run format` rewrote `docs/extra steps/STEP-008A-weight-calibration.md`.
- root cause: `docs/extra steps` is not listed in `.prettierignore`.
- resolution: the rewrite is formatting. The step text was not edited for content in this task.
- regression test: no.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or new network calls. No LLM chooses or edits weights at runtime.

## 16. Performance impact

Inventory construction walks the three tables. Scoring still walks only the nodes it is given. Not benchmarked beyond the test suite.

## 17. Data provenance / reproducibility impact

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. A scored candidate now records profile version 1, so the same nodes and the same version reproduce the same score.

## 18. Known limitations

Flat critical-hit chance for spells and for attacks is in the offensive table and is currently unreachable, because a `for` scope is still unscored under D-051. Movement speed and maximum resistance stay unscored on purpose. More, less, penetration, conversion, gain-as-extra, derived-from, chance, regeneration, and conditional lines stay unscored. A missing profile weight is stored on the contribution as weight 0 with `supported: false` and is left out of the sum. That 0 is the "not valued" marker from STEP-008. It is not a desirability weight. This is not DPS or EHP.

## 19. Decisions made

D-053 weights normalize unit scale and are not combat math. D-054 the three profiles are written tables, and balanced is not a computed average. D-055 flat critical-hit chance uses a larger `added` weight. D-056 the profile version is 1. D-057 ranking stays on `heuristicScore`.

## 20. Deviations from planning docs

None. No scale-category helper was added. The formula, the search, the parser, and the comparison claim are unchanged.

## 21. Remaining risks

A caller can still ignore `definitive` and sort by `heuristicScore` alone. The unreachable `for spells` and `for attacks` rows can look like live weights if a reader skips D-051. Global semantic coverage is still partial, so many real paths will not be valuation-complete.

## 22. Rollback notes

Restore the previous `added` critical-hit-chance weights (offensive 1, and the two `for` rows 1, balanced 0.5), remove `version` and `weightInventory`, and delete `calibration.test.ts` and this progress file. The passive-tree pin does not need to be restored.

## 23. Recommended next step

Do not start STEP-009 until it is explicitly approved. The next planned step is STEP-009 — Top-K recommendation engine. It should rank with `selectScoredCandidates`, keep `heuristicScore` as the sort key, and keep the reliability claim.

## 24. Completion statement

STEP-008A is complete. The weight tables are explicit, the flat critical-hit scale was adjusted, and the reliability rules still hold. No major scoring-model flaw was found. STEP-009 was not started.

## Complete Weight Tables

`absent` means the semantic id is not a key on that profile. `null` means the key exists and that operation is left unscored. No cell is the number 0. `reduced` is the negation of `increased` wherever `increased` is a number. `weightInventory()` emits one row per semantic id and operation, with `offensivePresent`, `defensivePresent`, and `balancedPresent`.

Movement speed and maximum cold resistance are absent from all three profiles.

| Semantic id                     | Offensive increased / reduced / added | Defensive increased / reduced / added | Balanced increased / reduced / added |
| ------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------ |
| accuracy                        | 0.3 / -0.3 / 0.05                     | absent                                | absent                               |
| armour                          | absent                                | 1.4 / -1.4 / 0.04                     | 0.7 / -0.7 / 0.02                    |
| attack-damage                   | 1.6 / -1.6 / 0.2                      | absent                                | 0.8 / -0.8 / 0.1                     |
| attack-speed                    | 1.5 / -1.5 / null                     | absent                                | 0.8 / -0.8 / null                    |
| block-chance                    | absent                                | 1 / -1 / 0.5                          | absent                               |
| cast-speed                      | 1.5 / -1.5 / null                     | absent                                | 0.8 / -0.8 / null                    |
| chaos-damage                    | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| chaos-resistance                | absent                                | 0.3 / -0.3 / 0.8                      | 0.15 / -0.15 / 0.4                   |
| cold-damage                     | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| cold-resistance                 | absent                                | 0.2 / -0.2 / 0.6                      | 0.1 / -0.1 / 0.3                     |
| critical-damage-bonus           | 1.2 / -1.2 / 0.4                      | absent                                | 0.6 / -0.6 / 0.2                     |
| critical-hit-chance             | 1.5 / -1.5 / 8                        | absent                                | 0.8 / -0.8 / 4                       |
| critical-hit-chance-for-attacks | 1.4 / -1.4 / 8                        | absent                                | absent                               |
| critical-hit-chance-for-spells  | 1.4 / -1.4 / 8                        | absent                                | absent                               |
| deflection                      | absent                                | 1.4 / -1.4 / 0.08                     | 0.7 / -0.7 / 0.04                    |
| dexterity                       | absent                                | 0.1 / -0.1 / 0.15                     | absent                               |
| elemental-damage                | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| evasion                         | absent                                | 1.6 / -1.6 / 0.04                     | 0.8 / -0.8 / 0.02                    |
| fire-damage                     | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| fire-resistance                 | absent                                | 0.2 / -0.2 / 0.6                      | 0.1 / -0.1 / 0.3                     |
| intelligence                    | absent                                | 0.1 / -0.1 / 0.15                     | absent                               |
| lightning-damage                | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| lightning-resistance            | absent                                | 0.2 / -0.2 / 0.6                      | 0.1 / -0.1 / 0.3                     |
| maximum-energy-shield           | absent                                | 1.8 / -1.8 / 0.15                     | 0.9 / -0.9 / 0.08                    |
| maximum-life                    | absent                                | 2 / -2 / 0.2                          | 1 / -1 / 0.1                         |
| melee-damage                    | 1.4 / -1.4 / 0.2                      | absent                                | absent                               |
| physical-damage                 | 1.2 / -1.2 / 0.2                      | absent                                | absent                               |
| projectile-damage               | 2 / -2 / 0.25                         | absent                                | 1 / -1 / 0.1                         |
| projectile-speed                | 0.5 / -0.5 / null                     | absent                                | absent                               |
| spell-damage                    | 2 / -2 / 0.25                         | absent                                | 1 / -1 / 0.1                         |
| strength                        | absent                                | 0.1 / -0.1 / 0.15                     | absent                               |

`critical-hit-chance-for-spells` and `critical-hit-chance-for-attacks` are present on `offensive` only. A line that would use them also has a `for` scope, which D-051 leaves unscored. Those cells are documented and are not live scores.

## Weight Rationale

Headline increased damage and increased life use weight 2 on the profile that cares about them, so 10% scores 20. Attack damage is 1.6, melee damage is 1.4, and elemental or physical damage is 1.2, so a narrower damage family sits below the headline and a generic damage family sits below that. Attack speed and cast speed are 1.5, below the same-size headline and not "exactly 1.5/2 of damage." Critical chance increased is 1.5 and critical damage bonus increased is 1.2. Projectile speed is 0.5, so 10% scores 5. Accuracy increased is 0.3, so 30% scores 9 and stays under 10% projectile damage.

On defense, life is 2, energy shield is 1.8, evasion is 1.6, and armour and deflection are 1.4. Block chance increased is 1. Fire, cold, and lightning resistance increased are 0.2 because a percentage increase to an existing resistance is a different line from `+N%` resistance, which uses `added` 0.6. Chaos resistance is a little higher, 0.3 increased and 0.8 added. Attributes increased are 0.1 and attributes added are 0.15, so +40 Strength scores 6 and stays under 10% life. Flat armour and evasion added are 0.04 because those ratings are tens or hundreds. Flat deflection added is 0.08. Flat damage added on offense is 0.2 or 0.25 so a small flat number does not match a 10% increased line.

Balanced writes the specialist headlines at about half: spell and projectile damage and life are 1, so 10% of either scores 10. The rest of the balanced table is written out in the same direction. It is not produced by averaging the other two profiles.

## Scale / Unit Review

Amount 10 is not equal value across families. The weights compensate where a family is scored. This is heuristic normalization.

| Line                                              | Profile   | Score | Reading                                              |
| ------------------------------------------------- | --------- | ----- | ---------------------------------------------------- |
| 10% increased Spell Damage                        | offensive | 20    | headline offense                                     |
| 10% increased Projectile Damage                   | offensive | 20    | headline offense                                     |
| 10% increased Critical Hit Chance                 | offensive | 15    | below the same-size damage headline                  |
| +1% critical hit chance, if it were unconditional | offensive | 8     | scale compensation, still below 15 and 20            |
| 10% increased Attack Speed                        | offensive | 15    | below 10% spell damage                               |
| 30% increased Accuracy Rating                     | offensive | 9     | below 10% projectile damage                          |
| 10% increased Projectile Speed                    | offensive | 5     | utility, below the damage headline                   |
| 10% increased Movement Speed                      | offensive | 0     | family is absent                                     |
| +40 to Strength                                   | defensive | 6     | below 10% life                                       |
| 10% increased maximum Life                        | defensive | 20    | headline defense                                     |
| 10% increased Armour                              | defensive | 14    | below life, above +40 Strength                       |
| +10% to Fire Resistance                           | defensive | 6     | below 10% life                                       |
| +1% to Maximum Cold Resistance                    | defensive | 0     | family is absent, so it is not worth 10% armour (14) |
| 10% increased Evasion Rating                      | defensive | 16    | below life                                           |
| 10% increased Deflection Rating                   | defensive | 14    | beside armour, below life                            |

`+10` Strength on the defensive profile scores 1.5. It does not outrank 10% increased life. On the offensive profile, Strength is absent, so it scores 0 and cannot outrank projectile damage by having a larger raw number.

## Synthetic Sanity Cases

| Case                                                                                      | Result                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 10% projectile damage, 10% increased critical chance, 10% increased critical damage bonus | 20 + 15 + 12 = 47 on offensive                                                                |
| 10% projectile speed alone                                                                | 5 on offensive, and the comparison prefers the crit package                                   |
| 10% life, 10% energy shield, 10% armour, +10% fire resistance                             | 20 + 18 + 14 + 6 = 58 on defensive                                                            |
| 10% evasion and 10% deflection                                                            | 16 + 14 = 30 on defensive                                                                     |
| 20% more Damage                                                                           | 0, `supported: false`                                                                         |
| 10% spell damage plus an unrecognized attack-and-cast line                                | spell line still scores, the raw line stays unsupported, and the comparison is not definitive |

Tiny utility does not beat a large core stat in these cases. One point of maximum resistance does not score like one point of increased armour. Flat attributes do not beat specialized offense or the life headline. The defensive profile scores an offense-only spell line at 0. The offensive profile scores a life-only line at 0.

## Objective Differentiation

| Path                       | Offensive               | Defensive               | Balanced |
| -------------------------- | ----------------------- | ----------------------- | -------- |
| 10% increased Spell Damage | 20                      | 0, valuation incomplete | 10       |
| 10% increased maximum Life | 0, valuation incomplete | 20                      | 10       |

Offensive therefore ranks the spell line above the life line by score. Defensive ranks the life line above the spell line by score. Those two comparisons are not definitive winners, because the losing path is mapped and unscored. Balanced scores the two headlines equally. Both paths are valuation-complete, the comparison is definitive, and the existing node-id tie-break selects the spell node because its id is `1` and the life node is `2`. That selection is the tie-break, not a hidden preference for offense. Balanced is not an accidental copy of either specialist profile.

## Point-Cost Decision

Ranking stays on `heuristicScore`. `scorePerPoint` is still reported and is not the sort key.

| Path                       | Points | heuristicScore | scorePerPoint | Selected |
| -------------------------- | ------ | -------------- | ------------- | -------- |
| 10% increased Spell Damage | 1      | 20             | 20            | no       |
| 30% increased Spell Damage | 5      | 60             | 12            | yes      |

The claim is `highest-scoring-path-among-enumerated-candidates`. The 1-point path is not preferred because its score per point is higher.

## Reliability Regression

A partial path whose numeric score is higher still compares as `not-definitive` with `preferred` null. A truncated search of an otherwise complete path still uses `best-path-found-within-search-limits`, with `definitive` false. That claim does not say global optimum or best possible path. Search completeness stays a separate field from semantic confidence. No weight was added for more, less, penetration, conversion, gain-as-extra, derived-from, chance, regeneration, or conditional effects.

## Pinned Fixture Results

Profile version 1. These are the first enumerated main-tree paths. The search on both fixtures was `exhaustive` inside its limits. That does not by itself make the path the global optimum of every possible allocation. The Witch path is valuation-complete. The Warrior path is not, because its only stat is outside the defensive table.

| Fixture                  | Profile   | Node ids | Point cost | heuristicScore | Semantic confidence | Search     | Main contribution                                                 |
| ------------------------ | --------- | -------- | ---------- | -------------- | ------------------- | ---------- | ----------------------------------------------------------------- |
| `witch-offensive.json`   | offensive | 1755     | 1          | 16             | complete            | exhaustive | spell-damage amount 8, weight 2, contribution 16, supported       |
| `warrior-defensive.json` | defensive | 3936     | 1          | 0              | complete            | exhaustive | melee-damage amount 10, weight 0, contribution 0, supported false |

The Witch score is the same number locked in STEP-008. The Warrior score is 0 because the first path is melee damage, which the defensive profile does not value. That is a property of this path, not a reason to add melee damage to the defensive table.

## Changed Weights

| Semantic id                     | Operation | Profile   | STEP-008 | STEP-008A | Reason                                            |
| ------------------------------- | --------- | --------- | -------- | --------- | ------------------------------------------------- |
| critical-hit-chance             | added     | offensive | 1        | 8         | unit scale for a small flat percentage            |
| critical-hit-chance-for-spells  | added     | offensive | 1        | 8         | same scale; still unreachable under D-051         |
| critical-hit-chance-for-attacks | added     | offensive | 1        | 8         | same scale; still unreachable under D-051         |
| critical-hit-chance             | added     | balanced  | 0.5      | 4         | written as half of the new offensive added weight |

Every other cell is unchanged. No locked Witch score moved, so there is no old-score / new-score pair for that fixture.

## Calibration Version

`SCORING_PROFILE_VERSION` is 1. Each profile stores it. `scorePassivePath` copies it to `profileVersion`. The next weight edit should bump this number.

## Remaining Heuristic Limitations

The score is still `amount * weight` for increased, reduced, and added only. It does not model hit rate, mitigation, or the chance that a conditional line is active. Coverage of the full tree is unchanged from STEP-007C. A finite score can sit on a path that is not valuation-complete.

## STEP-009 Readiness

The calibrated tables are satisfactory for a later Top-K step. STEP-009 was not started. It should wait for explicit approval, then rank with the existing comparison, keep `heuristicScore` as the primary key, and keep the reliability claim.
