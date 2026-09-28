# UIUX-007 — Passive tree canvas

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** UI/UX master / UIUX-007

## Objective

Improve the existing coordinate-based local passive path view with deliberate navigation controls while retaining its truthful local-map scope.

## Acceptance criteria

- [x] The local coordinate map has zoom, pan, and fit-path controls.
- [x] Allocated, proposed, shared, and comparison-only nodes retain their existing visual roles.
- [x] Node hover titles retain node name, id, and allocation step.
- [x] The map remains clearly labeled as a local view.
- [x] No passive engine calculation, path order, or map-data derivation changed.

## Implementation summary

Created `PassiveTreeCanvas`, a client presentation component that renders the existing `PathMap`. It recalculates only the SVG viewport for zoom and directional pan, with a reset-to-fit action. Existing edges, node roles, tooltips, step markers, and comparison overlay data are rendered unchanged.

## Files created

- `apps/web/src/app/passives/passive-tree-canvas.tsx`
- `docs/Pre prod/UI-UX/progress/UIUX-007-passive-tree-canvas.md`

## Files changed

- `apps/web/src/app/analysis-screen.tsx`: uses the dedicated canvas component.
- `apps/web/src/app/globals.css`: canvas header and responsive control layout.

## Data model, APIs, credentials, and routes

None changed. The component consumes the existing `PathMap`; no API, persistence, credential, or route change was introduced.

## Validation

- `npm run typecheck -w web`: PASS.
- Targeted ESLint and Prettier commands were run for changed files.
- In-app browser, passive recommendation demo: the canvas rendered; Zoom in changed the announced level to 125%; Fit path restored 100%; diagnostics were clear.

## Accessibility and responsive behavior

The canvas is a named section with a named image and semantic buttons in a labeled control group. The current zoom is announced politely. At narrow widths the header stacks and controls wrap.

## Known limitations

This remains a local coordinate view of the selected paths, not a full official passive-tree recreation. Directional controls provide reliable keyboard/touch pan; pointer-drag pan is not part of this step.

## Security, performance, provenance, rollback

No security or privacy impact. Viewport changes are local state only. Rendering uses existing map points and edges, preserving provenance. Roll back by restoring the prior inline SVG renderer and removing the component/CSS.

## Next step

UIUX-008 — PoB2 exact measurement experience.
