# STEP-008 — Configurable heuristic scoring

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-008  
**Authoring context:** Cursor-assisted development

## 1. Objective

Score passive paths with explicit heuristic weights, a contribution breakdown, and the reliability fields required by the PRE-008 guardrails. Do not calculate DPS or EHP, and do not start the next roadmap step.

## 2. Acceptance criteria

- [x] The public scorer returns more than a number
- [x] Unknown stats stay visible and are not added as zero
- [x] A higher score on a partial path is not a definitive win
- [x] Search completeness stays separate from semantic confidence
- [x] Weights live in offensive, defensive, and balanced profiles
- [x] Increased, reduced, and added stay distinct, and unsafe operations stay unscored
- [x] Conditional stats do not get a full unconditional value
- [x] Derived deflection is not scored as increased or flat deflection
- [x] Equal scores use a documented tie-break
- [x] An empty path and an empty candidate list are defined
- [x] The same input produces the same score

## 3. Implementation summary

`scorePassivePath` reads each node's raw stats, scores the effects the active profile can value, and attaches path semantic coverage, semantic confidence, unsupported raw lines, and the search completeness it was given. `compareScoredCandidates` refuses a definitive winner when confidence or valuation differs, or when the search was truncated. Profiles are data. The scoring function looks up weights. It does not embed objective numbers.

## 4. Files created

| File                                                       | Purpose                                    |
| ---------------------------------------------------------- | ------------------------------------------ |
| `packages/scoring-engine/package.json`                     | Workspace package                          |
| `packages/scoring-engine/tsconfig.json`                    | Typecheck for the package                  |
| `packages/scoring-engine/src/profiles.ts`                  | Offensive, defensive, and balanced weights |
| `packages/scoring-engine/src/score.ts`                     | Path score and breakdown                   |
| `packages/scoring-engine/src/compare.ts`                   | Reliability-aware comparison and tie-break |
| `packages/scoring-engine/src/index.ts`                     | Public exports                             |
| `packages/scoring-engine/src/score.test.ts`                | Guardrail tests                            |
| `docs/progress/STEP-008-configurable-heuristic-scoring.md` | This record                                |

## 5. Files changed

| File                                | Change                                |
| ----------------------------------- | ------------------------------------- |
| `packages/scoring-engine/README.md` | Describes the heuristic result        |
| `package.json`                      | Typecheck includes the scoring engine |
| `packages/README.md`                | Notes that scoring-engine has code    |
| `README.md`                         | Says the heuristic score is not DPS   |
| `docs/planning/DECISION_LOG.md`     | D-049 through D-052                   |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`scoringProfile` returns one weight table. `scorePassivePath` owns the sum and the breakdown. `pathSemanticCoverage` still comes from the passive engine and still sees only the nodes it is given. `compareScoredCandidates` and `selectScoredCandidates` own the claim. The passive engine still does not decide desirability. data-sources still only loads pins and fixtures.

## 8. External APIs / data sources involved

None. The pinned snapshot and the Witch fixture were read and not changed.

- provider: local pin and `packages/data-sources/fixtures/builds/witch-offensive.json`
- official export, no auth
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

New package types: `ScoringProfile`, `OperationWeights`, `ScoredCandidate`, `ScoreComparison`, and `ScoreComparisonClaim`. Domain `CandidatePath` was not changed. The passive-tree pin is unchanged. No new dependency versions were added. The scoring package depends on the existing domain and passive-engine packages.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency version changed.

## 12. Automated tests

| Command/Test           | Result | Notes                                  |
| ---------------------- | ------ | -------------------------------------- |
| `npm test`             | PASS   | 16 files, 101 tests                    |
| `npm run typecheck`    | PASS   | includes `@poe2-helper/scoring-engine` |
| `npm run lint`         | PASS   | exit 0                                 |
| `npm run format:check` | PASS   | after this document was formatted      |

## 13. Manual verification

Checked the formula on `10% increased Spell Damage` with the offensive increased weight 2, which scores 20. Checked that adding `8% increased [Attack] and Cast Speed` does not change that 20 and that the raw line is listed. Checked that `20% more Damage`, a while-on-full-life line, and deflection-from-evasion contribute 0 with `supported: false`. No browser UI exists for this step.

## 14. Errors/issues encountered

- symptom: the Witch path test guessed the score and point cost.
- root cause: those values had not been measured.
- resolution: locked the measured result, heuristic score 16 at 1 point.
- regression test: yes.

- symptom: the full test suite timed out the lint-coverage test at 5 seconds.
- root cause: ESLint startup took about 8 seconds while other tests loaded the passive-tree pin at the same time. Alone, the same test finishes in about 3 seconds.
- resolution: that test's timeout is 20 seconds. The assertions are unchanged.
- regression test: yes, `npm test` runs it with the rest of the suite.

- symptom: typecheck rejected a readonly stat list assigned to `rawStats`.
- root cause: the domain field is a mutable string array.
- resolution: the test copies the list before scoring.
- regression test: yes, the scoring tests typecheck.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or new network calls. No LLM is called.

## 16. Performance impact

Scoring walks the stat lines of the nodes it is given. It does not scan the rest of the tree. Not benchmarked beyond the test suite.

## 17. Data provenance / reproducibility

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. The same nodes, profile, and search completeness produce the same score.

## 18. Known limitations

More, less, penetration, conversion, gain-as-extra, derived stats, chance, regeneration, and conditional lines are visible and unscored. Global semantic coverage is still 48.8%. A path can have a finite heuristic score while `valuationComplete` is false. This is not a combat simulation.

## 19. Decisions made

D-049 the public result is never score-only, and comparison uses `heuristicScore`. D-050 operation weights and unscored operations. D-051 conditionals are unscored. D-052 mixed confidence is not definitive, truncated search uses the within-limits claim, and ties break by confidence rank, point cost, then node ids.

## 20. Deviations from planning docs

The score does not subtract an unsupported-mechanic penalty. Unsupported lines are omitted from the sum and kept visible, which matches the guardrail that unknown is not zero.

## 21. Remaining risks

A caller can ignore `definitive` and sort by `heuristicScore` alone. Derived deflection is still not calculated, so a defensive score can miss that relationship. Conditional offense and defense are absent from the number even when the player expects them to be active.

## 22. Rollback notes

Remove `packages/scoring-engine` source, drop it from the root typecheck script, and restore the README sentences that said scoring was not implemented. The passive-tree pin does not need to be restored.

## 23. Recommended next step

Do not start STEP-009 until it is explicitly approved. The next planned step is STEP-009 — Top-K recommendation engine. It should rank with `selectScoredCandidates` and keep the claim, the breakdown, and the data version.

## 24. Completion statement

STEP-008 is complete. Heuristic scoring follows the PRE-008 guardrails. STEP-009 was not started.

## Scoring Formula

For each semantically mapped effect:

```text
weight = profile.weights[semanticId][operation]
contribution = amount * weight
```

`weight` is used only when the operation is `increased`, `reduced`, or `added`, the profile has a number for it, and the effect has no unscored condition or scope. Otherwise the contribution is recorded with `supported: false` and is not added.

```text
heuristicScore = sum of supported contributions
scorePerPoint = heuristicScore / pointCost
```

When `pointCost` is 0, `scorePerPoint` equals `heuristicScore`. Ranking uses `heuristicScore` only.

## Weight Profiles

`offensive`, `defensive`, and `balanced` are tables in `profiles.ts`. Increased and reduced on the same id are opposite signs and are written in the table. Added uses a different number, or `null` when flat is not valued. Editing a number changes later scores without a code change in `scorePassivePath`.

## Operation Handling

| Operation                                                                              | Treatment                  |
| -------------------------------------------------------------------------------------- | -------------------------- |
| increased                                                                              | profile `increased` weight |
| reduced                                                                                | profile `reduced` weight   |
| added                                                                                  | profile `added` weight     |
| more, less, penetration, conversion, gain-as-extra, derived-from, chance, regeneration | unscored                   |

## Conditional Stat Policy

Conditions and the scopes `while`, `if`, `when`, `against`, `with`, `for`, and `per` are unscored. There is no configurable always-active factor. Actor scopes can still be scored when the semantic id has a weight.

## Path Comparison Policy

Definitive only when every candidate is semantically `complete`, valuation-complete, and the search is `exhaustive`. The higher `heuristicScore` wins. If confidence or valuation differs, the claim is `not-definitive` and `preferred` is null. A truncated search of otherwise complete paths uses `best-path-found-within-search-limits`.

## Tie-Break Policy

When heuristic scores are equal and the comparison is definitive: higher semantic-confidence rank, then lower point cost, then ascending node-id text. No weapon, ascendancy, or other gameplay preference is used.

## Semantic Coverage Contract

Each scored candidate includes `pathSemanticCoverage`, `semanticConfidence`, and `unsupportedRawLines`. Unrecognized and unmapped lines are omitted from the sum. They are not given amount 0. A mapped effect that cannot be valued stays in `contributions` with `supported: false`.

## Search Completeness Contract

`searchCompleteness` is copied from the path search onto the candidate. It is not stored inside semantic confidence. Truncated results must not be called the global optimum, the best possible path, or an exhaustive best path.

## Known Unscored Effects

More and less damage, penetration, conversion, gain-as-extra, chance, regeneration, conditional and scoped lines in the qualifier list, semantic ids missing from the active profile, and `Gain Deflection Rating equal to N% of Evasion Rating`. That derived line stays `deflection-from-evasion` and is not `N` deflection.

## Pinned Fixture Examples

The first path from `witch-offensive.json` on the `0.5.5` pin, scored with the offensive profile, costs 1 point and has heuristic score 16. Its `searchCompleteness` is the search result's value, and its semantic confidence is a separate field. `10% increased Spell Damage` on the offensive profile scores 20. The same line plus an unrecognized attack-and-cast line still scores 20, with that raw line listed and confidence no longer `complete`.
