# STEP-003A — Passive data hardening

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 1 / STEP-003A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden the passive-tree data layer before graph or optimizer work. Cover package TypeScript with ESLint, keep class-start information that the export's `root` node was pointing at, stop treating `docs/` as an implicit production path, and cache the validated snapshot in the current process.

## 2. Acceptance criteria

- [x] ESLint covers TypeScript source under `packages/*`, not only `apps/web`
- [x] The official export's `root` and class-start relationships were investigated and documented
- [x] `root` is still not a normal passive graph node
- [x] Normalized metadata identifies class starting nodes
- [x] Production runtime does not implicitly depend on `docs/`
- [x] A process-level cached snapshot loader is available
- [x] Later consumers reuse the loaded snapshot instead of reparsing the JSON
- [x] Unit and regression tests were added
- [x] STEP-003 provenance and previous failure behavior remain
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`npm run lint` now uses one root ESLint config. Next.js rules apply to `apps/web`. `typescript-eslint` recommended rules apply to `packages/**/*.ts`, `tests/**/*.ts`, and the Vitest config. Future packages under `packages/` are included by that same pattern.

The pinned export has a `classes` array of 12 named classes and six skill nodes whose `classStartIndex` lists two indexes each. The six `root` edges point at exactly those six nodes. `root` itself has no skill id and is still omitted from `nodes` and `edges`. Each class is stored as `{ classIndex, className, nodeId }` on `PassiveTreeSnapshot.classStarts`.

Loaders no longer default to `docs/data-snapshots`. Callers pass `snapshotDirectory`, or the process must set `POE2_PASSIVE_TREE_SNAPSHOT_DIR`. `getPinnedPassiveTreeSnapshot` verifies and normalizes a directory once, freezes the snapshot, and returns that same object until the process restarts or a test resets the cache.

## 4. Files created

| File                                                        | Purpose                                       |
| ----------------------------------------------------------- | --------------------------------------------- |
| `eslint.config.mjs`                                         | Root lint config for the web app and packages |
| `packages/data-sources/src/passive-tree/cached-snapshot.ts` | Process-local frozen snapshot cache           |
| `tests/lint-coverage.test.ts`                               | Checks that package TypeScript is linted      |
| `docs/progress/STEP-003A-passive-data-hardening.md`         | This progress record                          |

## 5. Files changed

| File                                                                  | Change                                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `package.json`                                                        | Root `lint` runs `eslint .`. ESLint and typescript-eslint are root dev dependencies. |
| `package-lock.json`                                                   | Lockfile update for those dev dependencies                                           |
| `packages/domain/src/passive-tree.ts`                                 | Adds `classStarts` and validates them                                                |
| `packages/domain/src/index.ts`                                        | Exports the class-start schema and type                                              |
| `packages/domain/fixtures/passive-tree.sample.json`                   | Empty `classStarts` list                                                             |
| `packages/domain/README.md`                                           | Mentions class starts                                                                |
| `packages/data-sources/src/passive-tree/raw-schema.ts`                | Requires the export `classes` array and allows `classStartIndex`                     |
| `packages/data-sources/src/passive-tree/normalize.ts`                 | Builds class starts and checks them against root edges                               |
| `packages/data-sources/src/passive-tree/load-pinned-snapshot.ts`      | Requires an explicit directory and logs the class-start count                        |
| `packages/data-sources/src/passive-tree/load-pinned-snapshot.test.ts` | Class-start, cache, and missing-directory tests                                      |
| `packages/data-sources/src/index.ts`                                  | Exports the cache and directory resolver                                             |
| `packages/data-sources/README.md`                                     | Documents the directory and cache                                                    |
| `.env.example`                                                        | Adds `POE2_PASSIVE_TREE_SNAPSHOT_DIR` with an empty value                            |
| `README.md`                                                           | Notes that the docs pin is not the production default                                |
| `docs/data-snapshots/README.md`                                       | Same runtime-path note                                                               |
| `docs/planning/DECISION_LOG.md`                                       | D-013, D-014, and D-015                                                              |

## 6. Files deleted

| File                         | Reason                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/web/eslint.config.mjs` | Replaced by the root ESLint config so web and packages are not linted by unrelated configs |

## 7. Important code paths / responsibilities

- `developmentPassiveTreeSnapshotDirectory` is the path to the docs pin. Tests pass it in. Production code is not given that path automatically.
- `resolvePassiveTreeSnapshotDirectory` uses the argument or `POE2_PASSIVE_TREE_SNAPSHOT_DIR`, and throws if both are missing.
- `loadPinnedPassiveTreeSnapshot` still checksums, validates, and normalizes. It does not cache.
- `getPinnedPassiveTreeSnapshot` caches one frozen snapshot per resolved directory.
- `resetPinnedPassiveTreeSnapshotCacheForTests` clears that cache. It is for tests.
- `classStartsFromExport` reads `classes[index].name` and the skill id on the node that lists that index. It fails if a root edge and `classStartIndex` disagree.

## 8. External APIs / data sources involved

No new download. The same STEP-003 pin is used.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Fields newly consumed: top-level `classes[].name`, and `classStartIndex` on skill nodes.
- `root` edges are still not copied into the passive graph. They are compared with `classStartIndex`.

The export's class list, in index order, and the skill each index starts on:

| Index | Export class name | Start skill id |
| ----: | ----------------- | -------------: |
|     0 | Marauder          |          47175 |
|     1 | Witch             |          54447 |
|     2 | Ranger            |          50459 |
|     3 | Duelist           |          50986 |
|     4 | Shadow            |          44683 |
|     5 | Templar           |          61525 |
|     6 | Warrior           |          47175 |
|     7 | Sorceress         |          54447 |
|     8 | Huntress          |          50459 |
|     9 | Mercenary         |          50986 |
|    10 | Monk              |          44683 |
|    11 | Druid             |          61525 |

Those pairings are what the file stores. This step does not decide which name is the only legal label for a start.

## 9. Credentials / environment variables

### Added/changed variable names

```dotenv
POE2_PASSIVE_TREE_SNAPSHOT_DIR=
```

The value in `.env.example` is empty. No secret.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`PassiveTreeSnapshot` now requires `classStarts`: an array of `{ classIndex, className, nodeId }`. Class indexes must be unique. Each `nodeId` must exist on the snapshot. The synthetic sample tree uses an empty list.

The raw export schema now requires `classes` with a non-empty `name` on each entry. Other class fields are passed through and not normalized.

No database.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
```

## 12. Automated tests

| Command/Test           | Result | Notes                                                                                                                                                                          |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm test`             | PASS   | 4 files, 14 tests. Includes the pinned tree, class starts, checksum mismatch, unknown `is*` flag, Grenade Damage self-link, cache reuse, missing directory, and lint coverage. |
| `npm run typecheck`    | PASS   | Root, web, domain, and data-sources                                                                                                                                            |
| `npm run lint`         | PASS   | Web app and package TypeScript. Exit code 0.                                                                                                                                   |
| `npm run format:check` | PASS   |                                                                                                                                                                                |
| `npm audit`            | PASS   | 0 vulnerabilities                                                                                                                                                              |

## 13. Manual verification

No UI changed. The class-start table above was read from the pinned `data.json` before the normalizer was written, then checked again by the unit test for Witch, Sorceress, Warrior, Huntress, and Monk.

## 14. Errors/issues encountered

### Next.js lint looked for a pages directory at the repository root

- Symptom: `npm run lint` printed `Pages directory cannot be found` at the repository root, even though the command exited 0.
- Root cause: `eslint-config-next` looks for `pages` or `src/app` beside the ESLint config. The app lives in `apps/web`.
- Final resolution: the web file block sets `settings.next.rootDir` to `apps/web/`. A second lint run printed no warning.
- Regression test added? No. The lint-coverage test checks package files, not this Next.js path setting.

## 15. Security/privacy impact

No secrets or account data were added. `POE2_PASSIVE_TREE_SNAPSHOT_DIR` is a filesystem path, and the example value is empty. The checksum check is unchanged. The cached snapshot is frozen so a later caller cannot edit the shared object.

## 16. Performance impact

The pinned tree is parsed on the first `getPinnedPassiveTreeSnapshot` call for a directory. A second call in the same process returns the same object and does not log another load. The unit test checks that the logger runs once across two calls. Parsing itself is still about a few hundred milliseconds for the 5 MB file; that cost is no longer repeated for every consumer.

## 17. Data provenance / reproducibility impact

The pin did not change.

- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Fetched at: `2026-09-26T14:45:00.000Z`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Nodes: 5,152
- Edges: 6,069
- Class starts: 12 records, 6 distinct skill ids

There is still no older snapshot to roll the file back to.

## 18. Known limitations

- The snapshot file still lives under `docs/` for development. A deployment copy step is documented and not implemented.
- Ascendancy names inside `classes[].ascendancies` are not copied onto `classStarts`. At least one of those names is an empty string in the pin, so it was left unnormalized instead of being guessed.
- The cache is per process. Separate server processes each load the file once.
- ESLint for packages is the recommended TypeScript rule set, not the Next.js rule set.
- No graph traversal or optimizer was added.

## 19. Decisions made

- D-013: runtime snapshot directory is explicit. `docs/` is the development pin, not a production default.
- D-014: the validated snapshot is cached and frozen in process memory.
- D-015: class starts keep the export index, export class name, and skill id. Shared start nodes stay shared.

## 20. Deviations from planning docs

The planning note's example used a map from a class name to node ids. The implementation uses a list with `classIndex` because the export gives two names for each start node. A name-only map would hide the index and the shared node.

The snapshot was not moved. The plan allowed keeping it in `docs/` if the production path is an explicit decision. D-013 is that decision.

## 21. Remaining risks

- A future export can add a class with an empty `name`. The raw schema will reject it until we decide how to represent that class.
- If `root` edges and `classStartIndex` diverge, ingestion fails. That is intentional.
- Two processes, or a test that forgets to reset the cache, can observe a snapshot loaded from an earlier directory.

## 22. Rollback notes

Restore `apps/web/eslint.config.mjs`, point `npm run lint` back at the web workspace, and remove `classStarts` from the domain schema and fixtures. Delete the cache module and the new environment variable. The pinned `data.json` can stay.

## 23. Recommended next step

STEP-004 — Passive graph construction.

Build an adjacency graph from the normalized snapshot, including the preserved class starts, and report unknown references. Do not start that step until it is approved.

## 24. Completion statement

STEP-003A satisfies the acceptance criteria. Package TypeScript is linted, class starts from the official export are stored without turning `root` into a passive node, the loader will not silently read `docs/` in production, and a second caller reuses the frozen snapshot. No optimizer logic was added.
