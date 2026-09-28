# STEP-020.9 — Community weight ingestion

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.9  
**Authoring context:** Cursor-assisted development

## 1. Objective

Give Buddy a versioned community weight layer, compare it with the historical Prohibited Library sheet, and recheck Augmentation chances for the scopes that have a weight on every eligible modifier.

## 2. Acceptance criteria

- [x] Historical rows are normalized and mapped by modifier id.
- [x] Ambiguous or level-mismatched families stay unresolved.
- [x] Current class weights are the promoted numbers.
- [x] Rusted Cuirass, Iron Ring, and Withered Wand were rechecked.
- [x] T1 life, T2 life, and the spirit ladder were calculated.
- [x] A missing weight blocks the whole open pool.
- [x] Default tests stay offline.
- [x] No random simulation, expected cost, or craft route was added.
- [x] The full weight tables stay gitignored.

## 3. Implementation summary

`calculateCommunityAugmentationProbabilities` draws once across the open magic sides and divides each class weight by that total. The promoted snapshot covers every eligible modifier on the three checked class pools. The historical sheet confirms the STR body life ladder and does not override a current weight.

## 4. Files created

| File                                                           | Purpose                                         |
| -------------------------------------------------------------- | ----------------------------------------------- |
| `packages/crafting-mechanics/src/community-weights.ts`         | Mapping, promotion, and probability helpers.    |
| `packages/crafting-mechanics/src/community-weights.test.ts`    | Offline mapping and probability tests.          |
| `scripts/crafting-weights-inspect.ts`                          | Opt-in historical and current comparison.       |
| `scripts/crafting-weights-promote.ts`                          | Explicit promotion of a passing scope.          |
| `scripts/crafting-weights-validate.ts`                         | Checks the local snapshot against the manifest. |
| `docs/data-snapshots/crafting/community-weights/manifest.json` | Compact promoted record.                        |
| `docs/progress/STEP-020-9-community-weight-ingestion.md`       | Step record.                                    |

## 5. Files changed

| File                                       | Change                                     |
| ------------------------------------------ | ------------------------------------------ |
| `packages/crafting-mechanics/src/index.ts` | Exports the weight helpers.                |
| `package.json`                             | Adds the weight commands.                  |
| `.gitignore`                               | Ignores `var/crafting-community-weights/`. |
| `docs/planning/DECISION_LOG.md`            | Adds D-093.                                |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`mapHistoricalFamily` accepts a ladder only when the display text, affix side, tier count, and required item level all agree. `classifyCommunityWeight` marks unchanged, changed, current-only, and historical-only. `promotedWeight` keeps the current number. `calculateCommunityAugmentationProbabilities` refuses a different patch, an empty open pool, or any open candidate without a weight.

## 8. External APIs / data sources involved

The public sheet `1l811uI5eXML-Iw_vNNouah9XRWZVGiLjzZOBWObxKpI` and the already downloaded Craft of Exile `4.5.5.3` data file were read by the opt-in inspect command. PoE2DB's weightings page still does not publish these per-modifier integers. No user item was sent.

## 9. Credentials / environment variables

### Added/changed variable names

`CRAFTING_WEIGHT_WORKBOOK` and `CRAFTING_COE_DATA` optionally point the inspect command at a local workbook and data file. Both default to the local research copies.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`COMMUNITY_WEIGHT_SCHEMA_VERSION` is 1. Augmentation semantics version stays 1. The full current records live in `var/crafting-community-weights/current-4.5.5.3.json`.

## 11. Commands executed

```text
npm run crafting:weights:inspect
npm run crafting:weights:promote
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:weights:validate
```

`npm test` passed: 50 files, 399 tests. Dependency files did not change, so `npm audit` was not required.

## 12. Automated tests

The tests cover family normalization, an exact life ladder, an unresolved count mismatch, a changed weight promoted as the current value, a 100/300/600 pool, side closure, a missing weight, a stale patch, and the committed manifest.

## 13. Manual verification

`crafting:weights:validate` compared the local snapshot with the manifest. No page in this app changed.

## 14. Errors/issues encountered

Ring and wand historical families did not line up with current required item levels, so those ladders stayed unresolved. Their current class weights still covered every eligible modifier. The first full test run also timed out two existing tests under load; a later run passed 50 files and 399 tests. Typecheck then required exporting `CommunityAffixKind` and `CommunityWeightRecord` from the package index.

## 15. Security/privacy impact

The inspect command reads local files only. No account or credential is stored.

## 16. Performance impact

Default tests use small fixtures. The inspect command scans the local snapshot for three bases.

## 17. Data provenance / reproducibility impact

Promoted checksum `sha256:28184ab7ffabb71a4829410afee503e8f3dea215e9ee353cbe6b5acd4b22630f`. Snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. Patch `4.5.5.3`.

## 18. Known limitations

The full weight tables are not in git. Ring and wand historical ladders are unresolved. Same-group blocking beyond the magic side cap remains unisolated. Other item classes are not promoted. PoE2DB did not supply a numeric cross-check.

## 19. Decisions made

D-093.

## 20. Deviations from planning docs

No exact historical mapping changed its weight, so the report has no changed example from this patch. The changed-weight rule is covered by a synthetic test. Preferred extra classes were not required for the first ready scope and were left out of this promotion.

## 21. Remaining risks

A later patch can change a class weight without this manifest changing. The pinned snapshot stays on `4.5.5.3` until a new promotion.

## 22. Rollback notes

Remove the weight module, the commands, and `docs/data-snapshots/crafting/community-weights/manifest.json`. Delete `var/crafting-community-weights/` locally. The direct-evidence registry stays blocked.

## 23. Recommended next step

STEP-021 may start for magic Augmentation on STR body armour, rings, and wands. It was not started here.

## 24. Completion statement

STEP-020.9 is complete. Three class pools have a current weight for every eligible modifier. **STEP-021 READY FOR AUGMENTATION USING COMMUNITY-DERIVED WEIGHTS: STR body armour, ring, and wand.**

## Why STEP-020.9 Exists

STEP-020.8A matched the candidate ids and the one-draw rule, then stopped because the class weights were not stored.

## Product Importance

Those weights are what let a later crafting guide say how likely a named modifier is. This step stores them for the first ready scope. It does not build the guide.

## Historical Weight Source

The public recombinator sheet `1l811uI5eXML-Iw_vNNouah9XRWZVGiLjzZOBWObxKpI`, associated with Krakenbul and the Prohibited Library, was read on 2026-09-27. It is a historical seed. It is not the current patch authority.

## Google Sheet Structure

Hidden tabs include `WEIGHTS`, `SPAWNLVLS`, and `W+I`. `WEIGHTS` has a base category, prefix or suffix, a display family, and tier columns. `SPAWNLVLS` supplies the required item level for the same cell. The inspect command normalized 8898 tier cells.

## Licensing / Distribution Decision

Community guides tell readers to copy the sheet for their own use. No license for redistributing the full table was found. The full historical file and the full current snapshot stay in `var/crafting-community-weights/`, which is gitignored. The committed manifest keeps counts, checksums, and the sample chances.

## Historical Import

`npm run crafting:weights:inspect` reads a local workbook export. Default tests do not contact Google.

## Historical Schema

Each normalized tier has a base category, affix kind, display family, tier index, required item level, and weight.

## Modifier Mapping

Display text is normalized from `{0}` and `[Label|Name]` forms onto the sheet's `#` text. A family is accepted only when the affix side, tier count, and required item level all match. The maximum Life ladder on STR body armour mapped to `IncreasedLife13` through `IncreasedLife1`. Families that missed the item level stayed unresolved.

## Current Craft of Exile Weight Extraction

Current weight is the class weight whose modifier key equals the Buddy modifier id. Patch `4.5.5.3`.

## PoE2DB Cross-Check

The PoE2DB weightings page does not publish these per-modifier integers. Status: unavailable. That is not a disagreement.

## Historical vs Current Diff

| Scope           | Eligible | Weighted | Unchanged | Changed | Current-only | Unresolved families |
| --------------- | -------: | -------: | --------: | ------: | -----------: | ------------------: |
| STR body armour |      144 |      144 |        13 |       0 |          131 |                  18 |
| Ring            |      203 |      203 |         0 |       0 |          203 |                  31 |
| Wand            |      118 |      118 |         0 |       0 |          118 |                  29 |

## Unchanged Weights

`IncreasedLife1` is 1000 historically and 1000 currently. The other twelve life tiers on that ladder are unchanged as well.

## Changed Weights

No exact mapping changed. A synthetic test still promotes a current 800 over a historical 1000.

## Current-Only Modifiers

`ArmourAppliesToElementalDamage1` is 1000 in the current class table and has no exact historical ladder. It is promoted with the current weight.

## Historical-Only Modifiers

None of the exact historical ids fell outside the eligible pools. Unresolved sheet families were not copied in as current modifiers.

## Current Snapshot

`var/crafting-community-weights/current-4.5.5.3.json`, checksum `sha256:28184ab7ffabb71a4829410afee503e8f3dea215e9ee353cbe6b5acd4b22630f`.

## Schema Version

`COMMUNITY_WEIGHT_SCHEMA_VERSION = 1`.

## Checksum

`sha256:28184ab7ffabb71a4829410afee503e8f3dea215e9ee353cbe6b5acd4b22630f`

## Coverage by Item Class

STR body armour, ring, and wand are each at 100% of the item-level-82 eligible pool. Other classes were not promoted.

## Rusted Cuirass Validation

Item level 82, magic, no explicits: 144 candidates, total weight 124500, 59 prefixes weighing 54000 and 85 suffixes weighing 70500. One prefix leaves a suffix denominator of 70500. One suffix leaves a prefix denominator of 54000. The probability sum is 1.

## Iron Ring Validation

203 of 203 eligible modifiers have a current weight. Total weight 161600.

## Wand Validation

Withered Wand: 118 of 118. Total weight 81800. The generic `WAND` sheet did not align item levels, so its rows stayed unresolved.

## T1 Life Probability

`IncreasedLife13`, weight 1000, chance 1000/124500.

## T2 Life Probability

`IncreasedLife12`, weight 1000, chance 1000/124500.

## Variable-Tier Weight Validation

Spirit on STR body armour is not one weight. From the highest item level downward the current weights are 100, 200, 300, 400, 500, 500, 500, 500 on `IncreasedSpirit8` through `IncreasedSpirit1`.

## Probability Sum Validation

The Rusted Cuirass zero-mod probabilities sum to 1.

## Missing-Weight Behavior

If any open candidate has no weight, the whole probability result is blocked. The missing modifier is not dropped and the rest are not renormalized. Unknown is not stored as 0.

## Patch Binding

The snapshot is pinned to `4.5.5.3`. A request for `4.5.4.1.2` fails closed.

## Runtime Independence

Craft answers do not call Google, Craft of Exile, or PoE2DB. They read the promoted local snapshot.

## Known Limitations

Recorded in section 18.

## STEP-021 Decision

**STEP-021 READY FOR AUGMENTATION USING COMMUNITY-DERIVED WEIGHTS: STR body armour, ring, and wand.**

The ready scope is a magic item with zero or one explicit modifier on those three class pools. Direct-evidence probabilities stay blocked. Other classes stay closed. STEP-021 was not implemented in this step.
