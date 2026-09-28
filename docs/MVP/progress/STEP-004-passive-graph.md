# STEP-004 — Passive graph construction

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 1 / STEP-004  
**Authoring context:** Cursor-assisted development

## 1. Objective

Build a queryable adjacency graph from a normalized passive-tree snapshot. Callers can ask for neighbors of a known node, look up nodes by domain kind, and see structural problems. This step does not search paths, score nodes, or add UI.

## 2. Acceptance criteria

- [x] The graph returns neighbors for any known node
- [x] Disconnected nodes and unknown references are reported
- [x] Reciprocal connections and snapshot edges are checked
- [x] Regular, notable, keystone, and ascendancy membership can be queried from domain kinds
- [x] The graph module has no UI
- [x] Unit tests cover a small fixture and the pinned official tree
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`@poe2-helper/passive-engine` turns a `PassiveTreeSnapshot` into a `PassiveGraph`. `buildPassiveGraph` is the public entry. It keeps the first copy of a duplicate id, drops unknown neighbor ids from the adjacency list, and records those problems on `issues`. Asking for a node that is not in the graph throws. One-way links stay as the node declared them. The reverse link is not invented.

Travel nodes stay the domain kind `small`. `nodesOfKind` filters by that kind list. `isAscendancyMember` is true when a node has `ascendancyId` or the kind `ascendancy-start`. `classStartNodeIds` returns the recorded start ids for a class name, including an id that is missing from the graph. A missing start is also an `unknown-reference` issue.

The pinned tree builds with no unknown references, no one-way links, and no edge mismatches. Twenty-two nodes have no known neighbors and are listed as `isolated-node`. Skill id `0` is not a node, so the omitted export `root` is still outside the graph.

## 4. Files created

| File                                        | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `packages/passive-engine/package.json`      | Workspace package, depends on domain only |
| `packages/passive-engine/tsconfig.json`     | Strict TypeScript check for the package   |
| `packages/passive-engine/src/graph.ts`      | Adjacency graph, issue recording, queries |
| `packages/passive-engine/src/index.ts`      | Public `buildPassiveGraph` entry          |
| `packages/passive-engine/src/graph.test.ts` | Fixture and pinned-tree graph tests       |
| `packages/passive-engine/README.md`         | What the package does and does not do     |
| `docs/progress/STEP-004-passive-graph.md`   | This progress record                      |

## 5. Files changed

| File                            | Change                                                |
| ------------------------------- | ----------------------------------------------------- |
| `package.json`                  | Root typecheck includes `@poe2-helper/passive-engine` |
| `package-lock.json`             | Links the new workspace                               |
| `vitest.config.mts`             | Runs `packages/*/src/**/*.test.ts`                    |
| `packages/README.md`            | Marks the graph package as implemented adjacency only |
| `README.md`                     | Adds the passive-engine layout line                   |
| `docs/planning/DECISION_LOG.md` | D-016                                                 |

## 6. Files deleted

`None`. A temporary isolated-node counter was created while inspecting the pin and removed before this document.

## 7. Important code paths / responsibilities

- `buildPassiveGraph` calls `PassiveGraph.fromSnapshot`. The constructor stays private so callers go through that check.
- `assemblePassiveGraph` builds the maps and the issue list. It is not exported.
- `neighbors` and `node` throw `Unknown passive node ${id}.` when the id was never stored.
- `hasNode` returns false for an unknown id and does not throw.
- `issues` can include `duplicate-node`, `unknown-reference` (`neighbor`, `edge`, or `class-start`), `non-reciprocal`, `edge-mismatch` (`missing-edge` or `edge-without-neighbor-link`), and `isolated-node`.
- Isolated means zero known neighbors after unknown ids are dropped. An ascendancy cluster that is connected inside itself is not an error.
- The package runtime dependency is `@poe2-helper/domain`. `@poe2-helper/data-sources` is a dev dependency so the official-tree test can load the pin. The graph does not read `docs/` itself.

## 8. External APIs / data sources involved

No new download. The graph is built from the STEP-003 pin already normalized by data-sources.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Fields used: normalized `nodes`, `edges`, `classStarts`, and `version`.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

No domain schema change. The graph adds `PassiveGraph`, `PassiveGraphSource`, and `GraphIssue` in the passive-engine package. `PassiveGraphSource` is the snapshot fields `version`, `nodes`, `edges`, and `classStarts`.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm install` also ran the audit and reported 0 vulnerabilities.

## 12. Automated tests

| Command/Test           | Result | Notes                                                                                                                                                           |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 5 files, 20 tests. Adds neighbor lookup, unknown-node throw, unknown and one-way links, missing class start, pinned tree, and the domain-only dependency check. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine                                                                                                             |
| `npm run lint`         | PASS   | Exit code 0. The existing `packages/**/*.ts` lint block covers the new package.                                                                                 |
| `npm run format:check` | PASS   |                                                                                                                                                                 |
| `npm audit`            | PASS   | 0 vulnerabilities, reported by `npm install`                                                                                                                    |

## 13. Manual verification

No UI changed. The pinned-tree test checks Witch and Sorceress both start at skill `54447`, Crystalline Phylactery (`17788`) is both `notable` and `jewel-socket` and counts as an ascendancy member, skill `0` is absent, and the issue list has 22 isolated nodes and no unknown, one-way, or edge-mismatch issues.

## 14. Errors/issues encountered

### Private constructor was called from outside the class

- Symptom: `npm run typecheck` failed with `TS2673: Constructor of class 'PassiveGraph' is private and only accessible within the class declaration` at the `new PassiveGraph` call. Vitest still passed because it does not run the package `tsc` check.
- Root cause: the assemble function lived outside the class and called the private constructor.
- Final resolution: that function now returns the maps and issue list. `PassiveGraph.fromSnapshot` is the only caller of `new PassiveGraph`.
- Regression test added? No. The package typecheck is the guard.

## 15. Security/privacy impact

No secrets, account data, or new environment variables. The graph is an in-memory view of data the caller already loaded.

## 16. Performance impact

Not measured as a budget. Building the graph walks each node, neighbor, and edge once. The pinned-tree unit test does that after the existing snapshot load and finishes inside the same test run (about 3 seconds for all 20 tests).

## 17. Data provenance / reproducibility impact

The pin did not change. The graph copies `version` from the snapshot, including commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`. Neighbor order follows the normalized `neighborIds` order, with duplicate and unknown ids removed.

## 18. Known limitations

- Path search, reachability, point budgets, and scoring are not implemented.
- Isolated nodes are reported and left in the graph. The 22 isolated nodes on this pin include jewel sockets and notables such as Kaom's Blessing (`3663`).
- A class-start id that is missing from `nodes` is still returned by `classStartNodeIds` and also reported.
- One-way links are not repaired. The node that omitted the reverse neighbor does not gain that neighbor.
- Duplicate ids keep the first node and report the later copies.
- `nodesOfKind` reads domain kinds. It does not invent a separate graph classification.

## 19. Decisions made

- D-016: the graph reports structural problems and throws only when a query asks for an unknown node. It does not search paths or score nodes.

## 20. Deviations from planning docs

The architecture file lists frontier detection, route search, and path enumeration under `passive-engine`. The roadmap places that work in STEP-006. This step implements the STEP-004 graph only.

Regular nodes use the existing domain kind `small`, from D-011 and D-012. The graph does not add a second kind named `regular`.

## 21. Remaining risks

- A later export can add isolated nodes or break reciprocity. The graph will still build and list those issues. Callers must read `issues` before treating the adjacency list as complete.
- Path search built on top of one-way links would follow only the declared direction. The current pin has no one-way links.

## 22. Rollback notes

Remove `packages/passive-engine`, drop it from the root typecheck script and the lockfile, and restore the previous Vitest include list if it should name packages one by one. D-016 can be removed from the decision log. Domain and data-sources stay as they were after STEP-003A.

## 23. Recommended next step

STEP-005 — Character/build fixture import.

Load class, level, allocated nodes, and goals from fixtures and check those node ids against this graph. Do not start that step until it is approved. Do not start STEP-006 path search in the same change.

## 24. Completion statement

STEP-004 satisfies the acceptance criteria. A known node returns its neighbors, unknown references and isolated nodes are reported, kinds and ascendancy membership are readable from the domain data, and the graph package has no UI or path search.
