# UIUX-006 — Passive recommendation redesign

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-006  
**Authoring context:** Codex-assisted development

## 1. Objective

Make passive recommendations easy to scan while preserving their deterministic engine order and the detailed evidence already available to advanced users.

## 2. Acceptance criteria

- [x] Complete passive paths render as clear recommendation cards.
- [x] Each card communicates rank, node names, point cost, heuristic score, valuation state, map action, and comparison action.
- [x] Incomplete paths are collapsed by default.
- [x] Incomplete paths can be filtered by node name and revealed in bounded groups without reordering results.
- [x] Technical score evidence remains available in a disclosure.
- [x] Browser validation confirms recommendation actions, filtering, and a clear console.

## 3. Implementation summary

The passive result now begins with a dedicated recommendation section. Complete candidates retain their engine-provided sequence and render as cards with player-facing facts and explicit heuristic labeling. The formerly unbounded incomplete list is inside a closed disclosure, initially shows ten matching paths, and can be filtered by node name or expanded ten at a time. The filter changes visibility only; it does not sort or recalculate candidates.

## 4. Files created

- `docs/Pre prod/UI-UX/progress/UIUX-006-passive-recommendation-redesign.md`: this record.

## 5. Files changed

- `apps/web/src/app/analysis-screen.tsx`: presentation state, recommendation hierarchy, incomplete-path search/reveal controls, and card markup.
- `apps/web/src/app/globals.css`: recommendation-card, disclosure, search, action, and responsive styles.

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`AnalysisReport` still receives the existing `recommendation` result. `visibleIncompleteCandidates` filters the existing ordered array by rendered node name, and `displayedIncompleteCandidates` takes its ordered prefix. `PathRow` is now a card presentation component; its technical disclosure retains allocation order, semantic coverage, valuation data, score breakdown, and unsupported lines.

## 8. External APIs / data sources involved

None.

## 9. Credentials / environment variables

None added or changed.

## 10. Data model / schema changes

None.

## 11. Commands executed

```text
npx prettier --write apps/web/src/app/analysis-screen.tsx apps/web/src/app/globals.css
npm run typecheck -w web
npm test
npm run lint
npm run format:check
```

## 12. Automated tests

`npm run typecheck -w web`: PASS.

Final suite, lint, and format-check results are recorded after command completion below.

## 13. Manual verification

In-app browser at `/build?demo=passive-recommendation`:

- The passive demo showed two complete paths as ranked cards with costs, heuristic scores, map controls, comparison controls, and technical details.
- The 309 incomplete paths were initially collapsed.
- Opening the disclosure and searching for “Spell Damage” showed the matching-count feedback and filtered results.
- Selecting “Show on map” worked after the redesign.
- Browser diagnostics contained no warnings or errors.

## 14. Errors/issues encountered

No implementation issue remained after validation.

## 15. Security/privacy impact

No data is stored, transmitted, or newly exposed. Search state is in-memory only.

## 16. Performance impact

The node-name filter runs only against the existing candidate list in memory. Bounding the initially rendered incomplete paths reduces initial DOM work for large result sets.

## 17. Data provenance / reproducibility impact

Candidate order, scores, valuation state, evidence, and provenance remain those returned by the engine. Filtering and incremental reveal alter only which existing rows are visible.

## 18. Known limitations

The local path sketch remains a focused coordinate sketch rather than the full passive tree. UIUX-007 addresses the interactive tree canvas.

## 19. Decisions made

The primary cards show player-facing names and facts, while node identifiers and detailed score evidence remain in a labeled technical disclosure. Incomplete candidates remain explicitly separate because their known score does not prove full value.

## 20. Deviations from planning docs

No new route was created. This step improves the existing `/build#passives` result surface.

## 21. Remaining risks

Search matches node display names, so a user who knows only an internal node identifier must use the technical details after locating a path. The planned technical mode will offer a dedicated advanced surface later.

## 22. Rollback notes

Restore the former ordered lists and remove the card/search CSS. No engine or data rollback is required.

## 23. Recommended next step

UIUX-007 — passive tree canvas.

## 24. Completion statement

UIUX-006 is complete. Passive recommendations are readable at a glance, incomplete candidates no longer dominate the page, and the underlying ranking remains unchanged.

## Before-state

Complete and incomplete passive candidates appeared as similarly dense rows, and hundreds of incomplete rows could occupy most of the page.

## After-state

Complete candidates appear first as action-oriented cards. Incomplete candidates are explicitly qualified, collapsed, searchable, and incrementally revealed without changing engine order.

## Components created

No separate component file. `PathRow` was redesigned as the reusable recommendation-card presentation within the existing client screen.

## Routes changed

None.

## UI states

The complete-path empty state remains visible when no fully valued candidate exists. The incomplete disclosure is absent when there are no incomplete candidates. A search with no match explains that no incomplete path contains that node name.

## Responsive behavior

At widths below 768px, card headers stack and recommendation facts align to the start. Actions retain semantic controls and wrap using the existing layout.

## Accessibility behavior

The recommendation area has a named region and headings. Cards use semantic lists, facts use definition lists, the incomplete set uses a native disclosure, filter feedback uses a polite live region, and map/compare actions preserve button and checkbox semantics.

## Browser verification

In-app browser, passive recommendation demo at `/build?demo=passive-recommendation`. Desktop analysis, collapsed incomplete state, open/filter state, and map action were checked. Browser console was clear.

## Regressions checked

The complete candidates retained the observed engine order: the 2-point score-32 path remained first, followed by the 1-point score-16 path. Existing path map and comparison controls remained present.

## Next step

UIUX-007 — passive tree canvas.
