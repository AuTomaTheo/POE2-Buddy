# UIUX-003 — Landing page and guided start

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-003  
**Authoring context:** Cursor-assisted development

## 1. Objective

Replace the fixture-first start with a landing page that says what the app is, how to start, and which named demos exist.

## 2. Acceptance criteria

- [x] The landing page answers what the app is, what you can do, and how to start.
- [x] Primary action is Analyze a build. Secondary action is Try a demo build.
- [x] Start cards cover Path of Building, a demo, and the real GGG unavailable state.
- [x] Named demos replace Fixture A, Fixture F, and Witch fixture on the normal start.
- [x] Onboarding is three steps, not a wizard, and explains heuristic, measured, and community-derived evidence.
- [x] Fixture JSON is under Advanced testing.
- [x] Recommendation order, scores, and craft rules are unchanged.

## 3. Implementation summary

The dashboard now leads with three steps, three evidence badges, and two actions. Demo cards name Fireball Witch, gear parsing, upgrade comparison, a small passive demo, a defensive warrior demo, and a crafting example. Each card says what it shows. The technical id sits under Technical details.

Opening a build demo loads that example on the server from a fixed list. The build page starts on Path of Building paste. Fixture JSON stays inside Advanced testing. A GGG source choice shows the existing disabled message and does not pretend to connect.

## 4. Files created

| File                                                            | Purpose                                       |
| --------------------------------------------------------------- | --------------------------------------------- |
| `apps/web/src/app/start/demos.ts`                               | Named demo catalog.                           |
| `apps/web/src/server/load-start-demo.ts`                        | Loads a whitelisted demo into analysis input. |
| `tests/load-start-demo.test.ts`                                 | Demo load and rejection checks.               |
| `docs/Pre prod/UI-UX/progress/UIUX-003-landing-guided-start.md` | This record.                                  |

## 5. Files changed

| File                                                                | Change                                                         |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/app/dashboard.tsx`                                    | Onboarding, evidence badges, start cards, and demo cards.      |
| `apps/web/src/app/page.tsx`                                         | Passes the real GGG enabled flag and message.                  |
| `apps/web/src/app/build/page.tsx`                                   | Reads the demo or source query and opens the matching form.    |
| `apps/web/src/app/analysis-screen.tsx`                              | PoB paste, named demos, GGG choice, and advanced fixture JSON. |
| `apps/web/src/app/actions.ts`                                       | Resolves a demo id before the existing analysis.               |
| `apps/web/src/app/globals.css`                                      | Start grid, steps, secondary button, and demo scroll margin.   |
| `docs/Pre prod/UI-UX/UI-UX-MASTER.md`                               | Progress path points at this folder.                           |
| `docs/Pre prod/UI-UX/progress/UIUX-001-application-shell.md`        | Record path updated after the move.                            |
| `docs/Pre prod/UI-UX/progress/UIUX-002-design-system-foundation.md` | Record path updated after the move.                            |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`START_DEMOS` only names examples. `analysisInputForDemo` reads a whitelisted file or fixture id. `analyzePassiveBuild` still calls `runPassiveAnalysis`. A pasted fixture JSON still replaces the selected demo. The crafting demo is a link to the existing planner, not a simulated craft.

## 8. External APIs / data sources involved

None. Share links are not fetched. The GGG card uses the existing readiness message.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

None.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

## 12. Automated tests

| Command/Test                    | Result | Notes                                      |
| ------------------------------- | ------ | ------------------------------------------ |
| `npm test`                      | PASS   | 55 files, 418 tests.                       |
| `npm run typecheck`             | PASS   | Exit 0.                                    |
| `npm run lint`                  | PASS   | Exit 0.                                    |
| `npm run format:check`          | PASS   | Recorded after this document.              |
| `tests/load-start-demo.test.ts` | PASS   | Fireball export loads. Unknown ids do not. |

## 13. Manual verification

Headless Chrome.

- The dashboard shows Analyze a build, Try a demo build, Fireball Witch, and the unconfigured GGG message.
- Fixture JSON and Fixture A are not on the dashboard.
- Fireball Witch shows Fireball and Infernalist.
- The passive recommendation demo shows score 32.
- The defensive warrior demo opens with the defensive objective.
- `/build` starts on the Path of Building paste field.
- Import fixture JSON appears only after Advanced testing is opened.
- At 390px the dashboard and build page do not scroll sideways.
- The first Tab on a fresh dashboard lands on Skip to content.

## 14. Errors/issues encountered

The first demo loader import pointed at the wrong folder. It now imports the catalog from `apps/web/src/app/start/demos.ts`. The isolated test then passed, and the full suite passed.

## 15. Security/privacy impact

Demo files are read only from a fixed name list. An unknown id returns no file. No new stored data.

## 16. Performance impact

A demo link submits the existing analysis once after the form is ready. No new background work.

## 17. Data provenance / reproducibility impact

Unchanged. Exact measurement copy says it applies when the calculator is enabled.

## 18. Known limitations

The upgrade demo opens the comparison and does not prefill the two items. Import validation and paste help beyond one short disclosure stay in UIUX-004. The first Tab after an in-page analysis can still land inside a result disclosure. That remains UIUX-019.

## 19. Decisions made

The normal build page starts on Path of Building paste. Fixture JSON stays available under Advanced testing because the owner still needs it. Demo ids are resolved on the server. A non-empty fixture JSON still wins over the selected demo.

## 20. Deviations from planning docs

The master lists four demo names. This step also keeps the existing witch and warrior fixtures as named demos so those checks do not require a JSON file. Full paste validation stays UIUX-004. The short “Where do I find this?” note does not invent a Path of Building menu path.

## 21. Remaining risks

A demo query auto-runs analysis. A later manual submit uses the form, including a pasted export, because the one-time demo id is cleared after that first submit.

## 22. Rollback notes

Restore the previous dashboard and build form. Remove the demo catalog and loader. No data rollback is required.

## 23. Recommended next step

UIUX-004 — build import experience.

## 24. Completion statement

UIUX-003 satisfies its acceptance criteria. The Witch score remains 32. Craft rules and recommendation order are unchanged.

## Before-state

The dashboard was a short paragraph and one link. The build form opened on a fixture selector, with fixture JSON in the normal form.

## After-state

The landing page explains the product, the three evidence kinds, and the three ways to start. Named demos open the existing analysis. Fixture JSON is under Advanced testing.

## Components created

None. The page uses `Card`, `Badge`, `Alert`, and the existing button classes.

## Routes changed

`/` is the guided start. `/build` reads `demo` and `source`. Demo links use `/build?demo=…` and the crafting demo uses `/build/crafting`.

## UI states

GGG disabled shows “Unavailable until access is configured.” and the real unconfigured message. A missing demo id returns “That demo is not available.” Loading copy is unchanged.

## Responsive behavior

Start cards wrap from one column to several. At 390px the dashboard and build page stay within the viewport width.

## Accessibility behavior

Evidence badges include their words. The GGG alert uses the existing info status role. Demo technical ids are inside a disclosure. The skip link remains the first Tab stop on a fresh page.

## Browser verification

Headless Chrome at 1280px and 390px. Screenshots were reviewed and were not added to the repository.

## Regressions checked

Fireball Witch still imports as Fireball / Infernalist. The passive demo still reaches score 32. The full suite is 418 tests.

## Next step

UIUX-004 — build import experience.
