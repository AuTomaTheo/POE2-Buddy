# STEP-019A — Crafting planner readiness closure

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-019A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether the STEP-019 crafting snapshot is safe for a scoped STEP-020 planner. A loaded dataset is not the same thing as planner approval.

## 2. Acceptance criteria

- [x] Compatibility was investigated with record comparisons, not version-string resemblance.
- [x] The scoped planner conclusion is `compatible`. The snapshot record itself stays `unknown` so a broad approval is not implied.
- [x] Labels 4.5.5.2, 0.5.5, and `0_5` were not treated as proof.
- [x] Representative bases and modifiers were cross-checked against Path of Building Community (PoE2) 0.23.1.
- [x] `assessPlannerReadiness` fails closed for an unknown capability, a mismatched report, or a report bound to a different checksum.
- [x] Distribution stays blocked. The full export is still uncommitted.
- [x] Unit tests no longer use copied upstream records.
- [x] Unresolved translations have a deterministic id-and-range fallback.
- [x] STEP-020 does not need every translation to be English prose.
- [x] Mod-group exclusivity and generation weights stay unapproved.
- [x] No recommendation, probability, cost, or crafting mechanic was added.
- [x] Default tests stay offline.

## 3. Implementation summary

Policy version 1 compares the local snapshot with recorded PoB 0.23.1 base types, item levels, stat ranges, and ordered spawn weights. The required scoped capabilities match, so planner readiness is ready for local development. Presentation stays partial. Distribution stays blocked. Same-group exclusivity is blocked because PoB splits defence families that this snapshot groups as `BaseLocalDefences`. Unit tests build synthetic records in code. `npm run crafting:readiness` writes `docs/data-snapshots/crafting/compatibility.json` and does not download anything.

## 4. Files created

| File                                              | Purpose                                                 |
| ------------------------------------------------- | ------------------------------------------------------- |
| `packages/crafting-data/src/planner.ts`           | Capability checks, fallback presentation, planner gate. |
| `packages/crafting-data/src/planner.test.ts`      | Gate, mismatch, and fallback tests.                     |
| `scripts/crafting-readiness.ts`                   | Offline readiness command.                              |
| `docs/data-snapshots/crafting/compatibility.json` | Checksum-bound evidence report.                         |

## 5. Files changed

| File                                                | Change                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `packages/crafting-data/src/index.ts`               | Exports the planner gate.                                                  |
| `packages/crafting-data/src/version.ts`             | Dataset readiness no longer claims the planner is closed by itself.        |
| `packages/crafting-data/src/normalize.ts`           | Compatibility note says the export label is metadata only.                 |
| `packages/crafting-data/src/normalize.test.ts`      | Synthetic records replace the upstream fixture.                            |
| `scripts/refresh-crafting-data.ts`                  | A refresh rebuilds the compatibility report and separate promotion fields. |
| `package.json`                                      | Adds `crafting:readiness`.                                                 |
| `docs/data-snapshots/crafting/manifest.json`        | Planner approval and distribution are separate fields.                     |
| `docs/planning/DECISION_LOG.md`                     | Adds D-086.                                                                |
| `docs/progress/STEP-019-crafting-data-ingestion.md` | Notes that the real fixture file was removed here.                         |

## 6. Files deleted

`packages/crafting-data/fixtures/source-subset.json`. It was a small copy of real upstream records. STEP-019A does not treat a small copy as cleared for the repository.

## 7. Important code paths / responsibilities

`crossCheckCraftingSnapshot` compares the snapshot with the recorded PoB observations. `evaluateCapabilityChecks` turns those checks into `compatible`, `incompatible`, or `unknown`. A required capability is compatible only when every required check for it matches. `buildCraftingCompatibilityReport` binds that result to the snapshot checksum. `assessPlannerReadiness` refuses a report whose checksum, commit, schema, or policy version does not match, and it returns `blocked` when a required capability is not compatible. `presentModifier` prints a source template when one exists, and otherwise prints the modifier id and stat ranges plus `translation unresolved`.

## 8. External APIs / data sources involved

No new network source. The cross-check evidence is the already installed Path of Building Community (PoE2) 0.23.1 data under the local roaming directory, read for this investigation and recorded as expected fields. It was not copied into the repository and it was not merged into the snapshot. The crafting snapshot remains `repoe-fork/poe2` commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CRAFTING_COMPATIBILITY_POLICY_VERSION` is 1. The normalized snapshot checksum is unchanged: `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. The snapshot's own compatibility status remains `unknown`. Planner approval lives in the compatibility report. Manifest promotion is now four separate flags: normalized, validated, planner-approved, and distribution-approved.

## 11. Commands executed

```bash
npm run crafting:readiness
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm run refresh:crafting-data` was not run again. The snapshot bytes did not change. The readiness command evaluated the snapshot that refresh already wrote.

## 12. Automated tests

| Command/Test                                   | Result | Notes                                                         |
| ---------------------------------------------- | ------ | ------------------------------------------------------------- |
| `npm test`                                     | PASS   | 44 files, 330 tests. Offline.                                 |
| `packages/crafting-data/src/planner.test.ts`   | PASS   | Missing check, hard mismatch, fallback, checksum fail-closed. |
| `packages/crafting-data/src/normalize.test.ts` | PASS   | Synthetic records only.                                       |

## 13. Manual verification

`npm run crafting:readiness` reported planner readiness `ready`, presentation `partial`, distribution `blocked`, and conclusion `compatible` for checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. No crafting UI was added.

## 14. Errors/issues encountered

PoB and the snapshot disagree about defence-mod families. That is a real mismatch, so group exclusivity stays blocked instead of being called compatible. Three class strings also differ and those classes stay unsupported. No product bug was patched around those disagreements.

## 15. Security/privacy impact

No user builds, items, or credentials were sent anywhere. Readiness reads the local snapshot only. The full export remains gitignored.

## 16. Performance impact

Readiness walks the local snapshot once when the command runs. It is not on a web request. The web bundle is unchanged.

## 17. Data provenance / reproducibility impact

The compatibility report stores the snapshot checksum, schema version 1, source commit, and policy version 1. It has no fetch timestamp. A later refresh rebuilds the report from the new snapshot and does not reuse this conclusion unless the checksum still matches.

## 18. Known limitations

Mod-group exclusivity is not approved. Generation weights are unknown. 12,258 modifiers use the fallback presentation. Buckler, FishingRod, and Warstaff are unsupported. Withered Wand has an extra snapshot tag, `chaos_implicit_skill`, that PoB 0.23.1 does not list. No sampled spawn rule uses that tag. The full snapshot cannot be bundled.

## 19. Decisions made

D-086. D-085 still pins the source and still forbids treating a spawn weight as a probability. D-086 replaces only the part of D-085 that kept every planner use closed.

## 20. Deviations from planning docs

The snapshot record stays `unknown` even though the scoped planner conclusion is `compatible`. One word would have implied that every capability, including groups and generation weights, had been proved. The report is the approval.

## 21. Remaining risks

A future game update can move a sampled range or spawn weight. The next refresh will fail the affected check and will not keep this approval. PoB 0.23.1 is community evidence, not an official Grinding Gear Games statement. Group exclusivity is the clearest place the two community sources disagree.

## 22. Rollback notes

Restore `packages/crafting-data/fixtures/source-subset.json` only if a later decision explicitly accepts real fixture records again. Removing `planner.ts`, the readiness script, and `compatibility.json` returns the gate to the STEP-019 behavior. The local snapshot can stay.

## 23. Recommended next step

Stop. STEP-020 may be started later as local scoped development. Do not start it in this step.

## 24. Completion statement

STEP-019A is complete. Final status: **STEP-020 READY FOR SCOPED DEVELOPMENT**.

That scope is local only. It includes the 25 supported item classes, source-pool eligibility, item level, generation type, stat ranges, and the translation fallback. It does not include group exclusivity, generation weights, a public bundle, crafting probability, or currency mechanics.

## Why STEP-019A Exists

STEP-019 ingested the dataset and correctly left planner use closed. This step decides which parts of that dataset a planner can trust.

## Current STEP-019 Snapshot

Commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, schema version 1, checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. 5,496 bases, 16,784 modifiers, 10,750 English translation rows. The snapshot's own compatibility field remains `unknown`.

## Compatibility Question

Whether this export describes the same item bases and item modifiers as the current PoB 0.23.1 data used alongside the Buddy passive-tree pin 0.5.5. The three version labels are different namespaces and were not compared.

## Compatibility Evidence Model

A check has a subject, an expected value, the snapshot value, a result of `match`, `mismatch`, or `unresolved`, and an evidence source. A required capability is `compatible` only when every required check matches. One mismatch makes it `incompatible`. A missing or unresolved required check leaves it `unknown`. Optional mismatches do not silently upgrade a capability.

## Independent Cross-Checks

Evidence source: Path of Building Community (PoE2) 0.23.1 `Data/Bases/*.lua` and `Data/ModItem.lua`, read locally. Not merged into the snapshot.

| Id                               | Field                                   | Snapshot                                                                     | PoB 0.23.1                         | Result     |
| -------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------- | ---------- |
| Rusted Cuirass                   | class and tags                          | Body Armour; armour, body_armour, default, ezomyte_basetype, str_armour      | same type and tags                 | match      |
| Withered Wand                    | class                                   | Wand                                                                         | Wand                               | match      |
| Iron Ring                        | class                                   | Ring                                                                         | Ring                               | match      |
| Strength1                        | level, generation, range, spawn weights | suffix, level 1, additional_strength 5–8, default weight 0 last              | same                               | match      |
| Strength2                        | level and shared group                  | level 11, group Strength                                                     | level 11, group Strength           | match      |
| IncreasedLife12                  | level and spawn                         | prefix, level 75, body_armour weight 1, default weight 0                     | same                               | match      |
| LocalBaseArmourAndEvasionRating1 | stat order and weights                  | armour 9–16 then evasion 6–10; str_dex_armour, str_dex_int_armour, default 0 | same                               | match      |
| BaseLocalDefences                | group family                            | one shared group for three defence mods                                      | three separate PoB groups          | mismatch   |
| Withered Wand tags               | tag set                                 | adds chaos_implicit_skill                                                    | those tags without that one        | unresolved |
| Generation weights               | rule count                              | 0                                                                            | no weightMultiplierKey in PoB Data | unresolved |

## Capability Compatibility Matrix

| Capability                 | Status       | Planner use                                              |
| -------------------------- | ------------ | -------------------------------------------------------- |
| baseIdentity               | compatible   | required                                                 |
| modifierIdentity           | compatible   | required                                                 |
| statRanges                 | compatible   | required                                                 |
| requiredItemLevel          | compatible   | required                                                 |
| generationType             | compatible   | required                                                 |
| sourcePoolEligibility      | compatible   | required, not a probability                              |
| translationFallback        | compatible   | required                                                 |
| modGroupExclusivity        | incompatible | blocked feature                                          |
| generationWeights          | unknown      | not required for STEP-020                                |
| baseTags for Withered Wand | unresolved   | not required; extra tag is unused by sampled spawn rules |

## Planner Minimum Capabilities

Base identity, modifier identity, stat ranges, required item level, generation type, source-pool eligibility, translation fallback, snapshot provenance, and the supported class list. Spawn-weight probability is not required. Group exclusivity is not in the minimum set.

## Planner Compatibility Gate

`assessPlannerReadiness` returns `ready` only when the report matches the snapshot checksum, policy version is 1, every required capability is `compatible`, and `localDevelopmentOnly` is true while distribution is blocked. Otherwise it returns `blocked` or a `snapshot-incompatible` error. It does not continue with an unknown required capability.

## Supported Planner Scope

Amulet, Belt, Body Armour, Boots, Bow, Claw, Crossbow, Flail, Focus, Gloves, Helmet, One Hand Axe, One Hand Mace, One Hand Sword, Quiver, Ring, Sceptre, Shield, Spear, Staff, Talisman, TrapTool, Two Hand Axe, Two Hand Mace, and Wand.

Each of those classes had a representative base whose PoB `type` string matched the snapshot item class, and every base of that class in the snapshot has domain `item`.

Unsupported: Buckler (PoB type Shield), FishingRod (PoB type `Fishing Rod`), Warstaff (PoB type Staff, subType Warstaff). No mapping was invented.

## Domain Undefined Investigation

3,340 bases use the source domain string `undefined`. Their classes are things like stackable currency, skill gems, and quest items. None of the 25 supported classes use that domain. The string was not changed to `item`. A missing domain field is still stored as null and is still distinct from the string `undefined`. This pin has zero missing domain fields.

## Spawn-Weight Semantic Review

The sampled spawn-weight sequences, including a trailing weight of 0, match PoB `ModItem.lua`. STEP-019's first-match walk is the same walk PoB uses. That is enough to call source-pool eligibility compatible for this scope. It is still community evidence from two community sources, not an official drop-rate formula. The numeric weight is not divided by anything.

## Generation-Weight Absence

The snapshot has zero generation-weight rules. PoB 0.23.1 item-mod data has no `weightMultiplierKey`. Both exports omit the rules. That does not prove the game can never use a generation weight, so the capability stays `unknown`. STEP-020 does not need it. STEP-021 might.

## Translation Readiness

Semantic identity does not depend on English prose. 5,000 translation rows are resolved templates. 5,750 are fallback-capable. None are unrenderable, because each unresolved row still has stat ids. Across modifiers, 4,526 presentations are resolved and 12,258 use the fallback. Zero are unrenderable.

## Translation Fallback

When a template is not resolved, the text is the source modifier name when it is non-empty, then the modifier id, then each stat id with its minimum and maximum, then the line `translation unresolved`. Source markup is kept only when the translation row itself resolved. Modifier source text is not copied in as a guessed sentence.

## Fixture Redistribution Review

The STEP-019 fixture was a small selection of real upstream records. A small copy is not automatically safe to commit. It was removed.

## Chosen Fixture Policy

Synthetic unit fixtures plus local real-source validation. `npm test` builds synthetic bases and modifiers in the test file. `npm run refresh:crafting-data` still spot-checks real ids against the downloaded export. `npm run crafting:readiness` compares the local snapshot with the recorded PoB fields.

## Local Snapshot Delivery

A developer runs `npm run refresh:crafting-data`. The web app does not fetch on startup. If the snapshot file is missing, readiness prints:

```text
Crafting data is not prepared.
Run:
npm run refresh:crafting-data
```

## Production Distribution Policy

Supported mode: local development, after the developer runs the refresh command. Not supported: a redistributed bundled snapshot, a server-prepared public bundle, or an automatic download. `distributionApproved` is false. Project policy has not approved redistribution of the generated export. This is not a legal conclusion beyond that policy.

## Readiness Dimensions

| Dimension             | Status  |
| --------------------- | ------- |
| semanticReadiness     | ready   |
| plannerReadiness      | ready   |
| presentationReadiness | partial |
| distributionReadiness | blocked |

## Snapshot Integrity

The gate checks schema version, source commit, policy version, and the normalized checksum. An edited checksum does not pass.

## Refresh Interaction

A future refresh writes a new snapshot, runs the same cross-check, and writes a new compatibility report. It does not copy the previous conclusion onto a different checksum. Promotion fields stay separate: a snapshot can be normalized and validated without being planner-approved or distribution-approved.

## Planner Provenance

The readiness result carries the snapshot checksum, schema version, source commit, compatibility policy version, and the supported class list. STEP-020 can copy that block onto a later planner result.

## Compatibility Policy Version

`CRAFTING_COMPATIBILITY_POLICY_VERSION = 1`. A new domain, generation type, item class, or eligibility shape does not join the supported scope until this policy is reviewed.

## Source Attribution

The manifest and the compatibility report name `repoe-fork/poe2` and the PoB 0.23.1 evidence source. Individual modifier rows do not repeat that attribution.

## Security / Privacy

No user data was uploaded. Source refresh remains public data only, and only when the refresh command is run.

## Tests

Default tests do not call GitHub, RePoE, PoB, poe.ninja, or an AI key. The explicit command is `npm run crafting:readiness`.

## Known Limitations

See section 18.

## Final STEP-020 Readiness

**STEP-020 READY FOR SCOPED DEVELOPMENT**

Local scoped development can use the approved classes and the required capabilities above. It cannot use group exclusivity, generation weights, or a bundled copy of the export. Do not start STEP-020 until that scope is accepted.
