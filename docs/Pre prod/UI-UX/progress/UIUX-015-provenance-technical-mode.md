# UIUX-015 — Provenance and technical mode

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-015

## Implementation

Tree version/commit, profile version, point budget, search completeness, and definitive state now live behind a named `Data and technical details` disclosure. This keeps the normal recommendation flow focused while retaining provenance for review and debugging.

## Validation

- `npm run typecheck -w web`: PASS.
- `git diff --check`: PASS.
- In-app browser passive demo: technical-details disclosure rendered after analysis; browser diagnostics were clear.

## Files changed

- `apps/web/src/app/analysis-screen.tsx`
- `docs/Pre prod/UI-UX/progress/UIUX-015-provenance-technical-mode.md`

## Impact and next step

Presentation only; no result, source, engine, or persistence behavior changed. UIUX-016 — loading, empty, error, and disabled states is next.
