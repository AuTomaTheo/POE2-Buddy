# STEP-017A — Gear modifier locality fidelity

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-017A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Stop classifying item modifiers as local or global from wording alone. Resolve locality from the item slot and from base-defence property lines, and leave it unknown when that evidence is missing.

## 2. Acceptance criteria

- [x] Flat maximum Energy Shield is not global from the words alone
- [x] Energy Shield is local only when the item text shows an Energy Shield property on armour or an off-hand
- [x] Flat maximum Energy Shield on a ring, amulet, or belt is global
- [x] Ambiguous Energy Shield stays unknown
- [x] Resistances and attributes stay global
- [x] Bare weapon damage is local on a weapon slot and unknown without that slot
- [x] Attack speed, critical strike chance, and accuracy are local only on a weapon slot
- [x] Armour, evasion, and deflection stay unresolved
- [x] A conditional line is not semantically complete
- [x] Unknown locality lowers semantic coverage and confidence
- [x] Raw lines stay preserved
- [x] No gear score or ranking API
- [x] Passive scoring is unchanged
- [x] Fixture F locality cases pass
- [x] GGG-shaped and fixture items still use the same analysis
- [x] Gear normalization version is 2
- [x] Required checks pass
- [x] This completion note exists

## 3. Implementation summary

The line matcher now records semantic shape only. `resolveGearLocality` then uses the canonical slot category and base-defence flags read from property lines such as `Energy Shield: 52`. Always-global families stay global with no item context. Contextual families stay unknown until a written rule matches. Armour, evasion, and deflection stay unknown even when a defence property is present.

`GEAR_NORMALIZATION_VERSION` is 2. PoB2 normalization stays 3. The analysis screen lists parsed locality inside a collapsed details block and says an unresolved line is a parser limit, not an item-quality judgment. D-076 records the rules.

## 4. Files created

| File                                                           | Purpose                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/gear-engine/src/item-context.ts`                     | Slot category and base-defence flags                 |
| `packages/gear-engine/src/locality.ts`                         | Locality modes and the resolver                      |
| `packages/data-sources/src/pob2/fixtures/real/F.locality.json` | Expected locality for three saved lines in fixture F |
| `docs/progress/STEP-017A-gear-modifier-locality-fidelity.md`   | This completion note                                 |

## 5. Files changed

| File                                                           | Change                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------- |
| `packages/gear-engine/src/families.ts`                         | Locality mode per family, including increased Energy Shield |
| `packages/gear-engine/src/parse-modifier.ts`                   | Shape parsing, then locality resolution                     |
| `packages/gear-engine/src/parse-item.ts`                       | Reads defence property lines into item context              |
| `packages/gear-engine/src/analyze-equipment.ts`                | Version 2 and the unresolved-locality diagnostic            |
| `packages/gear-engine/src/analyze-equipment.test.ts`           | Locality cases and the no-context family inventory          |
| `packages/gear-engine/src/index.ts`                            | Exports the locality rules                                  |
| `packages/gear-engine/README.md`                               | Describes context-aware locality and version 2              |
| `apps/web/src/app/analysis-screen.tsx`                         | Collapsed modifier-locality list                            |
| `tests/gear-analysis.test.ts`                                  | Version 2, fixture F locality, passive regression           |
| `packages/data-sources/src/pob2/fixtures/real/provenance.json` | Points at the locality record for fixture F                 |
| `docs/planning/DECISION_LOG.md`                                | Added D-076 and a partial supersession note on D-075        |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`parseGearModifier` matches a line to a family, operation, amount, and scope. It does not decide contextual locality. `analyzeItem` builds item context from the canonical slot and the raw text, then parses each modifier with that context. `data-sources` still only extracts item text and slots. It does not classify locality.

## 8. External APIs / data sources involved

No network calls. Fixture F remains the Path of Building (PoE2) 0.23.1 Generate export already stored in the repository. `F.locality.json` cites three lines from that saved text. No new export was generated.

## 9. Credentials / environment variables

No new variables. Live GGG import stays disabled. No credentials were added.

## 10. Data model / schema changes

`NormalizedItem` is unchanged. Item context is derived inside gear-engine. `GEAR_NORMALIZATION_VERSION` moved from 1 to 2. PoB2 normalization stays 3. Passive profile version stays 1.

## 11. Commands executed

- `npm run format`
- `npm test` — 11 snapshot-heavy tests timed out under parallel load. The failures were timeouts, not assertion errors.
- `npx vitest run --maxWorkers=1 --no-file-parallelism` — 34 files, 229 tests passed.
- `npm run lint`
- `npm run typecheck` — first run failed because one test passed an analyzed item where a normalized item was required. After that fix, `@poe2-helper/gear-engine` typecheck passed, then the full typecheck passed.
- `npm run format:check`
- `npx vitest run packages/gear-engine/src/analyze-equipment.test.ts` — 22 tests passed after the type fix.

`npm audit` was not run. Dependency files did not change.

## 12. Automated tests

The suite covers no-context Energy Shield staying unknown, local Energy Shield on a body and a focus that show an Energy Shield property, global Energy Shield on a ring, amulet, and belt, explicit `global` wording, resistances, attributes, weapon physical damage, attack speed, critical strike chance, accuracy, conditional life, coverage and confidence movement, and the absence of a gear score. Fixture F checks the three locality cases against `F.locality.json` and the saved raw text. The Witch recommendation stays nodes `[1755, 41965]` at heuristic score 32.

## 13. Manual verification

The Cursor browser tools did not re-register. Headless Chrome opened `http://localhost:3000`, selected PoB2, pasted fixture F, and submitted Import / Analyze. The gear section showed readiness `partial`, the existing sentence that coverage is not an item quality score, body armour confidence `high` with life and fire resistance `global`, the Twig Focus Energy Shield line `local`, the wand fire-damage line `local`, and the helmet armour line `unknown` with the sentence "Parsed modifier; item/global scope unresolved." The visible report still showed heuristic 32 and nodes 1755 and 41965. The page did not show "worst", "Replace your", or "Helmet score". The debug Chrome process was stopped. The dev server on port 3000 was left running.

## 14. Errors/issues encountered

The default `npm test` run timed out 11 tests that load the pinned tree while other files were loading it too. The same suite passed when files ran one at a time. The first full typecheck failed on a test argument type. The production resolver was not changed to fix that.

## 15. Security/privacy impact

No credentials, tokens, or personal builds were added. Fixture F is still the locally entered test export from STEP-017.

## 16. Performance impact

Locality resolution is a table lookup per parsed line. No new network or snapshot work was added.

## 17. Data provenance / reproducibility impact

Fixture F's code and truth file are unchanged. `F.locality.json` records the expected locality and the reason, taken from the saved item text. PoB2 source checksums are unchanged. The same raw line can now normalize differently when the slot or the Energy Shield property differs, which is why the gear version is 2.

## 18. Known limitations

Increased Armour, Evasion, and Deflection stay unknown even when the item shows that defence. Attack speed on gloves stays unknown. Increased Energy Shield on jewellery stays unknown. An off-hand without an `Energy Shield:` property does not become local. This step does not read PoB's internal mod domain and does not calculate item or character defence.

## 19. Decisions made

D-076. Locality requires item context. Unknown is preferred to a guessed locality. Energy Shield, weapon damage, and semantic completeness follow the rules in that decision. Gear normalization version is 2.

## 20. Deviations from planning docs

Increased Energy Shield was added to the inventoried grammar so the local increased form can be tested. Armour, evasion, and deflection were left unknown rather than newly marked local. No new PoB Generate was required because fixture F already contains the local focus line, the global resistance line, and the unresolved armour line.

## 21. Remaining risks

A future reader can still mistake parser confidence for item quality if they ignore the on-screen wording. Defence mods other than Energy Shield remain unresolved. Weapon-set off-hand items are not treated as weapons, so a swapped weapon in that slot would not receive local weapon damage.

## 22. Rollback notes

Revert the files in sections 4 and 5. Restoring gear normalization version 1 also restores the old Energy Shield classification. Passive weights, Top-K, the tree pin, and fixture F's export code were not changed.

## 23. Recommended next step

Do not start character totals, weapon DPS, upgrade recommendations, or a PoB2 calculation engine. The next choice needs a separate approval.

## 24. Completion statement

STEP-017A is complete. Modifier locality is item-context-aware. Unknown locality stays unknown, and the passive heuristic is unchanged.

## Original Locality Problem

STEP-017 matched `+N to maximum Energy Shield` and stored locality `global` inside that match. The same words are local on an Energy Shield base and global on jewellery. The family inventory then treated that stored value as the locality.

## Energy Shield Correction

Flat and increased Energy Shield are local when the slot category is armour or off-hand and the item text contains an `Energy Shield:` property. Flat maximum Energy Shield is global on a ring, amulet, or belt when that property is absent. The word `global` in the line forces global. Every other case is unknown, including a helmet or weapon with no Energy Shield property. The resolver does not calculate final item Energy Shield or character Energy Shield.

## Item Context Model

Categories come only from the canonical slot: weapon for the two main-hand slots, off-hand for the two off-hand slots, armour for helmet, body armour, gloves, and boots, jewellery for rings and the amulet, belt, other for charms, flasks, arms, and legs, and unknown for a jewel or an unmapped slot. Base-defence flags are booleans read from `Armour:`, `Evasion:` or `Evasion Rating:`, `Energy Shield:`, and `Deflection:` or `Deflection Rating:` property lines. Names are not fuzzy-matched.

## Locality Resolver Design

The matcher returns semantic id, operation, amount or range, unit, and scope. `resolveGearLocality` then applies the family mode. Scope `attacks` or `spells` is global before the contextual weapon rule, because that wording is the explicit added-damage grammar. The word `global` is removed only so the shape can match; the original line still forces global locality.

## Locality-Sensitive Family Audit

| Family                         | Mode       | Resolved locality                                     |
| ------------------------------ | ---------- | ----------------------------------------------------- |
| maximum-life                   | global     | global                                                |
| maximum-energy-shield          | contextual | local, global, or unknown from the Energy Shield rule |
| increased-energy-shield        | contextual | local or unknown; jewellery stays unknown             |
| fire/cold/lightning/chaos res. | global     | global                                                |
| strength, dexterity, int.      | global     | global                                                |
| movement-speed                 | global     | global                                                |
| attack-speed                   | contextual | local on a weapon slot, otherwise unknown             |
| cast-speed                     | contextual | local on a weapon slot, otherwise unknown             |
| critical-hit-chance            | contextual | local on a weapon slot, otherwise unknown             |
| critical-damage-bonus          | contextual | local on a weapon slot, otherwise unknown             |
| flat physical/fire/cold/light. | contextual | local on a weapon slot, otherwise unknown             |
| flat-fire-damage-to-attacks    | global     | global                                                |
| increased-physical-damage      | contextual | local on a weapon slot, otherwise unknown             |
| increased-elemental-damage     | contextual | local on a weapon slot, otherwise unknown             |
| increased-projectile-damage    | global     | global                                                |
| projectile-skill-level         | global     | global                                                |
| spirit                         | global     | global                                                |
| accuracy                       | contextual | local on a weapon slot, otherwise unknown             |
| armour                         | unknown    | unknown                                               |
| increased-armour               | unknown    | unknown                                               |
| evasion                        | unknown    | unknown                                               |
| deflection                     | unknown    | unknown                                               |

## Armour / Evasion / Deflection Policy

These families stay `unknown`. Seeing `Armour: 149` does not make `50% increased Armour` local. Coverage was not increased by guessing.

## Weapon Damage Policy

`Adds N to M Physical Damage` and `N% increased Physical Damage` are local on a main-hand weapon slot, including weapon set 2 main hand. The same lines are unknown on a ring, an off-hand, or a parse with no slot. `to Attacks` and `to Spells` stay global. No weapon DPS is calculated.

## Attack Speed / Crit / Accuracy Policy

On a weapon slot these are local. A line that contains `global` is global. Gloves, including fixture F's `12% increased Attack Speed`, stay unknown. Family membership alone does not decide locality.

## Global Stat Policy

Life, the four resistances, the three attributes, movement speed, spirit, projectile skill level, increased projectile damage, and flat fire damage to attacks stay global without item context. They were not weakened to make the Energy Shield correction.

## Semantic Coverage Change

A parsed line is semantically understood only when locality is known and the line has no condition. Energy Shield with no item context is parsed and not understood. The same line on the Twig Focus is understood because locality is local. Conditional life stays parsed, global, and not understood.

## Confidence / Readiness Change

Confidence is recalculated from understood lines. An item whose only line is unresolved Energy Shield is `low`, not `complete`. Fixture F body armour stays `high`. The focus stays `complete`, now because the Energy Shield line is local. The main-hand wand and the swap wand move to `complete` because their added damage is local on a weapon slot. Gear readiness for fixture F stays `partial` because other lines and missing slots remain.

## Real PoB2 Locality Fixtures

Fixture F from PoB 0.23.1, commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`, supplies the three cases. Expectations are in `F.locality.json` and are checked against `F.truth.json` raw text.

- L1, Weapon 2, Twig Focus, `+40 to maximum Energy Shield`: local, because the saved text has `Energy Shield: 52` on that off-hand item.
- L2, Body Armour, Rusted Cuirass, `+30% to Fire Resistance`: global, because this resistance grammar is character-wide.
- L3, Helmet, Wrapped Greathelm, `50% increased Armour`: unknown, because armour locality is not resolved in this version.

## Locality Rule Inventory

The inventory is `GEAR_LOCALITY_RULES` in `packages/gear-engine/src/locality.ts`. Each supported family has a mode of `global`, `contextual`, or `unknown`, plus the context that mode requires. The family example test parses each example with no item context: global examples resolve to global, and every other example stays unknown.

## Provider-Neutral Boundary

PoB2, GGG, and fixture items still enter `analyzeEquipment` as `NormalizedItem` values. Slot category and defence flags are derived there from the slot string and `rawText`. `data-sources` production dependencies stay `@poe2-helper/domain` and `zod`. Gear-engine was not given a new dependency.

## Normalization Version

`GEAR_NORMALIZATION_VERSION` is 2. The same line can now be local, global, or unknown depending on slot and property lines, so version 1 results are not preserved. PoB2 normalization version stays 3. Source checksums stay the SHA-256 of the inflated XML.

## Passive-Scoring Regression

The Witch fixture's first offensive candidate is still nodes `[1755, 41965]` at heuristic score 32, profile version 1, point budget 5. The browser check of fixture F showed that score and those nodes. Weights, Top-K, and the 0.5.5 tree pin were not changed.

## Remaining Locality Risks

Off-hand is not treated as a weapon, so local weapon mods apply only to the two main-hand slots. A focus is local for Energy Shield only when the Energy Shield property is present. Armour mods remain unresolved on purpose. None of these results is a character total.

## Character-Total Status

Character life, Energy Shield, resistances, and attributes are not summed. A global line is a classification, not a character total.

## PoB2 Calculation-Engine Status

No PoB2 calculation engine was added. Item defence and weapon DPS are not calculated.
