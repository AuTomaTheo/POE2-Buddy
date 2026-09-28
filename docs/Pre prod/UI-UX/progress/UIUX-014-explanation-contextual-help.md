# UIUX-014 — Explanation and contextual help

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-014

## Implementation

The deterministic explanation is now contextual help: a “Why this recommendation?” heading, clear deterministic badge, short truth-model explanation, and a collapsed full-evidence disclosure. The ranking and explanation data are unchanged.

## Validation

- `npm run typecheck -w web`: PASS.
- Source review: `git diff --check` passed; the change only alters presentation and retains the explanation document fields.
- In-app browser passive demo: the contextual-help heading and full-explanation disclosure rendered after analysis; browser diagnostics were clear.

## Files changed

- `apps/web/src/app/analysis-screen.tsx`
- `apps/web/src/app/globals.css`
- `docs/Pre prod/UI-UX/progress/UIUX-014-explanation-contextual-help.md`

## Next step

UIUX-015 — provenance and technical mode.
