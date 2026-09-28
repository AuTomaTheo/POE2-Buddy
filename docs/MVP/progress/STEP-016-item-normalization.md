# STEP-016 — Item normalization

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-016  
**Authoring context:** Cursor-assisted development

## 1. Objective

Normalize equipped items from the current character record. Map modifier text to a structured stat category only where the existing semantic map already names it. Keep the raw item text and flag every other modifier. Do not start STEP-017.

## 2. Acceptance criteria

- [x] Equipment from a fixture or an imported item can be normalized
- [x] Reliable modifier text maps to an existing semantic category
- [x] The raw item representation is preserved
- [x] Unknown modifiers stay visible and are not treated as zero
- [x] Passive heuristic scores are unchanged
- [x] Required repository checks pass

## 3. Implementation summary

`normalizeGearItem` copies the slot, name, base type, rarity, and raw text. It classifies each modifier line with the passive stat grammar and `semanticPassiveStats`. A markup line such as `10% increased [Spell] Damage` becomes `spell-damage`. Plain text such as `10% increased Spell Damage` stays unknown with reason `unmapped`. Text the grammar does not recognize stays unknown with reason `unrecognized`. A fixture item that has only a name has no modifiers. Bases are not assigned a category.

## 4. Files created

| File                                              | Purpose                                |
| ------------------------------------------------- | -------------------------------------- |
| `packages/gear-engine/package.json`               | Gear-engine package                    |
| `packages/gear-engine/tsconfig.json`              | Package typecheck                      |
| `packages/gear-engine/src/normalize-item.ts`      | Item normalization                     |
| `packages/gear-engine/src/normalize-item.test.ts` | Category, unknown, and raw-text checks |
| `packages/gear-engine/src/index.ts`               | Public exports                         |
| `packages/gear-engine/README.md`                  | Package note                           |
| `docs/progress/STEP-016-item-normalization.md`    | This record                            |

## 5. Files changed

| File                               | Change                                          |
| ---------------------------------- | ----------------------------------------------- |
| `package.json`                     | Typechecks `@poe2-helper/gear-engine`           |
| `package-lock.json`                | Links the new workspace package                 |
| `packages/domain/src/character.ts` | Notes that raw item text stays on the character |
| `packages/README.md`               | Marks item normalization as implemented         |
| `README.md`                        | Describes the gear engine                       |
| `docs/planning/DECISION_LOG.md`    | Adds D-070                                      |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`normalizeGearItem` owns the item record and the unknown/categorized split. `parsePassiveStatLine` and `semanticPassiveStats` still own whether a line has a semantic id. The character snapshot still stores the raw item. Passive analysis does not call the gear engine.

## 8. External APIs / data sources involved

`None`

Normalization reads item text already stored on a `NormalizedItem`. It does not fetch GGG, poe.ninja, or a new item dataset.

## 9. Credentials / environment variables

### Added/changed variable names

`None`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`NormalizedGearItem` is a gear-engine result. It is not a new field on `CharacterBuildSnapshot`. The domain item schema is unchanged. No scoring or passive-tree pin schema changed.

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

## 12. Automated tests

| Command/Test             | Result | Notes                                                                                                                                        |
| ------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`               | PASS   | 29 files, 176 tests                                                                                                                          |
| `normalize-item.test.ts` | PASS   | Markup spell damage is categorized. Plain spell damage is unmapped. An unrecognized line stays unknown. A name-only fixture has no modifiers |
| `npm run typecheck`      | PASS   | Includes gear-engine                                                                                                                         |
| `npm run lint`           | PASS   | Exit 0                                                                                                                                       |
| `npm run format:check`   | PASS   | Exit 0                                                                                                                                       |
| `npm audit`              | PASS   | 0 vulnerabilities                                                                                                                            |

## 13. Manual verification

The analysis screen was not changed, so its browser flow was not re-run. Item normalization is covered by the unit tests above.

## 14. Errors/issues encountered

Workspace typecheck reported that `delete` cannot remove a required `name` from the GGG character fixture. The missing-field test now builds the object without that property. The assertion is unchanged.

## 15. Security/privacy impact

No new credentials, tokens, or account data. Item text that is already on a character snapshot is classified in memory.

## 16. Performance impact

Not on the analysis request path. Classification walks the modifier lines of the items it is given.

## 17. Data provenance / reproducibility impact

The same item text produces the same categories. The result does not add a new data version. Passive recommendations still record the passive-tree `dataVersion`.

## 18. Known limitations

- Plain item wording is not categorized unless the existing semantic map names that exact line.
- Item bases are not mapped to item classes or tags.
- Local modifiers, conditional modifiers, and crafted-versus-explicit origin are not separated.
- The result is not shown on the analysis screen.
- Slot scores and upgrade targets are not implemented.

## 19. Decisions made

D-070. Categories come only from the current semantic map. Unknown lines stay on the item. Bases stay text. The result is not a passive score.

## 20. Deviations from planning docs

`None`

## 21. Remaining risks

A later item dataset can name modifiers the current grammar leaves unknown. Until then, most live item lines will be `unmapped` or `unrecognized` rather than categorized.

## 22. Rollback notes

Remove `packages/gear-engine` and the typecheck script entry. Character snapshots, passive scores, and the approved tree pin do not depend on this package.

## 23. Recommended next step

STEP-017, basic gear weakness analysis, after explicit approval. Do not start it as part of this step.

## 24. Completion statement

STEP-016 satisfies the acceptance criteria. Equipped items keep their raw text, known modifier lines receive an existing semantic category, and every other modifier is flagged unknown.
