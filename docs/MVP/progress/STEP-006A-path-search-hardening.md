# STEP-006A — Path-search hardening

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-006A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden main-tree path search before stat extraction or scoring. Inspect the pinned export's `isFree` flag without guessing its point cost, stop search when a shared allocation is disconnected from the class start, and make a truncated search impossible to describe as exhaustive or globally optimal.

## 2. Acceptance criteria

- [x] Every `isFree` node on the pinned PoE2 `0.5.5` snapshot was inspected and documented
- [x] The project does not guess what `isFree` means in game
- [x] No zero-cost rule was added, because the export does not state a point cost
- [x] Paths do not include `isFree` nodes, and an allocated `isFree` node stops the search
- [x] A disconnected shared allocation throws instead of continuing
- [x] Weapon-set-only ids are not treated as that disconnected-allocation error
- [x] `searchCompleteness` distinguishes exhaustive from truncated results
- [x] `candidateSelectionClaim` never returns a globally optimal claim
- [x] Regression tests cover the new behavior, and the STEP-006 path cases still pass
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

Outcome B from the step note applies. The export does not say whether `isFree` means zero passive points. `passiveNodePointCost` returns 1 for every node that lacks the flag and throws `UnpricedPassiveNodeError` for a node that has it. Search excludes `isFree` neighbors and records them on `excludedUnpricedNodeIds`. If one of those nodes is part of the class-start-connected shared allocation, the search throws instead of dropping it.

`DisconnectedAllocationError` stops the search when a shared main-tree allocation does not connect to the class start. The error lists the ids. Weapon-set-only ids and ascendancy allocations are not this error.

`searchCompleteness` is `exhaustive` when `truncated` is false and `truncated` when the path or expansion cap stops the walk. `candidateSelectionClaim` returns `highest-scoring path among enumerated candidates` only for an exhaustive search, and `best path found within search limits` for a truncated one.

## 4. Files created

| File                                               | Purpose              |
| -------------------------------------------------- | -------------------- |
| `docs/progress/STEP-006A-path-search-hardening.md` | This progress record |

## 5. Files changed

| File                                              | Change                                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/passive-engine/src/path-search.ts`      | Point-cost function, disconnected-allocation error, unpriced-node handling, completeness claim |
| `packages/passive-engine/src/path-search.test.ts` | `isFree`, disconnected allocation, caps, and pinned-node tests                                 |
| `packages/passive-engine/src/index.ts`            | Exports the new errors and cost helpers                                                        |
| `packages/passive-engine/README.md`               | Describes the hardened search                                                                  |
| `docs/planning/DECISION_LOG.md`                   | D-020, D-021, and D-022                                                                        |

## 6. Files deleted

`None`. Temporary inspection scripts used to read `isFree` nodes were removed before this document.

## 7. Important code paths / responsibilities

- `enumerateMainTreePaths` still calls `requireOptimizationReadiness` first. There is no second public search entry.
- `DisconnectedAllocationError` is the shared-allocation integrity check. It runs before enumeration.
- `passiveNodePointCost` and `calculatePathPointCost` are the only point-cost rules. Search records `pointCost` from `calculatePathPointCost`.
- `UnpricedPassiveNodeError` is thrown for an `isFree` node that is already inside the connected shared allocation. Neighbor `isFree` nodes are excluded and listed instead.
- `candidateSelectionClaim` is the contract for later scoring. It does not rank paths.

## 8. External APIs / data sources involved

No new download. The `isFree` inspection used the STEP-003 pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`

The raw export contains exactly three nodes with `isFree: true`. No other node carries that key. None of them is on the main passive tree. Each connects to a class start only by passing through its ascendancy start. The export has no numeric point-cost field on these nodes.

| Skill id | Name               | Kind    | Ascendancy  | Neighbors                                            | Other export metadata                                                                                                                                                                                    |
| -------- | ------------------ | ------- | ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8415     | Sanguimancy        | notable | `Witch2`    | 7, all `Witch2`, including Blood Mage `59822`        | Stats grant Life Remnants. `grantedSkill` is present and marked `verified: false`. No `unlockConstraint`. Group 993, orbit 6. Path to class start: Sanguimancy, Blood Mage, WITCH `54447`.               |
| 9988     | Smith's Masterwork | notable | `Warrior3`  | 13, all `Warrior3`, including Smith of Kitava `5852` | Stats restrict body armour and add armour per connected notable. No `grantedSkill` or `unlockConstraint`. Group 47, orbit 0. Path to class start: Smith's Masterwork, Smith of Kitava, MARAUDER `47175`. |
| 28254    | Sacred Unity       | notable | `Huntress2` | 1: Spirit Walker `63493`                             | `unlockConstraint.nodes` lists `41401`, `62743`, and `46070`. No `grantedSkill`. Group 1591, orbit 3. Path to class start: Sacred Unity, Spirit Walker, RANGER `50459`.                                  |

That graph position shows they are ascendancy notables. It does not say they cost zero points. Sanguimancy's granted skill is explicitly unverified in the file.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`MainTreePathSearch` now includes `searchCompleteness` and `excludedUnpricedNodeIds`. The success result no longer includes `disconnectedAllocatedIds`. Those ids are on `DisconnectedAllocationError` instead.

`CandidateSelectionClaim` is the allowed later wording for a selected path. No domain schema change. The build fixtures were not edited.

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

| Command/Test           | Result | Notes                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 9 files, 45 tests. Adds the three pinned `isFree` nodes, an excluded `isFree` neighbor, an allocated `isFree` node that throws, a disconnected shared id that throws, a distant weapon-set id that does not throw, `maxPaths` truncation, and `maxExpansions` truncation. Branch, cycle, duplicate-order, unreachable, zero-budget, budget-cap, readiness, and ascendancy tests still pass. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine                                                                                                                                                                                                                                                                                                                                         |
| `npm run lint`         | PASS   | Exit code 0                                                                                                                                                                                                                                                                                                                                                                                 |
| `npm run format:check` | PASS   |                                                                                                                                                                                                                                                                                                                                                                                             |

## 13. Manual verification

No UI changed. The three `isFree` rows in section 8 were read from the pinned `data.json` before the cost policy was chosen. The unit test checks the same ids, names, ascendancy ids, and notable kind on the normalized snapshot.

## 14. Errors/issues encountered

None in the test run. `npm run format` also rewrapped the untracked notes under `docs/extra steps`. Those files are not part of the search implementation.

## 15. Security/privacy impact

No secrets, account data, or network calls. The inspection read the local pin.

## 16. Performance impact

Not measured as a new budget. The caps from STEP-006 are unchanged. The full suite still finished in about 4 seconds.

## 17. Data provenance / reproducibility impact

The pin did not change. The `isFree` count is three nodes on commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`. A later pin can add a main-tree `isFree` node. The search will exclude it or throw if it is allocated, rather than inventing a cost.

## 18. Known limitations

- `isFree` still has no verified point cost. Excluding those nodes is not a claim that they are free or that they cost one point.
- Ascendancy access, weapon-set legality, quest points, and points from level are still not modeled.
- `exhaustive` means every path allowed by the current main-tree rules for that budget. It does not mean every legal PoE2 build.
- A truncated search can omit later combinations. Callers must use `candidateSelectionClaim` before describing a selected path.

## 19. Decisions made

- D-020: `isFree` is not treated as zero cost. Unpriced nodes are excluded or block the search.
- D-021: a disconnected shared allocation throws `DisconnectedAllocationError`. This supersedes the continue-search behavior in D-019.
- D-022: a truncated search is not an exhaustive or globally optimal result.

## 20. Deviations from planning docs

The step allowed either a new completeness field or a clearer boolean. Both are present: `truncated` remains, and `searchCompleteness` matches it.

The public result no longer carries `disconnectedAllocatedIds` on success. The ids move to the thrown error so a caller cannot read them and keep going.

## 21. Remaining risks

- A future export could use `isFree` for a real zero-cost main-tree node. This policy would hide that node until the flag is verified and D-020 is replaced.
- Sacred Unity's `unlockConstraint` is stored only in the raw export. It is not a domain field, and this step does not enforce it.
- Later scoring can still ignore `candidateSelectionClaim` unless STEP-008 calls it.

## 22. Rollback notes

Restore the STEP-006 path-search module and its test, and remove D-020, D-021, and D-022. That returns the behavior that reports disconnected ids and continues, and that charges one point for every new node without an `isFree` check.

## 23. Recommended next step

STEP-007 — Stat extraction and normalization.

Do not start that step until it is approved. Scoring remains STEP-008 and must respect D-022.

## 24. Completion statement

STEP-006A satisfies the acceptance criteria. The three pinned `isFree` nodes are documented and are not given a guessed point cost. A disconnected shared allocation stops the search. A truncated result cannot be labeled exhaustive or globally optimal through `candidateSelectionClaim`. No stat parsing or scoring was added.
