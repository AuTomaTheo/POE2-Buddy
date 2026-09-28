# STEP-022A — MVP final integration and exit validation

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** MVP exit review  
**Authoring context:** Cursor-assisted development

## 1. Objective

Decide whether the repository satisfies the current MVP, with deferred and post-MVP limits left in place.

## 2. Acceptance criteria

- [x] Canonical checks pass.
- [x] The Witch fixture, PoB2 import, gear, upgrade, craft, and explanation flows were exercised.
- [x] Unsupported and deferred capabilities stay labeled or fail closed.
- [x] No score, weight, ranking, or provider was changed.
- [x] The exit status is one pair: MVP COMPLETE and PRODUCTION-LAUNCH NOT READY.

## 3. Implementation summary

This step is a review. No optimizer, weight, crafting mechanic, trade search, language-model provider, or OAuth credential was added. The only repository edits are the roadmap status, the polish register, the README status, and this record.

## 4. Files created

| File                                                               | Purpose      |
| ------------------------------------------------------------------ | ------------ |
| `docs/progress/STEP-022A-mvp-final-integration-exit-validation.md` | Exit record. |

## 5. Files changed

| File                                        | Change                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/planning/MVP_ROADMAP.md`              | Records the exit status and the STEP-021, STEP-022, and STEP-023 state. |
| `docs/planning/POST-MVP-POLISH-REGISTER.md` | Checks the exit list and adds the 2026-09-28 review.                    |
| `README.md`                                 | States the local MVP status.                                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

No product code changed. The review used the existing analysis page, PoB2 import, character-aware delta, upgrade comparison, craft target planner, and deterministic explainer.

## 8. External APIs / data sources involved

No new external call was added. The browser journey did not call Grinding Gear Games, poe.ninja, or a language model. The optional economy checkbox stayed off during the helmet comparison. Existing pins were read, not refreshed.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

BLOCKED for live GGG OAuth. NOT REQUIRED for the local MVP.

The review server used an empty `GGG_LIVE_IMPORT`. One temporary server set `EXPLAINER_MODE=disabled`. One temporary server set `POB2_CALCULATOR_ENABLED=true` and `POB2_CALCULATOR_DIR` to the already prepared runtime. The dev server was then restored with the calculator off and `EXPLAINER_MODE` unset.

## 10. Data model / schema changes

None.

## 11. Commands executed

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
npm run test:pob2-calculator
npm run crafting:readiness
npm run crafting:weights:validate
```

The PoB2 suite and the browser journey ran before the documentation edits. Format, test, typecheck, lint, format check, audit, crafting readiness, and weight validation were run again after those edits. Results are in the next section.

## 12. Automated tests

| Command/Test                         | Result | Notes                                                |
| ------------------------------------ | ------ | ---------------------------------------------------- |
| `npm test`                           | PASS   | 52 files, 412 tests, 15.40s.                         |
| `npm run typecheck`                  | PASS   | Exit 0 after the documentation edits.                |
| `npm run lint`                       | PASS   | Exit 0 after the documentation edits.                |
| `npm run format:check`               | PASS   | All matched files use Prettier code style.           |
| `npm audit`                          | PASS   | 0 vulnerabilities.                                   |
| `npm run test:pob2-calculator`       | PASS   | 6 tests, 104.23s, before documentation.              |
| `npm run crafting:readiness`         | PASS   | Conclusion compatible. Planner readiness ready.      |
| `npm run crafting:weights:validate`  | PASS   | `failures` is empty.                                 |
| `tests/explanation.test.ts`          | PASS   | Disabled mode and a thrown renderer.                 |
| `packages/upgrade-engine` comparison | PASS   | Missing price and no-positive-within-budget.         |
| `packages/crafting-planner` plan     | PASS   | Unsupported class, stale checksum, missing snapshot. |

## 13. Manual verification

Headless Chrome was used because the IDE browser did not reconnect. Playwright was installed only in a temporary folder and was not added to the repository.

The journey covered fixture analysis, fixture A import, fixture F gear locality, the craft planner, the disabled GGG start route, a calculator-on passive measurement, and a two-helmet comparison. Details are in the sections below.

## 14. Errors/issues encountered

- The IDE browser server did not reconnect. The click-through used headless Chrome. No product change.
- A craft class change through the DOM alone left React on the previous class. The review invoked the existing change handler. The planner itself was already correct.
- A body-text search for `score 16` matched the explanation sentence before the path list's `score 32`. The ranked first complete candidate is still nodes 1755 and 41965 with heuristic score 32. No ranking change.
- One full-suite run timed out `tests/lint-coverage.test.ts` at 20s while the machine was busy. The same test then passed alone in 2.61s, and the next full suite passed 52 files and 412 tests in 15.40s. The timeout was load, not a product failure.

No regression test was added. No product defect required a fix.

## 15. Security/privacy impact

No secret, token, or personal build was added. `.env` and `.env.*` stay ignored, with `.env.example` kept. `var/pob2-runtime/`, `var/crafting-source/`, `var/crafting-data/`, and `var/crafting-community-weights/` stay ignored. Tracked OAuth files are the disabled adapter, not credentials. Calculator logs record version, tree key, checksum, status, and duration. Comparison logs record an error name. They do not record raw item text or tokens.

## 16. Performance impact

Not optimized. Observed times are in Performance Observations. The supported flows completed without a timeout.

## 17. Data provenance / reproducibility impact

The official tree pin and the community-weight pin were not changed. The prepared PoB2 runtime was not regenerated. Browser measurements showed the existing fingerprint.

## 18. Known limitations

Live GGG login, stash wealth, weapon-set optimization, ascendancy optimization, a full tree canvas, universal exact reranking, automatic rare trade search, multi-item optimization, craft simulation, a step-by-step craft guide, and a real language model remain outside the MVP. They are disclosed in the polish register.

## 19. Decisions made

No new decision. D-094 remains the latest decision. STEP-021 stays deferred. STEP-023 stays unselected.

## 20. Deviations from planning docs

The browser click-through used headless Chrome because the IDE browser was unavailable. The product behavior under review was unchanged.

## 21. Remaining risks

Production launch still needs a server-side PoB2 strategy, crafting data provisioning, real GGG credentials, persistent sessions, and operational hardening. Game patches can still invalidate pinned data.

## 22. Rollback notes

Revert the roadmap, polish register, README, and this progress file. No runtime or schema rollback is required.

## 23. Recommended next step

Freeze or tag this MVP state, keep the current data and runtime pins, then choose one post-MVP track in a separate step. Craft simulation (STEP-021) is the likely first track. Do not start it from this review.

## 24. Completion statement

The review satisfies its acceptance criteria.

**MVP COMPLETE**

**PRODUCTION-LAUNCH NOT READY**

## Objective

Confirm the current MVP and leave deferred work deferred.

## MVP Definition Used

A user can open the local app, load a fixture or paste a supported Path of Building 2 export, choose an objective and point budget, and see legal passive paths with node ids, point cost, a heuristic score, and the pinned tree provenance. The score is not DPS or EHP. Gear text is classified without becoming a quality score. Exact measurement and item comparison are available when the local calculator is enabled, and they stay separate from the heuristic. Craft targets list eligible modifiers for supported classes. A local template can explain the analysis. Live GGG login, craft simulation, and a remote model are not required.

## Repository Checks

`npm install` was already up to date. After the documentation edits, format, test, typecheck, lint, format check, and audit passed. The clean suite is 52 files and 412 tests in 15.40s. Audit reported 0 vulnerabilities. Crafting readiness concluded compatible, with planner readiness ready and distribution readiness blocked. Weight validation returned an empty `failures` list.

## Opt-in PoB2 Tests

`npm run test:pob2-calculator` passed 6 tests in 104.23s.

- PoB2 0.23.1
- tree key `0_5`
- runtime fingerprint `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`
- runtime checksum `sha256:ae3a82b69815c2dbe4517faca1cb7a3474b556a1b63546fb23a909dd302cd2ad`

The suite measures fixture B node 4739 and restores the baseline, covers the fixture D weapon-set node, fails closed on a fingerprint mismatch and on an unexpected allocation, replaces the fixture F helmet and restores it, compares two explicit helmets by Life, and times 10- and 50-candidate batches. The runtime was not regenerated.

## Snapshot / Version Validation

Passive tree pin:

- source `https://github.com/grindinggear/poe2-skilltree-export`
- version `0.5.5`
- commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- fetched `2026-09-26T14:45:00.000Z`

The analysis page showed the tree version and commit. PoB tree key `0_5` and Buddy tree `0.5.5` stayed separate. Fixture A remained compatible.

Crafting snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. A stale compatibility checksum returns `planner-not-ready`. A missing snapshot returns `snapshot-unavailable` and names `npm run refresh:crafting-data` and `npm run crafting:readiness`, with no URL in the result.

## Fixture Browser Flow

Witch offensive, point budget 5, on `http://localhost:3000`:

- analysis succeeded in 1791ms
- `score 32` and `score 16` were both visible
- nodes 1755 and 41965 were visible
- the page said the score is a heuristic and that fully valued paths are listed first
- tree provenance and the commit were visible
- primary skill stayed unresolved
- gear was shown with the line that parser coverage is not an item quality score

The first complete candidate remains nodes 1755 and 41965, point cost 2, heuristic score 32.

## STEP-022 Browser Verification

With the default explainer mode, the analysis page showed "Deterministic explanation" and the recommendation still showed score 32.

With `EXPLAINER_MODE=disabled` on a separate server, analysis still showed score 32 and nodes 1755 and 41965. "Deterministic explanation" was absent.

`tests/explanation.test.ts` keeps node ids and score 32 when the mode is disabled and when the renderer throws. The thrown-renderer message is "The explanation could not be rendered. The analysis result is unchanged."

## PoB2 Import Flow

Fixture A imported in the browser: Witch, Infernalist, level 16, PoB tree key `0_5`, active tree `0.5.5`, and Fireball. Import took 647ms with the calculator off.

Ascendancy ids stay out of the main-tree allocation in the existing import regression. This review did not change that split.

## Character Context

The Witch fixture showed build context and an unresolved primary skill. Fixture A showed Fireball. Tab focus landed on the disclosure "Offensive spell: Relevant based on imported build evidence". Unresolved skill metadata was left unresolved.

## Gear Flow

Fixture F in the browser:

- `+40 to maximum Energy Shield` stayed local
- `+30% to Fire Resistance` stayed global
- `50% increased Armour` stayed unknown
- the page said this is not an item quality score

Existing gear tests still cover ordinary Cast Speed as global, bare increased Elemental Damage as unknown, and Elemental Damage with Attacks or Spells as global.

## Exact Passive Measurement

With the calculator off, the page says "Character-aware calculation unavailable."

With the prepared runtime enabled, fixture A's displayed path measured in the browser in 4966ms:

- requested and verified nodes `4739, 18845, 1755, 41965`
- newly allocated `1755, 4739, 18845, 41965`
- verified point cost 4
- allocation verified
- restore check passed
- main skill Fireball
- PoB2 0.23.1, tree `0_5`, Buddy tree `0.5.5`
- runtime `sha256:252e1bc3a87e2f424329ea70adb09c0017c7655f90436cfef6072037193d1fc9`
- the section says the measurement does not reorder the heuristic paths

Average Hit moved from 4.0125 to 5.35. Total DPS moved from 3.3438 to 4.4583. The existing mismatch test still expects `candidate-allocation-mismatch` when PoB allocates a different set.

## Item Replacement

The opt-in suite replaces the fixture F helmet and restores the original item. Life moves from 382 to 464 and back. The browser comparison below measured both helmets from the same Life baseline of 382, which is the restore between the two measurements.

## Upgrade Comparison

With the calculator enabled, the browser compared two supplied helmets by Life, budget 100 chaos:

| Item        | Price    | Budget        | Life       | Other changes                              |
| ----------- | -------- | ------------- | ---------- | ------------------------------------------ |
| Spike Helm  | 40 chaos | Within budget | 382 to 464 | Armour down, Total EHP up, Mana 174 to 172 |
| Lesser Helm | 80 chaos | Within budget | 382 to 401 | Armour down, Total EHP up, Mana 174 to 172 |

Spike Helm ranked first by Life efficiency. Price source was "User-entered price". The fingerprint matched the prepared runtime. The comparison took 13666ms. The economy checkbox stayed off.

`compare.test.ts` still refuses a winner when the only positive candidate is over budget (`no-positive-within-budget`, `winnerCandidateId` null) and does not treat a missing price or a missing percent as zero.

## Economy

The live poe.ninja call stayed optional and was not used in the browser comparison. Existing adapter tests cover the cached client and a failed conversion. A missing conversion returns null and does not invent a rate. The log line is `economy conversion unavailable` plus the error name.

## GGG Gate

The home page had no Connect link. It said GGG OAuth is not configured and that no authorization request was sent.

`GET /api/auth/ggg/start` returned 503 with no Location header. The body named the missing `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, and `GGG_REDIRECT_URI`. It did not redirect to Path of Exile. Fixture and PoB2 analysis still ran.

This is an external blocker. It does not block the MVP.

## Craft Target Planner

Body Armour, Rusted Cuirass, item level 82, stat `base_maximum_life` showed `IncreasedLife12` and "Source-pool eligible". Opening "Crafting snapshot" showed checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`. A second target showed the coexistence warning. The page also says spawn weight is not a crafting probability. The query took 1225ms. The result did not say guaranteed, expected cost, or that the craft will work.

Warstaff, Aegis Quarterstaff, returned `unsupported-item-class` and "No nearby class is used."

## Community Weights

Manifest schema version 1, model kind `community-derived`, patch `4.5.5.3`.

- manifest checksum `sha256:28184ab7ffabb71a4829410afee503e8f3dea215e9ee353cbe6b5acd4b22630f`
- snapshot checksum `sha256:dbfd7c4286e1e340a180ef91cdab621e5b5b612faccfc8688376da2bc6b610a8`
- strength body armour, ring, and wand coverage 100%
- Rusted Cuirass ilvl 82 magic with zero explicits: count 144, total weight 124500, probability sum 1

Direct evidence stays blocked. Full tables stay gitignored. The simulator was not started. The manifest's older "STEP-021 READY" line is historical scope wording. The product decision remains that STEP-021 is deferred.

## Error-State Audit

| State                           | Result                                               |
| ------------------------------- | ---------------------------------------------------- |
| Calculator off                  | "Character-aware calculation unavailable."           |
| Explainer disabled              | Analysis remains, explanation panel is absent.       |
| Renderer throws                 | Analysis remains, with the unchanged-result message. |
| Unsupported item class          | `unsupported-item-class`, no nearby class.           |
| Missing crafting snapshot       | `snapshot-unavailable`, setup commands, no URL.      |
| Stale crafting checksum         | `planner-not-ready`.                                 |
| GGG unconfigured                | 503, no redirect.                                    |
| Missing price or metric         | Not treated as zero.                                 |
| No positive candidate in budget | No winner id.                                        |

## Truthfulness/Wording Audit

The analysis page says the score is a heuristic and is not DPS or EHP. The delta says it is not a score and does not reorder paths. Gear says parser coverage is not an item quality score. Craft results say source-pool eligible, and the warnings deny a crafting probability and a coexistence proof. The comparison says the budget is for one item and shows user-entered prices. The explanation heading is "Deterministic explanation". A source search of the web app found no claim of best, optimal, guaranteed, official, current price, craft success, or full build.

## Privacy/Secrets Audit

`.env.example` assignments are empty, including `EXPLAINER_MODE`, `AI_API_KEY`, `GGG_*`, and `POB2_CALCULATOR_*`. Git tracks no `.env` file, no runtime manifest, and no community weight table. The word "token" appears in the passive tokenizer and its test. OAuth source files are the disabled client. Logs cited above omit raw XML, item text, and secrets.

## Generated-Data Audit

Ignored and not committed: local PoB runtime, crafting source export, crafting snapshot, and full community weight tables. The committed crafting artifacts are the compatibility manifest and the small community-weight manifest, not the full tables. No personal PoB build and no Google Sheet export was copied into the review.

## Accessibility Smoke Check

This was not a WCAG audit. The analysis form controls have visible labels: import source, fixture, objective, point budget, and Analyze. Craft controls expose item class, item level, and stat id. Comparison buttons read "Compare supplied items". Budget status is the text "Within budget". The first Tab after analysis focused a disclosure summary. Deeper keyboard review is on the polish register under Priority 5.

## Performance Observations

| Flow                           | Time    |
| ------------------------------ | ------- |
| Initial page load              | 76ms    |
| Fixture analysis               | 1791ms  |
| PoB2 import, calculator off    | 647ms   |
| Craft target query             | 1225ms  |
| Fixture A delta, calculator on | 4966ms  |
| Two-helmet comparison          | 13666ms |
| Opt-in PoB2 suite              | 104.23s |

Nothing was unusably slow. No performance change was made.

## Polish Register Updates

Section M is checked from this review. Section O, "MVP exit review — 2026-09-28", records the result. No historical entry was deleted or newly marked resolved.

## New Issues Found

| Issue                                                         | Severity          | Notes                                                            |
| ------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------- |
| IDE browser unavailable                                       | MINOR NON-BLOCKER | Headless Chrome completed the journey.                           |
| First Tab lands in a disclosure                               | MINOR NON-BLOCKER | Labels and button names are present. Deeper pass stays post-MVP. |
| Explanation mentions the other candidate before the path list | MINOR NON-BLOCKER | Ranking is unchanged.                                            |

No BLOCKER was found.

## Blocker Classification

No MVP blocker.

External: live GGG OAuth has no approved client. The disabled route does not redirect.

Deferred: STEP-021 craft simulation and STEP-023 provider selection.

Production-launch gaps are listed below. They do not change the MVP result.

## Production-Launch Gaps

- No cloud or server strategy for the PoB2 runtime.
- Crafting snapshot and community-weight tables are local and gitignored.
- OAuth sessions are not a multi-instance production design, and no real GGG client exists.
- Production observability and security hardening are not in place.

## MVP Exit Decision

**MVP COMPLETE**

**PRODUCTION-LAUNCH NOT READY**

## Recommended Next Step

Freeze or tag this MVP state. Keep the tree pin, community-weight pin, and prepared runtime fingerprint as recorded above. Then choose one post-MVP track in its own step. STEP-021 is the likely first track and is not started here.

## Evidence table

| Capability                | Status           | Evidence                                                            | MVP blocker? |
| ------------------------- | ---------------- | ------------------------------------------------------------------- | ------------ |
| Fixture analysis          | Pass             | Witch offensive, score 32, browser 1791ms.                          | No           |
| Passive recommendations   | Pass             | First complete candidate 1755, 41965, score 32.                     | No           |
| Provenance                | Pass             | Tree 0.5.5, commit bd87e651, checksum on the pin.                   | No           |
| PoB2 import               | Pass             | Fixture A: Witch, Infernalist, 16, Fireball, 0_5 and 0.5.5.         | No           |
| Character context         | Pass             | Context visible. Unresolved skill stays unresolved.                 | No           |
| Gear normalization        | Pass             | Fixture F local, global, and unknown lines.                         | No           |
| Exact PoB2 delta          | Pass             | Browser path verified and restored. Off state is explicit.          | No           |
| Upgrade comparison        | Pass             | Spike Helm 382 to 464 over Lesser Helm. User-entered prices.        | No           |
| Economy normalization     | Pass             | Optional. Missing conversion does not invent a rate.                | No           |
| Craft target planner      | Pass             | IncreasedLife12 eligible. Warstaff refused.                         | No           |
| Community weights         | Pass             | Patch 4.5.5.3, three scopes at coverage 1, validate failures empty. | No           |
| Deterministic explanation | Pass             | Visible by default. Absent when disabled. Score unchanged.          | No           |
| GGG live OAuth            | External blocker | 503, no redirect, no client.                                        | No           |
| Craft simulation          | Deferred         | STEP-021 not started.                                               | No           |
| Real LLM provider         | Optional         | STEP-023 not selected.                                              | No           |
