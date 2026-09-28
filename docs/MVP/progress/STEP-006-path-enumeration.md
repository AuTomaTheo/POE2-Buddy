# STEP-006 — Reachability and legal path enumeration

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-006  
**Authoring context:** Cursor-assisted development

## 1. Objective

Enumerate connected main-tree passive paths from a ready build fixture. Each path stays within the fixture point budget. The same set of nodes is returned once. Ascendancy and weapon-set rules stay out of the search. The search does not score paths.

## 2. Acceptance criteria

- [x] Generated paths are connected and legal under the implemented main-tree rules
- [x] No path costs more than the fixture point budget
- [x] Tests cover branches, duplicate routes, unreachable nodes, and cycles
- [x] The search refuses to run when optimization readiness fails
- [x] A hard search limit stops large budgets and large result sets
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`enumerateMainTreePaths` calls `requireOptimizationReadiness` and then searches. The class start is the origin. Allocated main-tree nodes are part of that origin only when they connect back to the class start through other allocated main-tree nodes. Anything allocated but disconnected is listed and is not used as a root.

A path is an ordered list of new nodes. Each node must touch the origin or an earlier node in that path. Each new node costs one point. Paths longer than `goals.pointBudget` are not returned. Two orders of the same nodes collapse to one path. Neighbor ids are expanded in ascending order, so the kept order is stable.

Ascendancy members are excluded. Ids that appear only in `set1`, `set2`, or `set3` are excluded and are not treated as already allocated. The result scope is `main-passive-tree`.

The default limits are a point budget of 5, 500 paths, and 20,000 expansions. A fixture budget above 5 throws `PathSearchLimitError`. Hitting the path or expansion cap returns the paths already found and sets `truncated`.

## 4. Files created

| File                                              | Purpose                                         |
| ------------------------------------------------- | ----------------------------------------------- |
| `packages/passive-engine/src/path-search.ts`      | Main-tree frontier and bounded path enumeration |
| `packages/passive-engine/src/path-search.test.ts` | Branch, cycle, budget, and pinned-fixture tests |
| `docs/progress/STEP-006-path-enumeration.md`      | This progress record                            |

## 5. Files changed

| File                                   | Change                                           |
| -------------------------------------- | ------------------------------------------------ |
| `packages/passive-engine/src/index.ts` | Exports the search                               |
| `packages/passive-engine/README.md`    | Describes the main-tree search and its limits    |
| `packages/passive-engine/package.json` | Description no longer says path search is absent |
| `packages/README.md`                   | Notes that scoring is still later                |
| `README.md`                            | Layout line for passive-engine                   |
| `docs/planning/DECISION_LOG.md`        | D-019                                            |

## 6. Files deleted

`None`.

## 7. Important code paths / responsibilities

- `requireOptimizationReadiness` still decides whether a search may start. The search function does not duplicate that policy.
- `enumerateMainTreePaths` owns the frontier, the connected allocation, and the candidate paths. It does not read files and it does not score.
- `frontierNodeIds` are the main-tree nodes adjacent to the connected allocation before any new node is taken.
- `disconnectedAllocatedIds`, `ignoredAscendancyIds`, and `ignoredWeaponSetIds` explain what the search left out.
- `PathSearchLimitError` is the refusal for a budget above the cap. `truncated` is the stop for the path and expansion caps.
- Domain `CandidatePath` still includes a heuristic score. This step does not fill that type.

## 8. External APIs / data sources involved

No new download. The Witch and Warrior fixtures are searched on the STEP-003 pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`

The exact path lists in the unit tests use a small hand-built graph, not guesses about the official tree.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`MainTreePath` is `{ nodeIds, pointCost }`. `MainTreePathSearch` adds the scope, budget, frontier, paths, truncation flag, expansion count, the ignored id lists, and warnings.

No domain schema change. No database change. The build fixtures were not edited.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Dependencies did not change, so `npm audit` was not run again. The previous audit reported 0 vulnerabilities.

## 12. Automated tests

| Command/Test           | Result | Notes                                                                                                                                                                                                                                                                           |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 9 files, 43 tests. Adds branches, a deduped two-node order, an unreachable node, a cycle that does not repeat a node, a disconnected allocation, ascendancy and weapon-set exclusion, a path cap, a budget above 5, a not-ready graph, a zero budget, and both pinned fixtures. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine                                                                                                                                                                                                                             |
| `npm run lint`         | PASS   | Exit code 0                                                                                                                                                                                                                                                                     |
| `npm run format:check` | PASS   |                                                                                                                                                                                                                                                                                 |

## 13. Manual verification

No UI changed. The small-graph expectations were checked by the unit test: from class start `1` with budget 2 the paths are `[2]`, `[3]`, `[2, 3]`, and `[2, 4]`. Node `9` is two steps past `4` and is absent at budget 2. Node `5` is isolated. Node `6` is an ascendancy start. The pinned Witch and Warrior searches return at least one path, stay within their budgets, and match on a second call.

## 14. Errors/issues encountered

None. The first run of the path-search tests passed.

## 15. Security/privacy impact

No secrets, account data, or network calls. The search uses the fixture and graph already in memory.

## 16. Performance impact

The default caps are 5 points, 500 paths, and 20,000 expansions. The full suite, including both pinned fixtures searched twice, finished in about 4 seconds. A budget above 5 is rejected instead of being searched.

## 17. Data provenance / reproducibility impact

The tree pin did not change. The same fixture and graph return the same path list. Path order follows ascending neighbor ids, then point cost.

## 18. Known limitations

- This is main-tree connectivity only. It does not apply ascendancy access, ascendancy point budgets, weapon-set specialization legality, quest passive points, or points derived from character level.
- Every new node costs one point. Nodes flagged `isFree` are not treated as free.
- Jewel sockets are ordinary main-tree nodes when they are not ascendancy members. No jewel rule is applied.
- Weapon-set-only ids are omitted entirely. A main-tree node that could be reached only through one of those ids is not offered.
- An allocated main-tree node that does not connect to the class start does not extend the frontier.
- A search can stop at 500 paths or 20,000 expansions before every combination within the budget is listed. `truncated` reports that stop.
- Paths are not scored and are not ranked.

## 19. Decisions made

- D-019: main-tree path search charges one point per new node, excludes ascendancy members and weapon-set-only ids, dedupes by node set, and stops at the default caps. It does not score.

## 20. Deviations from planning docs

The domain recommendation type `CandidatePath` includes a heuristic score and contributions. STEP-006 does not use it, because filling a score would be scoring. The search returns `MainTreePath` instead. STEP-008 can attach scores later.

The architecture note allows beam search and shortest-path caches. This step uses a bounded breadth-first enumeration with hard caps. It does not rank or prune by score, because there is no score yet.

## 21. Remaining risks

- A five-point search on a larger allocation can hit the 500-path cap and omit later combinations. Callers must read `truncated`.
- Treating every node as one point will be wrong for any node the export marks free, until that rule is verified and implemented.
- Excluding weapon-set ids means the search will not recommend those nodes even when a later rule would allow them as normal passives.

## 22. Rollback notes

Delete `packages/passive-engine/src/path-search.ts` and its test, and remove the exports from the package index. D-019 can be removed from the decision log. The readiness gate from STEP-005A stays.

## 23. Recommended next step

STEP-007 — Stat extraction and normalization.

Parse passive stat text into normalized stats without dropping unknown stats. Do not start that step until it is approved. Scoring remains STEP-008.

## 24. Completion statement

STEP-006 satisfies the acceptance criteria for main-tree reachability. Paths are connected, they do not exceed the point budget, duplicate orders collapse, unreachable nodes and cycles are covered, and a search does not start when the readiness gate is closed. The result is not a full PoE2 legality claim and it is not a score.
