# STEP-012A — Snapshot optimizer compatibility gate

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-012A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Promote a downloaded passive-tree snapshot only when it is structurally valid and compatible with the current optimizer. A schema-valid export is not enough. Do not start STEP-013.

## 2. Acceptance criteria

- [x] A candidate snapshot is normalized before compatibility analysis
- [x] A graph is built from the candidate snapshot before promotion
- [x] Blocking graph diagnostics prevent promotion
- [x] Passive stat coverage is analyzed on the candidate snapshot
- [x] High-priority scoring-readiness rules are run against the candidate snapshot
- [x] Any blocking optimizer-readiness failure prevents promotion
- [x] Non-blocking limitations are reported explicitly
- [x] The compatibility result is deterministic
- [x] The current pin, `previous/`, and changelog stay unchanged when compatibility fails
- [x] A machine-readable compatibility result is available
- [x] The refresh CLI prints a human-readable summary
- [x] Tests run without contacting GitHub
- [x] STEP-012 rollback behavior is unchanged
- [x] Required repository checks pass
- [x] This completion document exists

## 3. Implementation summary

`refreshPassiveTreeSnapshot` still downloads one named commit, parses it, and normalizes it. The refresh command then passes the staged snapshot to `assessPassiveTreeRefreshCandidate`. That function calls `assessPassiveTreeCompatibility`, which builds the passive graph, splits diagnostics with `graphIssueBlocksOptimization`, compares class starts, scans stat coverage, runs `highPriorityFamilyReport`, and lists semantic ids that no scoring profile weights. Promotion runs only when `compatible` is true. data-sources does not import those engines. A failure deletes the staging directory and leaves the current pin, `previous/`, and `changelog.md` untouched. The CLI prints the summary before any promotion line. Rollback still validates the stored previous snapshot and does not apply this gate.

## 4. Files created

| File                                                          | Purpose                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/passive-engine/src/compatibility.ts`                | Deterministic compatibility result and CLI summary       |
| `packages/passive-engine/src/compatibility.test.ts`           | Baseline, graph, class-start, coverage, and family cases |
| `docs/progress/STEP-012A-snapshot-optimizer-compatibility.md` | This record                                              |

## 5. Files changed

| File                                                              | Change                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `packages/passive-engine/src/index.ts`                            | Exports the compatibility assessment                               |
| `packages/scoring-engine/src/profiles.ts`                         | Adds `weightedSemanticIds` from the existing profile tables        |
| `packages/scoring-engine/src/refresh-candidate.ts`                | Connects the compatibility report to the profile id list           |
| `packages/scoring-engine/src/index.ts`                            | Exports the refresh candidate check                                |
| `packages/data-sources/src/passive-tree/refresh-snapshot.ts`      | Promotes only when the supplied compatibility result passes        |
| `packages/data-sources/src/passive-tree/refresh-snapshot.test.ts` | Proves a failed gate leaves the pin, previous files, and changelog |
| `scripts/refresh-passive-tree.ts`                                 | Passes the real compatibility check into the command               |
| `packages/passive-engine/package.json`                            | Test dependency on the scoring engine                              |
| `package-lock.json`                                               | Records those workspace links                                      |
| `scripts/README.md`                                               | Documents the optimizer check                                      |
| `docs/data-snapshots/README.md`                                   | Documents that rollback does not use the new gate                  |
| `packages/data-sources/README.md`                                 | Notes the gate and unchanged rollback                              |
| `README.md`                                                       | Mentions the optimizer check on refresh                            |
| `docs/planning/DECISION_LOG.md`                                   | Adds D-064                                                         |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`assessPassiveTreeCompatibility` owns the report. `graphIssueBlocksOptimization` owns which graph diagnostics block. `highPriorityFamilyReport` owns which high-priority families block. `weightedSemanticIds` owns the list of semantic ids present in a scoring profile. `assessPassiveTreeRefreshCandidate` connects those two. `refreshPassiveTreeSnapshot` owns download, schema validation, and file replacement, and it promotes only when the supplied result is compatible. The command in `scripts/refresh-passive-tree.ts` supplies the real check. `formatPassiveTreeCompatibility` owns the CLI text. The refresh decision uses the `compatible` boolean, not that text.

## 8. External APIs / data sources involved

No new source. The refresh command still downloads one named commit of `https://github.com/grindinggear/poe2-skilltree-export` from `https://raw.githubusercontent.com/grindinggear/poe2-skilltree-export/<commit>/data.json`. No credential. Tests do not call that URL. The approved pin remains version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`.

## 9. Credentials / environment variables

### Added/changed variable names

`None`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

No scoring weights, parser rules, or snapshot schema changes. `PassiveTreeCompatibility` is a new report type. A promoted snapshot's files are unchanged in shape.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm audit
npm run format:check
```

The refresh CLI was exercised through `runPassiveTreeRefreshCli` against temporary directories and injected export bytes. It was not pointed at the approved pin and did not contact GitHub.

## 12. Automated tests

| Command/Test               | Result | Notes                                                                                                                                                                                                                                 |
| -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                 | PASS   | 22 files, 144 tests                                                                                                                                                                                                                   |
| `compatibility.test.ts`    | PASS   | Baseline 0.5.5 passes. Unknown reference, hidden damage conversion, missing class index, and a missing shared class start fail. Exposed less-damage, a coverage drop, a moved class start, and an unweighted mapped id warn and pass. |
| `refresh-snapshot.test.ts` | PASS   | A blocking candidate leaves `data.json`, `manifest.json`, `previous/`, and `changelog.md` byte-for-byte. The CLI prints FAIL and does not print a promotion line. Rollback tests still pass.                                          |
| `npm run typecheck`        | PASS   | Root, web, domain, data-sources, passive-engine, scoring-engine                                                                                                                                                                       |
| `npm run lint`             | PASS   | Exit 0                                                                                                                                                                                                                                |
| `npm run format:check`     | PASS   | Exit 0                                                                                                                                                                                                                                |
| `npm audit`                | PASS   | 0 vulnerabilities. Dependency links changed.                                                                                                                                                                                          |

## 13. Manual verification

No analysis-screen behavior changed, so the browser was not used. The CLI path was checked by the refresh test: a class-index gap prints `FAIL`, lists `Missing expected class index 1.`, says the current snapshot was not changed, and does not print `Promoted`. `git diff` of `docs/data-snapshots/passive-tree` stays empty.

## 14. Errors/issues encountered

- Symptom: `buildPassiveGraph is not a function` during compatibility assessment.
- Root cause: that helper is created in the package entry, and the compatibility module imported it from the graph module, which does not export it.
- Attempts: one.
- Final resolution: the gate calls `PassiveGraph.fromSnapshot`.
- Regression test added? Yes. The compatibility tests build a graph for every case.

Prettier rewrapped `docs/extra steps/STEP-012A-snapshot-optimizer-compatibility.md`. The instructions in that file were not changed.

## 15. Security/privacy impact

Download restrictions are unchanged: a 40-character commit, the official raw host, no credentials, and no caller-supplied URL. The gate reads the downloaded bytes and the current local pin. It does not send them anywhere.

## 16. Performance impact

The scan runs only inside an explicit refresh. It builds one graph and reads every passive stat line on the candidate, and the same for the current pin when one exists. A normal analysis request does not run it.

## 17. Data provenance / reproducibility impact

The approved pin is unchanged. The same candidate and current snapshots produce the same report, including sorted ids and diagnostics. The baseline semantic coverage is 48.8% and the structural coverage is 80.1%. A promoted snapshot still records its own version, commit, and checksum, and recommendations still copy that version into `dataVersion`.

## 18. Known limitations

- Coverage loss does not block promotion.
- A mapped semantic id with no profile weight does not block promotion. Maximum resistance stays unscored.
- A normalized export from the current loader does not itself emit blocking graph diagnostics. The gate still rejects them if a snapshot contains them.
- Only one previous generation is kept.
- The gate does not update fixtures or weights.
- Rollback can restore a snapshot that would fail today's gate.

## 19. Decisions made

D-064. Blocking graph diagnostics and blocking high-priority families stop promotion. Coverage changes, isolated nodes, exposed unsupported mechanics, moved class starts, and unweighted mapped ids warn. Rollback stays on the STEP-012 file check.

## 20. Deviations from planning docs

`assessStatScoringReadiness` also refuses a tree that misses the extraction-coverage target or a required semantic family that is simply absent. This gate does not use that broader status. STEP-012A says absence is not a failure and a coverage drop is not automatically blocking. The blocking family decision stays `highPriorityFamilyBlocks`.

## 21. Remaining risks

A future snapshot can lose a large amount of semantic coverage and still promote, as long as no blocking family or graph diagnostic appears. The operator has to read the warning. Promoting that snapshot without updating fixtures still fails the existing source check at analysis time.

## 22. Rollback notes

`npm run refresh:passive-tree -- --directory <snapshot-dir> --rollback` still restores `previous/` after the stored snapshot loads. It does not reject a previous pin for failing the new gate. A failed compatibility check does not need a data rollback because it does not write the pin. To remove this step's code, delete the compatibility module and the gate call, and drop the new package dependencies. Do not delete `docs/data-snapshots/passive-tree`.

## 23. Recommended next step

STEP-013, community price-data access through poe.ninja, after explicit approval. Do not start it as part of this step.

## 24. Completion statement

STEP-012A satisfies the acceptance criteria. A refresh promotes a snapshot only when the export is valid and the current optimizer gate returns compatible. The approved 0.5.5 pin passes that gate and was not modified.

## Compatibility Pipeline

Download, JSON parse, export normalization, staged checksum load, graph build, graph diagnostics, stat coverage, semantic inventory, high-priority family report, class-start comparison, then promotion only if `compatible` is true.

## Blocking Conditions

- Graph issues other than `isolated-node`, using `graphIssueBlocksOptimization`.
- A class index declared by the export with no start.
- A class start whose node is not in the snapshot.
- A class present on the current pin but missing from the candidate, including a class that shared its start node with another class.
- A high-priority family that `highPriorityFamilyReport` marks blocking.

## Non-Blocking Warnings

- Isolated nodes.
- A class-start node id change, or a newly added class.
- A drop in semantic coverage.
- A present high-priority family that is unsupported or partial while its omission stays visible.
- New or removed semantic ids, and new unmapped or unrecognized patterns, compared with the current pin.
- Mapped semantic ids that no scoring profile contains.

## Graph Gate

`PassiveGraph.fromSnapshot` builds the candidate graph. Blocking and non-blocking diagnostics are stored separately. The approved pin has blocking diagnostics of length 0.

## Class-Start Gate

Class starts come from the candidate export. They are not copied from the previous pin. A missing index or a disappeared class blocks. A start that moves to another existing node is `node-changed` and does not block.

## Semantic Coverage Comparison

The report records total lines, structurally parsed lines, semantic lines, unrecognized lines, structured-but-unmapped lines, and one-decimal ratios from `passiveStatSemanticCoverage`. When a current pin exists, it also records the deltas. The baseline ratios are structural 80.1% and semantic 48.8%, with a semantic delta of 0 against itself.

## High-Priority Family Report

The nine families from STEP-007D are reported with support status, presence, omission exposure, blocking, and reason. On the approved pin, none block. Maximum resistance remains represented and non-blocking. A synthetic `10% of Life Converted to Damage` line is partial damage conversion whose gap is not visible, so it blocks. `10% less [Attack] and Cast Damage` stays visible and does not block.

## New Mechanic Inventory

Against a current snapshot, the report lists new semantic ids, removed semantic ids, new structured-unmapped family ids, and new unrecognized family ids. Those lists are empty when the candidate is the approved pin compared with itself. They do not block on their own.

## Scoring-Profile Compatibility

`weightedSemanticIds` is the union of semantic ids in the offensive, defensive, and balanced profiles. Candidate ids outside that union are `mappedButUnweighted`. The approved pin includes `maximum-cold-resistance` there. No weight was added.

## Promotion Atomicity / File-Safety Behavior

The gate runs after the candidate is staged in `incoming/` and before `previous/` is replaced. On failure, `incoming/` is removed. `data.json`, `manifest.json`, `previous/`, and `changelog.md` stay byte-for-byte as they were. The CLI prints `FAIL` and the blocking reasons, and it does not print a promotion line.

## Baseline 0.5.5 Result

The approved pin compared with itself is compatible. Blocking reasons are empty. Class changes are empty. Semantic coverage is 48.8%. Structural coverage is 80.1%. The summary contains `PASS`.

## Synthetic Failure Cases

Unknown neighbor 99 blocks. A missing class index blocks. A missing shared Sorceress start blocks. Hidden damage conversion blocks and leaves an existing temporary pin unchanged. Exposed less-damage, a coverage drop, a moved Witch start, and an unweighted maximum-life id pass with warnings.

## Rollback Behavior

Rollback still requires `previous/` to load with the existing checksum and schema check, then swaps it with the current pin. It does not call `assessPassiveTreeCompatibility`.

## STEP-013 Readiness

The passive-tree refresh can now refuse a snapshot the optimizer cannot safely consume. Price data is still absent. STEP-013 is the next planned step and was not started.
