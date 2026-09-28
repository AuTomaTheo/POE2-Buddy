# STEP-020 — Scoped craft target planner

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-020  
**Authoring context:** Cursor-assisted development

## 1. Objective

Given a base, an item level, and one or more stat or modifier targets that a person chooses, list the individual modifiers that can satisfy each target. The answer is source-pool eligibility, required item level, generation type, exact ranges, and a resolved or fallback presentation.

## 2. Acceptance criteria

- [x] `@poe2-helper/crafting-planner` exists and depends only on `@poe2-helper/crafting-data` and zod.
- [x] Every plan calls `assessPlannerReadiness` first.
- [x] A missing snapshot or a stale compatibility report fails closed.
- [x] Only the 25 STEP-019A item classes are planned. Warstaff is refused and is not mapped to Staff.
- [x] The person supplies the base, the item level, and each target.
- [x] Candidates report eligibility, required item level, affix kind, exact ranges, and structured evidence.
- [x] Ineligible and unresolved modifiers stay visible with their reasons.
- [x] Multi-target plans say coexistence is not validated.
- [x] Generation weights are not applied. Spawn weight is not a probability.
- [x] There is no currency action, expected cost, budget, trade search, or AI target.
- [x] Default tests are synthetic and offline.
- [x] A separate local command checks one armour, one weapon, and one jewellery base.
- [x] The `/craft-targets` page was exercised in a browser.

## 3. Implementation summary

`planCraftTargets` checks planner readiness, resolves the base, and refuses an unsupported class. Stat targets match prefix and suffix modifiers that contain that stat id. A direct modifier id is evaluated even when its generation type is not prefix or suffix. Eligibility reuses the crafting-data source pool with generation weights turned off. The default for other crafting-data callers stays on. The page at `/craft-targets` loads bases and the plan on the server. The browser receives the class names, the bases for the selected class, a short search list, and the plan.

## 4. Files created

| File                                                      | Purpose                                    |
| --------------------------------------------------------- | ------------------------------------------ |
| `packages/crafting-planner/package.json`                  | Package boundary.                          |
| `packages/crafting-planner/src/plan.ts`                   | Target matching, coverage, and ordering.   |
| `packages/crafting-planner/src/plan.test.ts`              | Synthetic planner tests.                   |
| `packages/crafting-planner/src/schema.ts`                 | Strict input, result, and error schemas.   |
| `packages/crafting-planner/src/load.ts`                   | Local snapshot and report loading.         |
| `packages/crafting-planner/src/search.ts`                 | Deterministic target search.               |
| `packages/crafting-planner/src/version.ts`                | Planner version and fixed wording.         |
| `packages/crafting-planner/src/index.ts`                  | Public exports.                            |
| `scripts/crafting-plan.ts`                                | Opt-in local plan command.                 |
| `apps/web/src/server/craft-plan.ts`                       | Server-side snapshot cache and plan calls. |
| `apps/web/src/app/craft-actions.ts`                       | Server actions for the page.               |
| `apps/web/src/app/craft-targets/page.tsx`                 | Craft target planner route.                |
| `apps/web/src/app/craft-targets/craft-target-planner.tsx` | Base, item level, and target form.         |

## 5. Files changed

| File                                   | Change                                                               |
| -------------------------------------- | -------------------------------------------------------------------- |
| `packages/crafting-data/src/query.ts`  | `evaluateSourcePool` accepts `applyGenerationWeights`, default true. |
| `packages/crafting-data/src/index.ts`  | Exports the unsupported class list.                                  |
| `package.json`                         | Typecheck includes the planner. Adds `crafting:plan`.                |
| `apps/web/package.json`                | Depends on the crafting packages.                                    |
| `apps/web/next.config.ts`              | Transpiles the crafting packages.                                    |
| `apps/web/src/app/analysis-screen.tsx` | Links to the planner.                                                |
| `apps/web/src/app/globals.css`         | Warning band for planner notices.                                    |
| `docs/planning/DECISION_LOG.md`        | Adds D-087.                                                          |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`loadPlannerInputs` reads the local snapshot and the compatibility report. It does not download. `planCraftTargets` calls `assessPlannerReadiness` and returns `planner-not-ready` when the report does not match or the gate is not ready. It resolves a base id, or an exact name plus item class. Stat discovery skips affix kind `other`. A modifier id target still evaluates that modifier and adds the special-generation warning. `evaluateSourcePool(..., { applyGenerationWeights: false })` is the only planner eligibility call. `presentModifier` supplies the text. The result is parsed with a strict zod schema before it is returned.

## 8. External APIs / data sources involved

No new network source. The planner reads `var/crafting-data/snapshot.json` and `docs/data-snapshots/crafting/compatibility.json`, which STEP-019 and STEP-019A already prepared. The page does not call poe.ninja, the GGG API, or pobb.in.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CRAFTING_PLANNER_VERSION` is 1. A plan result carries the snapshot checksum, schema version, source commit, compatibility policy version, planner version, and the supported class list. Candidate rows have no probability, score, expected cost, budget, or affordability field. Duplicate stat targets keep the higher `minimumValue`. If only one of the duplicates has a minimum, that minimum is kept.

## 11. Commands executed

```text
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run crafting:plan -- base=Metadata/Items/Armours/BodyArmours/FourBodyStr1 ilvl=82 stat=base_maximum_life
npm run crafting:plan -- base=Metadata/Items/Armours/Helmets/FourHelmetStr3 ilvl=82 stat=base_maximum_life
npm run crafting:plan -- base=Metadata/Items/Rings/FourRing1 ilvl=1 stat=additional_strength
npm run crafting:plan -- base=Metadata/Items/Weapons/OneHandWeapons/Wands/FourWand1 ilvl=82 stat=base_maximum_mana
```

`npm install` reported 0 vulnerabilities. PowerShell drops `--flags` when it calls `npm.cmd`, so the local command also accepts `base=<id> ilvl=<n> stat=<stat-id>`. The `--base` form was checked through `tsx`.

## 12. Automated tests

`npm test` passed: 45 files, 352 tests. The new tests are synthetic. They cover a supported armour, weapon, and jewellery base, the item-level gate, a zero spawn weight, a missing weight, fallback text, one row for two stats, a shared group, a generation weight of zero, Warstaff, a stale report, a missing snapshot, stable ordering, and the absence of cost fields.

## 13. Manual verification

The in-editor browser server did not start. Headless Chrome drove `http://localhost:3000/craft-targets`. The flow selected Body Armour, Rusted Cuirass, item level 82, and the stat ids `base_maximum_life` and `additional_strength`. The page showed `IncreasedLife12`, "Source-pool eligible", the independent-target warning, and the spawn-weight notice. It then selected Warstaff and Aegis Quarterstaff. The page returned `unsupported-item-class` and "No nearby class is used." The analysis page links to the planner. The dev server stayed on port 3000 with the PoB calculator unset.

## 14. Errors/issues encountered

PowerShell removes `--flags` before `npm run` sees them. The command accepts the same values as `base=`, `ilvl=`, and `stat=` so it can be run from this shell. An initial mount effect that loaded bases was removed because the lint rule rejects setState inside that effect. The class change and the Load bases button load the list instead.

## 15. Security/privacy impact

The full snapshot stays on disk and is read by the server. The browser does not receive the 5,496 bases or 16,784 modifiers. Search returns at most 20 matches for a query of at least two characters. No credentials were added.

## 16. Performance impact

The first server plan parses and checksums the local snapshot, then caches it by file modification time. A Rusted Cuirass life plan after that cache is a lookup. Default unit tests do not load the snapshot.

## 17. Data provenance / reproducibility impact

Every successful plan includes checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`, schema version 1, source commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, compatibility policy version 1, and planner version 1. The four local plans matched that checksum.

## 18. Known limitations

Coexistence is unresolved. Generation weights are unused. Crafting actions, probabilities, expected cost, and budget are absent. Distribution of the snapshot stays blocked. Some translations are fallback text. Buckler, FishingRod, and Warstaff are unsupported. Grants-effects are counted in the snapshot coverage and are not stored on the modifier, so the planner cannot point at an individual grants-effect record. A stat target does not list affix kind `other`; targeting that modifier id does.

## 19. Decisions made

D-087. The planner is explicit-target only. See the sections below.

## 20. Deviations from planning docs

The original roadmap mentioned a budget field. STEP-020 does not add one. A budget needs a mechanic, a cost, and an outcome distribution, and none of those exist yet. The progress sections named in the step spec are included after the standard 24 headings.

## 21. Remaining risks

A person can read an eligible row as "this will craft." The page and the result say the spawn weight is not a probability and that coexistence is not validated. They still depend on that wording being read. A new snapshot with a different checksum is refused until `npm run crafting:readiness` is run again.

## 22. Rollback notes

Remove `@poe2-helper/crafting-planner`, the `/craft-targets` route, and the `crafting:plan` script. Leave the crafting snapshot and the STEP-019A readiness report in place. The generation-weight flag defaults to the previous behavior when callers omit it.

## 23. Recommended next step

Do not start STEP-021 from this result alone. The next step needs a written model of one crafting action: what it changes, which pool it samples, and how existing affixes affect the outcome. Until that exists, the planner should stay a target list.

## 24. Completion statement

STEP-020 is complete. The planner lists source-pool matches for an explicit base, item level, and target. It does not simulate a craft, estimate a cost, or choose a target for the player. STEP-021 is not ready.

## Why STEP-020 Is Scoped

The approved data can say whether a modifier's source pool includes a base at an item level. It cannot say whether two modifiers can exist together, how an action creates them, or what that costs. Those questions stay outside this step so the page cannot imply a crafting strategy.

## Approved STEP-019A Capabilities

The planner requires the ready gate. The required capabilities are base identity, modifier identity, stat ranges, required item level, generation type, source-pool eligibility, and translation fallback. Mod-group exclusivity and generation weights stay unapproved. Distribution stays blocked.

## Planner Package Boundary

`packages/crafting-planner` depends on `@poe2-helper/crafting-data` and zod. It does not import the calculator, the upgrade engine, the gear engine, a network adapter, or an AI client.

## Planner Version

`CRAFTING_PLANNER_VERSION` is 1. Increase it if the same inputs would return different candidates or a different order.

## Planner Input

The input is a base id, or an exact base name plus item class, an integer item level of at least 1, and at least one target. A target is `{ kind: "stat", statId, minimumValue? }` or `{ kind: "modifier", modifierId }`. Optional `affixKinds` may limit stat discovery to prefix, suffix, or both. There is no budget field.

## Supported Item Classes

Amulet, Belt, Body Armour, Boots, Bow, Claw, Crossbow, Flail, Focus, Gloves, Helmet, One Hand Axe, One Hand Mace, One Hand Sword, Quiver, Ring, Sceptre, Shield, Spear, Staff, Talisman, TrapTool, Two Hand Axe, Two Hand Mace, and Wand. The class must be in both the STEP-019A list and the loaded report.

## Base Resolution

A base id uses `resolveBase`. A name requires the item class and must match exactly. Two matches return `base-ambiguous`. No fuzzy name matching.

## Item-Level Policy

Item level is an integer greater than or equal to 1. It is part of the plan identity. The source files used here do not expose an upper cap, so none is invented. The planner does not copy the base drop level or a modifier level into the request.

## Target Model

Stat targets and modifier targets only. Free-text goals such as "more tanky" are rejected by the schema.

## Stat Target

A stat target matches modifiers whose stat list contains that stat id. By default only prefix and suffix modifiers are included. A modifier qualifies for `minimumValue` when the matching stat's max is at least the requested value. That does not mean a roll will land on that value.

## Modifier Target

A modifier target evaluates that exact id, including generation types other than prefix and suffix, even when an affix filter is set.

## Target Resolution

A missing stat id or modifier id is `not-found` on that target. The rest of the plan still returns. A target with at least one eligible candidate is `resolved-with-eligible-candidates`. Otherwise it is `resolved-no-eligible-candidates`. The plan status is `ready` only when every target has an eligible candidate. Otherwise the plan is `partial`. Readiness, snapshot, and class failures are errors, not a ready plan.

## Candidate Model

One row per modifier id. `targetIds` lists every requested target that row satisfies. Each row has affix kind, generation type, required item level, whether the supplied item level meets it, exact stat ranges, eligibility, evidence, presentation, and the source spawn weight labeled "Source spawn weight".

## Eligibility Model

The labels are "Source-pool eligible", "Source-pool ineligible", and "Eligibility unresolved". A missing spawn weight stays unresolved. A weight of zero is ineligible. Item level is checked before the spawn rules. Domain problems stay unresolved. Fallback text does not change eligibility.

## Generation-Type Handling

Prefix and suffix are the default stat pool. Affix kind `other` is omitted from that pool and is shown when the modifier id is targeted, with: "Special generation type. This planner does not model how to obtain this modifier." An essence-only flag says the source marks it essence-only and that the planner does not model the mechanic. It does not name an action.

## Translation Fallback

Resolved rows show the source template. Fallback rows show the source name when it exists, the modifier id, the stat ids and ranges, and "translation unresolved". The tests reject guessed English and the upstream `text` field.

## Target Coverage

Each target reports eligible, ineligible, and unresolved counts. A count of zero eligible uses: "No source-pool eligible modifier was found for this base and item level." It does not say the stat can never exist.

## Multi-Target Behavior

Two or more targets set `combinationFeasibility` to `unresolved` and include: "Targets are evaluated independently. Modifier coexistence and full craft feasibility are not validated yet." One target uses `not-requested`.

## No-Coexistence Rule

A shared modifier group does not remove a candidate, mark a conflict, or claim the modifiers can roll together. The group test keeps both life modifiers.

## No-Probability Rule

Spawn weight is labeled source metadata. The fixed notice is: "Spawn weight is source-pool metadata, not a crafting probability." Results have no probability, chance, odds, or expected-attempts field. Candidates are not ordered by weight.

## No-Budget Rule

The result schema has no `expectedCost`, `budgetEfficiency`, or `affordable` field. Budget stays deferred until a mechanic and a cost model exist.

## No-Mechanics Rule

The planner does not say to use an Exalted Orb, a Chaos Orb, or an Essence. It does not estimate attempts or build a craft sequence.

## Candidate Ordering

Eligible, then unresolved, then ineligible. Within a group: prefix, then suffix, then other; required item level ascending; modifier id. The result states that this is not a quality ranking. Reversing the modifier array does not change the order.

## Planner Readiness

A checksum, policy, or commit mismatch returns `planner-not-ready` and the report-mismatch message. A gate that is not `ready` returns the same code. A missing snapshot returns `snapshot-unavailable` and tells the person to run `npm run refresh:crafting-data` and `npm run crafting:readiness`. Nothing is fetched.

## Snapshot Binding

Provenance on every successful plan: snapshot checksum, schema version, source commit, compatibility policy version, planner version, and supported classes.

## Local Runtime Requirement

`npm run crafting:plan` reads the gitignored snapshot and the checked-in compatibility report. Default `npm test` does not. If the snapshot is missing, the command exits with the setup text.

## UI Flow

The page title is "Craft target planner". The person picks a class, loads the bases for that class, picks an exact base, enters an item level, adds stat or modifier ids, and presses Plan targets. Search is a case-sensitive substring of at least two characters, capped at 20 rows, sorted by id. There is no craft-action button and no "Craft optimizer" label. More than one target shows the coexistence warning. Spawn weight, when shown, uses the source-metadata sentence.

## Default Tests

Synthetic records built with `normalizeCraftingSource`. No network, no RePoE checkout, no PoB2 process, no poe.ninja, no GGG credentials, no AI key, and no full snapshot.

## Real Local Snapshot Validation

| Base              | Class       | Item level | Stat                  | Eligible examples                                                       |
| ----------------- | ----------- | ---------- | --------------------- | ----------------------------------------------------------------------- |
| Rusted Cuirass    | Body Armour | 82         | `base_maximum_life`   | `IncreasedLife1` through `IncreasedLife13`, including `IncreasedLife12` |
| Wrapped Greathelm | Helmet      | 82         | `base_maximum_life`   | `IncreasedLife1` through `IncreasedLife10`                              |
| Iron Ring         | Ring        | 1          | `additional_strength` | `Strength1`                                                             |
| Withered Wand     | Wand        | 82         | `base_maximum_mana`   | `IncreasedMana1`                                                        |

All four plans were `ready` and carried the current snapshot checksum. `IncreasedLife12` is body-armour scoped, so it is eligible on Rusted Cuirass and not on Wrapped Greathelm. That matches the spawn tag, not a new class rule.

## Security / Privacy

Server-side load only. The client bundle does not import the snapshot JSON. Search and base lists are the selected class and a capped query.

## Performance

The web server caches the indexed snapshot and the report until either file's modification time changes. Planning a single stat does not rescan the network.

## Known Limitations

Recorded in section 18. They are expected at the end of this step.

## STEP-021 Readiness

Not ready. STEP-020 provides a base, an item level, explicit targets, and factual candidate rows. It does not provide an action model, a pool sample, a conflict rule, an affix-count rule, or a cost. Those have to be specified for one mechanic before a simulator starts.
