# STEP-018C — Budget-aware upgrade prioritization

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Extra step STEP-018C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Compare explicit item candidates the user already has by one selected measured metric and an explicit acquisition cost, inside a budget that means the most the user would pay for one item.

## 2. Acceptance criteria

- [x] A budget-aware comparison model exists.
- [x] Comparison operates on explicit item candidates, not generated rare items.
- [x] Each candidate is measured through `evaluateItemReplacement`.
- [x] Candidate price has explicit provenance.
- [x] User-entered price is supported.
- [x] Supported economy-derived currency normalization is optional.
- [x] Arbitrary rare-item market prices are never fabricated.
- [x] The user explicitly selects the ranking metric.
- [x] Ranking is metric-specific, not a hidden composite score.
- [x] Candidates outside the budget are clearly marked.
- [x] A missing price does not become zero.
- [x] A missing metric does not become zero.
- [x] Zero and negative benefit are handled explicitly.
- [x] Other metric deltas remain visible beside the selected metric.
- [x] Calculator provenance stays attached per candidate.
- [x] Price provenance stays attached per candidate.
- [x] Estimated, normalized, and user-entered prices are distinguished. Estimated is unused in this step. User-entered same-currency prices are exact-input. Converted prices are normalized.
- [x] At least two explicit item candidates can be compared.
- [x] Cross-slot comparison is allowed only under one selected comparable metric, with a one-at-a-time warning.
- [x] The existing passive heuristic remains unchanged.
- [x] Existing passive and item delta behavior remains unchanged.
- [x] Gear normalization remains unchanged.
- [x] CharacterContext remains unchanged.
- [x] No crafting or trade search is added.
- [x] Default tests require no PoB2 runtime and no live network.
- [x] Required repository checks pass.

## 3. Implementation summary

`@poe2-helper/upgrade-engine` ranks supplied candidates from already measured metric deltas and an explicit price. It does not launch PoB2, parse item text, or call poe.ninja. The web server measures each pasted item with the existing item-replacement evaluator, optionally loads one Divine-to-chaos rate, and then calls the engine. The analysis screen shows the comparison under the character-aware delta after a successful PoB2 import. The ranking sentence names the selected metric and the budget. It does not call an item the best overall or tell the user to buy it.

## 4. Files created

| File                                                             | Purpose                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/upgrade-engine/package.json`                           | Workspace package. Depends only on zod.                      |
| `packages/upgrade-engine/tsconfig.json`                          | Package typecheck.                                           |
| `packages/upgrade-engine/src/policy.ts`                          | Engine version, candidate cap, rankable metrics, currencies. |
| `packages/upgrade-engine/src/compare.ts`                         | Price normalization, eligibility, efficiency, ordering.      |
| `packages/upgrade-engine/src/compare.test.ts`                    | Pure ranking tests.                                          |
| `packages/upgrade-engine/src/index.ts`                           | Public exports.                                              |
| `apps/web/src/server/pob2-session.ts`                            | Shared calculator worker for passive and item measurements.  |
| `apps/web/src/server/compare-upgrades.ts`                        | Server orchestration and display view.                       |
| `apps/web/src/app/upgrade-comparison.tsx`                        | Comparison form and table.                                   |
| `tests/upgrade-comparison.test.ts`                               | Orchestration tests with a fake calculator and a fake rate.  |
| `docs/progress/STEP-018C-budget-aware-upgrade-prioritization.md` | This record.                                                 |

## 5. Files changed

| File                                           | Change                                      |
| ---------------------------------------------- | ------------------------------------------- |
| `package.json`                                 | Typecheck includes the upgrade engine.      |
| `package-lock.json`                            | Workspace install for the new package.      |
| `apps/web/package.json`                        | Depends on `@poe2-helper/upgrade-engine`.   |
| `apps/web/next.config.ts`                      | Transpiles the new package.                 |
| `apps/web/src/app/actions.ts`                  | `compareUpgrades` server action.            |
| `apps/web/src/app/analysis-screen.tsx`         | Renders the comparison after a PoB2 import. |
| `apps/web/src/server/measure-passive-delta.ts` | Uses the shared worker session.             |
| `tests/pob2-calculator.integration.test.ts`    | Opt-in two-helmet Life comparison.          |
| `docs/planning/DECISION_LOG.md`                | D-083.                                      |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`compareUpgradeCandidates` owns eligibility, efficiency, and ordering. `compareSuppliedUpgrades` owns decoding the build, measuring each item, and loading at most one conversion rate. `openCalculator` owns the single PoB2 worker so a passive measurement and an item comparison do not start two processes. `UpgradeComparison` collects pasted items, prices, the budget, and the selected metric, then renders the server's table.

## 8. External APIs / data sources involved

poe.ninja currency exchange, only when the user turns on conversion and the prices are not already in one currency.

- provider: poe.ninja
- endpoint: existing `getExchangeOverview(league, "Currency")`
- community source
- auth: existing `POE2_NINJA_CONTACT` user agent; no new credential
- fields used: `referenceCurrency`, and either the Divine Orb line when the reference is chaos, or the Chaos Orb line when the reference is divine
- cache/rate: unchanged adapter behavior; one fetch per comparison
- fallback: if contact is missing or the fetch fails, measured deltas still return and cross-currency ranking is unavailable

The PoB2 runtime copy is the same local calculator from STEP-018B.1. No new network call is added there.

## 9. Credentials / environment variables

### Added/changed variable names

No new variables. Existing empty example values stay empty:

```dotenv
POB2_CALCULATOR_ENABLED=
POB2_CALCULATOR_DIR=
POE2_NINJA_CONTACT=
```

### Credential status

NOT REQUIRED for the default comparison. A user-entered price does not need poe.ninja. Conversion needs the existing contact string and a league id, and the checkbox is off by default.

## 10. Data model / schema changes

`UPGRADE_ENGINE_VERSION` is 1. A comparison result has the selected metric, the budget, a comparison currency, per-candidate price provenance, the selected metric's before/after/percent, an efficiency of `value` or `not-applicable`, a budget status, rankability, calculator provenance on a successful measurement, and an ordering of candidate ids. There is no score field.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run test:pob2-calculator
npm audit
```

## 12. Automated tests

| Command/Test                   | Result | Notes                                                                                             |
| ------------------------------ | ------ | ------------------------------------------------------------------------------------------------- |
| `npm test`                     | PASS   | 42 files, 295 tests. Includes the pure ranking tests and the fake-calculator orchestration tests. |
| `npm run typecheck`            | PASS   | Includes `@poe2-helper/upgrade-engine`.                                                           |
| `npm run lint`                 | PASS   |                                                                                                   |
| `npm run format:check`         | PASS   |                                                                                                   |
| `npm run test:pob2-calculator` | PASS   | 6 tests, 91.58s. The new test compares two explicit fixture F helmets.                            |
| `npm audit`                    | PASS   | 0 vulnerabilities.                                                                                |

## 13. Manual verification

Headless Chrome imported fixture F. The heuristic path list still showed score 72. Two pasted helmets were compared for Life with a 100 chaos budget. Spike Helm at 40 chaos measured Life 382 → 464 (+21.466%), 5.3665% per 10 chaos, within budget, user-entered price. Lesser Helm at 80 chaos measured Life 382 → 401 (+4.9738%), 0.6217% per 10 chaos, within budget. The headline said Spike Helm has the highest measured Life gain per chaos among these supplied items. Total EHP and Armour stayed visible as other changes. Both rows showed PoB2 0.23.1, tree 0_5, and runtime fingerprint `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`. The page stated that the budget is the most you would pay for one item. The live Path of Building `Build.lua` and `Launch.lua` have no worker marker. The dev server was put back with the calculator off.

## 14. Errors/issues encountered

- The first comparison-table JSX had two sibling elements without a parent, so the page failed to compile. Wrapping them in a fragment fixed it. Regression test: none beyond the typecheck and the browser pass.
- Sorting two unrankable candidates subtracted negative infinity from itself, which is `NaN`, so their order was not stable. The comparator now treats equal sort keys as a tie before subtracting. Covered by the orchestration test that expects the unpriced candidate, which has a measured gain, ahead of the failed and unmeasurable candidates.
- The first typecheck of the orchestration fixture omitted `label` on item identity and the buddy tree commit and checksum on provenance. The fixture was completed. No production change.

## 15. Security/privacy impact

Raw item text and PoB XML stay on the server and are not written to logs. The browser does not call poe.ninja. A conversion request sends a league id to the existing currency overview, not the pasted item. The calculator child environment is unchanged. The comparison feature does not enable the calculator by itself.

## 16. Performance impact

The engine accepts 1 to 10 candidates. The form asks for at least two before the server measures them. One comparison uses the existing worker queue, one build reload per item, and at most one poe.ninja currency request. The opt-in suite, including the new pair, finished in 91.58s. Default tests do not launch PoB2.

## 17. Data provenance / reproducibility impact

Each successful row carries the calculator fingerprint, PoB version, and tree key from the measurement. A user-entered price is labeled "User-entered price". A converted divine price keeps the entered amount and shows the chaos equivalent. The rate sentence states `1 divine = X chaos`, the source, the league, and the fetch time. Measurements that do not share one baseline are not ranked together.

## 18. Known limitations

See Known Limitations below.

## 19. Decisions made

D-083. Explicit candidates only. User-entered price is valid provenance. No automatic rare-item price. Efficiency is for one selected metric. The budget is for one item. The initial rankable allowlist is fixed. `UPGRADE_ENGINE_VERSION` is 1.

## 20. Deviations from planning docs

None. D-082 still says STEP-018C was not started at the time of that decision. That sentence is historical.

## 21. Remaining risks

A user can enter any number as a price, including a number that is not a market price. The label says it is user-entered. Cross-currency ranking depends on one exchange snapshot and is unavailable when that snapshot has no usable chaos/divine rate. Two different slots are compared as separate replacements, and a reader could still add those effects together even though the warning says not to.

## 22. Rollback notes

Remove the upgrade-engine workspace, the comparison action, the section on the analysis screen, and the shared session import. Point `measurePassiveDelta` back at a private worker. No saved data and no live PoB install change need to be reverted.

## 23. Recommended next step

Stop. The next product step is not trade search, crafting, or passive reranking until a later spec says so.

## 24. Completion statement

STEP-018C meets the acceptance criteria. The comparison is metric-specific, the prices are explicit, and the passive heuristic is unchanged.

## Why STEP-018C Is Now Safe

STEP-018B.1 already measures one explicit item replacement and restores the original item. This step only sorts those measurements by one selected percent change and an explicit cost. It does not add a new calculator or a new item parser.

## Upgrade Candidate Model

A candidate is an id, a slot, a label, the raw-text checksum, an optional price, and a measurement. The measurement is either the calculator's metric rows and provenance, or a failure code. The display name is not the identity.

## Candidate Source Policy

The user pastes the item text. The engine does not generate bases, mods, or trade results. Tests may supply a fixture price on a measurement that already happened.

## Price Model

A price is an amount, `chaos` or `divine`, and a source of `user-entered` or `fixture`. Missing, non-finite, and negative amounts are not treated as zero. A zero amount can be within budget but is not used for efficiency.

## User-Entered Price

The form sends the amount and currency the user typed. The table labels it "User-entered price". It is not labeled as a live market price.

## Economy Data Boundary

poe.ninja is used only to convert divine and chaos for a comparison the user opted into. The engine receives a rate, not an HTTP client. If every price and the budget already share one currency, no rate is loaded.

## No Rare-Item Pricing Rule

No code path looks up a pasted rare on poe.ninja or any stash overview. There is no rarity-based or mod-based price guess.

## Price Provenance

Same-currency user input is confidence `exact-input`. A price converted with a rate is confidence `normalized`. Missing price is `unavailable`. The category `estimated` exists for a future provider and is not produced for a user-entered price.

## Budget Model

The budget is the maximum acquisition cost of one candidate. A price equal to the budget is within budget. Over-budget candidates stay in the table and are ranked after within-budget candidates. A negative budget is `comparison-invalid`.

## Comparison Currency

When every price uses the budget currency, that currency is the comparison currency and no chaos rate is invented. When a divine rate is available, the comparison currency is chaos.

## Currency Conversion

The stored direction is chaos per one divine. If the exchange snapshot is referenced in chaos, the Divine Orb line's primary value is used as that rate. If the snapshot is referenced in divine, the Chaos Orb line is the divine price of one chaos, and the chaos-per-divine rate is its reciprocal. Any other reference currency leaves conversion unavailable. The rate is not inverted a second time.

## Primary Metric Policy

The form's ranking control is labeled "Ranking metric" and defaults to Total DPS as an explicit choice. The server rejects a metric outside the allowlist. The build's offensive or defensive objective is not used to pick the metric.

## Initial Rankable Metrics

Total DPS, Combined DPS, Average Hit, Life, Energy Shield, Total EHP, Armour, and Evasion. Higher is better. Resistances and chances stay visible only when they are already in the other-change list of rankable metrics; they are not themselves rankable. Efficiency uses the calculator's percent change. A null percent, including a zero baseline, is not ranked and is not replaced with a manufactured percent.

## Efficiency Formula

For a rankable metric and a positive normalized price, efficiency per currency unit is `percentDelta / normalizedPrice`. The table shows that value times 10, as percent gain per 10 of the comparison currency. A +8% change at 40 chaos is 2% per 10 chaos. A +12% change at 80 chaos is 1.5% per 10 chaos, so the cheaper gain ranks first for that metric. Zero change is efficiency 0. A negative change stays negative.

## Budget Eligibility

`within-budget` when the normalized price is less than or equal to the normalized budget. `over-budget` when it is greater. `price-unavailable` when the price is missing, negative, or cannot be converted. Over-budget candidates remain visible.

## Ranking Policy

Group 1 is within budget with positive efficiency. Group 2 is within budget with zero or negative benefit. Group 3 is over budget and still rankable. Group 4 is missing price, missing percent, zero price, calculator failure, or a currency that could not be normalized. There is no composite score.

## Tie-Break Rules

Inside a group the order is higher efficiency, then higher percent change, then lower normalized price, then candidate id. Unrelated metrics are not tie-breakers. Equal numeric keys are compared with equality before subtraction so two missing values do not become `NaN`.

## Trade-Off Visibility

The table keeps the other rankable metrics beside the selected one. In the browser check, both helmets lost armour and the larger Life gain also had the larger Total EHP gain. The headline still names only Life.

## Comparison Readiness

`ready` when at least two candidates are rankable and every candidate is rankable. `partial` when at least one is rankable and at least one is not. `insufficient` when none are rankable, including a baseline mismatch.

## Upgrade Engine Version

`UPGRADE_ENGINE_VERSION` is 1.

## Package Boundaries

The upgrade engine depends only on zod. It does not import the calculator, the gear engine, or the data sources. The web app measures items and passes plain numbers in.

## PoB2 Delta Integration

Production measurement calls `evaluateItemReplacement` on the shared worker. One candidate failure is stored on that candidate and the others are still measured. Passive delta behavior is unchanged apart from sharing that worker.

## Economy Integration

`chaosPerDivine` reads one currency snapshot. The orchestration tests cover a chaos-referenced Divine Orb line, a divine-referenced Chaos Orb line, and an unusable reference currency. Default tests do not call the live site.

## UI Flow

After a PoB2 analysis, the user enters at least two items, each with a slot, text, label, and optional price, then a one-item budget and a ranking metric. Compare shows "Measuring supplied items…" and then the table. The budget sentence is always shown with a successful comparison.

## Testing Strategy

Default tests cover the 40-chaos versus 80-chaos efficiency example, a metric switch that reverses the order, budget boundaries, missing and zero prices, negative prices, zero and negative benefit, divine conversion without inverting the rate, a missing rate, tie-breaks, calculator failure, baseline mismatch, and the cross-slot warning. Orchestration tests inject the evaluator and the rate loader.

## Opt-In Real PoB2 Comparison

Fixture F, two explicit helmets, fixture prices of 40 and 80 chaos, budget 100 chaos, ranked by Life. No live poe.ninja call. Measured Life percent was 21.465968586387437 for the +80 life helmet and 4.973821989528796 for the +20 life helmet. The +80 helmet ranked first. Both restores passed and the fingerprints matched. The result has no score field.

## Security / Privacy

See section 15. Item text is not logged. The browser does not receive a poe.ninja client.

## Performance

See section 16. The batch sizes from STEP-018B.1 were not increased.

## Known Limitations

This step does not search the trade site, craft an item, combine several replacements under one budget, or rerank passive paths. A rare item has no automatic price. Resistances are not rankable. Currency conversion is optional and fails closed. The calculator stays off unless the process environment enables it. OS-level outbound blocking of the PoB process is still not implemented.

## Crafting Status

No crafting engine behavior was added.

## Future Trade/Search Status

No trade search was added. A later step would have to specify candidate generation and price provenance before either could rank a searched item.
