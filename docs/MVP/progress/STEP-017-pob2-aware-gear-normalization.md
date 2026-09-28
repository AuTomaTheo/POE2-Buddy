# STEP-017 — PoB2-aware gear normalization and weakness diagnostics

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-017  
**Authoring context:** Cursor-assisted development

## 1. Objective

Turn imported equipment into a deterministic gear model: canonical slots, item identity, modifier parsing, coverage, and factual diagnostics. Do not score items or recommend replacements.

## 2. Acceptance criteria

- [x] Equipped items can be normalized by canonical equipment slot
- [x] PoB2 equipment remains the primary real fixture source
- [x] Gear analysis accepts normalized build/equipment rather than raw PoB2 XML
- [x] Provider-specific PoB2 parsing remains in `data-sources`
- [x] Raw item text remains preserved
- [x] Item identity fields remain preserved
- [x] Modifier sections are parsed deterministically where supported
- [x] Unsupported modifier lines remain visible
- [x] Unknown modifier semantics are not treated as zero
- [x] Local/global/conditional ambiguity is not silently guessed
- [x] Each item receives semantic/parser coverage information
- [x] Gear-analysis readiness is separate from passive-analysis readiness
- [x] Missing or malformed slots produce factual diagnostics
- [x] Duplicate-slot/import anomalies produce factual diagnostics
- [x] No generic item score is introduced
- [x] No "worst item" ranking is introduced
- [x] No replacement item recommendations are introduced
- [x] No price-based quality judgment is introduced
- [x] Existing passive scoring remains unchanged
- [x] Existing PoB2 import behavior remains unchanged for builds without this item-set layout
- [x] Existing GGG/fixture flows remain compatible
- [x] Tests use local fixtures and require no network access
- [x] Required repository checks pass
- [x] This completion note exists

## 3. Implementation summary

`analyzeEquipment` in `@poe2-helper/gear-engine` reads normalized items. It maps known PoB2 and stored GGG slot strings to canonical slots, parses item text with an inventoried modifier grammar, and returns coverage, confidence, diagnostics, and a gear-readiness result. The analysis screen renders that result in canonical slot order and says parser coverage is not an item quality score. Passive recommendations are unchanged. D-075 records the boundary.

Real Path of Building 0.23.1 puts item text on `Items/Item` and slot links inside `ItemSet`. The importer now reads those two places. Builds with no `ItemSet` still read `Item` and `Slot` from `Items` directly. Fixtures A–E have no items, so their import results do not change.

## 4. Files created

| File                                                        | Purpose                                       |
| ----------------------------------------------------------- | --------------------------------------------- |
| `packages/gear-engine/src/families.ts`                      | Inventoried modifier families                 |
| `packages/gear-engine/src/slots.ts`                         | Canonical slots and provider mapping          |
| `packages/gear-engine/src/parse-modifier.ts`                | Deterministic modifier grammar                |
| `packages/gear-engine/src/parse-item.ts`                    | Item text sections                            |
| `packages/gear-engine/src/analyze-equipment.ts`             | Item and equipment analysis                   |
| `packages/gear-engine/src/analyze-equipment.test.ts`        | Parser and equipment tests                    |
| `packages/data-sources/src/pob2/fixtures/real/F.code.txt`   | Generate code for a geared test build         |
| `packages/data-sources/src/pob2/fixtures/real/F.truth.json` | PoB's slot, identity, and raw item text       |
| `tests/gear-analysis.test.ts`                               | Passive regression and real-export gear check |
| `docs/progress/STEP-017-pob2-aware-gear-normalization.md`   | This completion note                          |

## 5. Files changed

| File                                                           | Change                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------ |
| `packages/gear-engine/src/index.ts`                            | Exports the analysis API                               |
| `packages/gear-engine/README.md`                               | Describes the unscored analysis boundary               |
| `packages/data-sources/src/pob2/import-build.ts`               | Reads real `Item` elements beside the active `ItemSet` |
| `packages/data-sources/src/pob2/fixtures/real/provenance.json` | Notes fixture F                                        |
| `apps/web/package.json`                                        | Depends on `@poe2-helper/gear-engine`                  |
| `apps/web/next.config.ts`                                      | Transpiles the gear package                            |
| `apps/web/src/server/analyze-passive-build.ts`                 | Attaches gear analysis to the result                   |
| `apps/web/src/app/analysis-screen.tsx`                         | Renders the gear section                               |
| `docs/planning/DECISION_LOG.md`                                | Added D-075                                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`data-sources` still owns PoB2 XML. `domain` still owns `NormalizedItem`. `analyzeEquipment` owns slot mapping, modifier parsing, coverage, and diagnostics. `normalizeGearItem` remains the earlier passive-map classifier and is not used by the screen. The web app only renders the analysis result.

## 8. External APIs / data sources involved

- Provider: Path of Building Community (PoE2), local install, used once to generate fixture F
- File: `Path of Building-PoE2.exe`, `SaveDB("code")`, item `BuildRaw`
- Official/community: community application, not a GGG API
- Auth/scopes: none
- Fields used: slot name, rarity, base name, and raw item text
- Cache/rate: none
- Version/commit/timestamp: 0.23.1, commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`
- Fallback: none. The product does not launch PoB

The export hook was removed and `Settings.xml` was restored. The already-running PoB process was left running. No saved build was exported.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CharacterBuildSnapshot` is unchanged. Gear analysis adds its own result: canonical slot, preserved identity, parsed modifiers, coverage counts, confidence, diagnostics, and `gearNormalizationVersion: 1`.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
```

`npm audit` ran because `apps/web/package.json` gained a workspace dependency. No new external package was added.

## 12. Automated tests

| Command/Test           | Result | Notes               |
| ---------------------- | ------ | ------------------- |
| `npm test`             | PASS   | 34 files, 219 tests |
| `npm run typecheck`    | PASS   |                     |
| `npm run lint`         | PASS   |                     |
| `npm run format:check` | PASS   |                     |
| `npm audit`            | PASS   | 0 vulnerabilities   |

## 13. Manual verification

Headless Chrome opened `http://localhost:3000` and pasted fixture F. The page showed gear-analysis readiness `partial`, the sentence that parser coverage is not an item quality score, Body armour `Ash Coat` / `Rusted Cuirass` at confidence `high` with 3 understood lines and 1 unsupported, Helmet `Black Sun Crest` at confidence `low`, distinct Ring 1 and Ring 2, weapon set 2, and the passive path at score 72. The page did not say an item was worst or should be replaced. The unsupported mana line is inside a closed details element, and the unit test checks that line directly.

## 14. Errors/issues encountered

Real 0.23.1 saves item bodies as siblings of `ItemSet`, while slots live inside the set. The first fixture F import therefore saw no equipment. `readItems` now takes item bodies from `Items` and slots from the active set. Synthetic exports that put both under `Items` still work. Regression test: fixture F.

A closed `<details>` element hides unsupported line text from the browser's visible text. The count on the item is visible.

## 15. Security/privacy impact

Item text is rendered as React text, not HTML. The parser does not evaluate expressions or send text anywhere. PoB2 decode limits are unchanged. No credentials were added.

## 16. Performance impact

Not measured. Gear parsing is a single pass over imported item lines. It does not search the passive tree.

## 17. Data provenance / reproducibility impact

Fixture F's code and truth file come from PoB 0.23.1 Generate. The truth raw text is what that process saved. Expected semantic ids were written from those lines. `GEAR_NORMALIZATION_VERSION` is 1. The same items produce the same analysis. Gear version is independent of PoB2 normalization version 3 and passive profile version 1.

## 18. Known limitations

The grammar is the inventoried family list only. Increased armour on a body piece stays locality `unknown`, so it is not a character total. Conditional modifiers are not evaluated. Missing tracked slots mean the import did not include that slot, not that the character should equip one. There is no resistance cap, life total, or item quality score.

## 19. Decisions made

D-075. PoB2 is the primary MVP gear source. The gear engine is provider-neutral. Canonical slots are explicit. Gear normalization version is 1. Unknown locality and conditions are not guessed. Unsupported is not zero. There is no generic gear score, no worst-slot ranking, and price is not build value.

## 20. Deviations from planning docs

The importer's item lookup changed so a real `ItemSet` export reaches the normalized equipment list. That is the provider parse required for the gear fixtures. A–E import results stay the same because those codes have no items.

## 21. Remaining risks

A later PoB version can rename slots or change item text. Mods outside the inventoried grammar stay unsupported even when they are good for a build. Local weapon damage is intentionally not added into a character total.

## 22. Rollback notes

Revert the files in sections 4 and 5. Removing fixture F and the gear section restores the previous screen. Passive weights, Top-K, and the tree pin were not changed.

## 23. Recommended next step

Do not start generic gear scoring. The next choice is a character-context layer, a PoB2 calculation spike, or a readiness step between them. That choice needs a separate approval.

## 24. Completion statement

STEP-017 is complete. Imported gear is identified, parsed where the grammar is explicit, and diagnosed without a quality score. The passive heuristic is unchanged.

## Current Character Source Architecture

PoB2 export is the primary MVP build source. GGG character import remains optional and disabled without credentials. Both can produce a `CharacterBuildSnapshot`. Gear analysis reads that snapshot's equipment.

## Provider-Neutral Gear Boundary

`analyzeEquipment` accepts `NormalizedItem` values plus an optional provider name and source checksum. It does not parse PoB2 XML. PoB2, GGG, and fixture items use the same function.

## Canonical Slot Model

Known slots include main hand, off hand, weapon set 2, helmet, body armour, gloves, boots, amulet, three rings, belt, charms, flasks, arm and leg sockets, and jewel. The mapping table is explicit. `Trinket` stays unknown and produces `unknown-slot`. Two items in one canonical slot produce `duplicate-slot` and both are kept. Display order is the canonical list, then unknown slots in input order.

## Item Identity Model

The provider name, base, rarity, slot, and raw text are preserved. Item level, quality, and the corrupted marker are read from the raw text when those lines are present. They do not replace a provider field that is already set, except rarity falls back to the text when the provider omitted it.

## Item Section Parsing

`Rarity`, `Item Level`, `Quality`, property lines, and `Implicits: N` are not modifiers. The next N lines after that header are implicits. Later lines are explicit. `{crafted}`, `{enchant}`, `{fractured}`, and `{rune}` set the section. An unclosed marker is unparseable and stays unsupported.

## Modifier Grammar

Each supported line is one inventoried pattern. A match records the raw line, semantic id, operation, amount, optional max, unit, scope, condition, and locality. The raw line is always kept.

## Supported Modifier Families

The families in `GEAR_MODIFIER_FAMILIES` are the only ones claimed. They include life, energy shield, the four resistances, attributes, movement speed, attack and cast speed, critical chance and critical damage bonus, flat damage ranges, increased physical, elemental, and projectile damage, projectile skill level, spirit, accuracy, armour, increased armour, evasion, and deflection. Each example line is tested.

## Local vs Global Policy

Life, energy shield, resistances, attributes, movement speed, spirit, projectile damage, and projectile skill levels are global. Flat damage "to Attacks" or "to Spells" is global for that scope. Increased armour, attack speed, cast speed, critical mods, accuracy, evasion, deflection, and a bare damage range stay `unknown`. Unknown locality is parsed and is not a character total.

## Conditional Modifier Policy

A trailing `while`, `if`, or `against` clause is stored and the line is not semantically complete. It is not treated as always active.

## Range Policy

`Adds 10 to 20 Fire Damage` stores min 10 and max 20. It does not become 15.

## Unsupported Modifier Policy

Unmatched lines stay on `unsupportedLines`. They do not become zero and they do not mark the item as bad. `+20 to maximum Mana` on fixture F is the real example.

## Coverage Model

Each item reports total modifier lines, parsed lines, semantically understood lines, and unsupported lines. Structural coverage is parsed/total. Semantic coverage is understood/total. Both are null when the item has no modifier lines. Understood requires a known family, known locality, and no condition.

## Item Confidence

`complete` means every modifier line is semantically understood. `high` means at least 75% are. `partial` means at least one is. `low` means lines exist and none are understood. `insufficient` means there are no modifier lines. These labels describe the parser, not the item.

## Gear Readiness

`insufficient` means no items. `ready` means there are no diagnostics and every item is `complete` or `high`. Otherwise the status is `partial`. This object is not the passive recommendation.

## Factual Diagnostics

Codes are `missing-equipment-slot`, `unknown-slot`, `duplicate-slot`, `item-missing-identity`, `item-text-unparseable`, `low-modifier-coverage`, `unknown-modifier-lines`, `unknown-locality`, and `unknown-condition`. Tracked missing slots are the primary ten. Charms, flasks, and weapon set 2 are recognized and are not reported as missing when absent.

## No-Ranking Rule

There is no `findWorstItem`, `rankGear`, or `scoreEquipment`. The screen sorts by canonical slot. A low confidence unique is a parser limit. The diagnostic text says that.

## PoB2 Fixture Provenance

Fixture F was generated by Path of Building (PoE2) 0.23.1. The items were entered in that process: rare Withered Wand, rare Twig Focus, rare swap wand, unique Black Sun Crest, rare Rusted Cuirass, two rare rings, and rare Linen Wraps with a fractured dexterity line and attack speed. `F.truth.json` stores the slot, base, rarity, and `BuildRaw` text from that process.

## UI Integration

The analysis screen has a Gear section for fixture and PoB2 results. It shows slot, name, base, rarity, coverage counts, understood semantic ids, confidence, unsupported lines in a collapsed list, missing slots, and other diagnostics.

## Passive-Scoring Regression

The Witch fixture's first offensive candidate remains nodes `[1755, 41965]` at heuristic score 32, profile version 1. A PoB2 import with the same allocated ids and an extra helmet produces the same complete and incomplete candidate lists. Fixture F still runs the passive heuristic. Weights and Top-K were not changed.

## poe.ninja Separation

Gear analysis does not read prices and does not call poe.ninja. The gear sources contain no `fetch` and no economy client.

## PoB2 Calculation-Engine Status

Not started.

## Character-Aware Scoring Status

Not started. Gear modifiers are not weights for the passive heuristic, and the passive heuristic is not an item score.

## Known Gear-Parser Limitations

See section 18. The largest gap is local item mods and any line outside the inventoried grammar, including maximum mana and light radius on fixture F.
