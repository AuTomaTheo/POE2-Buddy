# STEP-009 — Top-K recommendation engine

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-009  
**Authoring context:** Cursor-assisted development

## 1. Objective

Rank enumerated passive paths under the PRE-009 guardrails. Fully valued paths form the Top-K. Paths whose full value is unknown stay in a separate list. Do not start the next roadmap step.

## 2. Acceptance criteria

- [x] Complete and incomplete candidates are separate in the result
- [x] The complete Top-K uses `heuristicScore` and the existing tie-break
- [x] A higher score on a partial path is not a definitive win
- [x] Search completeness stays separate from semantic confidence
- [x] A truncated search is not called a global optimum
- [x] Maximum resistance was inspected and left unscored
- [x] Derived deflection stays valuation-incomplete
- [x] Unsupported effects stay on the result
- [x] The public result keeps scored candidates, the claim, and version metadata
- [x] K of 0, 1, and larger than the complete set are defined
- [x] An empty complete set is not filled with an incomplete path
- [x] The same input returns the same order
- [x] Required repository checks pass

## 3. Implementation summary

`recommendScoredCandidates` splits scored paths. Paths with semantic confidence `complete` and `valuationComplete` true are sorted and sliced to K. Every other path is returned with `fullValueUnknown: true`. `recommendMainTreePaths` enumerates a fixture, scores those paths with one profile, and recommends. `recommendMainTreeObjectives` enumerates once and scores the offensive, defensive, and balanced profiles. The sort helper stays inside the package. The public result is not a list of node ids.

## 4. Files created

| File                                                    | Purpose                                       |
| ------------------------------------------------------- | --------------------------------------------- |
| `packages/scoring-engine/src/recommend.ts`              | Top-K split, claims, and fixture entry points |
| `packages/scoring-engine/src/recommend.test.ts`         | Guardrail and pinned-fixture tests            |
| `docs/progress/STEP-009-top-k-recommendation-engine.md` | This record                                   |

## 5. Files changed

| File                                     | Change                                             |
| ---------------------------------------- | -------------------------------------------------- |
| `packages/scoring-engine/src/compare.ts` | Shared candidate order used by selection and Top-K |
| `packages/scoring-engine/src/index.ts`   | Exports the recommendation API                     |
| `packages/scoring-engine/README.md`      | Describes the two lists                            |
| `packages/README.md`                     | Notes Top-K recommendations                        |
| `README.md`                              | Notes Top-K recommendations                        |
| `docs/planning/DECISION_LOG.md`          | D-058 through D-060                                |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`enumerateMainTreePaths` still only enumerates. `scorePassivePath` still only scores. `recommendScoredCandidates` owns the split, the K slice, and the claim. `compareCandidateOrder` owns the sort and is not re-exported from the package index. The passive engine still does not decide desirability. The domain `Recommendation` sample from STEP-002 is unchanged.

## 8. External APIs / data sources involved

None. The pinned snapshot and the Witch and Warrior fixtures were read and not changed.

- provider: local pin and the two build fixtures
- official export, no auth
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

New scoring-engine types: `PassivePathRecommendation`, `RecommendationClaim`, `RankedCompleteCandidate`, and `IncompleteRecommendationCandidate`. No domain type changed. No weight changed, so `SCORING_PROFILE_VERSION` stays 1. The passive-tree pin is unchanged. No dependency version changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency file changed.

## 12. Automated tests

| Command/Test           | Result | Notes                                  |
| ---------------------- | ------ | -------------------------------------- |
| `npm test`             | PASS   | 18 files, 121 tests                    |
| `npm run typecheck`    | PASS   | includes `@poe2-helper/scoring-engine` |
| `npm run lint`         | PASS   | exit 0                                 |
| `npm run format:check` | PASS   | after this document was formatted      |

## 13. Manual verification

Checked the pinned maximum-resistance lines and classified them before choosing to leave them unscored. Checked the Witch offensive Top-K nodes, scores, and claim against a direct run. Checked the Warrior defensive result has an empty complete list. No browser UI exists for this step.

## 14. Errors/issues encountered

- symptom: an inventory assertion treated every `maximum-*` id as maximum resistance.
- root cause: `maximum-life` and `maximum-energy-shield` are already weighted families.
- resolution: the assertion looks for a maximum-resistance id.
- regression test: yes.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or new network calls. No LLM ranks paths or fills in missing stat values.

## 16. Performance impact

A recommendation scores each enumerated path once per profile. The three-objective helper enumerates once. The Witch fixture at budget 5 produced 311 paths. Not benchmarked beyond the test suite.

## 17. Data provenance / reproducibility impact

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. Each recommendation copies that version and profile version 1. The same fixture, pin, budget, profile, K, and search limits produce the same order.

## 18. Known limitations

Maximum resistance, life regeneration, derived deflection, and the other STEP-008 unscored operations stay out of the numeric sum. Many real paths are therefore incomplete. The incomplete list can be long because K does not drop those paths. Near-duplicate paths are all kept. This is not DPS or EHP.

## 19. Decisions made

D-058 maximum resistance stays unscored and profile version stays 1. D-059 the Top-K contains only fully valued paths, and incomplete paths stay visible with `fullValueUnknown: true`. D-060 the claim names the reliability limit, and a truncated search is not a global optimum. Ranking stays on `heuristicScore` under D-057.

## 20. Deviations from planning docs

The MVP roadmap mentions preventing near-duplicate recommendations where possible. PRE-009 defines the order as heuristic score plus the existing tie-break and forbids an extra gameplay preference. No similarity rule was specified, so this step does not drop paths that share nodes.

The STEP-002 domain `Recommendation` sample still has the earlier path shape. The live Top-K result is the scoring-engine type, which carries both lists, coverage, confidence, and the claim.

## 21. Remaining risks

A caller can still sort `incompleteCandidates` by `heuristicScore` and present that as a winner. The Witch search returns 309 incomplete paths beside 2 complete ones, so a UI that shows only the complete list will hide most of the search. Global semantic coverage is still partial.

## 22. Rollback notes

Remove `recommend.ts` and `recommend.test.ts`, drop the new exports, and restore the inline sort in `compare.ts`. The weight tables and the passive-tree pin do not need to be restored.

## 23. Recommended next step

Do not start STEP-010 until it is explicitly approved. The next planned step is STEP-010 — Minimal analysis screen. It should call this recommendation API and show the claim, both lists, and the data version. It should not contain its own ranking.

## 24. Completion statement

STEP-009 is complete. Top-K ranking follows the PRE-009 guardrails. The next roadmap step was not started.

## Ranking Policy

Fully valued candidates are ordered by `heuristicScore` descending. `scorePerPoint` is reported on each candidate and is not the sort key. Incomplete candidates are ordered with the same keys so the list is stable. That order does not mean one incomplete path outranks another, and it does not mix them into the complete list.

## Complete vs Incomplete Candidate Policy

A candidate is complete when `semanticConfidence` is `complete` and `valuationComplete` is true. Search completeness is not part of that test. A truncated path can still sit in the complete list, with the claim and `searchCompleteness` saying the search stopped early.

Every other candidate is incomplete. Each one has `fullValueUnknown: true`, its known heuristic score, semantic coverage, confidence, unsupported raw lines, point cost, node ids, and search completeness. K does not remove them. If the complete set is empty, `rankedCompleteCandidates` stays empty.

## Maximum Resistance Decision

Option B. No weights were added. Profile version stays 1.

The pin contains 28 maximum-resistance lines:

- 3 unconditional player lines: node `9928` is `+1%` maximum cold resistance, node `56988` is `+1%` maximum lightning resistance, and node `59759` is `+10%` maximum chaos resistance.
- 8 minion lines. An actor scope can still be scored, so a new weight would value those lines as well.
- 4 `while` lines. D-051 would leave them unscored even with a weight.
- 13 unrecognized or unmapped lines, including totem, support-gem, and recent-hit wording.

A single added weight would treat `+1%` and `+10%` as the same unit and would also score minion maximum resistance. That is not a safe heuristic. Mapped lines stay in `contributions` with `supported: false`. Unrecognized lines stay on `unsupportedRawLines`. Either way the path is routed to `incompleteCandidates`.

## Tie-Break Policy

After equal heuristic scores: higher semantic-confidence rank, then lower point cost, then ascending node-id text. No weapon, ascendancy, or duplicate-path preference is applied. Among fully valued paths the confidence rank does not change the order, because those paths are already `complete`.

## K Edge Cases

| Case                           | Result                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| K = 0                          | `rankedCompleteCandidates` is empty. Incomplete paths are still returned. `definitive` is false.                             |
| K = 1                          | At most one complete path is returned.                                                                                       |
| K larger than the complete set | Every complete path is returned. No placeholder is added.                                                                    |
| No candidates                  | Both lists are empty. The claim is `no-candidates`.                                                                          |
| Only incomplete candidates     | The complete list is empty. The claim is `no-complete-candidate`.                                                            |
| Mixed                          | Complete paths are sliced to K. Incomplete paths stay in the other list. The claim is `not-definitive-incomplete-valuation`. |

A negative K throws `RangeError`.

## Search Completeness Contract

`searchCompleteness` on the recommendation is `truncated` when the search says so or any candidate says so. Otherwise it is `exhaustive`. It is not stored inside semantic confidence. A truncated complete set uses the claim `highest-scoring-complete-path-found-within-search-limits`. That wording is the best complete path found within search limits. It is not a global optimum, the best possible path, or an exhaustive best path.

## Semantic Confidence Contract

Each candidate keeps `semanticConfidence`, `pathSemanticCoverage`, and `valuationComplete`. A path can be semantically `complete` and still be valuation-incomplete when a mapped effect has no weight. The Warrior fixture's highest known incomplete path is that case: life regeneration is mapped and unscored, while armour on the same path is scored.

## Recommendation Claim Rules

| Situation                                                                     | Claim                                                       | `definitive` |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------ |
| No candidates                                                                 | `no-candidates`                                             | false        |
| Candidates exist and none are fully valued                                    | `no-complete-candidate`                                     | false        |
| At least one fully valued path and at least one incomplete path               | `not-definitive-incomplete-valuation`                       | false        |
| Every path is fully valued and the search is truncated                        | `highest-scoring-complete-path-found-within-search-limits`  | false        |
| Every path is fully valued, the search is exhaustive, and K is greater than 0 | `highest-scoring-complete-path-among-enumerated-candidates` | true         |

When a search is truncated and incomplete paths also exist, the claim names the incomplete valuation. `searchCompleteness` still says `truncated`.

## Version/Reproducibility Metadata

Each result includes `dataVersion` from the graph and `profileVersion` from the profile. Candidates whose profile id or profile version disagree with the request are rejected. The same build, tree pin, point budget, objective, profile version, K, and search limits produce the same ordering.

## Pinned Fixture Examples

Profile version 1. Tree version 0.5.5. Both searches were `exhaustive` inside the search limits. That does not make an incomplete set a global optimum.

| Fixture                  | Profile   | K   | Claim                                 | Complete paths returned                                | Incomplete paths |
| ------------------------ | --------- | --- | ------------------------------------- | ------------------------------------------------------ | ---------------- |
| `witch-offensive.json`   | offensive | 3   | `not-definitive-incomplete-valuation` | 2                                                      | 309              |
| `witch-offensive.json`   | defensive | 3   | separate result                       | the first complete path differs from the offensive one | present          |
| `warrior-defensive.json` | defensive | 3   | `no-complete-candidate`               | 0                                                      | 41               |

The first Witch offensive complete path is nodes `1755`, `41965`, point cost 2, heuristic score 32. Both contributions are `8%` increased Spell Damage at weight 2. The second complete path is node `1755` alone, point cost 1, score 16. The first Witch defensive complete path is nodes `44871`, `30346`, `34006`, `15408`, `2254`, point cost 5, heuristic score 112.5, from energy shield and intelligence. It is not the offensive path.

The first Warrior incomplete path, in stable known-score order, is nodes `4665`, `61534`, `7721`, point cost 3, known heuristic score 22.5, semantic confidence `complete`, `valuationComplete` false. Armour contributes 21. Three life-regeneration lines are mapped, `supported: false`, and contribution 0. The path is not promoted into the complete list.
