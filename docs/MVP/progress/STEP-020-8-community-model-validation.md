# STEP-020.8 — Craft of Exile / PoE2DB differential validation

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.8  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether Buddy can reproduce a labeled, community-derived Orb of Augmentation model from current Craft of Exile and PoE2DB evidence. The direct-evidence model from STEP-020.6 stays blocked either way.

## 2. Acceptance criteria

- [x] STEP-020 target planning is unchanged.
- [x] The direct-evidence Augmentation result stays blocked.
- [x] Craft of Exile's current public patch, data file, and calculator worker name were checked on 2026-09-27.
- [x] PoE2DB's Rusted Cuirass page and weightings page were checked the same day.
- [x] Modifier ids were compared with the local snapshot.
- [x] `power` was compared with RePoE spawn weight and was not a single scale.
- [x] No Craft of Exile code or full dataset was copied into the repository.
- [x] No calculator probability was reproduced.
- [x] The community model is labeled `community-derived` and `blocked`.
- [x] Default tests stay offline.
- [x] No simulator was added.

## 3. Implementation summary

`assessCommunityAugmentationModel` records the 2026-09-27 differential and refuses a different snapshot or a different community patch. It does not replace the STEP-020.7 registry. Both answers stay blocked. The checksum covers the semantic facts and excludes the observation date.

## 4. Files created

| File                                                                      | Purpose                                  |
| ------------------------------------------------------------------------- | ---------------------------------------- |
| `packages/crafting-mechanics/src/community-model.ts`                      | Blocked community-model record.          |
| `packages/crafting-mechanics/src/community-model.test.ts`                 | Offline provenance and separation tests. |
| `docs/data-snapshots/crafting/community-models/augmentation-4.5.5.3.json` | Checked-in differential record.          |
| `scripts/crafting-community-validate.ts`                                  | Local validation command.                |
| `docs/progress/STEP-020-8-community-model-validation.md`                  | Step record.                             |

## 5. Files changed

| File                                       | Change                               |
| ------------------------------------------ | ------------------------------------ |
| `packages/crafting-mechanics/src/index.ts` | Exports the community-model helpers. |
| `package.json`                             | Adds `crafting:community-validate`.  |
| `docs/planning/DECISION_LOG.md`            | Adds D-091.                          |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`assessCommunityAugmentationModel` returns the blocked community record when the snapshot checksum, source commit, and community patch match the observation. `probabilityStatusForCommunityWeight` returns `blocked` for match, scaled-equivalent, mismatch, and unavailable. `assessSimulationRegistry` is unchanged.

## 8. External APIs / data sources involved

One public page and its linked static JSON were read on 2026-09-27: `https://beta.craftofexile.com/?game=poe2` and `json/poe2/4.5.5.3/data.json?v=1790085021`. The calculator worker URL was checked for a few identifier names and was not saved. PoE2DB pages for weightings and Rusted Cuirass were read. No user item was sent. The files were not committed.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

Augmentation semantics version stays 1. The community record is a separate object with `modelKind`, `validation`, `officialEvidence`, a patch binding, and a checksum. `CraftingItemState` is unchanged.

## 11. Commands executed

```text
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:community-validate
```

`npm test` passed: 48 files, 387 tests. Dependency files did not change, so `npm audit` was not required.

## 12. Automated tests

Five tests cover the blocked community record, its separation from the direct-evidence registry, dictionary counts that are not a pool, unavailable weights, a stale snapshot, a different patch, and the checked-in artifact.

## 13. Manual verification

`crafting:community-validate` printed `validation: blocked`, `officialEvidence: blocked`, and the recorded counts. No page in this app changed, so the browser was not required for Buddy. The Craft of Exile calculator itself could not be driven here, which is why no chance was copied from it.

## 14. Errors/issues encountered

The in-editor browser did not open the Craft of Exile calculator. The comparison used the public page constants and the public data file instead of a clicked emulator session.

## 15. Security/privacy impact

Research used public pages and synthetic base names already in the local snapshot. No account, build, or credential was sent. The worker file was not executed.

## 16. Performance impact

The validation command reads the local artifact and the compatibility report. Default tests do not download anything.

## 17. Data provenance / reproducibility impact

The community record is bound to snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, source commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, community patch `4.5.5.3`, and model checksum `sha256:f62c0a05fd515cc10ddf8c310ac8b7b341eb4a2f73571ac2e13d7078a16874ae`. The observation date is stored and is outside that checksum.

## 18. Known limitations

The community model is not usable. Craft of Exile can change patch `4.5.5.3` without this record changing. PoE2DB did not provide a numeric weight table for the controlled bases. A later patch needs a new validation, not a silent reuse of these counts.

## 19. Decisions made

D-091.

## 20. Deviations from planning docs

The step allowed a validated community model. The differential did not reproduce a pool, a conflict rule, or a probability, so the result is the blocked outcome.

## 21. Remaining risks

A reader can treat the 144, 203, and 118 overlapping ids as Craft of Exile's Augmentation outcomes. Those counts are dictionary presence only.

## 22. Rollback notes

Remove the community-model module, the command, and `augmentation-4.5.5.3.json`. The direct-evidence registry stays blocked.

## 23. Recommended next step

Do not start STEP-021. Do not open another Augmentation evidence step for this same gap. Crafting simulation stays deferred.

## 24. Completion statement

STEP-020.8 is complete. The community-derived Augmentation model was checked and was not validated. **STEP-021 BLOCKED.**

## Why STEP-020.8 Exists

STEP-020.7 rejected an official probability. It left open whether Buddy could still reproduce the current Craft of Exile model on purpose, with a clear community label.

## Why STEP-020.7 Was Not Enough

STEP-020.7 quoted the public weight pages and the pyoe2-craftpath README. It did not open the current data file, compare modifier ids, or compare `power` with spawn weight.

## Community-Model Policy

A community-derived model may be approved only when the pool, the required conflict and slot rules, and the selection rule are reproduced for a named scope and labeled as an estimate. This observation does not meet that gate. It is not official, not a GGG formula, and not guaranteed.

## Sources and Roles

RePoE remains the local id, tag, generation, and spawn-weight snapshot, label 4.5.5.2. PoE2DB was the cross-check for base identity and for the statement that weights are not in the game files. Craft of Exile was the candidate behavioral model. None of the three is an official mechanic specification.

## Craft of Exile Current Patch

Observed 2026-09-27 on `https://beta.craftofexile.com/?game=poe2`. Page constant `patch` and `core.currentPatch` were `4.5.5.3`. The user-facing label was `0.5.5.3`, league Forbidden Rites. The changelog entry for 2026-09-20 says PoE2 data was updated to patch 0.5.5.3. Data URL `json/poe2/4.5.5.3/data.json?v=1790085021`. The developers page says there are no API endpoints. The about page names Krakenbul for weights and does not provide a source license.

## PoE2DB Cross-Check

`https://poe2db.tw/us/weightings`, read 2026-09-27, still says weight information cannot be obtained from the game file. `https://poe2db.tw/Rusted_Cuirass` shows `Metadata/Items/Armours/BodyArmours/FourBodyStr1`, drop level 1, and the same base tags this snapshot uses. That page does not publish a numeric Augmentation weight for each modifier, so it could not confirm or contradict Craft of Exile `power`.

## RePoE/Buddy Baseline

Snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`. Inspection lists at item level 82, magic, no explicit modifiers: Rusted Cuirass 144, Iron Ring 203, Withered Wand 118. Final candidate lists remain empty.

## Public Client Behavior Investigation

The page lists calculator worker `packages/files/package_worker_calculator_processor_poe2.js?v=1790355360` (357,855 bytes). A string search found `poe2_augmentation`, `open_prefix`, `open_suffix`, `open_affix`, and `min_mod_level`. It did not find the identifiers `generationWeight` or `spawnWeight`. The file was not executed, not copied into the repository, and not treated as a formula. The public data file names handlers `poe2_augmentation`, `poe2_augmentation_greater`, and `poe2_augmentation_perfect`. Greater and Perfect carry `min_mod_level` 44 and 70. The base Augmentation entry is constrained to `rarity_magic` and `open_affix`.

## Controlled Test Matrix

| Base           | Item level | Rarity | Explicits | Inspection ids also in the Craft of Exile dictionary |
| -------------- | ---------- | ------ | --------- | ---------------------------------------------------- |
| Rusted Cuirass | 82         | magic  | none      | 144 of 144                                           |
| Iron Ring      | 82         | magic  | none      | 203 of 203                                           |
| Withered Wand  | 82         | magic  | none      | 118 of 118                                           |

No one-prefix, one-suffix, second item level, or calculator chance was captured from the emulator. The in-editor browser did not open the site.

## Candidate Mapping

Shared modifier ids are exact. All 3,183 Craft of Exile modifier keys in that file exist in the snapshot. All 2,816 prefix or suffix keys exist in the snapshot. Affix kind matched for every mapped modifier that had a positive RePoE spawn weight on Rusted Cuirass or Iron Ring.

## Candidate-Set Differences

Presence in the dictionary is not the Augmentation pool. Craft of Exile `classmods` for a class is a map of numeric keys to numbers, not a list of modifier ids. Of the prefix and suffix modifiers with a positive spawn weight at item level 82, 692 of 913 on Rusted Cuirass and 692 of 984 on Iron Ring are absent from the Craft of Exile dictionary. The reverse Augmentation pool, Craft of Exile minus Buddy, was not available as a filtered set.

## Prefix/Suffix Behavior

Where ids mapped, prefix stayed prefix and suffix stayed suffix. The data constraint `open_affix` does not state one prefix slot plus one suffix slot. The 2026-09-21 changelog mentions an Essence of the Abyss bug when one affix side was full. That is a bug note about that essence, not an Augmentation rule that was reproduced here.

## Conflict/Blocking Behavior

No occupied magic item was observed in the emulator, so same-id and same-group blocking were not reproduced. `BaseLocalDefences` was not overwritten.

## Essence-Only Behavior

No essence-only row was observed inside an Augmentation pool in the emulator. The data file has a separate essences section. That section was not turned into an exclusion rule.

## Special Generation Types

Craft of Exile generation types include PREFIX, SUFFIX, UNIQUE, CORRUPTED, ESSENCE, and the other labels in its type enum. Their absence from a normal Augmentation pool was not observed in a calculator result.

## Weight Comparison

For mapped modifiers with a positive spawn weight, Craft of Exile `power` divided by that spawn weight produced 134 distinct ratios on Rusted Cuirass and 121 on Iron Ring. Status: mismatch. PoE2DB displayed weight: unavailable for these rows.

## Weight Normalization

A single scale would have produced one ratio. It did not, so scale equivalence was not accepted.

## One-Stage vs Two-Stage Selection

Not determined. The worker mentions `open_prefix` and `open_suffix`, and the data constraint says `open_affix`. Neither token is a measured probability.

## Probability Reproduction

Not done. There is no public API, the calculator was not driven, and the worker was not executed. No candidate chance was compared.

## Validation Tolerance

No tolerance was applied, because there was no calculator number to compare.

## Known Mismatches

`power` is not a scale of spawn weight. Greater and Perfect minimum modifier levels 44 and 70 are not in the Augmentation item text. The snapshot label is 4.5.5.2 and the observed Craft of Exile patch is 4.5.5.3. Same ids on the sample bases do not make the weight tables the same model.

## Model Kind

`community-derived`.

## Model Version

Not promoted. Augmentation semantics version stays 1. The community record's validation value is `blocked`.

## Model Checksum

`sha256:f62c0a05fd515cc10ddf8c310ac8b7b341eb4a2f73571ac2e13d7078a16874ae`

## Supported Scope

None for simulation. The direct-evidence transition scope remains a magic item with zero explicit modifiers, and that scope is still not a draw.

## Runtime Independence

`crafting:community-validate` reads local files only. Buddy does not call Craft of Exile while answering a craft question.

## Refresh Policy

A later Craft of Exile patch stays outside this record until someone repeats the differential and reviews it. Nothing promotes a new patch automatically.

## Patch Drift

This record is pinned to `4.5.5.3`. A call with `4.5.4.1.2` returns `patch-mismatch`.

## Licensing / Code-Copy Boundary

The about page and the developers page do not grant a reusable source license. The developers page says there is no API. No Craft of Exile source and no full data file were added to the repository. The worker was deleted after the identifier search.

## Synthetic Tests

The tests use the pinned checksum and a wrong checksum. They do not read Craft of Exile.

## Real Differential Validation

`npm run crafting:community-validate` checks the artifact against the local compatibility report. It does not download. The counts above are the 2026-09-27 observation.

## Known Limitations

Recorded in section 18. They are the reason the community model stays blocked.

## STEP-021 Decision

**STEP-021 BLOCKED.**

The direct-evidence model is still incomplete. The community-derived model is blocked because the candidate pool was not reproduced, conflict behavior was not observed, `power` is not a proven selection weight, and no calculator probability matched. Crafting simulation stays deferred. Another Augmentation-only evidence step is not the next step.
