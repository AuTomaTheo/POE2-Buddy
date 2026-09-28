# STEP-020.5 — First crafting-mechanic semantics

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020.5  
**Authoring context:** Cursor-assisted development

## 1. Objective

Record the current behavior of one crafting action before any simulator exists. The action is Orb of Augmentation. The result says what the item text proves and what is still blocked.

## 2. Acceptance criteria

- [x] Exalted, Chaos, Essence, Transmutation, Regal, and Augmentation were compared from the pinned export.
- [x] One mechanic was selected: `add-random-explicit`.
- [x] The source is the community RePoE export of game item text, commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`.
- [x] Greater and Perfect share the same sentences and are recorded as a separate unresolved tier.
- [x] Preconditions, the stated cap, and the add-one transition are modeled.
- [x] The candidate pool is not treated as proven.
- [x] Mod-group conflict stays blocked.
- [x] Probability and expected cost are absent.
- [x] Default tests are synthetic and offline.
- [x] Local research and inspect commands were run separately.

## 3. Implementation summary

`@poe2-helper/crafting-mechanics` validates a magic item for Orb of Augmentation and, when the item has no explicit modifier ids, describes the transition as adding one modifier without choosing it. Source-pool eligible prefix and suffix ids are returned only as an inspection list. The final mechanic candidate list is empty. A stale readiness report fails closed. No crafting-action button was added.

## 4. Files created

| File                                                              | Purpose                                      |
| ----------------------------------------------------------------- | -------------------------------------------- |
| `packages/crafting-mechanics/src/definition.ts`                   | Recorded mechanic definition.                |
| `packages/crafting-mechanics/src/mechanic.ts`                     | State check and inspection list.             |
| `packages/crafting-mechanics/src/mechanic.test.ts`                | Synthetic semantics tests.                   |
| `packages/crafting-mechanics/src/schema.ts`                       | Strict state and result schemas.             |
| `packages/crafting-mechanics/src/version.ts`                      | Semantics version and quoted item text.      |
| `docs/data-snapshots/crafting/mechanics/add-random-explicit.json` | Machine-readable evidence record.            |
| `scripts/crafting-mechanic-research.ts`                           | Rechecks the local currency text.            |
| `scripts/crafting-mechanic-inspect.ts`                            | Runs the scoped check on the local snapshot. |

## 5. Files changed

| File                            | Change                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `package.json`                  | Typecheck includes the package. Adds the two mechanic commands. |
| `docs/planning/DECISION_LOG.md` | Adds D-088.                                                     |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`validateAddRandomExplicit` requires planner readiness, a supported base, rarity magic, known modifier ids, and fewer than two explicit ids. Zero explicit ids can continue. One known explicit id returns `conflict-model-unavailable`. Two or more returns `no-open-affix-slot` and does not claim the currency is consumed. `buildAddRandomExplicitPool` classifies modifiers for inspection and leaves `finalMechanicCandidateIds` empty. `explainWeightModel` returns `weight-model-unavailable`.

## 8. External APIs / data sources involved

No new download. The item text was read from the already local `var/crafting-source/data/base_items.json`. Path of Building Community (PoE2) 0.23.1 was searched locally for an Augmentation action and was not modified. No poe.ninja or GGG call was made.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CRAFTING_MECHANIC_SEMANTICS_VERSION` is 1. `CraftingItemState` is a base id, an item level, a rarity, and explicit modifier ids. Gear text and PoB imports do not supply those modifier ids. `craftingStateFromKnownFields` returns `state-unresolved` when one of them is missing.

## 11. Commands executed

```text
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run crafting:mechanic:research
npm run crafting:mechanic:inspect -- add-random-explicit
```

`npm install` reported 0 vulnerabilities. `npm test` passed: 46 files, 369 tests.

## 12. Automated tests

The synthetic tests cover a valid magic item, a rare item, a full item, an existing modifier, an unknown modifier id, one ring candidate, two armour candidates, stable order, a zero spawn weight, a special generation type, an essence-only flag, a generation weight of zero, Warstaff, a stale report, and the absence of a probability value.

## 13. Manual verification

`crafting:mechanic:research` matched the Orb, Greater, and Perfect Augmentation description and directions in the local export. Drop levels are 1, 46, and 72. `crafting:mechanic:inspect` accepted a magic Rusted Cuirass and a magic Iron Ring at item level 82. Both transitions were ready, both pools were partial, both probabilities were blocked, and both final candidate counts were 0. The checksum matched the current snapshot. No user-facing craft button was added, so the browser was not required.

## 14. Errors/issues encountered

The first pool sort called a missing helper. The helper was added and the tests passed.

## 15. Security/privacy impact

Research reads local files only. The live PoB install was not patched. No user data was sent anywhere.

## 16. Performance impact

The inspect command parses the local snapshot once. Default tests do not.

## 17. Data provenance / reproducibility impact

The quoted description and directions are stored in the package and in `docs/data-snapshots/crafting/mechanics/add-random-explicit.json`. The research command fails if the local export text no longer matches. Inspection results carry the snapshot checksum, schema version, source commit, compatibility policy version, and semantics version 1.

## 18. Known limitations

The roll itself is not modeled. Source-pool ids are not Augmentation outcomes. Generation weights, group conflicts, Greater and Perfect tier rules, empty-pool behavior, and full-item consumption remain unknown. Imported gear still lacks crafting modifier ids.

## 19. Decisions made

D-088. See the sections below.

## 20. Deviations from planning docs

The research preference was an add-one explicit action. The selected record is that action on a magic item, not the Exalted Orb. Exalted has the same missing pool and a larger stated cap, so it was not the smallest state. No probability was added, which matches the gate in the step spec.

## 21. Remaining risks

A reader can treat the inspection ids as the currency's outcomes. The result says they are not. The cap of two is a total count. It is not a proven prefix slot plus a suffix slot.

## 22. Rollback notes

Remove `@poe2-helper/crafting-mechanics`, the two scripts, and the mechanics JSON. STEP-020 target planning stays as it is.

## 23. Recommended next step

Do not start STEP-021 for this mechanic. The missing piece is a proven modifier pool and selection rule. A conflict rule is also required before an item that already has a modifier can be included.

## 24. Completion statement

STEP-020.5 is complete. Orb of Augmentation is specified as far as the item text goes. **STEP-021 BLOCKED.** The state transition is ready only for a magic item with no explicit modifiers. The candidate pool is partial, the weight model is unknown, and probability is blocked.

## Why STEP-020.5 Exists

STEP-020 lists modifiers that can appear on a base. It does not say which currency adds one of them. Guessing that step would invent a probability.

## Mechanic Candidates Considered

| Mechanic             | Record                       | What the text says                                                                         | Why it was not chosen, or why it was                                                               |
| -------------------- | ---------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Exalted Orb          | `CurrencyAddModToRare`       | Adds one random modifier to a rare item. Rare items can have up to six random modifiers.   | Same missing pool as Augmentation, with a larger cap and more existing modifiers to conflict with. |
| Chaos Orb            | `CurrencyRerollRare`         | Removes one random modifier and adds another.                                              | Two changes, plus the same missing pool.                                                           |
| Essence of the Body  | `CurrencyEssenceLife`        | Upgrades a magic item to rare and adds a guaranteed modifier.                              | The guaranteed modifier id is not in the item text.                                                |
| Orb of Transmutation | `CurrencyUpgradeToMagic`     | Upgrades a normal item to magic with 1 modifier.                                           | The text does not say the modifier is random.                                                      |
| Regal Orb            | `CurrencyUpgradeMagicToRare` | Upgrades magic to rare, keeps current modifiers, and adds one.                             | Two state changes, and the added modifier's pool is still unstated.                                |
| Orb of Augmentation  | `CurrencyAddModToMagic`      | Adds one random modifier to a magic item. Magic items can have up to two random modifiers. | Selected. Smallest add-one state with a stated rarity and a stated cap.                            |

## Selected Mechanic

`add-random-explicit`. Display name: Orb of Augmentation. Currency id: `Metadata/Items/Currency/CurrencyAddModToMagic`.

## Selection Rationale

The export states the rarity, the add-one transition, and a cap of two. A magic item with no explicit modifiers does not need a group-conflict rule to describe that transition. The pool is still unproven, so the step stops at validation and inspection.

## Current-Version Evidence

Pinned export label 4.5.5.2, commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, read locally on 2026-09-27. Greater and Perfect records in that same file repeat the sentences and use drop levels 46 and 72. No older patch note was used.

## Mechanic evidence

| Rule                   | Source                                                                       | Observed behavior                                                         | Status                                |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| Rarity requirement     | `CurrencyAddModToMagic` description: augments a Magic item                   | Only rarity `magic` is accepted                                           | Proven                                |
| Open-affix requirement | Directions: magic items can have up to two random modifiers                  | Two or more explicit ids return `no-open-affix-slot`                      | Proven as a cap                       |
| Modifier count         | Description: a new random modifier                                           | Adds one. The record does not describe a removal                          | Proven                                |
| Candidate pool         | Description names a random modifier and does not list one                    | Source-pool ids are listed for inspection. Final candidate ids stay empty | Blocked                               |
| Weight selection       | Absent from the item text. PoB 0.23.1 `GetModSpawnWeight` is not this action | `explainWeightModel` returns `weight-model-unavailable`                   | Unknown                               |
| Special mods           | Item text does not include special generation types                          | Those types are excluded from the inspection eligible list                | Excluded here; not a proven game rule |
| Essence-only           | `is_essence_only` exists on some modifiers. The currency text is silent      | Those modifiers stay unresolved                                           | Unresolved                            |
| Conflicts              | Absent from the item text. STEP-019A blocks generic group exclusivity        | Any existing explicit id returns `conflict-model-unavailable`             | Blocked                               |
| Failure behavior       | Absent from the item text                                                    | Empty-pool behavior and full-item currency consumption stay unknown       | Unknown                               |

## Source Hierarchy

The authority is the currency record in the community export of game item data. That is item text, so it supports the high-level transition and not a weight formula. PoB 0.23.1 was checked and did not supply an Augmentation implementation. Forum, PoE1, and wiki wording were not used.

## Mechanic Identity

The id is `add-random-explicit`. The display name is not the id. Greater and Perfect are different record ids and are unsupported by this version.

## Input Item State

`CraftingItemState` needs `baseId`, `itemLevel` of at least 1, `rarity`, and `explicitModifierIds`. No upper item-level cap was invented.

## Rarity Rules

Only `magic` is accepted. Normal, rare, and unique return `unsupported-rarity`. The text does not describe a rarity change, unlike Regal and Essence in the same file.

## Existing Affix Rules

The transition adds one modifier. The Augmentation record does not describe a removal. Chaos, in the same file, does. An item with one known explicit id is not pooled, because excluding or keeping a conflicting modifier is not proven. Unknown ids return `modifier-identity-unresolved`.

## Affix Count Rules

The directions state that magic items can have up to two random modifiers. This step uses that as a total cap. It does not split the cap into one prefix and one suffix. At two or more explicit ids the state is `no-open-affix-slot`. The text does not say whether the currency is consumed.

## Candidate Pool Construction

Planner readiness, supported base, magic rarity, and zero explicit ids come first. Prefix and suffix modifiers with positive source-pool eligibility are listed for inspection. Special generation types are excluded because the item text does not include them. Essence-only modifiers stay unresolved. Generation-weight rules stay unresolved. The final mechanic candidate list is empty.

## STEP-020 Source-Pool Relationship

Source-pool eligibility remains the STEP-020 question. It is not "Orb of Augmentation can add this modifier." The inspection note says that.

## Special Generation Types

Implicit, unique, corrupted, and other non-prefix/suffix generation types are excluded from the inspection eligible list. The reason is visible. They are not given a crafted outcome.

## Essence-Only Handling

A prefix or suffix marked essence-only is unresolved. The currency text does not say the flag excludes it, and it also does not say the flag is ignored.

## Modifier Conflict Rules

Same modifier id, same group, and same stat family were not found in the Augmentation text. STEP-019A still blocks generic group exclusivity. Any existing explicit modifier id stops the mechanic with `conflict-model-unavailable`.

## Spawn Weight Usage

Not proven for this currency. A zero spawn weight is excluded from the source-pool inspection list because that is the STEP-020 rule. It is not used as an Augmentation probability.

## Generation Weight Usage

Unknown. A modifier with generation-weight rules is unresolved. An empty rule list is not treated as a multiplier of 1.

## Weight Formula

Unproven. `explainWeightModel` returns `weight-model-unavailable`. No `spawnWeight * generationWeight` formula was added.

## Empty Pool Behavior

Unknown. The result field is `emptyPoolBehavior: "unknown"`. The action is not described as failing, succeeding, or consuming currency when nothing remains.

## State Transition

For a valid scoped item: rarity stays magic, explicit count goes from 0 to 1, no ids are removed, and the added id is null. The statement is that one random modifier is added and this version does not choose it.

## Randomness Model

The item text says the modifier is random. It does not say weighted-random or uniform-random. The modeled class is `weighted-or-uniform-unknown`. No random draw is performed.

## Probability Gate

`probabilityStatus` is `blocked`. There is no probability number. The pool is incomplete, conflicts are unavailable once a modifier exists, and the weight formula is unknown.

## Expected Cost Status

Not calculated. Currency price, repeatability, and failure consumption are not proven.

## Mechanic Readiness

| Check                                               | Status                                       |
| --------------------------------------------------- | -------------------------------------------- |
| State transition, magic item, no explicit modifiers | ready                                        |
| Candidate pool                                      | partial                                      |
| Conflict rules                                      | unavailable once an explicit modifier exists |
| Weights                                             | unknown                                      |
| Probability                                         | blocked                                      |

## CraftingItemState Model

Base id, item level, rarity, and explicit modifier ids. Implicit ids were not required by the proven rules, so they are not in the state.

## NormalizedItem Adapter Status

`craftingStateFromKnownFields` builds a state only when the base id, item level, rarity, and explicit modifier ids are all present. Gear parsing stores item text and may store an item level. It does not store crafting modifier ids. That gap stays `state-unresolved`. PoB import was not extended.

## Synthetic Tests

Seventeen tests in `packages/crafting-mechanics/src/mechanic.test.ts`. They do not read the full snapshot.

## Real Local Validation

Rusted Cuirass, magic, item level 82: transition ready, 144 source-pool inspection ids, 0 final mechanic candidates. Iron Ring, magic, item level 82: transition ready, 203 source-pool inspection ids, 0 final mechanic candidates. Checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`.

## Snapshot Binding

A mismatched compatibility report returns `mechanic-not-ready`. Successful inspection includes the snapshot checksum, schema version, source commit, compatibility policy version, and semantics version.

## Security / Privacy

Local files only. The PoB install was not edited. The full snapshot is not committed.

## Known Limitations

Recorded in section 18. They are the reason STEP-021 stays blocked.

## STEP-021 Readiness

**STEP-021 BLOCKED.**

State transition is ready only for a magic item with no explicit modifiers. Candidate pool status is partial, so a simulator must not draw a modifier. Probability status is blocked. A later step needs a proven pool and selection rule before this mechanic can be rolled, and a conflict rule before an occupied magic item can be included.
