# STEP-016.5B — Real PoB2 export fidelity

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-016.5B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Prove the PoB2 importer against export codes produced by Path of Building (PoE2) 0.23.1's own Generate action, instead of XML written in this repository and compressed with Node.

## 2. Acceptance criteria

- [x] At least four export codes came from the installed application's Generate path
- [x] Each code has a separate truth record taken from that process
- [x] Fixture A resolves Fireball and its two supports
- [x] Fixture B keeps both groups and selects the second as the main socket group
- [x] Fixture C selects Shockwave Slam from the display list, not the raw gem list
- [x] Fixture D keeps shared ids and weapon sets 1, 2, and 3 separate
- [x] Every code goes through decode, inflate, XML parse, and import
- [x] The active GGG pin is unchanged, and every serialized passive id is on that pin
- [x] Normalization version stays 2
- [x] Skills and supports do not change the passive heuristic
- [x] One real code was pasted on the analysis screen
- [x] Synthetic security fixtures were left in place

## 3. Implementation summary

Path of Building-PoE2.exe 0.23.1 was launched with a one-shot hook that called the Generate button's function, `base64url(Deflate(SaveDB("code")))`, on four fresh Witch builds. The hook and the user's settings file were restored afterward. The four codes and their truth files live under `packages/data-sources/src/pob2/fixtures/real/`. The importer already accepted this save shape, so no parser or fact-table change was required. D-073 records that these fixtures come from that Generate action and that a real `treeVersion` is not rewritten to `0.5.5`.

## 4. Files created

| File                                                           | Purpose                                             |
| -------------------------------------------------------------- | --------------------------------------------------- |
| `packages/data-sources/src/pob2/fixtures/real/A.code.txt`      | Generate code for one active skill and two supports |
| `packages/data-sources/src/pob2/fixtures/real/A.truth.json`    | What PoB showed for fixture A                       |
| `packages/data-sources/src/pob2/fixtures/real/B.code.txt`      | Generate code for two skill groups                  |
| `packages/data-sources/src/pob2/fixtures/real/B.truth.json`    | What PoB showed for fixture B                       |
| `packages/data-sources/src/pob2/fixtures/real/C.code.txt`      | Generate code for Shockwave Totem's display list    |
| `packages/data-sources/src/pob2/fixtures/real/C.truth.json`    | What PoB showed for fixture C                       |
| `packages/data-sources/src/pob2/fixtures/real/D.code.txt`      | Generate code with weapon-set allocations           |
| `packages/data-sources/src/pob2/fixtures/real/D.truth.json`    | What PoB showed for fixture D                       |
| `packages/data-sources/src/pob2/fixtures/real/provenance.json` | Version, commit, and export-action record           |
| `packages/data-sources/src/pob2/real-export.test.ts`           | Production-path checks for the four codes           |
| `docs/progress/STEP-016-5B-real-pob2-export-fidelity.md`       | This completion note                                |

## 5. Files changed

| File                              | Change                                                                           |
| --------------------------------- | -------------------------------------------------------------------------------- |
| `docs/planning/DECISION_LOG.md`   | Added D-073                                                                      |
| `packages/data-sources/README.md` | Noted that 0.23.1 emits `PathOfBuilding2` and that `treeVersion` is not remapped |
| `tests/ggg-live-import.test.ts`   | The two token-store checks use the test's frozen clock                           |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`importPob2Build` still owns decode, XML parsing, skill-role resolution, weapon-set separation, and the character snapshot. `decodePob2Export` still owns Base64 and zlib. `real-export.test.ts` reads the stored codes and does not build XML. The passive heuristic is unchanged. No new package dependency was added.

## 8. External APIs / data sources involved

- Provider: Path of Building Community (PoE2), local install
- File: `Path of Building-PoE2.exe` and its Lua modules, especially `Classes/ImportTab.lua` Generate and `Modules/Build.lua` `SaveDB`
- Official/community: community application, not a GGG API
- Auth/scopes: none
- Fields used: the Generate string, display-skill names, gem support flags, and saved passive ids
- Cache/rate: none
- Version/commit/timestamp: 0.23.1, commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`, changelog date 2026-07-28
- Fallback: none. The product does not launch PoB and does not call the network for these fixtures

The public tag `v0.23.1` was read to record the commit. That lookup is not part of the app.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

None. `POB2_NORMALIZATION_VERSION` remains 2.

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

| Command/Test           | Result | Notes                             |
| ---------------------- | ------ | --------------------------------- |
| `npm run format`       | PASS   | See the command log for this step |
| `npm test`             | PASS   | Includes `real-export.test.ts`    |
| `npm run typecheck`    | PASS   |                                   |
| `npm run lint`         | PASS   |                                   |
| `npm run format:check` | PASS   |                                   |

## 13. Manual verification

Headless Chrome opened `http://localhost:3000`, selected PoB2, pasted fixture A, and submitted Import / Analyze. The summary showed status partial, Witch, Infernalist, level 16, tree `0_5` against active `0.5.5`, one skill group, main skill Fireball, two supports, no unresolved-role gems, no equipment, configuration unavailable, the tree-version warning, and the sentence that the optimizer remains passive-tree heuristic only. The first complete candidate score 72 was on the page. The dev server was already running. The cursor browser tool did not re-register, so this check used headless Chrome.

## 14. Errors/issues encountered

- Symptom: the first launch failed with `t_insert` nil.
- Root cause: `t_insert` is a file-local alias in PoB, not a global.
- Resolution: the export script used `table.insert`.
- Regression test added? The stored codes are the regression. The launcher script is not part of the product.

- Symptom: launching PoB changed `Settings.xml`.
- Root cause: process shutdown saved the session mode.
- Resolution: the file was restored from the backup taken before launch.
- Regression test added? No. This was local install state, not product behavior.

- Symptom: two live-import tests returned a missing access token and HTTP 401.
- Root cause: those tests froze the callback at `2026-09-27T00:00:00.000Z`, so the saved token expired at `01:00Z`. The token store reads with the wall clock, which is now later that same day.
- Resolution: those two stores use the same frozen clock. Product token handling is unchanged.
- Regression test added? The existing live-import tests cover it.

## 15. Security/privacy impact

The four builds were fresh unnamed Witch builds. No saved character, community build, or share link was copied. The user's settings file was restored. Invalid Base64, bad zlib, the size limit, and document-type rejection are unchanged. Parsing stays on the server. Raw XML is not rendered as HTML.

## 16. Performance impact

Not measured / not applicable. The fixtures are a few kilobytes. No new network call was added to the app.

## 17. Data provenance / reproducibility impact

The same code imports to the same SHA-256 of the inflated XML. The active pin remains grindinggear/poe2-skilltree-export commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, version 0.5.5. PoB's `treeVersion` `0_5` is stored as emitted and warned, not rewritten.

## 18. Known limitations

These exports have no equipped items and no user-edited configuration, so every import is partial. Placeholder config defaults are not imported. A user `Input` nested in `ConfigSet` is still not read. Fixture E was not created. The passive score is still not a PoB damage calculation.

## 19. Decisions made

D-073. Real fidelity fixtures come from the 0.23.1 Generate action. Root `PathOfBuilding2` is what that version emits. `PathOfBuilding` stays accepted. `treeVersion` is not remapped. Normalization stays 2.

## 20. Deviations from planning docs

The Generate function was invoked inside the launched application. The export window was not clicked with the mouse. The XML still came from `SaveDB`, and the bytes were compressed with PoB's `Deflate`, which is the Generate button's body. Optional fixture E was skipped. Prettier reformatted this progress note and the truth JSON. It left `docs/extra steps/STEP-016-5B-real-pob2-export-fidelity.md` unchanged.

## 21. Remaining risks

A real export can contain a user `Input` inside `ConfigSet`. This reader still looks for `Input` as a direct child of `Config`. These four codes contain only `Placeholder` defaults, so that gap is not exercised. `mainActiveSkillCalcs` can be the literal string `nil` or a number. It is stored and not used to choose the skill. A future PoB version can emit another root or tree version.

## 22. Rollback notes

Delete `packages/data-sources/src/pob2/fixtures/real/`, `real-export.test.ts`, and this progress note, and remove D-073. No runtime behavior change has to be reverted.

## 23. Recommended next step

Stop. Do not start the PoB2 calculation engine, character-aware scoring, or STEP-017 until that work is requested.

## 24. Completion statement

The four required real exports import through the production path and match the truth records from Path of Building (PoE2) 0.23.1. The step is complete.

## PoB2 Version / Commit Used

Path of Building (PoE2) 0.23.1, changelog `VERSION[0.23.1][2026/07/28]`, manifest `Version` number `0.23.1`. Public tag `v0.23.1` is commit `7d6f530cbdab20389ff8bc6ba97a37ac27f74e41`.

## Real Fixture Creation Procedure

1. The installed executable was `C:\Users\Nitro5\AppData\Roaming\Path of Building Community (PoE2)\Path of Building-PoE2.exe`.
2. A temporary hook in `Modules/Build.lua` ran only when `POB2_FIDELITY_EXPORT=1`. It refused a build that already had a save path, then opened a fresh unnamed build.
3. The script selected Witch and Infernalist with PoB's `SelectClass` and `SelectAscendClass`, set level 16, and added gems with `FindSkillGem` and `ProcessSocketGroup`.
4. Fixture D allocated neighboring passives with `AllocNode` in modes 0, 1, 2, and 3.
5. `BuildOutput` ran so `displaySkillList` and `mainActiveSkill` were the values PoB calculated.
6. The script called `common.base64.encode(Deflate(SaveDB("code"))):gsub("+","-"):gsub("/","_")`, the Generate button body from `Classes/ImportTab.lua`.
7. Truth JSON was written from that process's display list, gem support flags, and allocation modes before this importer ran.
8. The hook was removed and `Settings.xml` was restored. No personal build file was copied.

## Fixture Provenance

`packages/data-sources/src/pob2/fixtures/real/provenance.json` records the application, version, commit, and Generate action. The truth files record the in-process interpretation. The `.code.txt` files are the exact Generate strings.

## Fixture A Truth Record

One group. Gems: Fireball (`FireballPlayer`), Magnified Area II (`SupportMagnifiedAreaPlayerTwo`, support), Lightning Attunement (`SupportAddedLightningDamagePlayer`, support). Display list: Fireball. `mainSocketGroup` 1. `mainActiveSkill` 1. Selected skill Fireball. Shared passive ids: 54447 (Witch class start) and 32699 (Infernalist). No weapon-set ids.

## Fixture B Truth Record

Group 1: Spark, display list Spark, `mainActiveSkill` 1. Group 2: Fireball and Rapid Attacks III (support), display list Fireball, `mainActiveSkill` 1. `mainSocketGroup` 2, so the main skill is Fireball and Rapid Attacks III stays on group 2. Group 2's saved `mainActiveSkillCalcs` is the literal `nil`. Shared ids match fixture A. No weapon-set ids.

## Fixture C Truth Record

Gems: Shockwave Totem and Magnified Area II. Display list from PoB: Shockwave Totem (`ShockwaveTotemPlayer`, source gem 1), then Shockwave Slam (`ShockwaveTotemQuakePlayer`, source gem 1). `mainActiveSkill` 2 selects Shockwave Slam. Magnified Area II is a support and is not a display entry. This matches the existing fact table. No fact was added.

## Fixture D Truth Record

One Fireball group, main skill Fireball. Shared ids: 4739 Spell Damage, 18845 Spell Damage, 32699 Infernalist, 54447 Witch class start. Weapon set 1: 1755 Spell Damage. Weapon set 2: 22419 Attribute. Weapon set 3: 6686 Mana Regeneration, 18407 Attribute, 47555 Attribute, 51184 Raw Power, 55807 Mana Regeneration. Set 3 has more than one id because `AllocNode` saved the path PoB allocated. Those ids were not edited.

## Actual Root / Format Observed

Root element: `PathOfBuilding2`. There is an XML declaration and no document type. `Build@targetVersion` is `0_1`. `Spec@treeVersion` is `0_5`. `SkillSet` has an id and no title. `mainActiveSkillCalcs` is either `1` or the literal `nil`. Configuration defaults are `Placeholder` elements inside `ConfigSet`, not `Input`. `PathOfBuilding` remains accepted for older codes. D-071 already allowed both roots. D-073 records which one 0.23.1 emits.

## Real Export Decode Results

Each code is URL-safe Base64 around a zlib stream. `decodePob2Export` inflates it, the XML parser accepts it, and `importPob2Build` returns `ok: true`. Two imports of the same code share one checksum. The checksum is the SHA-256 of the inflated XML. Normalization version is 2.

## Main-Skill Fidelity Results

| Fixture | Main group | Selected display skill | Source gem |
| ------- | ---------- | ---------------------- | ---------- |
| A       | 1          | Fireball               | 1          |
| B       | 2          | Fireball               | 1          |
| C       | 1          | Shockwave Slam         | 1          |
| D       | 1          | Fireball               | 1          |

Fixture C's index 2 is the second display entry, not the second gem. The second gem is Magnified Area II, a support.

## Support Fidelity Results

Supports are Magnified Area II and Lightning Attunement on A, Rapid Attacks III on B's second group, and Magnified Area II on C. Spark, Fireball, and Shockwave Totem stay active. No support was taken from another group. No non-support was labeled a support. Unresolved-role count is 0.

## Weapon-Set Fidelity Results

Fixtures A, B, and C have empty weapon sets. Fixture D's shared list does not contain 1755, 22419, or any set-3 id. Those ids stay on set 1, set 2, and set 3. The character snapshot's `allocatedPassiveIds` are the shared ids only.

## Parser Corrections Discovered

None. The 0.23.1 shape was already accepted: `PathOfBuilding2`, literal `nil`, display-list indexes, and weapon-set elements. No skill fact was added.

## Normalization-Version Decision

Stays 2. The real exports did not change normalized skill or passive meaning. Checksum meaning is unchanged.

## Tree Compatibility Results

Every id in the four truth records exists on the active 0.5.5 pin. None of the imports is `incompatible`. Each is `partial` because there are no items and because `treeVersion` `0_5` differs from `0.5.5`. The version string was not rewritten. Analysis still runs.

## Browser Verification

Fixture A was pasted into the analysis screen. Import succeeded. Status was partial. The tree line showed PoB2 `0_5` and active `0.5.5`. Main skill was Fireball, supports were 2, and the passive-tree heuristic warning was still shown. The first complete candidate score was 72.

## Remaining PoB2 Format Risks

User-edited configuration is saved as `Input` inside `ConfigSet`. This importer still reads only a direct `Config/Input` child. These fixtures have no such `Input`. `mainActiveSkillCalcs` is not interpreted. A later PoB release can change the root, the tree version key, or the display-list rule.

## Current Scoring Limitation

The score is the existing passive-tree heuristic, profile version 1, point budget 5. Fixture A's shared ids are only the Witch class start and the Infernalist start, so the first complete candidate is nodes `[4739, 18845, 1755, 41965]` with `heuristicScore` 72. Clearing skills and equipment does not change that recommendation. Fixture D's shared ids add the two Spell Damage nodes and the Infernalist start, and weapon-set ids stay out of the shared allocation, so it is not the Witch fixture allocation. At budget 5 it has no complete candidate. The Witch fixture's first candidate, `[1755, 41965]` with score 32, is unchanged for that fixture and is not the result of these real exports. Skills, supports, items, and configuration do not enter the score.

## PoB2 Calculation-Engine Status

Not started. These imports do not calculate PoB damage, EHP, or a character-aware score.
