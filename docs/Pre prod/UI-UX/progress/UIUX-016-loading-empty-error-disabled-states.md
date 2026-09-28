# UIUX-016 — Loading, empty, error, and disabled states

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-016

## Implementation

The craft-target planner now disables its submit action during source-pool work, labels the button with the operation in progress, clears stale output before planning, and exposes a status message that says what is being checked. Existing import, PoB2 measurement, comparison, alert, and disabled states already use the shared loading/alert treatment and were reviewed for consistency.

## Validation

- `npm run typecheck -w web`: PASS.
- `git diff --check`: PASS.
- Fresh in-app browser tab at `/build/crafting`: the empty `No targets yet.` state and disabled `Plan targets` button rendered in the accessibility tree; browser diagnostics were clear.

## Files changed

- `apps/web/src/app/craft-targets/craft-target-planner.tsx`
- `docs/Pre prod/UI-UX/progress/UIUX-016-loading-empty-error-disabled-states.md`

## Impact and next step

No planner rules, target data, or source-pool behavior changed. UIUX-017 — product-owner test mode is next.
