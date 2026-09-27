# STEP-005A — Pre-implementation validation

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 1 / STEP-005A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the validation gate that must pass before any reachability or path enumeration. Compare a build fixture with the selected passive-tree snapshot, keep `pointBudget` as a nonnegative integer, and refuse optimization when the class, passive ids, source pin, or graph connectivity are unsafe.

## 2. Acceptance criteria

- [x] Matching fixture and tree versions are accepted
- [x] Mismatched fixture and tree versions are detected
- [x] A fractional `pointBudget` is rejected
- [x] Unknown allocated passive ids block optimization readiness
- [x] Unknown weapon-set passive ids block optimization readiness
- [x] Unknown class names block optimization readiness
- [x] Blocking graph issues prevent the readiness gate from opening
- [x] Isolated-node issues do not close the gate for an otherwise valid main-tree fixture
- [x] The current Witch and Warrior fixtures stay ready for the supported main-tree scope
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`compareGameDataSources` reports whether a fixture `sourceVersion` and a tree `version` are the same pin. Source, version, and commit must all be present and equal. If both sides have a checksum, those must be equal too. A missing version or commit is not treated as a match. `fetchedAt` is ignored, so a second copy of the same commit does not look incompatible.

`BuildGoals.pointBudget` was already `z.number().int().nonnegative()`. A regression test rejects `3.5` and `-1`.

`assessOptimizationReadiness` takes a fixture and a `PassiveGraph`. It is `not-ready` when the class name is missing from `classStarts`, any shared or weapon-set id is missing from the graph, the sources are incompatible, or a blocking graph issue is present. `requireOptimizationReadiness` throws `OptimizationNotReadyError` in that case. It does not search paths.

`isolated-node` is diagnostic. `duplicate-node`, `unknown-reference`, `non-reciprocal`, and `edge-mismatch` block. The pinned tree's 22 isolated nodes stay listed, and both current build fixtures are still `ready`.

This gate covers main-tree structure only. It does not decide ascendancy access, weapon-set legality, or how many points a level or quest grants.

## 4. Files created

| File                                                | Purpose                                              |
| --------------------------------------------------- | ---------------------------------------------------- |
| `packages/domain/src/source-compatibility.ts`       | Fixture and tree pin comparison                      |
| `packages/domain/src/source-compatibility.test.ts`  | Match, mismatch, and missing provenance tests        |
| `packages/passive-engine/src/readiness.ts`          | Ready / not-ready gate and graph-issue policy        |
| `packages/passive-engine/src/readiness.test.ts`     | Blocking issues, isolated nodes, and pinned fixtures |
| `docs/progress/STEP-005A-optimization-readiness.md` | This progress record                                 |

## 5. Files changed

| File                                   | Change                                                            |
| -------------------------------------- | ----------------------------------------------------------------- |
| `packages/domain/src/index.ts`         | Exports the source comparison                                     |
| `packages/domain/src/domain.test.ts`   | Rejects a fractional and a negative `pointBudget`                 |
| `packages/domain/README.md`            | Documents the integer budget and source comparison                |
| `packages/passive-engine/src/index.ts` | Exports the readiness gate                                        |
| `packages/passive-engine/README.md`    | States the main-tree limit and that path search must use the gate |
| `packages/data-sources/README.md`      | Notes that the load report does not start optimization            |
| `docs/planning/DECISION_LOG.md`        | D-018                                                             |

## 6. Files deleted

`None`.

## 7. Important code paths / responsibilities

- `compareGameDataSources` lives in domain. It does not read files or the graph.
- `graphIssueBlocksOptimization` is the only classification of graph issues. A new issue kind fails the typecheck until this switch classifies it.
- `assessOptimizationReadiness` recomputes class, id, source, and graph checks from the fixture and graph. It does not trust the data-sources load report, so skipping that report cannot open the gate.
- `requireOptimizationReadiness` throws when status is `not-ready`. STEP-006 must call it before enumerating paths. This step does not add path enumeration.
- Fixture loading still belongs to data-sources. The passive engine still does not fetch data.

## 8. External APIs / data sources involved

No new download. The Witch and Warrior fixtures are still the STEP-005 files, checked against the STEP-003 pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`SourceCompatibility` records `compatible`, the fixture and tree version, commit, and source, and a list of reasons. `OptimizationReadiness` is `ready` or `not-ready`, with `blockers`, diagnostic graph issues, and the compatibility result.

`pointBudget` was already a nonnegative integer. The schema text did not change.

No database change. The build fixture files were not edited.

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

| Command/Test           | Result | Notes                                                                                                                                                                                                                   |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 8 files, 35 tests. Adds source match and mismatch, missing version or commit, fractional `pointBudget`, blocking graph issues, an isolated node that stays diagnostic, unknown class and ids, and both pinned fixtures. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine. The first run failed; see section 14.                                                                                                                              |
| `npm run lint`         | PASS   | Exit code 0 after the unused-variable fix.                                                                                                                                                                              |
| `npm run format:check` | PASS   |                                                                                                                                                                                                                         |

## 13. Manual verification

No UI changed. The pinned-fixture test checks that both build files are `ready` against the development snapshot, that compatibility names version `0.5.5` and the STEP-003 commit, and that the 22 isolated nodes remain diagnostic.

## 14. Errors/issues encountered

### Package typecheck failed on the readiness test

- Symptom: `tsc` reported that `@poe2-helper/domain` has no exported member `PassiveGraphSource`, and `buildPassiveGraph` then looked like it was called without nodes. Vitest had already passed.
- Root cause: `PassiveGraphSource` is a passive-engine type. The test imported it from domain, so the helper parameter type collapsed.
- Final resolution: the test imports `PassiveGraphSource` from `./graph`.
- Regression test added? No. The package typecheck is the guard.

### Lint rejected discarded provenance fields

- Symptom: ESLint reported `_version` and `_commit` as unused.
- Root cause: the missing-field cases used destructuring only to omit those fields.
- Final resolution: the test builds the partial version objects directly.
- Regression test added? No.

## 15. Security/privacy impact

No secrets, account data, or network calls. The gate reads objects the caller already has.

## 16. Performance impact

Not measured as a budget. Readiness walks the fixture's passive ids and the graph issue list once. The pinned-tree test also builds the graph that STEP-004 already builds.

## 17. Data provenance / reproducibility impact

The tree pin and the two build fixtures did not change. A fixture is compatible with that pin only when source, version `0.5.5`, and commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36` all match. Differing checksums also fail when both sides include one. A different `fetchedAt` does not.

## 18. Known limitations

- No path is enumerated. The gate only refuses or allows a later search.
- Readiness does not mean a legal PoE2 build. Unmodeled rules include ascendancy access, ascendancy point budgets, weapon-set specialization legality, quest passive points, and passive points derived from character level.
- The Witch fixture still stores `Infernalist` and does not allocate that ascendancy. The gate does not read the ascendancy string.
- Unknown ids stay on the character. The load report from STEP-005 is unchanged. Optimization is blocked only when the readiness function is used.
- Isolated nodes remain in the graph. They do not by themselves close the gate.

## 19. Decisions made

- D-018: optimization starts only from `requireOptimizationReadiness`. Isolated nodes are diagnostic. The other current graph issues block. Source compatibility requires source, version, and commit, and does not compare `fetchedAt`.

## 20. Deviations from planning docs

The roadmap's example `sourceCompatibility` object did not include reasons, source strings, or checksums. The implementation adds those so a mismatch is explicit and a missing version cannot pass as compatible.

`OptimizationReadiness` is the name used in the roadmap. `requireOptimizationReadiness` is the refusal point. Path enumeration itself remains STEP-006, which this step does not start.

## 21. Remaining risks

- A STEP-006 function that searches without calling `requireOptimizationReadiness` would bypass the gate. The passive-engine readme states that call as required.
- A new graph issue kind will not compile until `graphIssueBlocksOptimization` classifies it. That is intentional.
- Two snapshots can share a commit string and still differ if their checksums were omitted. When both checksums are present, a difference blocks.

## 22. Rollback notes

Delete `source-compatibility.ts`, `readiness.ts`, and their tests. Remove the new exports, the `pointBudget` assertions, and D-018. The integer schema on `BuildGoals` can stay, because it was already there in STEP-005.

## 23. Recommended next step

STEP-006 — Reachability and legal path enumeration.

Call `requireOptimizationReadiness` before searching, and limit the search to the main passive tree. Do not start that step until it is approved.

## 24. Completion statement

STEP-005A satisfies the acceptance criteria. Matching pins are accepted, mismatched pins and unsafe fixture or graph data are not ready, a fractional point budget is rejected, and the Witch and Warrior fixtures remain ready for a later main-tree search. No path search was added.
