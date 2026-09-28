# STEP-020.8A — Craft of Exile behavioral capture

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.8A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Capture the actual Craft of Exile Augmentation pool, side behavior, and chances, then try to reproduce one chance from Buddy's local snapshot.

## 2. Acceptance criteria

- [x] STEP-020 target planning is unchanged.
- [x] The direct-evidence Augmentation result stays blocked.
- [x] The STEP-020.8 community record stays blocked.
- [x] Zero-mod, one-prefix, one-suffix, and a second item level were reconstructed.
- [x] Rusted Cuirass, Iron Ring, and Withered Wand were included.
- [x] Candidate counts were compared with the local inspection set.
- [x] Three class-weight chances were reconstructed and compared with spawn-weight shares.
- [x] One-stage and equal-side two-stage selection were compared.
- [x] No Craft of Exile code or full dataset was copied.
- [x] Default tests stay offline.
- [x] No simulator was added.

## 3. Implementation summary

`assessCommunityBehavior` records the 2026-09-27 reconstruction. The candidate ids match the local eligible inspection set. The client's draw uses class weights. Those weights are not the spawn weights, so the recorded chances stay outside the display tolerance and the model stays blocked.

## 4. Files created

| File                                                                                            | Purpose                                        |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `packages/crafting-mechanics/src/community-behavior.ts`                                         | Blocked behavioral record and chance helpers.  |
| `packages/crafting-mechanics/src/community-behavior.test.ts`                                    | Offline slot, selection, and separation tests. |
| `docs/data-snapshots/crafting/community-models/augmentation-behavioral-validation-4.5.5.3.json` | Compact observation.                           |
| `scripts/crafting-coe-behavior-validate.ts`                                                     | Local validation command.                      |
| `docs/progress/STEP-020-8A-coe-behavioral-capture.md`                                           | Step record.                                   |

## 5. Files changed

| File                                       | Change                                 |
| ------------------------------------------ | -------------------------------------- |
| `packages/crafting-mechanics/src/index.ts` | Exports the behavior helpers.          |
| `package.json`                             | Adds `crafting:coe-behavior-validate`. |
| `docs/planning/DECISION_LOG.md`            | Adds D-092.                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`oneStageChance` divides a weight by the pool total. `equalSideTwoStageChance` picks a side at one half and then the modifier inside that side. `openMagicSides` closes the side that already has a modifier. `assessCommunityBehavior` returns the blocked observation for the pinned snapshot and patch.

## 8. External APIs / data sources involved

The public page `https://beta.craftofexile.com/?game=poe2`, `json/poe2/4.5.5.3/data.json?v=1790085021`, and calculator worker `package_worker_calculator_processor_poe2.js?v=1790355360` were read on 2026-09-27. The worker was not saved in the repository and was not executed. No user item was sent.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

Augmentation semantics version stays 1. No community model version was issued. The behavioral record is a separate blocked object.

## 11. Commands executed

```text
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:coe-behavior-validate
```

`npm test` passed: 49 files, 393 tests. Dependency files did not change, so `npm audit` was not required.

## 12. Automated tests

Six tests cover the one-stage draw, the equal-side alternative, magic side closure, a missing weight, separation from the direct-evidence registry, a stale snapshot, a different patch, and the checked-in observation.

## 13. Manual verification

The in-editor browser did not open, so the calculator page was not clicked. `crafting:coe-behavior-validate` prints the blocked decision and the three reconstructed chances. No page in this app changed.

## 14. Errors/issues encountered

The in-editor browser server was unavailable. The capture used the public data file and the public calculator worker instead of a clicked session.

## 15. Security/privacy impact

Research used public pages and the local synthetic bases already in the snapshot. No account or credential was sent. The worker was not executed.

## 16. Performance impact

The validation command reads local files. Default tests do not download anything.

## 17. Data provenance / reproducibility impact

The record is bound to snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, source commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, community patch `4.5.5.3`, and behavior checksum `sha256:6916d2f7c45c53616ab5b0f94722acde4bfc94e9bcc1d2f1ceef50eecfd12384`.

## 18. Known limitations

The class-weight table is not in the local snapshot and was not copied. Same-group blocking was not separated from the magic side cap. Greater and Perfect minimum modifier levels 44 and 70 were not adopted. A clicked calculator percentage was not captured.

## 19. Decisions made

D-092.

## 20. Deviations from planning docs

The step allowed a validated community model after a clicked calculator session. The browser was unavailable. The public client was reconstructed instead. The reconstructed chances do not match local spawn weights, so the result stays blocked.

## 21. Remaining risks

A reader can treat the matching candidate counts as permission to roll with spawn weights. Those counts match. The chances do not.

## 22. Rollback notes

Remove the behavior module, the command, and `augmentation-behavioral-validation-4.5.5.3.json`. The direct-evidence registry and the STEP-020.8 community record stay blocked.

## 23. Recommended next step

Do not start STEP-021. Do not add another Augmentation evidence step. Crafting simulation stays deferred.

## 24. Completion statement

STEP-020.8A is complete. Calculator behavior was reconstructed, and the community model was not validated. **STEP-021 BLOCKED.**

## Why STEP-020.8A Exists

STEP-020.8 could see modifier ids and could not see what the calculator does with them.

## STEP-020.8 Gap

STEP-020.8 did not record a zero-mod pool, a one-prefix pool, a one-suffix pool, a second item level, or a chance.

## Evidence Route Used

Route A and route B were not available: the in-editor browser did not open. Route C and route D were used. The public data file and the public calculator worker were read, and the Augmentation path was reconstructed as behavior. The worker was not copied and was not executed. No manual checklist was left open, because the client reconstruction covered the controlled cases.

## Craft of Exile Patch

Observed 2026-09-27. Internal patch `4.5.5.3`, label `0.5.5.3`. Data query `1790085021`. Worker query `1790355360`.

## Controlled Case Matrix

| Case | Base           | Item level | Existing side | Reconstructed count | Local inspection count |
| ---- | -------------- | ---------: | ------------- | ------------------: | ---------------------: |
| A    | Rusted Cuirass |         82 | none          |                 144 |                    144 |
| B    | Rusted Cuirass |         82 | one prefix    |                  85 |                     85 |
| C    | Rusted Cuirass |         82 | one suffix    |                  59 |                     59 |
| D    | Rusted Cuirass |          1 | none          |                  10 |                     10 |
| E    | Iron Ring      |         82 | none          |                 203 |                    203 |
| F    | Withered Wand  |         82 | none          |                 118 |                    118 |

The one-prefix modifier was `AttackerTakesDamage1`. The one-suffix modifier was `ArmourAppliesToElementalDamage1`. Both are ordinary base-influence affixes present in both datasets.

## Zero-Mod Case

A magic Rusted Cuirass with no explicits at item level 82 has 59 prefixes and 85 suffixes in one pool. Both sides are open. The same id set is eligible in the local snapshot.

## One-Prefix Case

After `AttackerTakesDamage1`, the reconstructed pool has 0 prefixes and 85 suffixes. The whole prefix side closes. Seven of the removed prefixes share its group. No suffix was removed.

## One-Suffix Case

After `ArmourAppliesToElementalDamage1`, the reconstructed pool has 59 prefixes and 0 suffixes.

## Low-Item-Level Case

At item level 1 the Rusted Cuirass pool falls from 144 to 10, split 3 prefixes and 7 suffixes. All 134 removed modifiers have a local required item level above 1. The 10 that remain match the local item-level-1 inspection set. Iron Ring falls to 20 and Withered Wand falls to 7, and those counts also match.

## Jewellery Case

Iron Ring at item level 82 matches 203 of 203, with 100 prefixes and 103 suffixes.

## Weapon Case

Withered Wand at item level 82 matches 118 of 118, with 52 prefixes and 66 suffixes. The public data lists that base under wands, so the action is supported there.

## Candidate Pool Capture

The reconstructed pool keeps prefix and suffix rows whose class weight is positive, whose level range contains the item level, and whose influence is the base influence. Essence influence and other generation types are left out. Display names were not taken from a clicked row. Ids were taken from the shared modifier keys.

## Candidate Set Diff

For every zero-mod case above, Buddy-only is 0 and Craft-of-Exile-only is 0. The earlier gap of hundreds of positive spawn-weight rows was a wider query than this eligible inspection set. The eligible set matches.

## Existing-Mod Blocking

One existing prefix removes every prefix, including other groups. One existing suffix removes every suffix. Cross-side removal was 0 for the two chosen modifiers.

## Prefix/Suffix Rule

The client magic cap is one prefix and one suffix. Zero mods offer both sides. One prefix leaves suffixes. One suffix leaves prefixes.

## Conflict Rule

Same-id and same-group removal were not isolated. On a magic item the side cap already removes the whole occupied side. `LocalIncreasedPhysicalDamageReductionRating1` is in `BaseLocalDefences`. Adding it leaves 0 prefixes, 85 suffixes, and 0 other `BaseLocalDefences` rows. That follows the side cap. It does not show whether Craft of Exile splits that family more finely than the local group.

## Essence-Only Rule

The snapshot has 3 essence-only prefix or suffix records. None is eligible on Rusted Cuirass, so none is in that Augmentation pool. Some normal body modifiers also appear in the essence table. Those stay in the pool because they are ordinary base affixes, not because the essence table was included.

## Special Generation Types

Nine body-class rows whose generation type is neither prefix nor suffix were excluded from the reconstructed pool. The tested pools contain only prefixes and suffixes. That is the tested scope, not a claim about every currency.

## Power Field Investigation

On the Rusted Cuirass pool, class weight equals `power` for 0 modifiers. `power` is the client's within-group ordering key after minimum level. The roll uses the class weight. Those weights on this pool are 100, 200, 250, 300, 400, 500, 800, 900, and 1000. Nine distinct ratios against spawn weight remain. `power` is not the selection weight.

## One-Stage vs Two-Stage Selection

The client makes one draw over the combined open-side weights. Prefix weight on Rusted Cuirass is 54000 and suffix weight is 70500. An equal coin-flip between sides, followed by a draw inside the side, gives a different chance. A first draw that picks the side in proportion to its weight would match the single draw numerically. The client path is the single draw.

## Captured Probability

Case A, total class weight 124500, total spawn weight 144:

| Modifier         | Class weight | Reconstructed chance | Spawn-weight chance |
| ---------------- | -----------: | -------------------: | ------------------: |
| ChaosResist1     |          250 |           250/124500 |               1/144 |
| IncreasedSpirit8 |          100 |           100/124500 |               1/144 |
| Strength1        |         1000 |          1000/124500 |               1/144 |

These are reconstructed from the client weight map. They are not numbers read off a clicked emulator row.

## Independent Probability Reproduction

The local check divides the recorded integers. It does not call Craft of Exile. The same division from spawn weight does not match.

## Tolerance

Display tolerance is 0.0001 absolute, one unit at two decimal places of a percent. Raw tolerance is exact equality of the integer ratio. All three samples miss the display tolerance. No sample was accepted as close enough.

## Cross-Case Validation

Id parity holds for the body, ring, and wand zero-mod cases and for item level 1. The chance comparison is locked on the body case, where class weight and spawn weight were both measured for three modifiers. Ring and wand pools also have more than one class-weight-to-spawn ratio, so the same weight gap is not unique to the body.

## Community Model Rule

Not issued. The candidate filter matches the local eligible set, and the weight source does not.

## Community Model Version

Not issued. Augmentation semantics version stays 1.

## Direct-vs-Community Separation

`officialEvidence` on the behavioral record is `blocked`. The simulation registry decision remains `NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE`.

## Supported Scope

None for simulation.

## Known Limitations

Recorded in section 18.

## STEP-021 Decision

**STEP-021 BLOCKED.**

The candidate ids match and the magic side rule was reconstructed. The chances do not. Class weight is not spawn weight, the class-weight table was not copied, and no clicked calculator percentage was available to confirm the reconstruction. Same-group blocking was not separated from the side cap. This was the last planned Augmentation-only evidence step. Crafting simulation stays deferred.
