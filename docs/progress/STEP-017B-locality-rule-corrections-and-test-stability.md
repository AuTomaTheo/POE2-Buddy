# STEP-017B — Locality rule corrections and canonical test stability

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-017B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Correct two locality rules that were too broad, and make `npm test` pass under its normal command.

## 2. Acceptance criteria

- [x] Ordinary increased Cast Speed is not local merely because the item is a weapon
- [x] That Cast Speed grammar is global
- [x] Bare increased Elemental Damage is not local merely because the item is a weapon
- [x] Elemental Damage with Attacks or with Spells is global
- [x] Bare increased Elemental Damage stays unknown
- [x] Weapon physical damage stays local on a weapon slot
- [x] Weapon attack speed stays local on a weapon slot
- [x] Critical strike chance and accuracy stay on the existing weapon rule
- [x] The locality inventory matches these policies
- [x] Synthetic tests and fixture G cover the corrected lines
- [x] `GEAR_NORMALIZATION_VERSION` is 3 because those lines now normalize differently
- [x] Passive scoring is unchanged
- [x] No gear score or ranking API
- [x] `npm test` passes
- [x] Typecheck, lint, format, and format check pass
- [x] Default tests do not use the network
- [x] This completion note exists

## 3. Implementation summary

Ordinary `N% increased Cast Speed` is global for every slot. Bare `N% increased Elemental Damage` is unknown, including on a wand. The same family with `with Attacks` or `with Spells` is global because the line states the scope. Physical damage and attack speed on a weapon slot stay local. Vitest `maxWorkers` is 2 so the pinned tree is not loaded by every test file at once. D-077 records both decisions.

## 4. Files created

| File                                                                      | Purpose                                   |
| ------------------------------------------------------------------------- | ----------------------------------------- |
| `packages/data-sources/src/pob2/fixtures/real/G.code.txt`                 | Generate code for the locality export     |
| `packages/data-sources/src/pob2/fixtures/real/G.truth.json`               | PoB's saved slot, base, and raw item text |
| `packages/data-sources/src/pob2/fixtures/real/G.locality.json`            | Expected locality for the saved lines     |
| `docs/progress/STEP-017B-locality-rule-corrections-and-test-stability.md` | This completion note                      |

## 5. Files changed

| File                                                           | Change                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `packages/gear-engine/src/locality.ts`                         | Cast Speed is global; bare Elemental Damage is unknown                 |
| `packages/gear-engine/src/families.ts`                         | Inventory modes, plus the Attacks and Spells Elemental Damage grammars |
| `packages/gear-engine/src/parse-modifier.ts`                   | Parses Elemental Damage with Attacks or Spells                         |
| `packages/gear-engine/src/analyze-equipment.ts`                | Gear normalization version 3                                           |
| `packages/gear-engine/src/analyze-equipment.test.ts`           | Cast Speed, Elemental Damage, and version assertions                   |
| `packages/gear-engine/README.md`                               | Describes version 3 and the two corrected rules                        |
| `tests/gear-analysis.test.ts`                                  | Version 3 and the fixture G check                                      |
| `packages/data-sources/src/pob2/fixtures/real/provenance.json` | Notes fixture G                                                        |
| `vitest.config.mts`                                            | `maxWorkers: 2`                                                        |
| `docs/planning/DECISION_LOG.md`                                | Added D-077                                                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`resolveGearLocality` still applies family mode after an explicit `global` word. Scope `attacks` or `spells` is global before the weapon rule. Cast Speed no longer belongs to the weapon-local set. Bare increased Elemental Damage uses mode `unknown`, so a weapon slot cannot promote it. The new `with Attacks` and `with Spells` lines set that scope and therefore resolve global.

## 8. External APIs / data sources involved

No network calls during tests. Fixture G was produced by one local Path of Building (PoE2) 0.23.1 Generate on a fresh unnamed Witch build. No saved character or community build was exported.

## 9. Credentials / environment variables

No new variables. The one-shot export used `POB2_FIDELITY_EXPORT`, `POB2_FIDELITY_SCRIPT`, and `POB2_FIDELITY_OUT` on a process started for that export. Those variables are not part of the app. Live GGG import stays disabled.

## 10. Data model / schema changes

`NormalizedItem` is unchanged. `GEAR_NORMALIZATION_VERSION` moved from 2 to 3. PoB2 normalization stays 3. Passive profile version stays 1.

## 11. Commands executed

- `npm run format`
- `npm test` — passed. 34 files, 232 tests, 23.11s. An earlier run of the same command, before this note was added, also passed in 15.76s.
- `npm run typecheck`
- `npm run lint`
- `npm run format:check`

`npm audit` was not run. `vitest.config.mts` changed and no package was added.

## 12. Automated tests

Cast Speed is global on Weapon 1, Weapon 2, and Ring 1. Bare `80% increased Elemental Damage` on a weapon is unknown, not understood, and lowers coverage and confidence. `with Attacks` and `with Spells` are global. Physical damage and attack speed on a weapon stay local. Fixture F's Energy Shield, resistance, and armour expectations are unchanged. Fixture G checks the five saved lines against `G.locality.json`. The Witch fixture's first offensive candidate stays nodes `[1755, 41965]` at heuristic score 32.

## 13. Manual verification

Headless Chrome opened `http://localhost:3000`, selected PoB2, and submitted fixture G. The gear section showed readiness `partial` and the sentence that coverage is not an item quality score. The wand listed Cast Speed as global, bare Elemental Damage as unknown with "Parsed modifier; item/global scope unresolved.", and Elemental Damage with Attacks as global. Wand confidence was `partial` (3 lines, 2 understood). The focus and the ring listed Cast Speed as global with confidence `complete`. The page did not show "worst", "Replace your", or "Helmet score". The debug Chrome process was stopped. The dev server was left running.

## 14. Errors/issues encountered

The first browser script also looked for a physical-damage line that fixture G does not contain. The locality lines were already on the page. That extra check was not rerun.

A Path of Building process, pid 7356, was running before the export. The export started a separate process, pid 25948, and only that pid was stopped. Afterward, no Path of Building process was listed. The export hook was removed and `Settings.xml` was restored from the backup taken before launch.

## 15. Security/privacy impact

No credentials or personal builds were added. Fixture G is a locally entered test item set. The export hook is not left in `Build.lua`.

## 16. Performance impact

`maxWorkers: 2` limits how many test files run at once. The canonical suite finished in about 23 seconds. Locality changes are a table lookup per line.

## 17. Data provenance / reproducibility impact

Fixture G's code is the Generate string from PoB 0.23.1, commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`. `G.truth.json` stores `BuildRaw()` text. `G.locality.json` states the expected locality from those lines and the rules in this step. Fixture F's code and checksum are unchanged.

## 18. Known limitations

Bare increased Elemental Damage stays unknown even on a weapon, because the line does not say whether it changes the weapon or the character. Critical strike chance and accuracy are still local on a weapon slot. Armour, evasion, and deflection stay unknown. This step does not calculate weapon DPS or character totals.

## 19. Decisions made

D-077. Ordinary Cast Speed is global. Bare increased Elemental Damage is unknown. Explicit attack or spell scope on that line is global. Gear normalization version is 3. Vitest uses two workers.

## 20. Deviations from planning docs

`N% increased Elemental Damage with Spells` was added beside `with Attacks` so both explicit scopes are in the inventory. Bare Elemental Damage was left unknown rather than marked global, because the saved wording does not establish a character-wide stat by itself.

## 21. Remaining risks

A later mod-domain source could show that some bare Elemental Damage lines are local to the weapon. Until that evidence is stored, those lines stay unknown. Two workers can still be slow if both are loading the pinned tree; the suite passed twice under that setting.

## 22. Rollback notes

Revert the files in sections 4 and 5. Restoring gear normalization version 2 also restores weapon-local Cast Speed and weapon-local bare Elemental Damage. Removing `maxWorkers` restores the previous parallel test load. Passive weights, Top-K, and the tree pin were not changed.

## 23. Recommended next step

Do not start character totals, weapon DPS, upgrade recommendations, or a PoB2 calculation engine. The gear-normalization layer can be reviewed for a freeze. That review needs a separate approval.

## 24. Completion statement

STEP-017B is complete. Cast Speed and Elemental Damage follow the corrected rules, and `npm test` passes with two workers.

## Remaining STEP-017A Blockers

STEP-017A left Cast Speed and bare increased Elemental Damage local on any weapon slot, and the default `npm test` timed out when many files loaded the pinned tree together. Those three items are the scope of this step.

## Cast Speed Correction

`10% increased Cast Speed` on a wand, `12% increased Cast Speed` on a focus, and `8% increased Cast Speed` on a ring are global. The family mode is `global`. The weapon-local set no longer includes Cast Speed.

## Elemental Damage Correction

`80% increased Elemental Damage` is unknown on a weapon and without item context. `80% increased Elemental Damage with Attacks` and `25% increased Elemental Damage with Spells` are global. Weapon slot is not evidence for the bare line.

## Locality Inventory Changes

| Grammar                                    | Mode    | Required context                    |
| ------------------------------------------ | ------- | ----------------------------------- |
| N% increased Cast Speed                    | global  | none                                |
| N% increased Elemental Damage              | unknown | none; a weapon slot is not evidence |
| N% increased Elemental Damage with Attacks | global  | the words `with Attacks`            |
| N% increased Elemental Damage with Spells  | global  | the words `with Spells`             |

Attack speed, physical damage, critical strike chance, critical damage bonus, and accuracy remain contextual and local only on a main-hand weapon slot.

## Regression Rules Preserved

Energy Shield stays local only with an Energy Shield property on armour or an off-hand, and flat maximum Energy Shield stays global on jewellery and a belt. Armour, evasion, and deflection stay unknown. Added and increased physical damage stay local on a weapon slot. Attack speed on gloves stays unknown. Life, resistances, and attributes stay global.

## Fixture Evidence

Fixture F does not contain Cast Speed or Elemental Damage, so its confidence is unchanged. Fixture G is a new 0.23.1 Generate. The wand raw text contains all three Elemental and Cast Speed lines, including `with Attacks`, as PoB saved them. The focus and the ring contain Cast Speed. Expected locality is in `G.locality.json`.

## Semantic Coverage Impact

A known locality can be semantically understood. Unknown locality is parsed and not understood. The wand's bare Elemental Damage line is the unknown line. Cast Speed on that wand is understood. No special case preserves the old weapon-local confidence.

## Confidence Changes

Fixture F items keep the STEP-017A confidence values. Fixture G's wand is `partial`: 3 modifier lines, 2 understood. The focus and the ring are `complete` because their only line is global Cast Speed. Gear readiness for G is `partial` because of the unknown line and missing slots.

## Gear Normalization Version Decision

Version moved from 2 to 3. The same wand text `10% increased Cast Speed` was local under version 2 and is global under version 3. The same wand text `80% increased Elemental Damage` was local under version 2 and is unknown under version 3. PoB2 normalization stays 3. Source checksums stay the SHA-256 of the inflated XML.

## Original npm test Failure

STEP-017A's default `npm test` reported 11 timeouts. The failing tests were snapshot loads and the lint-coverage eslint run, each past its existing timeout while many files ran together. The same assertions passed when files ran one at a time. They were not assertion failures.

## Test Runner Root Cause

Many test files load the pinned passive-tree snapshot. Doing that in every worker at once made those tests slower than the default timeout. The tests themselves did not need new timeouts.

## Canonical Test Configuration

`vitest.config.mts` sets `maxWorkers: 2`. The npm script is still `vitest run`. Tests are not skipped, marked flaky, or retried. The existing 30 second timeouts on the pinned-tree compatibility test and the two gear-analysis imports stay as they were. No other timeout was raised.

## Canonical npm test Result

```text
npm test
PASS
34 files
232 tests
23.11s
maxWorkers: 2
```

An earlier `npm test` after the rule change also passed, in 15.76s, with the same file and test counts.

## Passive Regression

The Witch fixture test still expects the first offensive candidate `[1755, 41965]`, heuristic score 32, profile version 1. Weights, Top-K, and path search were not edited. Fixture G allocates only the Witch class start, so its imported tree is a different build from that fixture.

## Remaining Gear-Locality Risks

Bare Elemental Damage may be local for some real mods and global for others. This version does not have a mod-domain flag, so it stays unknown. Critical strike chance and accuracy are still classified from the weapon slot. Off-hand weapons still do not receive local weapon damage.

## PoB2 Calculation-Engine Status

No PoB2 calculation engine was added.

## Character-Aware Scoring Status

No character-aware gear score was added. The screen still says parser coverage is not an item quality score.
