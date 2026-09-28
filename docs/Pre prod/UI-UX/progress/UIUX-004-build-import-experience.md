# UIUX-004 — Build import experience

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-004  
**Authoring context:** Codex-assisted development

## 1. Objective

Make PoB2 import understandable, recoverable, and usable with the existing demo and advanced-testing paths.

## 2. Acceptance criteria

- [x] Path of Building, demo, and GGG sources remain available.
- [x] Empty codes, share links, and XML receive specific corrective guidance.
- [x] Clipboard paste has a manual-paste fallback.
- [x] Server validation remains authoritative for compressed exports.
- [x] Invalid submissions retain the pasted code.
- [x] Successful imports show class, ascendancy, level, and primary skill before diagnostics.
- [x] Fixture JSON stays inside Advanced testing.
- [x] PoB demos retain their export for downstream measurement and comparison.
- [x] Keyboard submission focuses the result heading.
- [x] Review gate is clear of browser errors.

## 3. Implementation summary

The import form now has input guidance, clipboard paste, immediate input feedback, pending-state protection, and a focused result heading. PoB metadata is summarized before a collapsed compatibility disclosure. The server prepares the selected public demo export for the form, allowing measurement and item-comparison controls to receive the same build code. No engine rules changed.

## 4. Files created

- `apps/web/src/app/build/import-validation.ts`: presentation-only checks for empty, URL, and XML input.
- `docs/Pre prod/UI-UX/progress/UIUX-004-build-import-experience.md`: this record.

## 5. Files changed

- `apps/web/src/app/analysis-screen.tsx`: paste workflow, retained draft, errors, pending fieldset, result focus, import summary, safe hash lookup.
- `apps/web/src/app/build/page.tsx`: supplies a whitelisted demo's export to the form.
- `apps/web/src/app/globals.css`: import fieldset layout and result focus styling.

## 6. Files deleted

None. Existing uncommitted work and documentation moves were preserved.

## 7. Important code paths / responsibilities

`exportInputProblem` provides guidance only. `analyzePassiveBuild` and `runPassiveAnalysis` still own validation and analysis. `analysisInputForDemo` continues to constrain file selection to known demos. The submitted export is retained in React memory for existing downstream actions. Hash scrolling uses an element id rather than a CSS selector supplied through the URL.

## 8. External APIs / data sources involved

None added. Clipboard access is initiated by the paste button. Share links are not fetched.

## 9. Credentials / environment variables

None added or changed. GGG remains gated by existing configuration. The calculator was not enabled for this review.

## 10. Data model / schema changes

No engine schema changes. `AnalysisScreen` receives an initial public demo code. No personal build is persisted.

## 11. Commands executed

```text
npx prettier --write apps/web/src/app/analysis-screen.tsx apps/web/src/app/build/page.tsx apps/web/src/app/build/import-validation.ts apps/web/src/app/globals.css
npm test
npm run typecheck
npm run lint
npm run format:check
```

Changed files were formatted directly to avoid rewriting unrelated work in the existing dirty checkout.

## 12. Automated tests

`npm test`: PASS, 55 files, 418 tests, 24.25 seconds on the sequential rerun. The first run had 417 passes and a lint-coverage timeout while typecheck/lint also ran. The timeout was not suppressed or extended.

`npm run typecheck`: PASS after correcting an action return annotation and a duplicate import/prop introduced during editing. The web typecheck also passed again after the final focus change. `npm run lint` and `npm run format:check`: PASS.

## 13. Manual verification

Codex in-app browser, localhost:3000, with native keyboard interactions:

- Empty input produces a paste-code instruction and returns focus to the input.
- A share link receives a specific explanation that link import is unsupported.
- Malformed compressed input receives the existing decompression error; its draft remains present.
- Fireball Witch loads Witch, Infernalist, level 16, and Fireball. The calculator-unavailable message is now reachable from this PoB demo.
- The passive demo still shows the two-point path with score 32.
- GGG selection shows the actual unconfigured status without an authorization request.
- Demo selection keeps fixture JSON under Advanced testing.
- Success focus lands on the result heading.

## 14. Errors/issues encountered

Review found repeated React duplicate-key errors from `candidate.unsupportedRawLines.map` in `analysis-screen.tsx`. Different nodes in a path can contain the same unsupported text, including `6% [FasterESRechargeStart|faster start of Energy Shield Recharge]`.

The list now keys each occurrence by its position plus text. The Fireball demo visibly retains repeated entries, including after a second analysis submission, and the browser console is clear. This keeps the engine-provided facts intact while providing React a stable per-occurrence identity.

The browser locator click and select helpers did not consistently trigger React handlers. Native keyboard Enter and arrow keys exercised the real form behavior successfully; DOM-only selection was not counted as a passing test.

## 15. Security/privacy impact

No local storage, database, or telemetry added. Personal pasted exports remain in current-page memory. Only a whitelisted synthetic demo export is sent as an initial form value. Failed transport requests return a bounded message rather than a raw stack.

## 16. Performance impact

No additional calculation per submission. The input fieldset is disabled while the existing request runs. No fake progress percentage.

## 17. Data provenance / reproducibility impact

Tree, runtime, profile, and normalization pins are unchanged. Technical import metadata remains in a disclosure.

## 18. Known limitations

Clipboard permission success was not exercised; manual paste was exercised. Live GGG and an enabled real PoB worker were not tested. Share URLs remain unsupported.

## 19. Decisions made

Friendly input checks do not replace the server decoder. Demo export retention fixes downstream UI availability without enabling the calculator. Repeated unsupported facts stay visible rather than being deduplicated for rendering.

## 20. Deviations from planning docs

No scoring or engine changes.

## 21. Remaining risks

No new risk identified from the Step 4 review.

## 22. Rollback notes

Revert only this step's import changes and new helper. Preserve the preceding UIUX-001 through UIUX-003 work and other pre-existing uncommitted changes. No data rollback is needed.

## 23. Recommended next step

UIUX-005 — build overview dashboard.

## 24. Completion statement

UIUX-004 is complete. The duplicate-key issue was fixed and review is clear. UIUX-005 may begin.

## Before-state

Minimal paste field, short help, technical import output, and PoB demos without a retained submitted export for downstream controls.

## After-state

Guided paste with recovery messages, retained draft, compact identity summary, diagnostics disclosure, and keyboard result focus. Demo exports feed the existing downstream controls.

## Components created

No new component library. A small import-validation helper; existing Alert and LoadingNote components are reused.

## Routes changed

`/build` and its existing demo query. No new route.

## UI states

Empty, unsupported link/XML, importing, invalid compressed export, success, transport failure, and unconfigured GGG.

## Responsive behavior

Observed at 1280px and 390px. At 390px, document width was 375px within the viewport. Controls stack vertically. The existing long results remain for later redesign steps.

## Accessibility behavior

Visible labels, fieldset legend, input description and invalid state, live feedback, keyboard submission, and focused result heading. A full screen-reader audit is still UIUX-019.

## Browser verification

In-app browser screenshots reviewed at desktop and mobile sizes. Native keyboard interaction was used where locator clicks did not target reliably. No enabled-worker measurement is claimed.

## Regressions checked

418 existing tests pass. Passive demo retains score 32. Fireball demo retains its imported identity. Repeated unsupported lines remain visible with no browser warnings. GGG remains disabled. No engine files changed.

## Next step

UIUX-005 — build overview dashboard.
