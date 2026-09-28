# STEP-020.6 — Orb of Augmentation pool and selection-rule closure

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.6  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether Orb of Augmentation has a proven modifier pool, conflict rule, slot rule, and selection formula. The step keeps the STEP-020.5 transition and does not simulate a roll.

## 2. Acceptance criteria

- [x] The magic, add-one, cap-of-two transition from STEP-020.5 still holds.
- [x] The currency record and the modifier export were checked for a mechanic-specific pool.
- [x] Prefix and suffix are not treated as proven Augmentation outcomes.
- [x] Special generation types stay out of the inspection eligible list, with a reason code.
- [x] Essence-only prefix and suffix modifiers stay unresolved.
- [x] Same-id and mod-group conflicts stay unproven.
- [x] The total cap of two stays separate from a prefix/suffix slot split.
- [x] A magic item with one explicit modifier id still returns `conflict-model-unavailable`.
- [x] Spawn weight and generation weight stay unproven as the selection formula.
- [x] Weight 0 stays out of the inspection eligible list and out of the final candidate list.
- [x] Empty-pool behavior stays unknown.
- [x] `finalMechanicCandidateIds` stays empty.
- [x] No probability number is returned.
- [x] Rusted Cuirass and Iron Ring were inspected on the local snapshot.
- [x] Default tests stay synthetic.
- [x] No cost, expected attempts, Monte Carlo, trade search, or AI was added.

## 3. Implementation summary

The closure records that the pool, the slot split, the conflict rule, and the weight formula are still unproven. A zero-explicit magic item still returns source-pool inspection ids and an equal `inspectionCandidateIds` list. Those ids are not final Augmentation outcomes. An item that already has an explicit modifier id is still rejected. `CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1 because the modeled roll did not become more complete.

## 4. Files created

| File                                                              | Purpose      |
| ----------------------------------------------------------------- | ------------ |
| `docs/progress/STEP-020-6-augmentation-pool-selection-closure.md` | Step record. |

## 5. Files changed

| File                                                              | Change                                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/crafting-mechanics/src/definition.ts`                   | Records the blocked closure statuses.                                |
| `packages/crafting-mechanics/src/schema.ts`                       | Adds inspection ids, reason codes, and selection statuses.           |
| `packages/crafting-mechanics/src/mechanic.ts`                     | Fills those fields and explains the missing selection rule.          |
| `packages/crafting-mechanics/src/mechanic.test.ts`                | Covers occupied items, an empty inspection list, and stable reasons. |
| `docs/data-snapshots/crafting/mechanics/add-random-explicit.json` | Stores the closure statuses and snapshot binding.                    |
| `scripts/crafting-mechanic-research.ts`                           | Rechecks the export, the modifier file, and local PoB class files.   |
| `scripts/crafting-mechanic-inspect.ts`                            | Prints pool, conflict, weight, and probability readiness.            |
| `docs/planning/DECISION_LOG.md`                                   | Adds D-089.                                                          |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`validateAddRandomExplicit` still accepts only a magic item with no explicit modifier ids. One known id returns `conflict-model-unavailable`. Two or more returns `no-open-affix-slot`. `buildAddRandomExplicitPool` classifies modifiers for inspection and leaves the final candidate list empty. `explainAddRandomExplicitSelection` returns the unproven selection statuses and no probability.

## 8. External APIs / data sources involved

No new download. Research read the local `var/crafting-source/data/base_items.json`, `var/crafting-source/data/mods.json`, and Path of Building Community (PoE2) 0.23.1 `Classes` Lua files. The live install was not modified.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

The inspection result now carries `inspectionCandidateIds`, reason codes, and explicit pool, conflict, slot, spawn-weight, generation-weight, and selection statuses. `CraftingItemState` is unchanged: base id, item level, rarity, and explicit modifier ids. Prefix and suffix identity is not stored twice. `CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1.

## 11. Commands executed

```text
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:mechanic:research
npm run crafting:mechanic:inspect -- add-random-explicit
```

`npm test` passed: 46 files, 376 tests. Dependency files did not change, so `npm audit` was not required.

## 12. Automated tests

Twenty-four synthetic tests cover a magic item with no modifiers, a rare item, a full item, one prefix, one suffix, an unknown id, a ring inspection list, stable order, a zero spawn weight, a special generation type, an essence-only flag, a generation weight, Warstaff, a stale report, an empty inspection list, and the absence of a probability value.

## 13. Manual verification

`crafting:mechanic:research` matched the three Augmentation records and reported no mismatches. Generation-weight rules were 0. Modifier records naming the currency were 0. Essence-only rows were 2 prefixes and 1 suffix. PoB class files did not name the currency record. `crafting:mechanic:inspect` accepted a magic Rusted Cuirass and a magic Iron Ring at item level 82. Both final candidate counts were 0 and both probabilities were blocked. No browser check was required because no page changed.

## 14. Errors/issues encountered

None in the final run.

## 15. Security/privacy impact

Research reads local files only. The live PoB install was not patched. No user data was sent anywhere.

## 16. Performance impact

The research command parses the local modifier export once. Default tests do not.

## 17. Data provenance / reproducibility impact

`docs/data-snapshots/crafting/mechanics/add-random-explicit.json` is bound to snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, compatibility policy version 1, and semantics version 1. The research command fails if that binding or the currency text drifts.

## 18. Known limitations

The roll is still not modeled. Inspection ids are not Augmentation outcomes. A one-modifier magic item cannot be pooled. Greater and Perfect Orb of Augmentation stay unsupported. Imported gear still lacks crafting modifier ids.

## 19. Decisions made

D-089. The mechanic chosen in D-088 stands. The pool and the selection rule do not.

## 20. Deviations from planning docs

The step allowed a ready pool if the evidence existed. The evidence does not, so the result is the blocked outcome. Semantics version was not incremented.

## 21. Remaining risks

A reader can treat the 144 or 203 inspection ids as the currency's outcomes. The result says they are not. The unresolved count of 2585 on both samples shows that many modifier rows are outside that inspection list as well.

## 22. Rollback notes

Revert the crafting-mechanics result fields and the research checks. STEP-020.5's transition and empty final list are the behavior this step kept.

## 23. Recommended next step

Do not start STEP-021 for this mechanic. The missing pieces are a proven candidate pool, a proven selection formula, and a conflict rule for an item that already has a modifier.

## 24. Completion statement

STEP-020.6 is complete. Orb of Augmentation was checked for a pool and a selection rule, and neither was found. **STEP-021 BLOCKED.**

## Why STEP-020.6 Exists

STEP-020.5 proved the high-level transition for a magic item with no explicit modifiers. It left the sampling pool, the conflicts, the slot split, and the weights unproven. A simulator needs those rules before it can roll.

## STEP-020.5 Starting State

State transition ready only for a magic item with zero explicit modifier ids. Candidate pool partial. Conflict rules unavailable once an explicit modifier exists. Weights unknown. Probability blocked. Final mechanic candidate ids empty.

## Primary Research Questions

The currency record does not say which modifier ids it can add. It does not say which existing modifiers exclude a candidate. It does not say that an open side must be a prefix or a suffix. It does not say how one candidate is chosen.

## Current-Version Evidence

Pinned export label 4.5.5.2, commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, checked locally on 2026-09-27. Path of Building Community (PoE2) 0.23.1 `Classes` was read the same day and does not name `CurrencyAddModToMagic`.

| Rule                     | Source                                                                                               | Observed behavior                                                                                 | Status                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Candidate pool           | Currency record and `mods.json`                                                                      | The record has no pool field. No modifier names the currency.                                     | Partial                                          |
| Normal prefix/suffix     | Currency directions                                                                                  | The text says random modifier. It does not say prefix or suffix.                                  | Unproven                                         |
| Special generation types | Observed `generation_type` values, including `unique`, `corrupted`, `essence`, and `scourge_gimmick` | Those types stay out of the inspection eligible list because the item text does not include them. | Excluded from inspection; not a proven game rule |
| Essence-only             | `is_essence_only` on 2 prefixes and 1 suffix                                                         | The currency text does not say the flag excludes them.                                            | Unresolved                                       |
| Magic structure          | Directions; PoB `Item.lua` magic branch                                                              | Total cap of two is stated. PoB uses `affixLimit` 2 as an editor layout.                          | Slot split unproven                              |
| Same id                  | Currency record                                                                                      | No statement that an existing id cannot be added again.                                           | Blocked                                          |
| Mod group                | STEP-019A `BaseLocalDefences` mismatch                                                               | Groups are not used.                                                                              | Blocked                                          |
| Spawn weight             | Currency record; PoB `GetModSpawnWeight`                                                             | No link from that walk to this currency.                                                          | Unproven                                         |
| Generation weight        | `generation_weights` count 0; PoB has no `weightMultiplierKey`                                       | Empty is not a multiplier of 1.                                                                   | Unknown                                          |
| Empty pool               | Currency record                                                                                      | Not stated.                                                                                       | Unknown                                          |

## Candidate Pool Rule

There is no proven mechanic-specific pool. Source-pool eligible prefix and suffix ids remain an inspection list. `inspectionCandidateIds` copies that list so it can be non-empty while `finalMechanicCandidateIds` stays empty.

## Normal Prefix/Suffix Pool

The export contains 2767 prefix records and 2458 suffix records. That count is not evidence that Augmentation samples them. The inspection list still uses prefix and suffix as the STEP-020.5 classification, and the pool note says that list is not the mechanic pool.

## Special Generation Types

The export's generation types include `unique`, `corrupted`, `essence`, `scourge_gimmick`, and the other non-prefix/suffix types recorded in STEP-019. There is no `implicit` or `enchantment` generation type in this commit. Non-prefix/suffix rows are excluded from the inspection eligible list with code `wrong-generation-type`. That exclusion is a scope limit of the inspection list, not a proven Augmentation rule.

## Essence-Only Handling

Two prefix rows and one suffix row are essence-only. They stay unresolved with code `essence-only-unresolved`. They do not enter the inspection list or the final list. Because they are unresolved, the candidate pool cannot be called complete.

## Magic Affix Structure

The directions say magic items can have up to two random modifiers. They do not say one prefix and one suffix. PoB 0.23.1 sets `affixLimit` to 2 for a crafted magic item when stored limits are absent, then walks each affix list for `affixLimit / 2` slots. That is the editor's slot layout. It is not code that applies Orb of Augmentation.

## Existing-Modifier Conflict Rules

No same-id, same-group, or stat-family rule is in the currency record. A magic item with one known explicit id still returns `conflict-model-unavailable`.

## Same-ID Handling

Unproven. The occupied item is rejected instead of being allowed to roll the same id again.

## Mod-Group Handling

Unproven. The `BaseLocalDefences` mismatch from STEP-019A remains. Group ids are not rewritten and are not used as exclusions.

## Slot Capacity

The only proven capacity rule is the total cap of two explicit ids. A full item returns `no-open-affix-slot`. The message still does not claim the currency is consumed. One existing prefix does not open a suffix-only pool. One existing suffix does not open a prefix-only pool.

## Spawn-Weight Use

Not proven for this currency. A zero spawn weight is excluded from the inspection list with code `zero-weight` because that is the source-pool rule. It is not an Augmentation probability.

## Generation-Weight Use

The local `mods.json` has zero generation-weight rules. PoB 0.23.1 Data has no `weightMultiplierKey`. An empty list is not treated as a multiplier of 1. A synthetic modifier that does have a generation-weight rule stays unresolved.

## Final Weight Formula

Unproven. No `spawnWeight * generationMultiplier` formula was added.

## Pool Completeness

`candidatePoolStatus` stays `partial`. The final candidate list stays empty on every supported state, including a base whose inspection list is empty.

## Empty-Pool Behavior

`emptyPoolBehavior` stays `unknown`. A synthetic Focus with no matching spawn tags has an empty inspection list and still does not describe a failed or consumed currency.

## Probability Gate

`probabilityStatus` is `blocked` for the zero-mod state and for the one-mod state. The result has no probability rows and no expected cost.

## Probability Formula

None. The common weight-share formula was not used.

## Mechanic Semantics Version

`CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1. The candidate pool, conflict rule, and selection rule did not become complete.

## CraftingItemState

Unchanged. Prefix and suffix kinds are looked up only when a modifier id is classified. They are not copied onto the item state. `craftingStateFromKnownFields` still returns `state-unresolved` when the base id, item level, rarity, or explicit modifier ids are missing. Real imported gear still does not supply crafting modifier ids, so a later simulator would need a manually specified state even after this closure.

## Synthetic Tests

The new cases are one prefix, one suffix, same-id and same-group rejection, an empty inspection list, stable exclusion codes, and a selection explanation with no probability number.

## Real Local Validation

Magic item level 82, no explicit modifiers:

| Base           | Inspection ids | Final ids | Unresolved rows | Probability |
| -------------- | -------------- | --------- | --------------- | ----------- |
| Rusted Cuirass | 144            | 0         | 2585            | blocked     |
| Iron Ring      | 203            | 0         | 2585            | blocked     |

Checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. Semantics version 1. One-prefix and one-suffix states were not inspected on the snapshot because the conflict rule is blocked.

## Snapshot Binding

The mechanics artifact stores the snapshot checksum, compatibility policy version 1, and semantics version 1. A mismatch fails `crafting:mechanic:research`.

## Known Limitations

Recorded in section 18. They are the reason the simulator stays blocked.

## STEP-021 Readiness

**STEP-021 BLOCKED.**

State transition is ready only for a magic item with no explicit modifiers. Candidate pool status is partial. Conflict rules are blocked. Spawn weight is unproven. Generation weight is unknown. Selection is unproven. Probability is blocked. STEP-021 must not roll Orb of Augmentation.
