# STEP-007A — Stat coverage expansion

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-007A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Group the stat lines STEP-007 left unrecognized, add only whole-line templates that keep their qualifiers, and add a separate semantic map that does not merge different phrases. Report extraction coverage, semantic coverage, and whether the stat layer is ready for STEP-008 scoring. Do not score.

## 2. Acceptance criteria

- [x] The 4,142 unrecognized lines from STEP-007 were grouped into structural families before new templates were added
- [x] The remaining unrecognized lines are grouped by a function that can be run again on the pin
- [x] New templates are whole lines. Conditions and two-effect lines that cannot be stored stay unrecognized
- [x] Every raw line is still returned, recognized or not
- [x] Semantic normalization is a separate map and does not replace extraction
- [x] Critical Damage Bonus and Critical Spell Damage Bonus stay different semantic ids
- [x] Increased, reduced, more, and less stay different operations
- [x] An unrecognized line does not become a semantic stat with amount 0
- [x] Coverage on the pin is total 5,963, recognized 2,616, semantic 1,845, unrecognized 3,347
- [x] Scoring readiness is `not-ready`, with the blocking families listed
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

The pipeline is still `rawStats` to extraction to an optional semantic stat. `parsePassiveStatLine` keeps the STEP-007 templates and adds further whole-line templates. A line whose variable wording contains `while`, `if`, `when`, `against`, `per`, `with`, or `for` is left unrecognized. Two markup tokens are left unrecognized unless an exact template stores one effect and its scope.

`semanticPassiveStat` looks up the extracted stat id in an explicit table. It copies the operation, amount, unit, scopes, and raw text. It returns null when the line is unrecognized or when the id is not in the table. `assessStatScoringReadiness` returns `ready` only when every required semantic family has at least one line, extraction coverage is at least 70%, and the unsupported high-priority list is empty. On this pin the required families are all present, coverage is 43.9%, and nine high-priority families are still unsupported, so the status is `not-ready`.

## 4. Files created

| File                                                 | Purpose                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/passive-engine/src/semantic.ts`            | Semantic map, semantic coverage, scoring readiness                  |
| `packages/passive-engine/src/stat-inventory.ts`      | Structural grouping of unrecognized lines, plus node id and name    |
| `packages/passive-engine/src/stat-coverage.test.ts`  | Templates, semantic separation, inventory, pinned totals, readiness |
| `docs/progress/STEP-007A-stat-coverage-expansion.md` | This record                                                         |

## 5. Files changed

| File                                        | Change                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/passive-engine/src/stats.ts`      | Added whole-line templates and the forms `reduced`, `more`, `less`, and `penetration` |
| `packages/passive-engine/src/stats.test.ts` | Pinned recognized and unrecognized totals updated to the measured values              |
| `packages/passive-engine/src/index.ts`      | Exports the semantic and inventory functions                                          |
| `packages/passive-engine/README.md`         | Describes the semantic layer and the not-ready result                                 |
| `packages/passive-engine/package.json`      | Description mentions stat extraction and that scoring is not implemented              |
| `packages/README.md`                        | Passive-engine row mentions semantic normalization                                    |
| `README.md`                                 | Layout line mentions semantic normalization                                           |
| `docs/planning/DECISION_LOG.md`             | D-024 through D-028                                                                   |

## 6. Files deleted

A temporary inventory script, `scripts/inspect-stat-families-temp.mjs`, was used to group the STEP-007 unrecognized lines and then deleted. No project file was removed.

## 7. Important code paths / responsibilities

`parsePassiveStatLine` and `extractPassiveNodeStats` own extraction. They do not assign semantic families.

`semanticPassiveStat` owns the explicit id table. `passiveStatSemanticCoverage` counts recognized lines and lines that also have a semantic id, in one walk.

`unrecognizedStatFamilyId` assigns each unrecognized raw string to one structural family. `unrecognizedStatInventory` groups those lines. `unrecognizedStatOccurrences` keeps the raw string, node id, and node name.

`decideStatScoringReadiness` applies the ready rule. `assessStatScoringReadiness` runs that rule on a node list. Neither function scores a build.

## 8. External APIs / data sources involved

- provider: local pinned tree already loaded by `@poe2-helper/data-sources`
- file: `docs/data-snapshots/passive-tree/data.json`
- official export: grindinggear/poe2-skilltree-export commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, version `0.5.5`
- auth: none
- fields used: node `stats` text already normalized to `rawStats`, plus node id and name for unrecognized occurrences
- cache: the existing snapshot loader
- fetchedAt: `2026-09-26T14:45:00.000Z`
- fallback: none. This step does not fetch

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`PassiveStatForm` now includes `reduced`, `more`, `less`, and `penetration`. A recognized line has `scopes`, an empty array when the template has no scope.

`SemanticPassiveStat` is `{ raw, statId, semanticId, operation, amount, unit, scopes }`.

`StatScoringReadiness` is `{ status, extractionCoverage, semanticCoverage, supportedFamilies, unsupportedHighPriorityFamilies, reasons }` with status `ready` or `not-ready`.

`UnrecognizedStatFamily` is `{ familyId, totalOccurrences, distinctLines, examples }`.

No snapshot file and no domain schema changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. Dependency files did not change.

## 12. Automated tests

| Command/Test           | Result | Notes                                               |
| ---------------------- | ------ | --------------------------------------------------- |
| `npm test`             | PASS   | 11 files, 62 tests                                  |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine |
| `npm run lint`         | PASS   |                                                     |
| `npm run format:check` | PASS   |                                                     |

Pinned assertions lock 5,963 lines, 2,616 recognized, 1,845 semantic, 3,347 unrecognized, the unrecognized family totals, and readiness `not-ready`.

## 13. Manual verification

The STEP-007 unrecognized set was grouped with the four original templates before the parser grew. That grouping totaled 4,142 and is recorded below. After the new templates, `unrecognizedStatInventory` was run on the pin and its family totals were copied into the test. Two calls return the same inventory. Semantic ids for critical damage bonus and critical spell damage bonus were checked against the table. No browser UI exists for this step.

## 14. Errors/issues encountered

The first pinned extraction test still expected 1,821 recognized lines. That number was the STEP-007 result. After the new templates the measured count is 2,616. The test was updated to the measured totals. No production behavior was changed to make the old number pass.

`npm run format` also rewrapped `docs/extra steps/STEP-007A-stat-coverage-expansion.md`. That file is the step note. The rewrap did not change the instructions that were implemented.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or network calls were added.

## 16. Performance impact

Coverage and inventory each walk the 5,963 stat lines once. Parsing does not rescan the tree. Not otherwise measured.

## 17. Data provenance / reproducibility impact

The pin is unchanged: version `0.5.5`, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`. The same nodes produce the same extraction, the same semantic ids, and the same inventory order. Family examples are the first three distinct raw lines in locale sort order.

## 18. Known limitations

Extraction coverage is 43.9%. Most lines are still unrecognized, especially lines with two markup tokens. Semantic coverage is 30.9% because 771 recognized lines are not in the semantic table. More damage, less damage, damage reduction, gain-as-extra, conversion, conditional damage, generic elemental penetration, maximum resistance, and reservation are not supported. The readiness status is `not-ready`. This step does not score.

## 19. Decisions made

- D-024 — additional whole-line templates; qualifier words stay unrecognized
- D-025 — semantic ids come from an explicit table; listed same-family pairs keep their operation
- D-026 — conditions and multi-effect lines stay unrecognized unless a template stores them
- D-027 — increased, reduced, more, and less stay different operations
- D-028 — readiness needs every required family, at least 70% extraction, and an empty unsupported list

## 20. Deviations from planning docs

The step's example semantic names were `SPELL_DAMAGE` and similar. This codebase uses hyphenated ids such as `spell-damage`, matching the extracted stat ids. The meaning is the same list of families.

No separate percentage is reported for "offensive", "defensive", or "conditional" groups. Those would need a defined denominator this data does not provide. Overall extraction and semantic percentages are reported, and each semantic family has a count.

## 21. Remaining risks

A later scorer could still treat a recognized-but-unmapped line as a generic stat if it ignores the null semantic result. The unsupported families are large enough that a score built only on the mapped lines would miss more, conversion, and conditional effects. The 70% target is a working target for this step, not a proof that 70% would be enough.

## 22. Rollback notes

Revert the passive-engine stat, semantic, and inventory files, their exports and tests, the README lines, and D-024 through D-028. The passive-tree pin does not need to change. STEP-007 behavior returns if the new templates and the semantic module are removed.

## 23. Recommended next step

Do not start STEP-008. The stat layer is `not-ready`. The next work is another coverage step that adds verified support for the blocking families, or an explicit decision to score without them. Wait for approval before either.

## 24. Completion statement

STEP-007A is complete. The inventory, the extra whole-line templates, the separate semantic map, and the readiness report are in place. Scoring readiness is `not-ready`. STEP-008 was not started.

## Unknown Stat Inventory

Before any new template, the 4,142 lines STEP-007 left unrecognized were grouped with the structural rules now in `unrecognizedStatFamilyId`. Each line is in one family. Counts are occurrences, then distinct lines.

| Family                  | Occurrences | Distinct lines |
| ----------------------- | ----------: | -------------: |
| multiple-markup-tokens  |        1957 |           1131 |
| increased-unstructured  |         542 |            203 |
| life                    |         202 |             69 |
| energy-shield           |         157 |             26 |
| multiple-numeric-values |         133 |            120 |
| while                   |         133 |             88 |
| with                    |         107 |             43 |
| reduced                 |         106 |             75 |
| minion                  |         105 |             32 |
| no-numeric-value        |         101 |            100 |
| unclassified            |          89 |             48 |
| chance                  |          87 |             39 |
| for                     |          73 |             25 |
| flat-unstructured       |          60 |             29 |
| resistance              |          48 |             26 |
| against                 |          38 |             31 |
| per                     |          36 |             22 |
| when                    |          32 |             28 |
| movement-speed          |          31 |              7 |
| cast-speed              |          31 |              9 |
| armour                  |          18 |             11 |
| conversion              |          16 |              6 |
| evasion                 |          10 |              6 |
| if                      |           8 |              7 |
| less                    |           8 |              8 |
| more                    |           7 |              7 |
| penetration             |           5 |              3 |
| projectile              |           1 |              1 |
| critical                |           1 |              1 |

Those 29 families sum to 4,142. Examples from that pass included `15% increased Mana Regeneration Rate`, `18% increased maximum [EnergyShield|Energy Shield]`, `[Minion|Minions] deal 10% increased Damage`, and `+10% to [Resistances|Cold Resistance]`.

After the new templates, `unrecognizedStatInventory` on the same pin reports 3,347 lines. The largest remaining family is `multiple-markup-tokens` at 1,859 occurrences. The test locks every remaining family total. Occurrences also carry node id and node name. An unrecognized line is never stored as amount 0.

## Coverage Before vs After

| Measure                 |         STEP-007 |    STEP-007A |
| ----------------------- | ---------------: | -----------: |
| Total lines             |             5963 |         5963 |
| Recognized extraction   |     1821 (30.5%) | 2616 (43.9%) |
| Semantically normalized | 0 (no layer yet) | 1845 (30.9%) |
| Unrecognized            |     4142 (69.5%) | 3347 (56.1%) |

Percentages are one decimal place, half up. 771 recognized lines have no semantic id. The pin and the 5,963 line total did not change.

## Supported Semantic Families

These ids are present on the pin. The count is the number of lines mapped to that id. Added and increased forms of the same visible stat share an id only where D-025 says so, and the operation stays on the semantic result.

| Semantic id                      | Lines |
| -------------------------------- | ----: |
| spell-damage                     |    43 |
| attack-damage                    |    79 |
| melee-damage                     |    29 |
| projectile-damage                |    39 |
| physical-damage                  |    59 |
| fire-damage                      |    47 |
| cold-damage                      |    39 |
| lightning-damage                 |    51 |
| chaos-damage                     |    41 |
| elemental-damage                 |    54 |
| damage                           |    18 |
| critical-hit-chance              |    51 |
| critical-damage-bonus            |    38 |
| critical-spell-damage-bonus      |    12 |
| critical-hit-chance-for-attacks  |    17 |
| critical-hit-chance-for-spells   |    18 |
| attack-speed                     |    60 |
| cast-speed                       |    30 |
| projectile-speed                 |    16 |
| accuracy                         |    54 |
| maximum-life                     |    15 |
| maximum-energy-shield            |    81 |
| armour                           |    73 |
| evasion                          |    85 |
| deflection                       |     4 |
| block-chance                     |    53 |
| strength                         |    47 |
| dexterity                        |    38 |
| intelligence                     |    28 |
| any-attribute                    |   293 |
| all-attributes                   |    14 |
| fire-resistance                  |     9 |
| cold-resistance                  |    11 |
| lightning-resistance             |    11 |
| chaos-resistance                 |     9 |
| fire-resistance-penetration      |    19 |
| cold-resistance-penetration      |    18 |
| lightning-resistance-penetration |    26 |
| movement-speed                   |    27 |
| mana-regeneration                |    73 |
| life-regeneration                |    32 |
| minion-damage                    |    53 |
| minion-maximum-life              |    31 |

`critical-damage-bonus` and `critical-spell-damage-bonus` are both supported and are not aliases. `any-attribute` and `all-attributes` are not aliases. Minion damage is not generic damage. Scoped critical chance is not generic critical chance.

## Unsupported High-Priority Families

These stay unsupported because a safe whole-line reading was not available:

- `more-damage` — simple `N% more Damage` is not what the remaining more-lines say
- `less-damage` — `Take 30% less Damage` has a leading word the template does not drop
- `damage-reduction`
- `gain-as-extra`
- `damage-conversion`
- `conditional-damage` — including damage while on full life
- `elemental-resistance-penetration` — the plain "Enemy Elemental Resistances" sentence, not the fire, cold, and lightning lines that are supported
- `maximum-resistance`
- `reservation`

## STEP-008 Scoring Readiness

Status: **not-ready**.

Extraction coverage: 43.9%. Semantic coverage: 30.9%.

Every family in `REQUIRED_SEMANTIC_IDS` has at least one line on the pin. That is not enough. Coverage is below the 70% working target, and the nine families above are still blocking. STEP-008 was not started.
