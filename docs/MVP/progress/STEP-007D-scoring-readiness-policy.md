# STEP-007D — Scoring readiness policy refinement

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-007D  
**Authoring context:** Cursor-assisted development

## 1. Objective

Refine the stat-scoring readiness gate so a high-priority family blocks STEP-008 only when it occurs on current passive-node stats, matters to MVP scoring, is unsupported, and path coverage would not show the gap. Do not change parser semantics and do not implement scoring.

## 2. Acceptance criteria

- [x] Readiness separates support status from presence in the passive-tree domain
- [x] An absent family does not block because the parser lacks a global rule
- [x] Outgoing `less-damage` does not block this pin
- [x] Incoming `less Damage taken` stays defensive and is not outgoing less-damage
- [x] Partial damage conversion stays listed and does not block
- [x] The unsupported conversion line stays visible on a path that contains it
- [x] Path semantic coverage and search completeness stay mandatory and separate
- [x] The STEP-008 comparison rules are documented
- [x] Readiness on the pinned `0.5.5` tree is `ready`
- [x] Existing parser, semantic, coverage, and path tests still pass
- [x] STEP-008 was not started

## 3. Implementation summary

`highPriorityFamilyReport` now records support, whether the family occurs in passive-node `rawStats`, whether a missing line would stay visible, and whether that family blocks. Incoming damage and outgoing less-damage stay separate. `assessStatScoringReadiness` blocks only on families marked `blocking`. On this pin that list is empty, so the status is `ready`. Damage conversion remains `partially-supported`. No score is calculated.

## 4. Files created

| File                                                           | Purpose                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/passive-engine/src/scoring-readiness-policy.test.ts` | Presence, direction, conversion visibility, and blocking tests |
| `docs/progress/STEP-007D-scoring-readiness-policy.md`          | This record                                                    |

## 5. Files changed

| File                                                | Change                                                            |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| `packages/passive-engine/src/semantic.ts`           | Domain-aware family report and readiness gate                     |
| `packages/passive-engine/src/stat-coverage.test.ts` | Pinned readiness is `ready`; hidden-family case stays `not-ready` |
| `packages/passive-engine/src/index.ts`              | Exports `highPriorityFamilyBlocks`                                |
| `packages/passive-engine/README.md`                 | States the ready result and the two reliability fields            |
| `docs/planning/DECISION_LOG.md`                     | D-044 through D-048                                               |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`highPriorityFamilyReport` scans passive-node `rawStats` once per readiness assessment. `highPriorityFamilyBlocks` applies the block rule. `assessStatScoringReadiness` uses blocking families from that report. `pathSemanticCoverage` is unchanged and still reads only the nodes it is given. `searchCompleteness` stays on the path search. data-sources does not decide readiness. This package still does not score.

## 8. External APIs / data sources involved

None. The existing pinned snapshot was read and not changed.

- provider: local file from the grindinggear/poe2-skilltree-export pin
- file: `docs/data-snapshots/passive-tree/data.json`
- official export, no auth
- fields used: node `rawStats`
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call in this step

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`HighPriorityFamilyReport` gained `supportStatus`, `presentInScoringDomain`, `omissionExposed`, `blocking`, and `reason`. `status` remains and matches `supportStatus`. `StatScoringReadiness` gained `familyReports`. No domain schema change. The passive-tree pin is unchanged.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. Dependency files did not change.

## 12. Automated tests

| Command/Test           | Result | Notes                                           |
| ---------------------- | ------ | ----------------------------------------------- |
| `npm test`             | PASS   | 15 files, 91 tests                              |
| `npm run typecheck`    | PASS   | root, web, domain, data-sources, passive-engine |
| `npm run lint`         | PASS   | exit 0                                          |
| `npm run format:check` | PASS   | after this document was formatted               |

Pinned coverage totals are unchanged: 5,963 lines, 4,775 structurally parsed, 2,907 semantically mapped, 1,188 unrecognized, 1,868 structured-but-unmapped. Readiness is `ready`. `damage-conversion` stays partially supported and non-blocking. `less-damage` stays unsupported and absent.

## 13. Manual verification

Checked the pinned conversion node: its raw line includes `Deal no Non-Fire Damage`, path coverage lists that line, and confidence is not `complete`. Checked that `Take 30% less Damage` and `10% less Damage taken` do not mark outgoing less-damage present, and that `Mirages deal 50% less Damage` does when it is placed on a passive node. No browser UI exists for this step.

## 14. Errors/issues encountered

- symptom: typecheck reported `input.highPriorityFamilies` as possibly undefined.
- root cause: a boolean flag did not narrow the optional array.
- resolution: assign the array to a local before filtering it.
- regression test: the readiness tests typecheck.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or new network calls.

## 16. Performance impact

Presence detection walks passive-node stat lines once inside the existing readiness scan. Path coverage still walks only the candidate nodes. Not benchmarked beyond the test suite.

## 17. Data provenance / reproducibility

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. The same nodes produce the same family report.

## 18. Known limitations

Damage-type conversion is still incomplete. The second clause `Deal no Non-Fire Damage` has no semantic representation. A path that allocates that node must not be treated as fully understood. Outgoing less-damage is unsupported if a later pin adds a passive-node line the grammar cannot parse and path coverage cannot show. 1,868 structured lines remain unmapped. Global semantic coverage is 48.8%.

## 19. Decisions made

D-044 scoring domain. D-045 support versus presence. D-046 outgoing less-damage does not block this pin. D-047 partial conversion stays visible and does not block. D-048 the pin is `ready`, and a future score must keep path coverage and search completeness separate. D-043 is superseded in part by D-048.

## 20. Deviations from planning docs

`npm run format` rewrapped `docs/extra steps/STEP-007D-scoring-readiness-policy.md`. That is formatting only. Parser behavior was not changed. The expected readiness result is `ready`.

## 21. Remaining risks

A later score could ignore path confidence and call a higher number on a partial path better than a complete path. A later score could call a truncated search the global optimum. A future tree could add outgoing less-damage; readiness must be rerun on that pin. The fire-conversion node is still only partly understood.

## 22. Rollback notes

Revert the readiness report fields and restore the STEP-007C rule that every `still-unsupported` family blocks. The passive-tree pin does not need to be restored. Parser files do not need to be restored.

## 23. Recommended next step

Do not start STEP-008 until it is explicitly approved. The next planned step is STEP-008 — Configurable heuristic scoring. A score must include path semantic coverage and search completeness, and it must not treat unknown lines as zero.

## 24. Completion statement

STEP-007D is complete. Scoring readiness on the pinned tree is `ready`. STEP-008 was not started.

## Scoring Domain Definition

The domain is passive-node `rawStats` from the pinned PoE2 `0.5.5` tree. Gems, skill descriptions, gear, ascendancy text that is not a current passive-node stat, future trees, Path of Building, and trade data are outside it.

## Family Presence Results

| Family                           | Support                | Present in domain | Blocking |
| -------------------------------- | ---------------------- | ----------------- | -------- |
| more-damage                      | supported-semantically | yes               | no       |
| less-damage                      | still-unsupported      | no                | no       |
| damage-reduction                 | supported-semantically | yes               | no       |
| gain-as-extra                    | supported-semantically | yes               | no       |
| damage-conversion                | partially-supported    | yes               | no       |
| conditional-damage               | supported-semantically | yes               | no       |
| elemental-resistance-penetration | supported-semantically | yes               | no       |
| maximum-resistance               | supported-semantically | yes               | no       |
| reservation                      | supported-semantically | yes               | no       |

`Take 30% less Damage` and `10% less Damage taken` set damage-reduction, not outgoing less-damage. `Mirages deal 50% less Damage` is detected as outgoing less-damage when it is supplied as a passive-node line. On the pin that line is a gem-tab stat, so presence stays false.

## Blocking vs Non-Blocking Families

Blocking families: none.

Non-blocking gaps:

- `less-damage` is unsupported and absent from passive nodes.
- `damage-conversion` is partial and present. The unrecognized conversion line stays in `unsupportedRawLines`.

A family would block if it were present, not supported, and the gap would not appear in path coverage. A missing required semantic family, extraction below 70%, or a missing structural operation still returns `not-ready`.

## Damage Conversion Policy

`75% of Damage Converted to Fire Damage\nDeal no Non-Fire Damage` stays unrecognized. The second clause is not parsed and is not dropped. Cost conversion remains the supported portion. The family is `partially-supported`, present, and non-blocking because path coverage lists the raw line. A path containing that node is not confidence `complete`.

## Path Confidence Contract

Every future scored candidate must include `pathSemanticCoverage`: `semanticCoverageRatio`, `structuralCoverageRatio`, confidence, and `unsupportedRawLines`. Unknown and unmapped lines are not evaluated. They are not stored as amount 0.

- `complete` paths may be compared with other `complete` paths, subject to search completeness.
- A path that is not `complete` may score known effects, and the result must say unsupported effects were not evaluated. A higher number does not prove it is better than a complete path.

## Search Completeness Contract

`searchCompleteness` stays `exhaustive` or `truncated`, separate from semantic confidence. The four combinations remain available: exhaustive and complete, exhaustive and partial, truncated and complete, truncated and partial. A truncated search must not be called the global optimum, the best possible path, or an exhaustive best path. Allowed wording is the highest-scoring path found within search limits. If the path is also semantically incomplete, both limits stay visible.

## Final STEP-008 Readiness

Status: **ready**.

Extraction coverage: 80.1%. Semantic coverage: 48.8%.

Blocking families: none.

`damage-conversion` remains partially supported and visible.

STEP-008 may start after explicit approval. It must not start from this step alone.
