# STEP-003 — Official passive-tree ingestion

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 1 / STEP-003  
**Authoring context:** Cursor-assisted development

## 1. Objective

Pin the official GGG PoE2 passive-tree export, validate that JSON, and convert it into the internal `PassiveTreeSnapshot`.

## 2. Acceptance criteria

- [x] The full current tree parses successfully
- [x] The parser fails loudly on incompatible schema changes
- [x] The snapshot version is displayed or logged

## 3. Implementation summary

`@poe2-helper/data-sources` reads a local copy of `data.json` from the official `poe2-skilltree-export` repository. A manifest next to that file records the commit, the version string from that commit, the fetch time, and a sha256 checksum. The loader refuses the file when the checksum does not match.

The adapter checks the export shape with Zod, then builds undirected neighbors from each node's `in` and `out` lists. Those links are checked against the export's `edges` array. The result is a domain `PassiveTreeSnapshot`.

The pinned tree has 5,152 skill nodes and 6,069 edges. Loading it logs one line with the source, version `0.5.5`, commit, checksum, node count, and edge count.

## 4. Files created

| File                                                                  | Purpose                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/data-sources/package.json`                                  | Adapter workspace package                                                 |
| `packages/data-sources/tsconfig.json`                                 | Strict typecheck for the adapter                                          |
| `packages/data-sources/README.md`                                     | What the adapter owns                                                     |
| `packages/data-sources/src/index.ts`                                  | Public exports                                                            |
| `packages/data-sources/src/passive-tree/raw-schema.ts`                | Zod schema for the official export                                        |
| `packages/data-sources/src/passive-tree/normalize.ts`                 | Converts the export into domain types                                     |
| `packages/data-sources/src/passive-tree/load-pinned-snapshot.ts`      | Reads the pinned file, checks the checksum, and logs the version          |
| `packages/data-sources/src/passive-tree/load-pinned-snapshot.test.ts` | Full-tree and malformed-data tests                                        |
| `docs/data-snapshots/passive-tree/data.json`                          | Pinned official export                                                    |
| `docs/data-snapshots/passive-tree/manifest.json`                      | Commit, version, fetch time, and checksum                                 |
| `.gitattributes`                                                      | Keeps `data.json` bytes stable so the checksum does not change on Windows |
| `docs/progress/STEP-003-passive-tree-ingestion.md`                    | This progress record                                                      |

## 5. Files changed

| File                                                | Change                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `package.json`                                      | Typecheck now includes `@poe2-helper/data-sources`                                    |
| `package-lock.json`                                 | Workspace link for the new package                                                    |
| `vitest.config.mts`                                 | Runs the adapter tests                                                                |
| `.prettierignore`                                   | Leaves the 5 MB export unformatted                                                    |
| `README.md`                                         | Mentions the adapter and the snapshot folder                                          |
| `packages/README.md`                                | Notes that the passive-tree adapter exists                                            |
| `docs/data-snapshots/README.md`                     | Describes the pinned tree                                                             |
| `packages/domain/src/passive-tree.ts`               | `kinds` and `sourceFlags` replace the single `kind` field. Reference checks use maps. |
| `packages/domain/fixtures/passive-tree.sample.json` | Sample nodes use `kinds` and `sourceFlags`                                            |
| `packages/domain/README.md`                         | Explains multiple kinds                                                               |
| `docs/planning/DECISION_LOG.md`                     | Added D-012                                                                           |

## 6. Files deleted

None kept. Temporary inspection scripts used while reading the export were removed.

## 7. Important code paths / responsibilities

- `parseSkillTreeExport` accepts the official JSON and throws if required fields or known flags do not match.
- An `is*` flag that is not on the known list fails the parse. Other unknown keys are ignored so a new optional text field does not block ingestion.
- `normalizeSkillTreeExport` turns skill ids, stat lines, positions, ascendancy ids, and connections into domain nodes and edges.
- `loadPinnedPassiveTreeSnapshot` is the function later steps should call. It does not download anything.
- The domain package still has no network or UI code. The adapter depends on the domain package and Zod.

## 8. External APIs / data sources involved

- Provider: Grinding Gear Games `poe2-skilltree-export`.
- Repository: https://github.com/grindinggear/poe2-skilltree-export
- File: `data.json` at commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`.
- Official source. No credential and no OAuth scope.
- Version string on that commit: `0.5.5`. The newest GitHub release tag at pin time was `0.5.2`, which is older than this commit, so the pin follows the commit rather than that tag.
- Fetched once on 2026-09-26. Checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`.
- Fields consumed: `nodes`, `edges`, and on each skill node `skill`, `name`, `stats`, `in`, `out`, `x`, `y`, `ascendancyId`, and the known `is*` flags.
- The placeholder root node and edges whose endpoint is `"root"` are not copied into the passive graph.
- No request is made when the app or tests load the snapshot.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`PassiveNode.kind` was replaced by `kinds`, a list, because skill `17788` ("Crystalline Phylactery") is both a notable and a jewel socket. `sourceFlags` keeps recognized non-structural flags such as `isBlighted`.

The raw export schema is new and lives in the adapter, not in the domain package.

No database.

## 11. Commands executed

```bash
curl.exe -L --fail -o docs/data-snapshots/passive-tree/data.json https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/bd87e6512c92b868542eddfb1ba4ea8b6dc2da36/data.json
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

## 12. Automated tests

| Command/Test               | Result | Notes                                                                                                                                             |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | PASS   | 3 files, 11 tests. The pinned tree test checks 5,152 nodes, 6,069 edges, the Phylactery kinds, the Grenade Damage self-link, and the version log. |
| `npm run typecheck`        | PASS   | Root, web, domain, and data-sources                                                                                                               |
| `npm run lint`             | PASS   | ESLint still covers `apps/web` only                                                                                                               |
| `npm run format:check`     | PASS   | The large `data.json` is excluded                                                                                                                 |
| `npm audit` during install | PASS   | 0 vulnerabilities                                                                                                                                 |

## 13. Manual verification

No page changed, so the browser was not used. The version is logged by `loadPinnedPassiveTreeSnapshot` and stored on `snapshot.version`. The test captures that log line. The home page does not show it yet.

## 14. Errors/issues encountered

### Node links did not match the edges array

- Symptom: the first full-tree parse threw `Passive tree export node links do not match the edges array`. The counts were 6,069 links and 6,070 edges. The extra edge was `35653-35653`.
- Root cause: skill `35653`, named "Grenade Damage", lists itself in `in` and `out`. The export also has one edge from that skill to itself.
- Attempts: the comparison treated that self-link as a normal edge, while the neighbor builder did not keep a node as its own neighbor.
- Final resolution: self-links are skipped, counted as `skippedSelfEdges=1`, and the node keeps its real neighbors. The domain rule that a node cannot neighbor itself stays in place.
- Regression test added? Yes. The pinned-tree test expects the skip count and expects Grenade Damage not to list itself.

## 15. Security/privacy impact

The snapshot is public game data. No account, token, or secret is read. The checksum check rejects a swapped file before normalization. Unexpected `is*` flags fail instead of being ignored.

## 16. Performance impact

Parsing the pinned 5 MB file and validating the graph took about 180 ms in the unit test on this machine. Domain reference checks now use maps so the full tree does not scan the node list for every edge.

## 17. Data provenance / reproducibility impact

There was no previous snapshot. This is the first pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Fetched at: `2026-09-26T14:45:00.000Z`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Result: 5,152 nodes and 6,069 edges
- Rollback: restore the previous `docs/data-snapshots/passive-tree` folder. There is no older folder yet, so rollback means deleting this pin and the adapter.

Every normalized snapshot copies those manifest fields into `version`. The fetch time does not change on later reads.

## 18. Known limitations

- The home page does not display the version. The loader logs it.
- Class-start edges that only touch the export's `"root"` placeholder are omitted. Class start nodes themselves remain.
- The Grenade Damage self-link is omitted.
- Groups, classes, jewel slot metadata, skill overrides, icons, and granted attributes are not normalized yet.
- A new optional field that does not start with `is` is ignored. A new `is*` flag fails the parse.
- ESLint does not lint this package.
- The web app does not call the loader yet.

## 19. Decisions made

D-012: structural kinds are a list, and non-structural flags are kept on `sourceFlags`.

The root placeholder and self-links are not passive edges. Both are counted in the log so they are not dropped silently.

## 20. Deviations from planning docs

The architecture sketch had one `kind` value. D-012 replaces that with `kinds` because the real export contains a combined notable and jewel socket.

The snapshot version is logged and stored on the result. It is not drawn in the UI. The analysis screen is still STEP-010.

## 21. Remaining risks

- A future export can add an `is*` flag and the parser will stop until that flag is classified.
- Connections that are not symmetric between `in`, `out`, and `edges` will fail the load. That is intentional.
- The pinned commit can fall behind the live game until someone updates the snapshot on purpose.

## 22. Rollback notes

Delete `packages/data-sources` implementation files, `docs/data-snapshots/passive-tree`, and `.gitattributes` if it only exists for this file. Restore the single `kind` field only if D-012 is also reverted. The sample domain fixtures would then need `kind` again.

## 23. Recommended next step

STEP-004 — Passive graph construction.

Build an adjacency graph from `PassiveTreeSnapshot`, classify neighbors, and report unknown references. Do not start that step until it is approved.

## 24. Completion statement

STEP-003 satisfies the acceptance criteria. The pinned official tree parses, incompatible flags and checksum mismatches throw, and the loader logs the snapshot version.
