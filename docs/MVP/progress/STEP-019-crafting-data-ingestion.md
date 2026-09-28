# STEP-019 — Crafting data ingestion

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 6 / STEP-019  
**Authoring context:** Cursor-assisted development

## 1. Objective

Ingest a pinned, versioned set of Path of Exile 2 base, modifier, stat-range, and translation records so later steps can ask factual crafting questions. This step does not choose a craft, estimate a cost, or calculate a probability.

## 2. Acceptance criteria

- [x] A normalized crafting-data package exists.
- [x] The source is selected and documented as community data, not an official Grinding Gear Games feed.
- [x] The exact commit is pinned.
- [x] Licensing was inspected before any copied data was added, and the full export was not committed.
- [x] Schema version 1 is separate from the source version and from the passive-tree pins.
- [x] Checksums and provenance are recorded.
- [x] Bases, modifiers, domains, generation types, groups, required item level, stat ranges, ordered spawn weights, tag conditions, stat ids, and English translations are ingested.
- [x] Unsupported translations stay unresolved.
- [x] Base lookup, modifier lookup, and source-pool eligibility stay inside the proven rules.
- [x] There is no recommendation, expected cost, simulation, or AI crafting advice.
- [x] Runtime queries use the local snapshot. Tests do not use the network.
- [x] Dataset validation and source spot checks passed.
- [x] STEP-020 readiness is partial, not forced to ready.

## 3. Implementation summary

`@poe2-helper/crafting-data` normalizes the community RePoE PoE2 export into schema version 1. The refresh command downloads only the pinned files over HTTPS, checks size and checksums, and writes the full snapshot under gitignored `var/crafting-data/`. The repository keeps a provenance manifest and a small fixture of real records. Spawn-weight eligibility uses the first matching base tag, which matches Path of Building Community (PoE2) `ItemClass:GetModSpawnWeight`. A positive weight means source-pool eligible. It does not mean craftable, and it is not a probability.

## 4. Files created

| File                                                 | Purpose                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/crafting-data/package.json`                | Package boundary. Depends only on Zod.                                            |
| `packages/crafting-data/tsconfig.json`               | Strict typecheck for the package.                                                 |
| `packages/crafting-data/src/version.ts`              | Schema version, known domains, known generation types, partial-readiness reasons. |
| `packages/crafting-data/src/errors.ts`               | Structured error codes.                                                           |
| `packages/crafting-data/src/schema.ts`               | Normalized snapshot schema and checksum check.                                    |
| `packages/crafting-data/src/canonical.ts`            | Stable JSON and sha256.                                                           |
| `packages/crafting-data/src/normalize.ts`            | Raw export to normalized records, plus spot checks.                               |
| `packages/crafting-data/src/query.ts`                | Indexes, lookups, eligibility, translations, planner gate.                        |
| `packages/crafting-data/src/diff.ts`                 | Unclassified dataset diff.                                                        |
| `packages/crafting-data/src/index.ts`                | Public exports.                                                                   |
| `packages/crafting-data/src/normalize.test.ts`       | Offline fixture tests.                                                            |
| `packages/crafting-data/fixtures/source-subset.json` | Real source records for tests.                                                    |
| `scripts/refresh-crafting-data.ts`                   | Fetch, normalize, validate, local snapshot, manifest.                             |
| `scripts/crafting-inspect.ts`                        | Print coverage for the local snapshot.                                            |
| `docs/data-snapshots/crafting/manifest.json`         | Provenance, checksums, and the redistribution block.                              |

## 5. Files changed

| File                            | Change                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `package.json`                  | Typecheck includes the package. Adds `refresh:crafting-data` and `crafting:inspect`. |
| `package-lock.json`             | Workspace link for the new package.                                                  |
| `.gitignore`                    | Ignores `var/crafting-source/` and `var/crafting-data/`.                             |
| `.prettierignore`               | Ignores `var/` so the full snapshot is not formatted.                                |
| `docs/planning/DECISION_LOG.md` | Adds D-085.                                                                          |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`normalizeCraftingSource` owns the raw-to-normalized mapping and fails the whole snapshot on an unknown domain or generation type. `indexCraftingSnapshot` builds id, name, domain, generation, group, and translation indexes. `resolveBase` and `resolveGearBase` match an id or an exact name plus item class. `evaluateSourcePool` applies the item-level gate, the domain rule, ordered spawn weights, and ordered generation weights. `querySourcePool` returns eligible ids, unresolved ids, and an excluded count. `translateModifier` keeps stat order and does not fill in a roll. `requirePlannerCompatibility` rejects this snapshot because compatibility is unknown. The refresh script owns the network and the files. The package does not fetch.

## 8. External APIs / data sources involved

- Provider: `repoe-fork/poe2`.
- Repository: `https://github.com/repoe-fork/poe2`.
- Fetch host: `https://raw.githubusercontent.com/repoe-fork/poe2/b818b843337cae43b090b272fd98bbc0fd3a34f3/`.
- Classification: community. Not an official Grinding Gear Games API.
- Auth: none.
- Fields used: base name, item class, domain, tags, drop level, requirements; modifier domain, generation type, groups, required level, spawn weights, generation weights, stats, text, name, implicit tags, essence-only flag; English stat-description ids, conditions, and template strings.
- Cache: local files under `var/crafting-source/` and `var/crafting-data/`. The web app does not load them.
- Version: commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, export label 4.5.5.2, fetched at `2026-09-27T14:26:54.311Z`.
- Fallback: none. A failed fetch does not switch provider.

Path of Building Community (PoE2) 0.23.1 `Classes/Item.lua` `ItemClass:GetModSpawnWeight` was read locally as a semantic cross-check. That Lua was not copied into the repository and was not merged into the dataset.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`CRAFTING_DATA_SCHEMA_VERSION` is 1. A snapshot contains bases, modifiers, English translation rows, coverage, an unknown inventory, provenance, compatibility, and readiness. The semantic checksum excludes provenance timestamps. Compatibility for this pin is `unknown`. Readiness is `partial`.

## 11. Commands executed

```bash
npm install
npm run refresh:crafting-data -- --offline
npm run refresh:crafting-data
npm run crafting:inspect
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
```

## 12. Automated tests

| Command/Test                                   | Result | Notes                                  |
| ---------------------------------------------- | ------ | -------------------------------------- |
| `npm test`                                     | PASS   | 43 files, 323 tests. No network.       |
| `packages/crafting-data/src/normalize.test.ts` | PASS   | 19 tests. Uses the committed fixture.  |
| `npm run typecheck`                            | PASS   | Includes `@poe2-helper/crafting-data`. |
| `npm run lint`                                 | PASS   |                                        |
| `npm run format:check`                         | PASS   |                                        |
| `npm audit`                                    | PASS   | 0 vulnerabilities.                     |

## 13. Manual verification

`npm run refresh:crafting-data` downloaded the pinned files and wrote the local snapshot. A second pass, after an offline normalize of the same bytes, kept the same normalized checksum. `npm run crafting:inspect` reported readiness `partial` and planner result `snapshot-incompatible`. All seven fixture F base names resolved by exact class and name. Spot checks matched Rusted Cuirass, Strength1, LocalBaseArmourAndEvasionRating1, IncreasedLife12, and HybridStrDex against the upstream records. No crafting UI was added, so the browser was not used.

## 14. Errors/issues encountered

- The full export cannot be committed. Root cause: RePoE's license says generated data files are owned by Grinding Gear Games, and the PoE2 repository has no GitHub license. Resolution: the refresh script works locally, the manifest records `redistribution: blocked`, and tests use a small real fixture. Regression test: the fixture tests run without the full snapshot.
- The first pool assertion treated the warning sentence as a forbidden probability field. Root cause: the warning says eligibility is not a probability. Resolution: the test checks that the result has no probability or expected-cost property. Regression test: yes.

## 15. Security/privacy impact

No credentials, tokens, or user data were added. The refresh URL is fixed to the pinned commit, rejects redirects, and stops if a file exceeds its size limit. Downloaded files are parsed as JSON and are not executed. The web bundle does not import this package. The full export is gitignored.

## 16. Performance impact

The local refresh normalized 5,496 bases, 16,784 modifiers, and 10,750 translation rows in roughly 11 seconds on this machine, plus the download. That work is not on a web request. The web bundle is unchanged.

## 17. Data provenance / reproducibility impact

The same pinned files and schema version produced `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8` on both the offline normalize and the later fetch. Fetch time is stored in provenance and is not part of the checksum. A changed spawn weight changes the checksum in the unit test. The dataset diff between those two local snapshots was empty and was left `unclassified`.

## 18. Known limitations

English templates keep source markup such as `{0}` and `[Strength|Strength]`. 5,750 of 10,750 translation rows are unresolved because the wording is conditional, ambiguous, duplicated, or missing. 3,340 bases use the source domain string `undefined`, so their eligibility stays unresolved. This pin has no generation-weight rules. 447 modifiers have no stats. 28 modifiers grant effects that this step does not interpret. The snapshot is not approved for a crafting planner.

## 19. Decisions made

D-085. The source, the license block, schema version 1, the offline runtime, the eligibility tri-state, and the rule that a spawn weight is not a probability are recorded there.

## 20. Deviations from planning docs

The full normalized dataset is local only. STEP-019 allows that when redistribution rights are unclear. `stats_by_file.json` was not used as stat identity because it is keyed by display strings. Stat identity is the id on the modifier plus the English stat-description row. `item_classes.json` and `tags.json` are checksummed. Class and tag values used for lookup come from each base record.

## 21. Remaining risks

The spawn-weight rule is community evidence from Path of Building, not an official crafting formula. A later mechanic can disagree with it. Compatibility with the passive-tree pin 0.5.5 is unknown. The full dataset still cannot be published from this repository. Conditional translations can stay unresolved until a later step implements those conditions without guessing.

## 22. Rollback notes

`npm run refresh:crafting-data -- --rollback` restores `var/crafting-data/previous-snapshot.json` over the current local snapshot. Deleting `packages/crafting-data/`, the refresh script, the manifest, and the D-085 entry removes the step from the repo. The gitignored export can be deleted without a commit. Passive scores, gear normalization, character context, and upgrade ranking were not changed.

## 23. Recommended next step

Stop here. STEP-020, the craft target planner, is not ready to start. Compatibility is unknown, translations are partial, and the full snapshot cannot be redistributed.

## 24. Completion statement

STEP-019 meets its acceptance criteria. The snapshot answers factual identity, range, translation, and source-pool questions. It does not answer what to craft or how likely a craft is. Status is COMPLETE. STEP-020 readiness is partial.

## Why STEP-019 Starts Now

Phase 5 through STEP-018C.1 is frozen. Phase 6 needs a versioned crafting dataset before a planner or a simulation exists.

## Selected Data Sources

Primary source: `repoe-fork/poe2`. No second data source is merged. Path of Building was used only to read the spawn-weight walk order.

## Source Classification

Community. Not official.

## Source Version / Commit

Commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`. Message label version 4.5.5.2. `version.txt` and `exported-version.txt` both contain `4.5.5.2`. This label is not passive-tree version 0.5.5 and not PoB tree key `0_5`.

## Licensing / Redistribution

The PoE2 repository's GitHub license field is null. Parent RePoE `LICENSE.md` is MIT for the software and says generated files in the data directory are owned by Grinding Gear Games and shall not be used or published except in accordance with their terms of use. This step does not treat that as permission to publish the export. `docs/data-snapshots/crafting/manifest.json` sets `redistribution` to `blocked` and `productionPromoted` to false. The committed fixture is a handful of real records used by tests, not the dataset.

## Source Files Used

`version.txt`, `exported-version.txt`, `data/item_classes.json`, `data/tags.json`, `data/base_items.json`, `data/mods.json`, and `data/stat_translations/stat_descriptions.json`. Art, skills, and unrelated trees were not downloaded.

## Raw Source Checksums

| File                                            | sha256                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| `version.txt`                                   | `sha256:b904ae522c1827a18760f2a362e92b89bf72d7b19b9b42f50b6b1d26b8afc2e2` |
| `exported-version.txt`                          | `sha256:895cb9e6a68bc903aeea1a52b73c07db35d13e29162af56a71be9dcb54f6f574` |
| `data/item_classes.json`                        | `sha256:c235f54b1801a84bc03c121072d2003615b8efd40be423cf498c9b6965d35d60` |
| `data/tags.json`                                | `sha256:d80ec3e84684f20f02cdf3429a23957580f68064ed90d528c8a254ad143c3cc1` |
| `data/base_items.json`                          | `sha256:86932dabccb37552e0d38b3abf996edebea73f1946bfa941ed7992c05f16fcd3` |
| `data/mods.json`                                | `sha256:3ee691822595d8c91c96416583d1adc9c5e9884232db6cc6f295e79d15d85a07` |
| `data/stat_translations/stat_descriptions.json` | `sha256:1d4fca41f24520f937ad47ab607ef0ff1e94113c21ae186a4275cdc13d7beb76` |

## Normalized Snapshot Checksum

`sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`

The local file is `var/crafting-data/snapshot.json`. It is not in git.

## Crafting Data Schema Version

`CRAFTING_DATA_SCHEMA_VERSION = 1`.

## Compatibility Mapping

Status is `unknown`. The export label 4.5.5.2 is not mapped onto the passive-tree pin. `requirePlannerCompatibility` returns `snapshot-incompatible`. Factual queries still run.

## Base Item Model

A base keeps its metadata id, exact name, item class, domain, tags, drop level, and requirement numbers when the source has them. The id is the identity. The name is not.

## Base Tags / Requirements

Tags stay in source order and are the match keys for spawn weights. Requirement level, strength, dexterity, and intelligence are stored when present. They are not turned into a crafting recommendation.

## Modifier Model

A modifier keeps its id, name, domain, generation type, groups, required item level, ordered spawn-weight rules, ordered generation-weight rules, ordered stat ranges, source text, implicit tags, and the essence-only flag. The id is the identity. Display text is not.

## Generation Types

The closed set is the 21 `generation_type` strings observed in this commit, including `prefix`, `suffix`, and `unique`. A new string fails snapshot promotion.

## Affix Kind Mapping

`prefix` maps to prefix. `suffix` maps to suffix. Every other known generation type maps to `other`. HybridStrDex is `unique`, so its affix kind is `other` even though its text mentions Strength.

## Modifier Groups

Groups are the source group ids, in source order. Strength1 and Strength2 share `Strength`. HybridStrDex is `HybridStat`. Similar text does not create a group. Sharing a group does not prove that every crafting mechanic excludes the pair.

## Item-Level Requirements

The source field `required_level` is stored as `requiredItemLevel`. It is the modifier's item-level gate from this export, not a character level inferred by this app. IncreasedLife12 requires 75. Item level 74 on Rusted Cuirass is ineligible. Item level 75 continues into the spawn-weight rules and is eligible because the first matching tag is `body_armour` with weight 1.

## Modifier Stats / Ranges

Each stat keeps its id, minimum, and maximum in source order. Ranges are not averaged and are not rolled. LocalBaseArmourAndEvasionRating1 keeps armour 9–16 and evasion 6–10 in that order. Empty stat lists stay empty.

## Stat Definitions

The stat id on the modifier is the identity. `stats_by_file.json` is a reverse index by display string and was not ingested. English wording comes only from `stat_descriptions.json`.

## Translation Model

Locale is English only. One unconditional English template resolves. Conditional, ambiguous, missing, or duplicate rows are unresolved and do not keep a guessed sentence. Markup is preserved. Placeholders are not replaced with a roll. A multi-stat modifier uses one combined row when that exact id order exists; otherwise it uses one line per stat id, in stat order.

## Spawn-Weight Model

Each rule is `{ tag, weight, sourceIndex }`. Order is the source array order. Weight 0 stays 0. A missing weight stays null. Rules are not collapsed to one number and are not sorted alphabetically.

## Spawn-Weight Semantics

Path of Building Community (PoE2) 0.23.1 starts the weight at 0, walks the tags in order, and takes the first tag that is on the base. If none match, the weight stays 0. Callers treat a weight above 0 as able to appear. This step uses that walk for source-pool eligibility. It is community evidence, not an official statement. Strength1 on a Withered Wand matches `default` with weight 0 and is ineligible. Strength1 on a Rusted Cuirass matches `str_armour` with weight 1 and is eligible at item level 1.

## Generation Weights

Generation-weight rules are stored separately. This pinned export has zero of them. The unit test shows a matching generation weight of 0 makes the result ineligible, and a non-matching generation rule does not. The ratio is not exposed.

## Eligibility Model

The result is `eligible`, `ineligible`, or `unresolved`. Below the required item level is ineligible. A null domain is unresolved. Any domain other than `item` on the base or the modifier is unresolved. The first matching spawn rule then decides: null weight is unresolved, 0 is ineligible, and a positive weight continues. No matching tag is ineligible. A pool query can filter by generation type, group, stat id, and domain. Eligible and unresolved ids are sorted by id so the order is stable. That order is not a ranking.

## Eligibility Limitations

Only the `item` domain is mapped. The source string `undefined` is a real domain value on 3,340 bases and stays unresolved. Essence-only, grants-effects, and other crafting currencies are stored or counted and are not interpreted as mechanics. Source-pool eligible does not mean every crafting method can produce the modifier.

## No-Probability Rule

No function returns a probability, an expected cost, a weight divided by a total, or a craft recommendation. The pool warning says source-pool eligibility is not a crafting probability.

## Base Resolution

Lookup by id returns that base or not-found. Lookup by exact name returns one base, not-found, or ambiguous. `Silver Coin` is ambiguous because two records share that exact name. `Rusted` is not-found. The wrong item class is not-found.

## Gear-to-Base Resolution

`resolveGearBase` takes `{ baseName, itemClass }` and does not import the gear engine. Fixture F resolved on the full snapshot:

| Name              | Class       | Id                                                      |
| ----------------- | ----------- | ------------------------------------------------------- |
| Rusted Cuirass    | Body Armour | `Metadata/Items/Armours/BodyArmours/FourBodyStr1`       |
| Linen Wraps       | Gloves      | `Metadata/Items/Armours/Gloves/FourGlovesDexInt2`       |
| Wrapped Greathelm | Helmet      | `Metadata/Items/Armours/Helmets/FourHelmetStr3`         |
| Iron Ring         | Ring        | `Metadata/Items/Rings/FourRing1`                        |
| Ruby Ring         | Ring        | `Metadata/Items/Rings/FourRing3`                        |
| Withered Wand     | Wand        | `Metadata/Items/Weapons/OneHandWeapons/Wands/FourWand1` |
| Twig Focus        | Focus       | `Metadata/Items/Armours/Focii/FourFocus1`               |

## Coverage Report

| Count                          | Value  |
| ------------------------------ | ------ |
| Bases                          | 5,496  |
| Modifiers                      | 16,784 |
| Prefixes                       | 2,767  |
| Suffixes                       | 2,458  |
| Other generation types         | 11,559 |
| Translation rows               | 10,750 |
| Resolved translations          | 5,000  |
| Unresolved translations        | 5,750  |
| Domain string `undefined`      | 3,340  |
| Absent domain field            | 0      |
| Modifiers with no stats        | 447    |
| Grants-effects not interpreted | 28     |
| Generation-weight rules        | 0      |

## Unknown Inventory

Unknown domain and generation strings fail promotion. They are not dropped. The unknown inventory records the absent-domain count, the `undefined` domain-string count, and fields that are intentionally not interpreted: `adds_tags`, `gold_value`, `grants_effects`, `stats_by_file`, non-English locales, and translation markup.

## Snapshot Promotion

Validation passed, so the local snapshot was written. Production promotion did not happen. The blocker is `compatibility-unknown`. A failed validation writes `var/crafting-data/rejection.json` and leaves the previous snapshot in place.

## Rollback

The refresh copies the previous local snapshot to `var/crafting-data/previous-snapshot.json` before replacing it. `npm run refresh:crafting-data -- --rollback` restores that file.

## Refresh Command

```bash
npm run refresh:crafting-data
npm run refresh:crafting-data -- --offline
npm run refresh:crafting-data -- --rollback
npm run crafting:inspect
```

The default command fetches, checksums, parses, normalizes, validates, diffs, and writes the local snapshot and the manifest. It does not run when the web app starts. `--offline` reads `var/crafting-source/` and still refuses another provider if a file is missing.

## Dataset Diff

The fetch after the offline normalize produced an empty added, removed, and changed set for bases, modifiers, stats, domains, and generation types. `safety` is `unclassified`. A diff is never marked safe automatically.

## Fixture Provenance

`packages/crafting-data/fixtures/source-subset.json` records provider `repoe-fork/poe2`, commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, and version 4.5.5.2. It contains the seven fixture F bases, both `Silver Coin` records, Strength1, Strength2, LocalBaseArmourAndEvasionRating1, IncreasedLife12, HybridStrDex, and the three English rows those stats need. STEP-019A later removed this file and moved unit tests onto synthetic records. Real-source checks stay in the refresh command.

## Source Spot Checks

The refresh compared the normalized snapshot with the raw export for Rusted Cuirass, Strength1's level, suffix kind, group, final weight 0, and 5–8 strength range, LocalBaseArmourAndEvasionRating1's stat and weight order, IncreasedLife12's required level 75, and HybridStrDex's group. All passed. The unit tests repeat those checks against the fixture.

## Offline Tests

`npm test` does not fetch, does not start PoB, and does not call poe.ninja. The crafting tests read the fixture from disk.

## Security

See section 15. No secrets were added to `.env.example`.

## Performance

See section 16.

## Known Limitations

See section 18.

## STEP-020 Readiness

Partial. Base identity, modifier identity, item level, generation type, groups, stat ranges, ordered spawn weights, provenance, and explicit unresolved eligibility are in place. Probability is not required. STEP-020 is still not ready to start: compatibility is unknown, 5,750 translations are unresolved, spawn-weight meaning is community evidence, generation weights are absent in this export, and the full snapshot cannot be redistributed. Planner use fails closed.
