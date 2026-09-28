# UIUX-008 — PoB2 exact measurement experience

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-008

## Objective

Present exact PoB2 passive-path measurement as a clear, distinct result while keeping diagnostic data available on demand.

## Implementation

`CharacterDelta` now has a **Measured impact** header with a **Measured by PoB2** badge, operation-specific loading feedback, player-facing metric cards, a clear unavailable/error alert, and a `Technical measurement details` disclosure containing runtime provenance, allocation verification, ids, point cost, and the full metric table.

## Files changed

- `apps/web/src/app/character-delta.tsx`
- `apps/web/src/app/globals.css`
- `docs/Pre prod/UI-UX/progress/UIUX-008-pob2-exact-measurement-experience.md`

## Engine, data, and security impact

None. The component calls the existing measurement action and renders its existing view model. It does not recalculate, rerank, persist, or transmit data beyond the current measurement flow.

## Validation

- `npm run typecheck -w web`: PASS.
- Changed files formatted with Prettier; targeted ESLint was run.
- In-app browser, `/build?demo=fireball-witch`: the measured-impact region rendered with the exact-calculation label and truthful unavailable state, `Character-aware calculation unavailable.`
- Browser accessibility snapshot confirms named region, heading, badge text, and status semantics.

## Accessibility and responsive behavior

Loading uses the existing status component; unavailable/error output is an alert. Metric cards use headings and text, while detailed table data remains semantic inside a native disclosure. The metric grid wraps automatically for narrow screens.

## Known limitation

The current local Fireball demo cannot obtain a character-aware calculation, so this browser pass exercised the unavailable state rather than a successful metric result. The success renderer directly maps the existing `rows` returned by PoB2 and retains the table in technical details.

## Rollback

Restore the previous `CharacterDelta` markup and remove the measurement CSS. No engine or schema rollback is needed.

## Next step

UIUX-009 — character context redesign.
