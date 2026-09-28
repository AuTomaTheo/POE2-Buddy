# UIUX-001 — Current UI inventory and application shell

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-001  
**Authoring context:** Cursor-assisted development

## 1. Objective

Give the product one navigation shell and a current-build header before any feature screen is redesigned.

## 2. Acceptance criteria

- [x] The main sections are visible from every page.
- [x] Navigation is the same on dashboard, build, and crafting.
- [x] The existing analysis and craft-target workflows still run.
- [x] Recommendation order, scores, and crafting rules are unchanged.

## 3. Implementation summary

The app now opens on a short dashboard. Analyze a build goes to the existing analysis form. Crafting lives at `/build/crafting`. A sticky header names the section and keeps the loaded build visible for the browser session. Passives and Gear jump to those sections on the build page. They are not separate screens yet.

## 4. Files created

| File                                                         | Purpose                                    |
| ------------------------------------------------------------ | ------------------------------------------ |
| `apps/web/src/app/shell/app-shell.tsx`                       | Header, navigation, page title, build bar. |
| `apps/web/src/app/shell/build-session.tsx`                   | In-memory current build for the header.    |
| `apps/web/src/app/shell/build-identity.ts`                   | Player-facing labels for that header.      |
| `apps/web/src/app/dashboard.tsx`                             | Section index and the analyze action.      |
| `apps/web/src/app/build/page.tsx`                            | Existing analysis workflow.                |
| `apps/web/src/app/build/crafting/page.tsx`                   | Existing craft target planner.             |
| `tests/build-identity.test.ts`                               | Source and status label checks.            |
| `docs/Pre prod/UI-UX/progress/UIUX-001-application-shell.md` | This record.                               |

## 5. Files changed

| File                                                      | Change                                               |
| --------------------------------------------------------- | ---------------------------------------------------- |
| `apps/web/src/app/layout.tsx`                             | Wraps every page in the shell.                       |
| `apps/web/src/app/page.tsx`                               | Dashboard instead of the analysis form.              |
| `apps/web/src/app/globals.css`                            | Dark shell, shared form colors, focus outline.       |
| `apps/web/src/app/analysis-screen.tsx`                    | Publishes the loaded build and uses section anchors. |
| `apps/web/src/app/craft-targets/page.tsx`                 | Redirects to `/build/crafting`.                      |
| `apps/web/src/app/craft-targets/craft-target-planner.tsx` | Drops the duplicate title and back link.             |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`AppShell` owns navigation and the page title. `buildIdentity` only formats names the analysis already produced. `AnalysisScreen` still calls the same analysis action. The craft planner still calls the same planner actions.

## 8. External APIs / data sources involved

None. The dashboard repeats the existing disabled GGG message. No new request is sent.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

None. The build header is React state for the current browser session. It is not written to storage.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

## 12. Automated tests

| Command/Test                   | Result | Notes                                      |
| ------------------------------ | ------ | ------------------------------------------ |
| `npm test`                     | PASS   | 53 files, 415 tests, including 3 new ones. |
| `npm run typecheck`            | PASS   | Exit 0.                                    |
| `npm run lint`                 | PASS   | Exit 0.                                    |
| `npm run format:check`         | PASS   | Recorded after this document.              |
| `tests/build-identity.test.ts` | PASS   | Demo, Path of Building, and empty cases.   |

## 13. Manual verification

Headless Chrome, because the IDE browser was not used for this step.

- Dashboard shows the five sections, Analyze a build, and "No build loaded".
- Witch offensive still shows score 32. The header reads Fixture Witch, Witch · Infernalist, Source: Demo build, Status: Partial.
- Crafting keeps that header and still shows the item class control.
- `/craft-targets` redirects to `/build/crafting`.
- At 390px the page does not scroll sideways. The nav wraps.
- The first Tab on the build page lands on "Skip to content".

## 14. Errors/issues encountered

None that required a product change.

## 15. Security/privacy impact

The header keeps the build name, class, skill, and source in memory only. Pasted Path of Building text and item text are not stored.

## 16. Performance impact

Not measured as a new cost. Navigation is local. Analysis still uses the existing action.

## 17. Data provenance / reproducibility impact

Unchanged. Tree version and commit still appear in the analysis result.

## 18. Known limitations

Passives and Gear are anchors on the build page. The form still exposes fixture JSON. Incomplete paths are still listed in full. Exact measurement, gear slots, and craft search are not redesigned. The dark surface is the shell treatment, not the full design system.

## 19. Decisions made

Primary navigation is Dashboard, Build, Passives, Gear, and Crafting. Upgrades stay inside the build page until their own step. A fixture source is labeled "Demo build". No engine value is relabeled as a measurement.

## 20. Deviations from planning docs

UIUX-001 says not to redesign feature internals. The visible import choices now say "Demo build" and "Path of Building". The submitted values are still `fixture` and `pob2`.

## 21. Remaining risks

A long analysis page can still hide the section a nav item points at until the user scrolls. Later steps split those sections.

## 22. Rollback notes

Remove the shell wrapper, point `/` back at `AnalysisScreen`, and point `/craft-targets` back at the planner. No data rollback is required.

## 23. Recommended next step

UIUX-002 — design system foundation. Shared tokens, badges, cards, and loading states, still without redesigning each workflow.

## 24. Completion statement

UIUX-001 satisfies its acceptance criteria. The analysis score and craft planner behavior are unchanged.

## Before-state

One cream analysis page held import, recommendations, context, gear, measurement, and upgrades. Crafting was a separate page with a back link. There was no shared navigation or current-build header.

## After-state

A dark application shell wraps every page. The dashboard explains the sections. The loaded build stays in the header across the build page and crafting. Existing forms still submit to the same actions.

## Components created

`AppShell`, `BuildSessionProvider`, `Dashboard`, and `buildIdentity`.

## Routes changed

| Route             | Now                                   |
| ----------------- | ------------------------------------- |
| `/`               | Dashboard.                            |
| `/build`          | Analysis, passives, and gear.         |
| `/build#passives` | Passive recommendations on that page. |
| `/build#gear`     | Gear section on that page.            |
| `/build/crafting` | Craft target planner.                 |
| `/craft-targets`  | Redirects to `/build/crafting`.       |

## UI states

No build loaded. Build loaded with Ready, Partial, Not enough evidence, or Unavailable. The GGG line remains the existing disabled message.

## Responsive behavior

Below 768px the header stacks and the nav wraps. The 390px check had no horizontal page overflow.

## Accessibility behavior

One page title. Primary nav has a label and marks the current item. The build bar has a label. Status is text, not color alone. Focus uses a gold outline. A skip link is the first Tab stop.

## Browser verification

Headless Chrome at 1280px and 390px. Desktop dashboard, loaded Witch build, and the narrow build page were reviewed. Screenshots were not added to the repository.

## Regressions checked

Witch offensive still reaches score 32. Crafting still renders its class control. The old craft URL redirects. The full suite is 415 tests.

## Next step

UIUX-002 — design system foundation.
