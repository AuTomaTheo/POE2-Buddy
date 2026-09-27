# STEP-016.5C — Real export normalization corrections

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-016.5C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Correct three normalization mistakes that the real Path of Building (PoE2) 0.23.1 exports exposed: ascendancy nodes were sitting in the main-tree allocation, user configuration was read from a synthetic `Config/Input` shape, and the PoB tree key `0_5` was treated as a mismatch with GGG pin `0.5.5`.

## 2. Acceptance criteria

- [x] Ascendancy passive ids are separated from shared/main-tree allocations
- [x] Ascendancy ids are preserved rather than discarded
- [x] Shared/main-tree allocation contains only nodes valid for the main tree
- [x] Weapon-set allocation remains separate and unchanged
- [x] Existing ascendancy name/class context remains preserved
- [x] Real fixture A no longer places Infernalist start node 32699 in `allocatedPassiveIds`
- [x] Real fixture D still keeps set1/set2/set3 allocations separate
- [x] `ConfigSet/Input` values from real PoB2 exports are parsed
- [x] Direct `Config/Input` is not a supported 0.23.1 shape, so it is ignored
- [x] Placeholder/default entries are not mistaken for user-entered configuration
- [x] Configuration values retain raw key, value, type, config-set id, and source
- [x] PoB treeVersion is preserved exactly as emitted
- [x] Active GGG snapshot version is preserved independently
- [x] PoB treeVersion textual mismatch alone does not make an otherwise compatible import partial
- [x] Unknown passive ids still make the import incompatible
- [x] Tree-version/source information remains visible in diagnostics
- [x] The import readiness model remains deterministic
- [x] Normalization version is incremented because normalized semantics change
- [x] Existing passive heuristic outputs remain unchanged for equivalent main-tree allocations
- [x] Existing PoB2 security behavior remains unchanged
- [x] Existing real fixtures continue to pass
- [x] A real configuration fixture exercises `ConfigSet/Input`
- [x] Required repository checks pass
- [x] This completion note exists

## 3. Implementation summary

`importPob2Build` now splits shared node ids after the weapon-set subtraction. Ids that the active snapshot marks with `ascendancyId` or the kind `ascendancy-start` move to `ascendancyPassiveIds` on the PoB2 document. `CharacterBuildSnapshot.allocatedPassiveIds` receives only the remaining main-tree ids. Configuration is read from `ConfigSet` children. `Placeholder` elements are counted and not imported. A direct `Config/Input` child is ignored. `treeVersion` and the GGG pin version are both stored, and they are not compared. Unknown ids still make the import incompatible. Normalization version is 3. The checksum is still the SHA-256 of the inflated XML. D-074 records these rules.

## 4. Files created

| File                                                                 | Purpose                                              |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/data-sources/src/pob2/fixtures/real/E.code.txt`            | Generate code with two ConfigSets and edited Inputs  |
| `packages/data-sources/src/pob2/fixtures/real/E.truth.json`          | PoB's in-memory config and tree record for fixture E |
| `docs/progress/STEP-016-5C-real-export-normalization-corrections.md` | This completion note                                 |

## 5. Files changed

| File                                                           | Change                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `packages/data-sources/src/pob2/import-build.ts`               | Ascendancy split, ConfigSet parsing, tree provenance, normalization version 3             |
| `packages/data-sources/src/index.ts`                           | Exports `pob2AscendancyNodeIds`                                                           |
| `packages/data-sources/src/pob2/import-build.test.ts`          | Synthetic fixtures use ConfigSet; new split, config, and version tests                    |
| `packages/data-sources/src/pob2/skill-role.test.ts`            | ConfigSet fixture; `0_5` stays compatible when the rest of the import is complete         |
| `packages/data-sources/src/pob2/real-export.test.ts`           | A–D expectations follow the split; fixture E checks real Inputs                           |
| `packages/data-sources/src/pob2/fixtures/real/provenance.json` | Notes that fixture E came from the same Generate action                                   |
| `packages/data-sources/README.md`                              | Describes the split, ConfigSet, and the two version namespaces                            |
| `apps/web/src/server/analyze-passive-build.ts`                 | Passes ascendancy ids into the pin and shows them in the analysis view                    |
| `apps/web/src/app/analysis-screen.tsx`                         | Shows the PoB tree key, the GGG version, recognized ids, ascendancy ids, and Input values |
| `packages/passive-engine/src/compatibility.test.ts`            | The pin acceptance test allows 30 seconds under parallel snapshot loads                   |
| `docs/planning/DECISION_LOG.md`                                | Added D-074 and marked the superseded sentences in D-073                                  |
| `docs/progress/STEP-016-5B-real-pob2-export-fidelity.md`       | Roadmap header corrected from Phase 2 to Phase 4                                          |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`pob2AscendancyNodeIds` copies the domain rule used by the passive engine: `ascendancyId` is set, or `kinds` includes `ascendancy-start`. `data-sources` does not import `passive-engine`. `importPob2Build` applies that set to the shared list after weapon-set ids have already been removed. `readConfig` owns ConfigSet selection. `analyze-passive-build` builds the set from the pinned snapshot and passes it in. The analysis screen only displays the result. The heuristic still reads `allocatedPassiveIds`.

## 8. External APIs / data sources involved

- Provider: Path of Building Community (PoE2), local install, used once to generate fixture E
- File: `Path of Building-PoE2.exe`, `Classes/ConfigTab.lua` `Save`, `Modules/Build.lua` `SaveDB`
- Official/community: community application, not a GGG API
- Auth/scopes: none
- Fields used: Generate string, ConfigSet id and title, Input name and boolean/number/string, Placeholder count, shared passive ids
- Cache/rate: none
- Version/commit/timestamp: 0.23.1, commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`, changelog date 2026-07-28
- Fallback: none. The product does not launch PoB

The one-shot export hook was removed from `Build.lua`. `Settings.xml` was restored from the backup taken before launch. The already-running PoB process was left running. No saved build was exported.

The active passive-tree pin is unchanged: grindinggear/poe2-skilltree-export commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, version `0.5.5`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`Pob2BuildDocument` gained `ascendancyPassiveIds`, `configurationSets`, `activeConfigSetId`, and `configurationSelection`. Each configuration value gained `valueKind` and `configSetId`. The import result gained `treeProvenance` with the PoB tree key, the GGG version, a relationship that is always a different namespace and never compared directly, and whether every imported passive id was recognized. `CharacterBuildSnapshot` is unchanged. `POB2_NORMALIZATION_VERSION` is 3.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. Dependencies did not change.

## 12. Automated tests

| Command/Test           | Result | Notes                                           |
| ---------------------- | ------ | ----------------------------------------------- |
| `npm test`             | PASS   | 32 files, 203 tests, after the pin test timeout |
| `npm run typecheck`    | PASS   |                                                 |
| `npm run lint`         | PASS   |                                                 |
| `npm run format:check` | PASS   |                                                 |

## 13. Manual verification

Headless Chrome opened `http://localhost:3000`. Fixture E was pasted through the PoB2 import control. The summary showed status partial, Witch, Infernalist, level 16, ascendancy passive `32699`, PoB tree key `0_5`, active GGG data version `0.5.5`, all imported passive ids recognized, main skill Fireball, and configuration `customMods=Added fire damage, conditionFullLife=true, detonateDeadCorpseLife=5000`. The page did not contain a tree-version mismatch sentence. The passive analysis still ran and showed score 72. The Cursor browser tool did not re-register, so this check used Chrome's debug port instead.

## 14. Errors/issues encountered

- Symptom: the full `npm test` run timed out `accepts the approved 0.5.5 pin` at 5 seconds while other files were also parsing the snapshot. Isolated, that test passed in about 3.5 seconds.
- Root cause: parallel snapshot loads, not a change to the pin or the compatibility rules.
- Resolution: that one test now allows 30 seconds.
- Regression test added: no new product assertion. The same pin test still asserts compatibility.

The Cursor browser MCP server did not re-register. Headless Chrome completed the same page check.

## 15. Security/privacy impact

Decode limits, XML entity handling, and the refusal to fetch share links are unchanged. No credentials were added. The export hook refused a build that already had a save file. Personal builds were not copied. The hook was removed after fixture E was written.

## 16. Performance impact

Not measured. The import still parses one XML document. The ascendancy set is built once from the snapshot the analysis already loads.

## 17. Data provenance / reproducibility impact

Fixtures A–D keep the same export codes and the same checksums. Their truth files still record PoB's serialized shared list, including `32699`. Tests subtract ascendancy members from that list. Fixture E is a new Generate code. Its truth file was written from PoB's in-memory config sets before this importer read the XML. Normalization version 3 does not change the checksum.

## 18. Known limitations

Ascendancy ids are stored and shown. They are not scored, and they do not change path search. Configuration values are stored and shown. They are not interpreted as game conditions. A missing user configuration still makes the import partial, and analysis still runs. Weapon-set ids that are also ascendancy members stay on the weapon set; the split only moves ids that remain in the shared list. Gems outside the checked fact table stay unresolved. There is still no PoB2 calculation engine.

## 19. Decisions made

D-074. Ascendancy ids stay on the PoB2 document, not on `CharacterBuildSnapshot`. `ConfigSet/Input` is the configuration path. Placeholders are not user input. PoB `treeVersion` and the GGG pin version are different namespaces. Node-id validation decides tree compatibility. Normalization version is 3.

## 20. Deviations from planning docs

Direct `Config/Input` is ignored. The step allowed that path to remain only if it was still a real supported shape. Path of Building (PoE2) 0.23.1 writes user values under `ConfigSet`, so the synthetic direct child was removed from the fixtures and covered by a test that expects it to be ignored.

## 21. Remaining risks

A later PoB version can change ConfigSet selection, the display-skill rule, or which nodes carry `ascendancyId`. Placeholder counts differ between config sets because PoB fills them from option defaults, and this importer does not check that those defaults are current. Unknown skill roles still make an otherwise valid tree partial.

## 22. Rollback notes

Revert the files in sections 4 and 5. Fixtures A–D do not need to be restored. Removing fixture E and returning `POB2_NORMALIZATION_VERSION` to 2 restores the previous import meaning. The passive-tree pin, heuristic weights, and Top-K order were not changed.

## 23. Recommended next step

Do not start a PoB2 calculation engine or character-aware scoring from this step. The next approved step should be chosen separately. Passive analysis of a pasted build is ready to keep using main-tree ids only.

## 24. Completion statement

STEP-016.5C is complete. Ascendancy nodes, ConfigSet inputs, and the two tree-version namespaces are normalized as specified. The heuristic weights, Top-K order, passive-tree pin, and calculation engine were not changed.

## Ascendancy Allocation Problem

PoB serializes the Infernalist start `32699` in the same shared node list as the Witch class start `54447`. Normalization version 2 copied that whole list into `allocatedPassiveIds`. The optimizer then treated the ascendancy start as a main-tree node.

## Ascendancy Identification Rule

A node is an ascendancy member when the active snapshot has `ascendancyId` set, or when `kinds` includes `ascendancy-start`. This matches `isAscendancyMember` in the passive engine. Names, positions, id ranges, and class names are not used. On the 0.5.5 pin, raw node `32699` has `isAscendancyStart`, which normalizes to kind `ascendancy-start`. Raw node `54447` is the Witch class start and is not an ascendancy member.

## Domain / Provider Storage Decision

`ascendancyPassiveIds` lives on `Pob2BuildDocument`. `CharacterBuildSnapshot` is unchanged, so GGG character fixtures stay valid. The optimizer reads `allocatedPassiveIds`, which is the main-tree list only. Weapon sets stay on `weaponSetSpecialisations`.

## Real Fixture A Before / After

PoB's truth file still lists shared ids `32699` and `54447`. After normalization, shared and `allocatedPassiveIds` are `[54447]`. `ascendancyPassiveIds` is `[32699]`. Class, ascendancy name, and level are unchanged.

## Weapon-Set Regression

Fixture D's PoB shared list is `4739`, `18845`, `32699`, `54447`. After the split, the main-tree allocation is `4739`, `18845`, and `54447`. Weapon set 1 stays `[1755]`, set 2 stays `[22419]`, and set 3 stays `[6686, 18407, 47555, 51184, 55807]`. Those weapon-set ids are not in the shared list.

## Real ConfigSet Shape

Fixture E was generated by the 0.23.1 Generate action. The XML has `Config activeConfigSet="1"`, then two `ConfigSet` elements. Set 1 is titled Default and contains `customMods` string `Added fire damage`, `conditionFullLife` boolean `true`, and `detonateDeadCorpseLife` number `5000`, plus Placeholder children. Set 2 is titled Inactive and contains `conditionMoving` boolean `true`. The active set is set 1.

## Configuration Parsing Rules

Only `Input` elements inside a `ConfigSet` are user configuration. An `Input` without a name is skipped. A boolean attribute wins over number, then string. Zero ConfigSets means selection `none`. One ConfigSet means `only-set`. Several ConfigSets use `active-set` when `activeConfigSet` matches exactly one set id. Any other case is `unresolved`: the sets are kept, the selected inputs are empty, and `ambiguous` contains `active config set`. That string does not by itself make the import incompatible. A direct `Config/Input` child is ignored.

## Configuration Fixture Truth Record

`E.truth.json` was written by the PoB process from `configTab` memory, using the same default comparison `Save` uses. It was not produced by this importer. The test compares the importer's active-set inputs with that record. Placeholder names such as `enemyFireResist` are absent from the imported inputs. Set 1 has 33 placeholders and set 2 has 19, matching the XML.

## Placeholder Policy

Placeholders are defaults. They increment `placeholderCount` and do not become configuration values, do not change readiness by themselves, and do not change `heuristicScore`.

## Tree-Version Namespace Decision

PoB key `0_5` and GGG version `0.5.5` are stored separately. `treeProvenance.versionRelationship` is always `{ namespace: "different", comparedDirectly: false }`, including when the strings happen to match. The importer does not rewrite `0_5` into `0.5.5` and does not warn because the strings differ.

## Node-ID Compatibility Rule

If every shared, ascendancy, and weapon-set id is in the pin, `passiveIdsRecognized` is true. An unknown id is kept and the import is `incompatible`. A version-key difference alone does not do that. A synthetic build with known ids, a resolved skill, an item, and a ConfigSet Input stays `compatible` when its tree key is `0_5` and the pin is `0.5.5`.

## Readiness Changes

Missing user configuration adds `configuration` to `unavailable` and makes the import partial. Analysis still runs. A version-string difference no longer adds a warning, so it no longer makes the import partial. Fixtures A–D stay partial because they have no equipment and no user Input. Fixture E stays partial because it has no equipment. Its configuration is present. Unknown ids and an ambiguous active tree spec still make the import incompatible. An unresolved active config set does not.

## Normalization Version

`POB2_NORMALIZATION_VERSION` moved from 2 to 3 because the same source now produces a different main-tree allocation and a different configuration list.

## Checksum Stability

The checksum is `sha256:` plus the hex SHA-256 of the inflated XML. Fixtures A–E assert that this matches `decodePob2Export`. Changing the normalization version does not change those checksums.

## Browser Verification

See section 13. Fixture E showed the new provenance wording, the ascendancy id, and the three Input values, and the analysis still ran.

## Scoring Regression

The Witch fixture's first offensive candidate stays nodes `[1755, 41965]` at heuristic score 32, profile version 1, point budget 5. Fixture A's allocated ids are now `[54447]` only. Its first complete candidate was re-measured and is still `[4739, 18845, 1755, 41965]` at heuristic score 72. The Infernalist start adds no offensive heuristic stats, so removing it from the allocation did not move that number. A skills-cleared character with the same main-tree ids produces the same recommendation. Fixture E, which has the same main-tree ids plus real configuration, matches that recommendation too. Fixture D still has no complete candidate at budget 5. It was not forced to the Witch score of 32. `32699` is absent from both analyses' `allocatedNodeIds`. Profile version stays 1. Top-K and path order were not changed.

## Remaining PoB2 Import Risks

See section 21. The largest remaining import gap is skill facts outside the small checked table, and configuration that is stored but not applied to any calculation.

## PoB2 Calculation-Engine Status

Not started. This step does not calculate damage, life, or support applicability. The analysis screen still says the current optimizer is passive-tree heuristic only.
