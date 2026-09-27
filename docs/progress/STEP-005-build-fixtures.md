# STEP-005 — Character/build fixture import

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 1 / STEP-005  
**Authoring context:** Cursor-assisted development

## 1. Objective

Define a JSON build-fixture format and load at least two fixtures with different classes and goals. Invalid passive ids must be reported. The sample allocations must exist on the selected passive-tree snapshot.

## 2. Acceptance criteria

- [x] The fixture format includes class, level, allocated nodes, optional ascendancy, skills, an equipment summary, and goals
- [x] Invalid node ids are reported
- [x] A sample character loads deterministically
- [x] Every allocated id in the two build fixtures exists on the pinned tree snapshot
- [x] The two fixtures use different classes and different goals
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

A build fixture is a `CharacterBuildSnapshot` plus `goals`. Goals are `objective` (`offensive`, `defensive`, or `balanced`) and a nonnegative `pointBudget`. Goals are not stored on the character snapshot.

`loadBuildFixture` reads one JSON file, parses it with the domain schema, and compares passive ids with a snapshot the caller passes in. Ids missing from that snapshot are listed on the report. They stay on the character. Weapon-set ids are listed separately from `allocatedPassiveIds`. A class name that is not in `classStarts` is reported as `unknownClassName`.

Two fixtures are checked against the development tree pin:

| File                                                           | Class   | Goal                | Allocated skill ids |
| -------------------------------------------------------------- | ------- | ------------------- | ------------------- |
| `packages/data-sources/fixtures/builds/witch-offensive.json`   | Witch   | offensive, 5 points | 54447, 4739, 18845  |
| `packages/data-sources/fixtures/builds/warrior-defensive.json` | Warrior | defensive, 3 points | 47175, 38646, 1913  |

Those ids are the class-start node and two connected travel nodes on the main tree. The Witch file also stores ascendancy `Infernalist`. The Warrior file omits ascendancy. Skill and item names are labels. The older domain samples under `packages/domain/fixtures/` still use invented ids `101`, `102`, and `103` and are not tree-checked.

## 4. Files created

| File                                                           | Purpose                              |
| -------------------------------------------------------------- | ------------------------------------ |
| `packages/domain/src/build-fixture.ts`                         | Fixture schema: character plus goals |
| `packages/data-sources/src/builds/load-build-fixture.ts`       | File load and unknown-id report      |
| `packages/data-sources/src/builds/load-build-fixture.test.ts`  | Pinned-tree and unknown-id tests     |
| `packages/data-sources/fixtures/builds/witch-offensive.json`   | Witch fixture, offensive goal        |
| `packages/data-sources/fixtures/builds/warrior-defensive.json` | Warrior fixture, defensive goal      |
| `docs/progress/STEP-005-build-fixtures.md`                     | This progress record                 |

## 5. Files changed

| File                                 | Change                                                            |
| ------------------------------------ | ----------------------------------------------------------------- |
| `packages/domain/src/index.ts`       | Exports the fixture schema and parser                             |
| `packages/domain/src/domain.test.ts` | Parses a fixture and rejects a goal that is missing `pointBudget` |
| `packages/domain/README.md`          | Describes goals and the invented-id samples                       |
| `packages/data-sources/src/index.ts` | Exports the loader and report types                               |
| `packages/data-sources/README.md`    | Describes fixture loading                                         |
| `packages/README.md`                 | Notes the build-fixture adapter                                   |
| `README.md`                          | Notes that data-sources also reads build fixtures                 |
| `docs/planning/DECISION_LOG.md`      | D-017                                                             |

## 6. Files deleted

`None`. A temporary script that printed class-start neighbors was removed before this document.

## 7. Important code paths / responsibilities

- `parseBuildFixture` checks the JSON shape. A bad shape throws. It does not look at the tree.
- `loadBuildFixture` reads a path the caller supplies. It does not default to `docs/` or to the fixture folder.
- `reportBuildFixtureAgainstSnapshot` compares `allocatedPassiveIds`, `set1`, `set2`, and `set3` with `snapshot.nodes`. It compares `className` with `classStarts`.
- Unknown ids are reported in file order, including repeats. They are not stripped.
- data-sources still depends only on domain and Zod. It does not call the passive graph. Membership is the snapshot node list.

## 8. External APIs / data sources involved

No new download. Allocated ids were taken from the STEP-003 pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Nodes used: Witch start `54447` (`WITCH`) and travel nodes `4739` and `18845` (both named Spell Damage). Warrior start `47175` (`MARAUDER`, also the Marauder start) and travel nodes `38646` and `1913` (both named Armour).

The fixture `sourceVersion` copies that pin. Skill names, item names, levels, and point budgets are written in the fixture files. They are not fetched from a character API.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`BuildFixture` is `{ character: CharacterBuildSnapshot, goals: BuildGoals }`. `BuildGoals` is `{ objective, pointBudget }`. `CharacterBuildSnapshot` is unchanged, so weapon sets stay separate from the shared allocation.

No database. The domain sample characters were not rewritten onto the official tree.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
```

## 12. Automated tests

| Command/Test           | Result | Notes                                                                                                                                                                                   |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 6 files, 25 tests. Adds Witch and Warrior loads, a second load of the same file, unknown allocated ids, unknown weapon-set ids, an unknown class name, and a domain fixture-shape test. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine                                                                                                                                     |
| `npm run lint`         | PASS   | Exit code 0                                                                                                                                                                             |
| `npm run format:check` | PASS   |                                                                                                                                                                                         |
| `npm audit`            | PASS   | 0 vulnerabilities. Dependencies were unchanged.                                                                                                                                         |

## 13. Manual verification

No UI changed. The allocated ids were read from the pinned export before the fixtures were written: Witch start neighbors include Spell Damage `4739`, and that node neighbors Spell Damage `18845`. Warrior start neighbors include Armour `38646`, and that node neighbors Armour `1913`. The unit test checks those names on the normalized snapshot.

## 14. Errors/issues encountered

None. The first test run passed.

## 15. Security/privacy impact

No secrets, account data, or network calls. The fixtures are local files. Loading them does not contact Grinding Gear Games.

## 16. Performance impact

Not measured as a budget. Each load reads one small JSON file and scans the snapshot node list once to build a set. The pinned snapshot load was already tested in earlier steps.

## 17. Data provenance / reproducibility impact

The tree pin did not change. Both build fixtures record commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`. Loading the same path twice returns an equal report, and allocated ids stay in file order.

## 18. Known limitations

- The loader does not check that allocated nodes form a connected path from the class start. These two files happen to be short connected chains. Path legality is STEP-006.
- Level is stored and is not converted into a passive-point total. `pointBudget` is the goal in the file, not a calculated cost of the current allocation.
- Ascendancy text is stored and not checked. The Witch file says `Infernalist` and does not allocate the Infernalist start node. Ascendancy names were left unnormalized in STEP-003A.
- Skill and equipment entries are labels. No mods are parsed.
- Quest stats are empty. No quest passive rules are applied.
- The domain samples `character-witch.sample.json` and `character-warrior.sample.json` still use invented ids. They are schema examples, not these build fixtures.
- data-sources does not pick a snapshot directory for the caller. The test passes the development pin.

## 19. Decisions made

- D-017: a build fixture keeps goals beside the character. Unknown passive ids are reported and left in place. Weapon-set ids are reported separately.

## 20. Deviations from planning docs

The architecture sketch shows `FixtureCharacterProvider` with `listCharacters` and `getCharacter`. This step loads explicit file paths and reports unknown ids. A provider class that lists every fixture is not required to meet the acceptance criteria, and live character listing stays blocked on OAuth.

The illustrative `CharacterBuildSnapshot` in the architecture doc has no goals field. Goals stay on the fixture, matching D-017, instead of being added to the character.

## 21. Remaining risks

- A later tree pin can renumber or remove these skill ids. The fixture tests will fail until the files are updated to that pin.
- A caller that ignores `unknownAllocatedIds` can analyze a character that names nodes the selected tree does not contain.
- These allocations are not yet checked for connectivity, ascendancy access, or weapon-set rules.

## 22. Rollback notes

Delete `packages/data-sources/fixtures/builds/`, `packages/data-sources/src/builds/`, and `packages/domain/src/build-fixture.ts`. Remove the new exports and the domain test. D-017 can be removed from the decision log. The character snapshot schema and the invented-id samples stay.

## 23. Recommended next step

STEP-006 — Reachability and legal path enumeration.

Use these fixtures and the passive graph to find connected allocations within a point budget. Do not start that step until it is approved.

## 24. Completion statement

STEP-005 satisfies the acceptance criteria. Two build fixtures with different classes and goals load to the same result on each read, their allocated ids exist on the pinned snapshot, and ids that are not on that snapshot are reported without being deleted.
