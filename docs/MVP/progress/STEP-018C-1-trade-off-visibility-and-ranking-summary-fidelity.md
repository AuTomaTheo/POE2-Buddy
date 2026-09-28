# STEP-018C.1 — Trade-off visibility and ranking-summary fidelity

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-018C.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Keep every meaningful measured change visible, including metrics that are not allowed to rank candidates, and make the comparison headline name a winner only when a positive within-budget candidate exists.

## 2. Acceptance criteria

- [x] The selected ranking metric remains unchanged in behavior.
- [x] The initial rankable metric allowlist is unchanged.
- [x] All measured non-zero calculator deltas are preserved for display.
- [x] Non-rankable metrics are not dropped from candidate trade-offs.
- [x] Resistance, chance, and resource changes can be displayed without becoming ranking metrics.
- [x] Candidate ordering still uses only the selected rankable metric and the price policy.
- [x] Trade-off visibility does not affect ranking.
- [x] The UI distinguishes the ranking metric from supporting trade-off metrics.
- [x] The headline is safe when no positive within-budget candidate exists.
- [x] The headline is safe when only over-budget positive candidates exist.
- [x] The headline is safe when all candidates are unrankable.
- [x] The headline is safe when the top within-budget candidate has a zero delta.
- [x] Existing price and economy behavior remains unchanged.
- [x] Existing PoB2 delta behavior remains unchanged.
- [x] No trade search, crafting, candidate generation, or composite score was added.
- [x] Default tests remain offline.
- [x] Repository checks pass.
- [x] This progress record exists.

## 3. Implementation summary

Each candidate now carries `displayMetricDeltas` for measured rows whose raw absolute change is non-zero, plus the selected ranking metric even when that change is zero. The comparison result carries a summary state, a winner id, and the counts of ranked and positive within-budget candidates. The headline is built from that state. The table still orders candidates with the STEP-018C groups. Other measured changes are listed beside the selected metric, with signed numbers and the words improved, decreased, or unchanged.

## 4. Files created

| File                                                                             | Purpose      |
| -------------------------------------------------------------------------------- | ------------ |
| `docs/progress/STEP-018C-1-trade-off-visibility-and-ranking-summary-fidelity.md` | This record. |

## 5. Files changed

| File                                          | Change                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/upgrade-engine/src/policy.ts`       | Engine version 2. Display names for visible metrics, separate from the rankable allowlist. |
| `packages/upgrade-engine/src/compare.ts`      | Trade-off rows, summary state, winner id, and a version-2 result schema.                   |
| `packages/upgrade-engine/src/compare.test.ts` | Resistance, resource, summary, and ordering regressions.                                   |
| `packages/upgrade-engine/src/index.ts`        | Exports the new types and schema.                                                          |
| `apps/web/src/server/compare-upgrades.ts`     | Keeps calculator metric labels and renders trade-off text from the engine rows.            |
| `apps/web/src/app/upgrade-comparison.tsx`     | Shows "Ranked by" and the server headline.                                                 |
| `tests/upgrade-comparison.test.ts`            | Percentage-point trade-off text through the server view.                                   |
| `docs/planning/DECISION_LOG.md`               | D-084.                                                                                     |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`displayMetricDeltas` chooses which measured rows are shown. `buildSummary` chooses the summary state and the winner id from positive within-budget candidates, not from the first ordered row. `upgradeComparisonResultSchema` requires engine version 2 and the new fields. The web view formats percentage-point metrics as percentage points and prints the engine's summary lines.

## 8. External APIs / data sources involved

None. No new poe.ninja call and no new PoB2 calculation. Trade-off rows come from metrics the item delta already returned.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`UPGRADE_ENGINE_VERSION` is 2. A successful comparison includes `summaryState`, `winnerCandidateId`, `rankedCandidateCount`, `positiveWithinBudgetCount`, `summaryLines`, and `displayMetricDeltas` on each candidate. A result that claims version 2 without those fields fails schema validation. There is still no score, weight, or importance field.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run test:pob2-calculator
```

## 12. Automated tests

| Command/Test                   | Result | Notes                                                                |
| ------------------------------ | ------ | -------------------------------------------------------------------- |
| `npm test`                     | PASS   | 42 files, 304 tests.                                                 |
| `npm run typecheck`            | PASS   |                                                                      |
| `npm run lint`                 | PASS   |                                                                      |
| `npm run format:check`         | PASS   |                                                                      |
| `npm run test:pob2-calculator` | PASS   | 6 tests, 71.01s. Ordering of the two fixture F helmets is unchanged. |

## 13. Manual verification

Headless Chrome imported fixture F and compared the two explicit helmets by Life. With a 100-chaos budget, Spike Helm at 40 chaos was the within-budget winner: Life 382 → 464 (+21.466%). Its other measured changes included Armour 194 → 144 and Mana 174 → 172, labeled decreased. Mana is not a ranking metric. With the budget set to 1 chaos, both prices were over budget and the headline was: "No supplied candidate provides a positive Life improvement within this budget." It named both items as over budget and did not say either had the highest gain. The heuristic list still showed score 72. The live Path of Building `Build.lua` has no worker marker. The dev server was returned to calculation off.

## 14. Errors/issues encountered

The first browser slice used the earlier page sentence "Fully valued paths are listed first" as the end of the comparison section, so the captured text was empty. The check was rerun from the comparison heading. No product change.

## 15. Security/privacy impact

No new external call. Raw item text and build XML are still not logged. The new rows are numeric deltas already measured for that comparison.

## 16. Performance impact

No extra PoB2 run is used to fill trade-offs. The opt-in suite finished in 71.01s, which is the same class of runtime as the previous comparison suite.

## 17. Data provenance / reproducibility impact

Calculator provenance on each row is unchanged. A visible trade-off is a measured before, after, and raw absolute change. A missing metric is omitted rather than shown as zero.

## 18. Known limitations

See Known Limitations below.

## 19. Decisions made

D-084. Non-rankable measured metrics remain visible. Ranking and trade-off visibility are separate policies. A winner exists only for a positive within-budget rankable result. A no-positive comparison has no winner. `UPGRADE_ENGINE_VERSION` is 2.

## 20. Deviations from planning docs

Partial comparisons keep readiness `partial` and add a sentence such as "2 of 3 supplied candidates could be ranked for Total EHP efficiency." The winner state stays `positive-within-budget` when a positive affordable candidate exists among the ranked ones. The spec allowed the state names to differ.

## 21. Remaining risks

A reader can still treat a decreased resistance as a reason to ignore the selected-metric order. The page states the ranking metric separately so that reading is not presented as the comparison result. Metrics the calculator does not return are still absent.

## 22. Rollback notes

Return `UPGRADE_ENGINE_VERSION` to 1 and remove the summary and display-delta fields if a caller still expects the version-1 shape. No live install change and no saved user data need to be reverted.

## 23. Recommended next step

Stop. After review, choose among trade-integration research, STEP-019 crafting data, passive PoB2 reranking, or skill-metadata enrichment. Do not start one automatically.

## 24. Completion statement

STEP-018C.1 meets the acceptance criteria. Non-zero measured changes stay visible, and the headline names a winner only for a positive within-budget result.

## Why STEP-018C Needed Closure

STEP-018C ranked on a conservative allowlist and listed only those rankable metrics. A resistance or mana loss could disappear. The headline also treated the first ordered row as a positive winner, which is wrong when that row is a loss, a zero change, or over budget.

## Rankable vs Visible Metrics

Rankable metrics remain Total DPS, Combined DPS, Average Hit, Life, Energy Shield, Total EHP, Armour, and Evasion. Visible metrics are the calculator rows that were actually measured. `VISIBLE_METRIC_DISPLAY` supplies labels and units. It is not an input to ordering.

## Visible Trade-Off Policy

A row is shown when its raw `absoluteDelta` is not zero, or when it is the selected ranking metric. Direction is improved, decreased, or unchanged from the sign of that raw delta. Failed measurements get an empty trade-off list.

## Non-Zero Metric Policy

Inclusion uses the raw number before display rounding. A change of 0.00001 is kept. Display formatting falls back to the full number if rounding four decimal places would show zero.

## Percentage-Point Display

Crit chance, hit chance, deflect chance, and the four resistances are shown as before% → after% and an absolute percentage-point change. They do not receive an efficiency percentage.

## Comparison Summary States

`positive-within-budget` when at least one rankable within-budget candidate has a positive selected-metric change. `no-positive-within-budget` when candidates can be ranked but none of those is a positive affordable gain. `no-rankable-candidates` when none can be ranked. A partial comparison is readiness `partial` plus a count sentence.

## Positive Within-Budget Summary

The winner sentence names the candidate, the selected metric, and the comparison currency, and it limits the claim to supplied items within the stated budget.

## No-Positive Summary

The sentence is "No supplied candidate provides a positive {metric} improvement within this budget." An over-budget candidate with a positive selected-metric change can be named as over budget. It is not called the highest gain.

## All-Unrankable Summary

"These candidates cannot be ranked for the selected metric with the available measurements and prices." `winnerCandidateId` is null.

## Partial Comparison Summary

When some candidates are rankable and others are not, the summary includes "{ranked} of {total} supplied candidates could be ranked for {metric} efficiency." The winner, if any, is chosen only from positive within-budget candidates.

## Winner-ID Policy

`winnerCandidateId` is the first positive within-budget candidate in the existing order. It is null when that set is empty, even if `ordering[0]` is a within-budget loss or an over-budget gain.

## Ordering Regression

The 40-chaos +8% Total DPS candidate still ranks ahead of the 80-chaos +12% candidate after Fire Resistance and Mana losses are attached to the cheaper candidate. The Life order in the resistance and resource tests follows Life efficiency only.

## Upgrade Engine Version

`UPGRADE_ENGINE_VERSION` is 2 because the visible result for the same inputs now includes trade-offs and a summary state. Ordering math is unchanged.

## UI Verification

See section 13. The ranking line reads "Ranked by: Life efficiency". Other measured changes use decreased and improved with signed numbers. Mana 174 → 172 stayed visible on the higher-ranked helmet.

## Security / Privacy

See section 15.

## Known Limitations

Trade search, crafting, candidate generation, multi-item optimization, and passive reranking are not part of this step. Resistances are not ranked. A metric the calculator omits is not shown. The budget is still the most you would pay for one item.

## STEP-018 Chain Status

STEP-018 through STEP-018C.1 now cover import, character context, measured explicit changes, explicit cost, metric-specific comparison, and visible trade-offs. That chain should stay frozen unless a real bug or a new requirement reopens it.

## Next-Step Options

After review, the open choices are candidate sourcing or supported trade-integration research, STEP-019 crafting data ingestion, passive PoB2 reranking, or runtime skill-metadata enrichment for CharacterContext. None of those is started here.
