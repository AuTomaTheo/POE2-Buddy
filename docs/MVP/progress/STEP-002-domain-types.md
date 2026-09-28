# STEP-002 — Domain model

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 0 / STEP-002  
**Authoring context:** Cursor-assisted development

## 1. Objective

Define the internal PoE2 types, runtime schemas, and sample fixtures. The domain package must not depend on HTTP or UI code.

## 2. Acceptance criteria

- [x] External-source fields are normalized into internal types
- [x] The domain package has no HTTP or UI dependencies
- [x] Fixtures validate against runtime schemas

## 3. Implementation summary

`packages/domain` is now a workspace package named `@poe2-helper/domain`. It exports Zod schemas and TypeScript types for game-data provenance, passive nodes and edges, a character build snapshot, and a heuristic recommendation.

Sample JSON fixtures cover a four-node tree, a Witch build, a Warrior build, and one recommendation. Tests parse those files and reject a few invalid shapes: an unknown neighbor, a raw character field named `hashes`, and a path that costs more points than the requested budget.

The node ids in the fixtures are invented. They are not hashes from the official tree. No passive graph, scoring, or ingestion code was added.

## 4. Files created

| File                                                     | Purpose                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/domain/package.json`                           | Domain workspace package. Depends only on Zod.               |
| `packages/domain/tsconfig.json`                          | Strict typecheck for the domain package                      |
| `packages/domain/src/version.ts`                         | `GameDataVersion` schema                                     |
| `packages/domain/src/passive-tree.ts`                    | Node, edge, and tree snapshot schemas, plus reference checks |
| `packages/domain/src/character.ts`                       | Character snapshot, skills, items, and weapon-set schemas    |
| `packages/domain/src/recommendation.ts`                  | Objective, contribution, path, and recommendation schemas    |
| `packages/domain/src/index.ts`                           | Public exports                                               |
| `packages/domain/src/domain.test.ts`                     | Fixture and boundary tests                                   |
| `packages/domain/fixtures/passive-tree.sample.json`      | Synthetic four-node tree                                     |
| `packages/domain/fixtures/character-witch.sample.json`   | Witch fixture with a `set2` allocation                       |
| `packages/domain/fixtures/character-warrior.sample.json` | Warrior fixture with empty weapon sets                       |
| `packages/domain/fixtures/recommendation.sample.json`    | Heuristic recommendation shape                               |
| `docs/progress/STEP-002-domain-types.md`                 | This progress record                                         |

## 5. Files changed

| File                            | Change                                                                   |
| ------------------------------- | ------------------------------------------------------------------------ |
| `package.json`                  | Added `packages/*` to workspaces and domain typecheck to the root script |
| `package-lock.json`             | Locked Zod 3.25.76                                                       |
| `vitest.config.mts`             | Runs domain tests as well as the root tests                              |
| `README.md`                     | Points at the domain package                                             |
| `packages/README.md`            | Notes that domain now contains types                                     |
| `packages/domain/README.md`     | Replaced the placeholder with a module description                       |
| `docs/planning/DECISION_LOG.md` | Added D-011                                                              |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

- `gameDataVersionSchema` records source, optional version and commit, fetch time, and optional checksum.
- `passiveNodeSchema` stores id, name, raw stat lines, neighbor ids, structural kind, optional ascendancy id, and optional position.
- `passiveTreeSnapshotSchema` requires unique node ids, symmetric neighbor lists, and one undirected edge for each neighbor link. Unknown neighbor ids fail validation.
- `characterBuildSnapshotSchema` stores shared `allocatedPassiveIds` separately from `weaponSetSpecialisations.set1`, `set2`, and `set3`.
- `recommendationSchema` requires `scoreKind: "heuristic"` and rejects a path whose `pointCost` is above `pointBudget`.
- `parsePassiveTreeSnapshot`, `parseCharacterBuildSnapshot`, and `parseRecommendation` are the functions later adapters should call.

## 8. External APIs / data sources involved

No live requests were made.

The shapes were chosen from public documentation, then stored only in the internal form:

- Official GGG character reference: `passives.hashes` becomes `allocatedPassiveIds`. `passives.specialisations` keys `set1`, `set2`, and `set3` stay separate. `passives.quest_stats` becomes `questStats`. Source: https://www.pathofexile.com/developer/docs/reference — official, OAuth not used, no fields fetched, no cache.
- Official `poe2-skilltree-export` node flags inform `kind` and `ascendancyId`. A plain node is `small`. Present-only flags map to `notable`, `keystone`, `jewel-socket`, `mastery`, `attribute`, and `ascendancy-start`. Neighbor ids correspond to the export's `out` list. Source repository: https://github.com/grindinggear/poe2-skilltree-export — official, no credential, no snapshot downloaded in this step.
- Fixture `source` is the string `fixture`. There is no tree commit or checksum yet.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

New internal types: `GameDataVersion`, `PassiveNode`, `PassiveEdge`, `PassiveTreeSnapshot`, `CharacterBuildSnapshot`, `WeaponSetSpecialisations`, `NormalizedSkill`, `NormalizedItem`, `OptimizationObjective`, `StatContribution`, `CandidatePath`, and `Recommendation`.

Schemas use Zod `.strict()`, so a raw source field such as `hashes` is rejected until an adapter maps it.

No database.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
```

## 12. Automated tests

| Command/Test               | Result | Notes                                                                        |
| -------------------------- | ------ | ---------------------------------------------------------------------------- |
| `npm test`                 | PASS   | 2 files, 7 tests. Includes the STEP-001 env example test and 6 domain tests. |
| `npm run typecheck`        | PASS   | Root, `web`, and `@poe2-helper/domain`                                       |
| `npm run lint`             | PASS   | ESLint still covers `apps/web` only                                          |
| `npm audit` during install | PASS   | 0 vulnerabilities                                                            |

## 13. Manual verification

No UI changed. The home page was not retested. Fixture validation is covered by the unit tests.

## 14. Errors/issues encountered

None. `npm install` added Zod without the arborist error seen during STEP-001.

## 15. Security/privacy impact

No secrets, tokens, or user data were added. The domain package cannot call the network. Strict schemas reject unexpected fields instead of keeping raw account payloads.

## 16. Performance impact

Not measured / not applicable. The sample tree has four nodes. Reference checks compare ids with array scans, which is fine for fixtures and will need a set-based lookup when the full tree is loaded.

## 17. Data provenance / reproducibility impact

Every tree, character, and recommendation schema requires a `GameDataVersion` or `sourceVersion`. The sample fixtures use `source: "fixture"` and `version: "sample-1"`. They do not claim to match a live game patch.

## 18. Known limitations

- Fixtures are synthetic. The real passive tree is not loaded.
- Skills and items keep only a name, optional base type, and optional raw text. Mod lists are not parsed.
- Class-override nodes from the tree export are not a separate kind. A node with no special flag is `small`.
- Ascendancy access rules, point costs other than the explicit `pointCost`, and weapon-set legality are not enforced here.
- `set3` is stored because the official API has that key. Its gameplay meaning is not modeled.
- A recommendation does not yet check that `nodeIds` exist on a tree.
- ESLint does not lint `packages/domain`.

## 19. Decisions made

D-011: structural node kind is separate from `ascendancyId`. Weapon sets are always `set1`, `set2`, and `set3`. Scores carry `scoreKind: "heuristic"`.

## 20. Deviations from planning docs

The architecture sketch used one `kind` value of `ascendancy` and an optional `specialisations` record. The implementation uses the official export flags for kind, a separate `ascendancyId`, and the official `set1` / `set2` / `set3` keys. This avoids merging ascendancy notables into one kind and avoids dropping the third weapon set.

`heuristicScore` is used instead of a bare `score` so the field name matches the rule that early scores are heuristic.

## 21. Remaining risks

- The full tree may contain flag combinations this kind list does not represent. Ingestion must fail on an unrecognized combination rather than guessing.
- Neighbor symmetry is required by the internal schema. The raw export's `in` list is documented as often empty, so the future adapter must build neighbors from `out` and its reverse before validation.
- Synthetic fixtures will not catch a real schema change in the official export.

## 22. Rollback notes

Remove `packages/domain` source, fixtures, and package manifest, restore the domain README placeholder, and remove D-011, the workspace entry, and the Zod dependency. STEP-001 remains valid without this package.

## 23. Recommended next step

STEP-003 — Official passive-tree ingestion.

Add an adapter that reads a pinned local snapshot of the official tree export, validates the raw JSON, and converts it into `PassiveTreeSnapshot`. Do not start that step until it is approved.

## 24. Completion statement

STEP-002 satisfies the acceptance criteria. Internal schemas normalize the documented source fields, the domain package depends only on Zod, and the sample fixtures pass validation.
