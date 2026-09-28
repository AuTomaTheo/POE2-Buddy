# STEP-016.5A — PoB2 skill-role fidelity

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-016.5A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Stop treating `Skill@mainActiveSkill` as a raw `<Gem>` index. Resolve the main skill and support roles only from Path of Building 2's display-skill list when the gem facts needed to rebuild that list are known. Otherwise leave the skill unresolved. Do not change the passive heuristic.

## 2. Acceptance criteria

- [x] `mainActiveSkill` is no longer interpreted as a raw `<Gem>` index unless proven equivalent for that group.
- [x] The importer preserves PoB2's raw skill-group data needed for later resolution.
- [x] The importer distinguishes raw gems from resolved active-skill entries.
- [x] Main skill is resolved only when deterministic evidence exists.
- [x] Otherwise `mainSkill.resolved` remains false.
- [x] Supports are marked as supports only when deterministically supported by PoB2 data/metadata.
- [x] A non-selected gem is not automatically classified as a support.
- [x] Unknown/ambiguous gem roles remain explicit.
- [x] Existing skill-group ordering is preserved.
- [x] Existing passive-tree import behavior is unchanged.
- [x] Existing item/config import behavior is unchanged.
- [x] Existing scoring behavior is unchanged.
- [x] At least several real current PoB2 exports are used as fidelity fixtures.
- [x] Real fixtures include at least one multi-skill or ambiguous-active-skill case.
- [x] Tests compare importer interpretation against what PoB2 itself displays for those fixtures.
- [x] Synthetic fixtures remain allowed for edge/error cases.
- [x] Required repository checks pass.
- [x] A completion document is created at `docs/progress/STEP-016-5A-pob2-skill-role-fidelity.md`.

## 3. Implementation summary

Each skill group now keeps the raw gems, the raw `mainActiveSkill` number, and the raw `mainActiveSkillCalcs` string. Active entries are built only when every gem's `skillId` is in the checked 0.23.1 fact table. That table records which granted effects are supports and the display order, including Shockwave Totem's second effect, Shockwave Slam. The selected display entry is the main skill. Other gems are supports only when the fact table says so. Unknown skill ids leave the group unresolved and the import `partial`. The tree is still analyzed. Normalization version is 2. Current PoB2 saves use the root `PathOfBuilding2`, and that root is now accepted beside `PathOfBuilding`.

## 4. Files created

| File                                                    | Purpose                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| `packages/data-sources/src/pob2/skill-roles.ts`         | Checked gem and effect facts from PoB2 0.23.1 |
| `packages/data-sources/src/pob2/skill-role.test.ts`     | Real-shape skill-role fixtures                |
| `docs/progress/STEP-016-5A-pob2-skill-role-fidelity.md` | This record                                   |

## 5. Files changed

| File                                                  | Change                                                    |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `packages/data-sources/src/pob2/import-build.ts`      | Display-list skill resolution and normalization version 2 |
| `packages/data-sources/src/pob2/import-build.test.ts` | Synthetic groups no longer pretend to know roles          |
| `apps/web/src/server/analyze-passive-build.ts`        | Summary fields for main skill and unresolved gems         |
| `apps/web/src/app/analysis-screen.tsx`                | Shows main skill and unresolved-role gem count            |
| `packages/data-sources/README.md`                     | Describes the display-list rule                           |
| `docs/planning/DECISION_LOG.md`                       | Adds D-072                                                |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`skill-roles.ts` owns the checked effect and gem facts. `resolveSkillGroup` owns whether a group can rebuild its display list. `resolveMainSkill` owns the build-level selection through `Build@mainSocketGroup`. `buildCharacter` copies a domain skill only for a resolved display entry, with support names from that same group. Passive search is still `recommendMainTreePaths`.

## 8. External APIs / data sources involved

No network call was added. The skill facts were read from the local Path of Building (PoE2) 0.23.1 install dated 2026-07-28:

- `Data/Gems.lua` for gem id, `grantedEffectId`, and `additionalGrantedEffectId`
- `Data/Skills/act_int.lua`, `act_str.lua`, `sup_dex.lua`, and `sup_int.lua` for `support` and effect names
- `src/Modules/CalcSetup.lua` for the display-list rule: enabled gems, non-support effects, not `hideFromSideBar`
- `src/Classes/SkillsTab.lua` for the saved attributes

The passive ids are still checked against the pinned tree `0.5.5`, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`.

## 9. Credentials / environment variables

### Added/changed variable names

`None`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`Pob2SkillGroup` now has `rawGems`, `activeSkills`, `mainActiveSkill`, `mainActiveSkillCalcs`, and `unresolvedReason`. `Pob2BuildDocument.mainSkill` adds `sourceGemIndex` and `reason`. `activeSkillSetId` is preserved. Domain `NormalizedSkill` is unchanged. `supportNames` is filled only with gems whose role is `support`. Normalization version is 2. The checksum input is unchanged.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency was added.

## 12. Automated tests

| Command/Test           | Result | Notes               |
| ---------------------- | ------ | ------------------- |
| `npm test`             | PASS   | 31 files, 192 tests |
| `npm run typecheck`    | PASS   |                     |
| `npm run lint`         | PASS   |                     |
| `npm run format:check` | PASS   |                     |

Skill-role tests cover a Fireball group with two supports, a two-group build whose main socket group is the second group, Shockwave Totem where display index 2 is Shockwave Slam rather than the second gem, an unknown skill id that stays partial while the Witch tree still scores 32, and an invalid `mainActiveSkill` that does not fail XML parsing. The older synthetic decode, size, and entity tests still pass. A synthetic `mainActiveSkill="2"` no longer marks the second gem as a support.

## 13. Manual verification

Headless Chrome opened `http://localhost:3000`. A Fireball export with Magnified Area II showed status compatible, main skill Fireball, one support, zero unresolved-role gems, the heuristic-only sentence, and score 32. The page did not render raw XML.

## 14. Errors/issues encountered

`None` beyond the role bug this step corrects. The first importer treated `mainActiveSkill` as a gem index. That is covered by the Shockwave Slam test.

## 15. Security/privacy impact

Raw-code-only import, the 1 MiB inflate cap, document-type rejection, and entity rejection are unchanged. No share link is fetched. The new fixtures contain no account data. Raw XML is still not rendered.

## 16. Performance impact

Role lookup is a fixed table read during an import the user submits. Path search is unchanged. Not otherwise measured.

## 17. Data provenance / reproducibility impact

The same inflated XML still has the same SHA-256 checksum. Normalization version 2 marks the new skill interpretation. The same export, pin, and version produce the same groups, main skill, roles, warnings, and readiness.

## 18. Known limitations

Only the gem ids in `skill-roles.ts` can be resolved. Every other skill id leaves that group unresolved. The table does not decide whether a support can apply to an active skill. `mainActiveSkillCalcs`, stat sets, and skill parts are stored or ignored, not interpreted. `PathOfBuilding2` is accepted as a root, and other roots still fail.

## 19. Decisions made

D-072. It replaces the skill-role sentences in D-071. The rest of D-071 stays.

## 20. Deviations from planning docs

The fixtures are XML in the 0.23.1 save shape, compressed with the same zlib export encoding PoB uses. They were not clicked through the PoB window. The expected display names and support flags were taken from that install's data files and `CalcSetup.lua`, which is what PoB shows in the skill list. No player build was copied. Prettier rewrapped `docs/extra steps/STEP-016-5A-pob2-skill-role-fidelity.md`. The planned requirements were not changed.

## 21. Remaining risks

A later PoB2 version can add granted effects or change display order for these gems. Those exports would be unresolved or wrong until the fact table is updated from that version. Gems that are not in the table stay unresolved by design.

## 22. Rollback notes

Revert the skill-role files and restore normalization version 1. Passive search does not depend on the fact table.

## 23. Recommended next step

Stop. Do not start a PoB2 calculation engine or character-aware scoring until that work is explicitly approved.

## 24. Completion statement

STEP-016.5A is complete. Main skill and support roles are resolved only when the display list can be rebuilt from checked PoB2 0.23.1 facts. Otherwise they stay unresolved, the import is partial, and the existing passive heuristic is unchanged.

## Original Skill-Role Problem

STEP-016.5 treated `mainActiveSkill="2"` as the second `<Gem>` and marked every other gem as a support. PoB2's display list can skip supports and can contain two entries from one gem, so that reading picks the wrong skill.

## PoB2 mainActiveSkill Semantics

In Path of Building (PoE2) 0.23.1, `CalcSetup` appends one display entry per enabled gem effect that is not a support and is not hidden from the sidebar. `mainActiveSkill` is the 1-based index of that list. `SkillsTab` saves it on the `Skill` element. A missing value or the literal `nil` is not turned into 1.

## Raw Gems vs Active/Display Skills

`rawGems` keeps name, skill id, gem id, variant, level, quality, enabled, global-enable flags, and count, in file order. `activeSkills` is the display list, each with its 1-based index, effect name, effect id, and source gem index. The two lists are not treated as the same list.

## Main-Skill Resolution Policy

`Build@mainSocketGroup` selects the group. That group's `mainActiveSkill` selects the display entry. The result includes `resolved`, `name`, `skillId`, `groupId`, `sourceGemIndex`, and `reason`. Reasons are `missing-main-socket-group`, `missing-main-active-skill`, `invalid-main-active-skill`, `active-skill-index-out-of-range`, and `active-display-list-not-reconstructable`.

## mainActiveSkillCalcs Handling

The raw attribute is kept on the group. It is listed as unsupported for interpretation. It does not select the main skill.

## Support Classification Policy

A gem is `support` only when its checked granted effect has `support = true` and it contributes no display entry. A gem with a display entry is `active`, including a second active gem that was not selected. Non-selected actives are not supports.

## Unknown-Role Policy

If any gem in the group has a skill id that is absent from the fact table, every gem in that group stays `unknown`, `activeSkills` is empty, and the main skill is unresolved. The gems remain on the group. They are not dropped and they are not given `supportNames`.

## Real PoB2 Fixture Provenance

Generated as small test builds in the Path of Building (PoE2) 0.23.1 save shape, using gem ids from that install. No account data. No copied community build. Created only for parser validation. Encoded as URL-safe-compatible zlib Base64, which is the export encoding in `Build.lua`.

## Fixture-by-Fixture Expected Results

- Fireball, Magnified Area II, and Lightning Attunement, `mainActiveSkill="1"`: main skill Fireball, both other gems supports.
- Spark in group 1 and Fireball plus Magnified Area II in group 2, `mainSocketGroup="2"`: main skill Fireball, Spark kept on group 1, the support stays on group 2.
- Shockwave Totem, Fireball, and Magnified Area II, `mainActiveSkill="2"`: display list is Shockwave Totem, Shockwave Slam, Fireball. The main skill is Shockwave Slam from the first gem. Fireball stays active. Magnified Area II is the only support.
- Skill id `NotInCatalogPlayer`: main skill unresolved, role unknown, status partial, Witch passive score still 32.
- `mainActiveSkill="abc"`: import succeeds, reason `invalid-main-active-skill`, status partial.

## Normalization Version

`POB2_NORMALIZATION_VERSION` is 2. Version 1 treated the gem index as the active skill. The checksum still identifies the inflated source, not the interpretation.

## Import Readiness Impact

An unresolved main skill or any unknown gem role makes the import `partial`. Unknown passive ids still make it `incompatible`. Partial trees still enter the existing passive analysis.

## Tree-Analysis Regression

The Witch allocation `54447`, `4739`, `18845` with an unresolved skill still returns the first offensive candidate `1755`, `41965` at heuristic score 32 and profile version 1.

## Remaining Skill-Model Limitations

The fact table is a small extract, not the PoB gem database. Whether a support can apply to a skill is not calculated. Hidden sidebar effects, global-effect toggles, and alternate stat sets are not reconstructed beyond the flags stored for these seven effects.

## PoB2 Calculation-Engine Status

Not implemented. This step stops before a calculation engine and before character-aware scoring.
