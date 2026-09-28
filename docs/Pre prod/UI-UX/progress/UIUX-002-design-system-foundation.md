# UIUX-002 — Design system foundation

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-002  
**Authoring context:** Cursor-assisted development

## 1. Objective

Create one visual system for later screens: spacing, color, type, buttons, badges, cards, alerts, disclosures, and loading.

## 2. Acceptance criteria

- [x] Shared tokens cover surface, text, accent, heuristic, measured, and community-derived colors.
- [x] Buttons, badges, cards, alerts, and loading notes are reusable components or classes.
- [x] Status is written in text, not color alone.
- [x] The shell and dashboard use the system.
- [x] Analysis scores and craft results are unchanged.

## 3. Implementation summary

Colors, spacing, and type now come from one set of variables. The dashboard uses a card, a button, and an info alert. The build header uses a badge whose words stay Ready, Partial, Not enough evidence, or Unavailable. Analysis and crafting errors and warnings use the same alert styles. A loading note appears while a build is analyzed.

## 4. Files created

| File                                                                | Purpose                             |
| ------------------------------------------------------------------- | ----------------------------------- |
| `apps/web/src/app/shared/badge.tsx`                                 | Text badge with a tone.             |
| `apps/web/src/app/shared/alert.tsx`                                 | Info, caution, and blocking text.   |
| `apps/web/src/app/shared/card.tsx`                                  | Titled surface.                     |
| `apps/web/src/app/shared/loading-note.tsx`                          | Running-work note.                  |
| `apps/web/src/app/shared/status-tone.ts`                            | Maps a status word to a badge tone. |
| `tests/status-tone.test.ts`                                         | Status word checks.                 |
| `docs/Pre prod/UI-UX/progress/UIUX-002-design-system-foundation.md` | This record.                        |

## 5. Files changed

| File                                                         | Change                                  |
| ------------------------------------------------------------ | --------------------------------------- |
| `apps/web/src/app/globals.css`                               | Tokens and shared control styles.       |
| `apps/web/src/app/shell/app-shell.tsx`                       | Status badge and page title.            |
| `apps/web/src/app/dashboard.tsx`                             | Card, button, and info alert.           |
| `apps/web/src/app/analysis-screen.tsx`                       | Loading note and shared alerts.         |
| `apps/web/src/app/craft-targets/craft-target-planner.tsx`    | Shared alerts for notices and warnings. |
| `docs/Pre prod/UI-UX/UI-UX-MASTER.md`                        | Progress files now live in this folder. |
| `docs/Pre prod/UI-UX/progress/UIUX-001-application-shell.md` | Moved here from `docs/progress`.        |

## 6. Files deleted

`docs/progress/UIUX-001-application-shell.md` was moved, not removed as history.

## 7. Important code paths / responsibilities

`statusBadgeTone` only picks a color tone for an existing status word. It does not change the word. Alerts and badges render the text they are given. They do not calculate game values.

## 8. External APIs / data sources involved

None.

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

| Command/Test                | Result | Notes                               |
| --------------------------- | ------ | ----------------------------------- |
| `npm test`                  | PASS   | 54 files, 416 tests.                |
| `npm run typecheck`         | PASS   | Exit 0.                             |
| `npm run lint`              | PASS   | Exit 0.                             |
| `npm run format:check`      | PASS   | Recorded after this document.       |
| `tests/status-tone.test.ts` | PASS   | Ready, Partial, and other statuses. |

## 13. Manual verification

Headless Chrome.

- The dashboard card, gold button, and blue info alert are visible.
- After the Witch demo, the header badge reads Partial and uses the caution tone.
- At 390px the dashboard does not scroll sideways.

## 14. Errors/issues encountered

None.

## 15. Security/privacy impact

No new stored data.

## 16. Performance impact

The loading mark is a small CSS animation. It stops when the user prefers reduced motion.

## 17. Data provenance / reproducibility impact

Unchanged.

## 18. Known limitations

Recommendation rows, gear slots, and craft modifier cards are not rebuilt on this system yet. Heuristic, measured, and community-derived badge styles exist and are ready for those screens. The spinner does not pretend to show a percentage.

## 19. Decisions made

Amber means heuristic, blue means measured, and violet means community-derived. Every one of those styles still requires the written label. UI/UX progress files stay in `docs/Pre prod/UI-UX/progress`.

## 20. Deviations from planning docs

The master originally named `docs/progress` for these records. That path now points at `docs/Pre prod/UI-UX/progress`, including the UIUX-001 record.

## 21. Remaining risks

Later screens can still invent one-off colors unless they use these components. UIUX-003 should start from them.

## 22. Rollback notes

Revert the shared components and the stylesheet tokens. Move UIUX-001 back only if the progress folder changes again. No data rollback is required.

## 23. Recommended next step

UIUX-003 — landing page and guided start. Replace the remaining fixture-first wording on the build form with the demo and Path of Building choices described in the master.

## 24. Completion statement

UIUX-002 satisfies its acceptance criteria. The Witch score and craft planner rules are unchanged.

## Before-state

The shell had a dark background and a few local classes. Alerts, badges, and loading were not shared.

## After-state

One token set and a small shared component group. The dashboard and build header use them. Existing error and warning text uses the same alert styles.

## Components created

`Badge`, `Alert`, `Card`, `LoadingNote`, and `statusBadgeTone`.

## Routes changed

None.

## UI states

Info, caution, and blocking alerts. Badge tones for success, caution, unavailable, heuristic, measured, community-derived, and user-entered. Loading note with a static mark when reduced motion is requested.

## Responsive behavior

Shared padding uses the same spacing tokens. The 390px dashboard does not overflow sideways.

## Accessibility behavior

Badges and alerts include their text. Blocking alerts use `role="alert"`. Info and caution use `role="status"`. The loading mark is hidden from assistive tech because the sentence is the status. Focus outlines from UIUX-001 remain.

## Browser verification

Headless Chrome at 1280px and 390px. Screenshots were reviewed and were not added to the repository.

## Regressions checked

Witch offensive still reaches score 32. The header still says Partial for that demo. The full suite is 416 tests.

## Next step

UIUX-003 — landing page and guided start.
