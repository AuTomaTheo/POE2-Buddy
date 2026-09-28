# STEP-020.7 — Simulator go/no-go and mechanic evidence expansion

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.7  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether any current crafting action is proven far enough to simulate. The step looks at new sources and at other currency records. It does not roll an item.

## 2. Acceptance criteria

- [x] STEP-020 target planning is unchanged.
- [x] STEP-020.5 and STEP-020.6 Augmentation findings stay in place.
- [x] The Augmentation gaps are recorded as missing evidence.
- [x] PoE2DB, Craft of Exile, and pyoe2-craftpath were read as new sources.
- [x] Those sources were not used to fill the missing pool or weight formula.
- [x] Transmutation, Regal, Exalted, Chaos, Essence of the Body, Annulment, Alchemy, and Scouring were compared from the pinned item text.
- [x] No mechanic was marked ready for simulation.
- [x] The decision is explicit: no crafting mechanic is currently safe to simulate.
- [x] No probability number was added.
- [x] No simulator, Monte Carlo, cost model, or craft button was added.
- [x] Default tests stay offline.

## 3. Implementation summary

`assessSimulationRegistry` binds the go/no-go to the current snapshot checksum and source commit. A mismatch fails closed. Augmentation remains a transition-only mechanic. Every compared alternative stays partial or blocked. The checked-in artifact and `npm run crafting:sim-readiness` report the same decision.

## 4. Files created

| File                                                              | Purpose                              |
| ----------------------------------------------------------------- | ------------------------------------ |
| `packages/crafting-mechanics/src/registry.ts`                     | Simulation registry and scope check. |
| `packages/crafting-mechanics/src/registry.test.ts`                | Offline readiness tests.             |
| `docs/data-snapshots/crafting/mechanics/simulator-readiness.json` | Checked-in go/no-go artifact.        |
| `scripts/crafting-sim-readiness.ts`                               | Local readiness command.             |
| `docs/progress/STEP-020-7-simulator-go-no-go.md`                  | Step record.                         |

## 5. Files changed

| File                                       | Change                         |
| ------------------------------------------ | ------------------------------ |
| `packages/crafting-mechanics/src/index.ts` | Exports the registry.          |
| `package.json`                             | Adds `crafting:sim-readiness`. |
| `docs/planning/DECISION_LOG.md`            | Adds D-090.                    |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`assessSimulationRegistry` returns the decision, the mechanic rows, and the new sources. `evaluateMechanicScope` accepts a magic item with zero explicit modifiers only as an Augmentation transition, and it still marks that state not simulatable. A rare item or an occupied magic item is out of scope. The Augmentation pool builder from STEP-020.6 is unchanged.

## 8. External APIs / data sources involved

No download was added to the project. The new pages were read on 2026-09-27 and summarized. The local currency and modifier files were checked again only to compare other currency records and the Essence name collision. The live PoB install was not modified.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

The registry is separate from `CRAFTING_MECHANIC_SEMANTICS_VERSION`, which stays 1 for Augmentation. Unmodeled currencies have `semanticsVersion: null`. `CraftingItemState` is unchanged. Imported gear still cannot fill it.

## 11. Commands executed

```text
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:sim-readiness
```

`npm test` passed: 47 files, 382 tests. Dependency files did not change, so `npm audit` was not required.

## 12. Automated tests

Six registry tests cover the empty selection, the zero-mod magic scope, a rare item, an occupied magic item, a stale checksum, a stale commit, the absence of a probability number, and the checked-in artifact.

## 13. Manual verification

`crafting:sim-readiness` matched the local currency texts and the four Essence of the Body monster records. Rusted Cuirass and Iron Ring stayed transition-ready, pool-partial, selection-unproven, and probability-blocked, with final candidate count 0. No page changed, so the browser was not required.

## 14. Errors/issues encountered

None in the final run.

## 15. Security/privacy impact

The new sources were public pages. No user data was sent. No downloaded code was executed. The PoB install was not patched.

## 16. Performance impact

The readiness command parses the local modifier export when it checks the Essence name collision. Default tests do not.

## 17. Data provenance / reproducibility impact

The artifact is bound to checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, source commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, compatibility policy version 1, and the observation date 2026-09-27. A different checksum or commit fails the registry.

## 18. Known limitations

No mechanic can be rolled. Community weight numbers exist and are explicitly not used. Guide sites that say Orb of Scouring is absent were not treated as proof against the released export record, and the export record was not treated as a complete result state. Another search of the same Augmentation question would not add a simulator.

## 19. Decisions made

D-090.

## 20. Deviations from planning docs

The step allowed a pivot if another mechanic was fully proven. None was. The result is the no-mechanic outcome.

## 21. Remaining risks

A later reader can treat Craft of Exile weights, or the pyoe2-craftpath level gates, as if this project had approved them. The registry says those sources do not close the gaps.

## 22. Rollback notes

Remove the registry, the readiness command, and `simulator-readiness.json`. Augmentation semantics from STEP-020.6 stay as they are.

## 23. Recommended next step

Do not start STEP-021. Do not open another step whose only job is to reread these same weight pages. Wait for a source that states one mechanic's pool and selection rule for a named scope.

## 24. Completion statement

STEP-020.7 is complete. **NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE. STEP-021 BLOCKED.**

## Why STEP-020.7 Exists

STEP-020.6 stopped because the pinned export and Path of Building do not prove how Orb of Augmentation chooses a modifier. A simulator needs that rule, or a different action whose whole behavior is proven.

## STEP-020 Overall Status

STEP-020 remains the explicit craft-target planner. Its behavior was not changed. STEP-020.5 and STEP-020.6 remain the Augmentation semantics and the blocked pool closure.

## STEP-020.6 Blockers

Those blockers are evidence gaps. The candidate pool is partial. Conflicts are blocked once an explicit modifier exists. The prefix/suffix split is unproven. Spawn weight is unproven for this currency. Generation weight is unknown. The selection formula is unproven. Probability is blocked.

## New Evidence Investigated

| Source                                                                             | What STEP-020.6 did not already say                                                                                                                                                                                                                   | Effect on Augmentation                   |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| PoE2DB weightings, https://poe2db.tw/us/weightings, read 2026-09-27                | The page says weight information cannot be obtained from the game file. Weights there are compiled with recombinators, or from trade listings for some bases.                                                                                         | Does not close the pool or the formula.  |
| Craft of Exile, https://www.craftofexile.com/weightings?game=poe2, read 2026-09-27 | The page says modifier weightings are not part of the PoE2 game client. The method is recombinators, trade parsing, and a normalization script, and the page says the numbers can be wrong.                                                           | Does not authorize those numbers.        |
| pyoe2-craftpath, MIT, README on `main`, read 2026-09-27                            | The tool targets PoE2 0.4.0 and fetches weights from Craft of Exile. Commit `8acb17c0bac048d0a16f780f71313aef4bb4a2af` uses item levels 55 and 70 for Greater and Perfect Augmentation. The README says unknown desecration weights are treated as 1. | Conflicts with this export. Not adopted. |

No in-game sample was taken. Finite samples would not prove a complete pool anyway.

## Evidence Source Quality

PoE2DB and Craft of Exile are community pages with no commit pin and no statement that they match export label 4.5.5.2. pyoe2-craftpath is MIT and inspectable, and it names game version 0.4.0, which is not this project's source label. A tool that applies a weight does not prove that the weight is the game's rule. None of the three is an official Grinding Gear Games data file.

## Mechanic Candidates

| Mechanic             | Transition                      | Pool    | Conflict                      | Weight         | Probability  | Real-item state | Source                                        | Decision     |
| -------------------- | ------------------------------- | ------- | ----------------------------- | -------------- | ------------ | --------------- | --------------------------------------------- | ------------ |
| Orb of Augmentation  | ready for magic, zero explicits | partial | blocked                       | unproven       | blocked      | blocked         | pinned text plus the new sources above        | not selected |
| Orb of Transmutation | partial                         | blocked | not required on a normal item | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Regal Orb            | partial                         | blocked | blocked                       | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Exalted Orb          | partial                         | blocked | blocked                       | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Chaos Orb            | blocked                         | blocked | blocked                       | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Essence of the Body  | partial                         | blocked | blocked                       | not applicable | blocked      | blocked         | pinned text; four monster-domain name matches | not selected |
| Orb of Annulment     | partial                         | blocked | blocked                       | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Orb of Alchemy       | partial                         | blocked | not required                  | unproven       | blocked      | blocked         | pinned text                                   | not selected |
| Orb of Scouring      | partial                         | blocked | not required                  | not applicable | not required | blocked         | pinned text                                   | not selected |

Simulation difficulty is the same factual state for every row: not safe to simulate. There is no composite score.

## Augmentation Reassessment

The new sources do not name the modifier pool, the conflict rule, or a weight formula that belongs to this export. They say the weights are outside the game files, and the open-source simulator uses a different version plus level gates the item text does not state. Augmentation stays `ready-for-transition-only`.

## Alternative Mechanic Assessment

Transmutation adds one modifier to a normal item and does not say which modifier or that the choice is random. Regal keeps current modifiers and adds one unnamed modifier. Exalted repeats the Augmentation gap on a rare item with a cap of six. Chaos removes one random modifier and adds another. Essence of the Body says the added modifier is guaranteed, and the currency record does not point at an item modifier. Four records named Essence of the Body are domain `monster` and have no stats: `MonsterLesserEssenceModLife1`, `MonsterEssenceModLife1`, `MonsterGreaterEssenceModLife1`, `MonsterPerfectEssenceModLife1`. Annulment says the removed modifier is random and does not give the draw. Alchemy states four random modifiers and says current modifiers are not retained, without a pool. Scouring is the smallest deterministic-looking record: it removes all modifiers from a magic or rare item. It does not state the resulting rarity, and it does not separate implicits from explicits. The metadata id `CurrencyConvertToNormal` is not used as a rarity rule.

## Selected First Simulation Mechanic

None.

**NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE.**

## Supported Scope

Augmentation's encoded scope remains a magic item with zero explicit modifier ids, and that scope is transition-only. No scope is approved for a draw.

## State Model

`CraftingItemState` still has base id, item level, rarity, and explicit modifier ids. That is enough to express the Augmentation transition and not enough to express a socket currency or a numeric reroll. It also cannot store the unstated rarity result of Scouring. Imported gear remains blocked for this state because crafting modifier ids are absent. A future simulator could still take a manual state once a mechanic is actually ready.

## Pool Readiness

No mechanic has a ready mechanic-specific pool. Augmentation's inspection list stays an inspection list.

## Conflict Readiness

Same-id and mod-group rules remain unproven. Regal would need them because it retains modifiers. Chaos and Annulment would need a removal rule. Scouring does not need a pairwise conflict rule, and it still lacks a complete result state.

## Slot Readiness

The Augmentation cap of two remains a total count. A prefix slot plus a suffix slot is still unproven. Exalted's cap of six is likewise a total count in the item text.

## Selection Readiness

No random mechanic has a proven uniform, weighted, or two-stage rule. Scouring and Essence would be deterministic only if the result were fully named. It is not.

## Probability Readiness

Blocked for every random mechanic. Not required for Scouring, and Scouring is still not simulatable. No probability value is stored.

## Mechanic Registry

`assessSimulationRegistry` is the registry. Each row has its own semantics version: 1 for Augmentation and null for the others. The only readiness values used are `ready-for-transition-only`, `partial`, and `blocked`.

## Provenance Binding

Checksum, source commit, compatibility policy version 1, and observation date 2026-09-27. The command also rechecks the compared currency sentences and the four Essence records against the local files.

## Synthetic Tests

The registry tests do not read the full snapshot. They use the pinned checksum constant and a deliberately wrong checksum.

## Real Local Validation

Magic item level 82, zero explicit modifiers, on the local snapshot:

| Base           | State            | Pool    | Selection | Probability | Final candidates |
| -------------- | ---------------- | ------- | --------- | ----------- | ---------------- |
| Rusted Cuirass | transition ready | partial | unproven  | blocked     | 0                |
| Iron Ring      | transition ready | partial | unproven  | blocked     | 0                |

Supported scope for that check: magic item with zero explicit modifier ids. The command's decision line is `NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE`.

## Known Limitations

Recorded in section 18.

## STEP-021 Decision

**STEP-021 BLOCKED.**

No mechanic has a proven transition, candidate pool, required conflict or slot rule, and selection rule for a scope that can be simulated. The next evidence has to be stronger than the pinned item text and stronger than extrapolated community weights.
