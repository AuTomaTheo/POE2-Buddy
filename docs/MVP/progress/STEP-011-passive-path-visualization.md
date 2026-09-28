# STEP-011 — Passive-path visualization

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 3 / STEP-011  
**Authoring context:** Cursor-assisted development

## 1. Objective

Show the nodes of a recommended path in allocation order, distinguish nodes the character already has from nodes still to take, and compare two paths without creating a new ranking. Do not start STEP-012.

## 2. Acceptance criteria

- [x] A path is a numbered list of node names and ids
- [x] Already-allocated nodes are separate from proposed nodes
- [x] A local sketch highlights the selected path when positions exist
- [x] The numbered list remains when a sketch cannot be drawn
- [x] Two paths can be compared by shared and unique nodes
- [x] Comparison does not pick a winner
- [x] The existing recommendation order is unchanged
- [x] Required repository checks pass

## 3. Implementation summary

The analysis result now includes a node catalog, the character's allocated ids, the class start, and the allocated node each path attaches to. The page renders that path as steps, draws a small coordinate sketch of the path plus its attachment node, and can list the node-set difference of two selected paths. The sketch uses export coordinates. It is not the official tree art, and it does not sort paths.

## 4. Files created

| File                                                   | Purpose                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------- |
| `apps/web/src/lib/path-layout.ts`                      | Allocation steps, node-set comparison, and local map geometry |
| `tests/path-layout.test.ts`                            | Order, comparison, and missing-position checks                |
| `docs/progress/STEP-011-passive-path-visualization.md` | This record                                                   |

## 5. Files changed

| File                                           | Change                                                      |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/src/server/analyze-passive-build.ts` | Adds the catalog and attachment node to the analysis result |
| `apps/web/src/app/analysis-screen.tsx`         | Shows the order, sketch, and comparison                     |
| `apps/web/src/app/globals.css`                 | Styles the sketch and comparison controls                   |
| `tests/analyze-passive-build.test.ts`          | Locks Witch node names and the attachment node              |
| `docs/planning/DECISION_LOG.md`                | D-062                                                       |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`recommendMainTreePaths` still owns the order of the two lists. `analyze-passive-build` looks up names and positions and chooses the attachment node. `path-layout` turns a path into steps and a sketch. The screen renders those values. It does not score, sort, or drop paths.

## 8. External APIs / data sources involved

None. Names and positions come from the existing pinned snapshot.

- provider: local pin
- official export, no auth
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

The analysis result gained `nodes`, `allocatedNodeIds`, `classStartNodeId`, and `entryNodeIds`. Domain types are unchanged. No dependency version changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency file changed.

## 12. Automated tests

| Command/Test           | Result | Notes                             |
| ---------------------- | ------ | --------------------------------- |
| `npm test`             | PASS   | 20 files, 128 tests               |
| `npm run typecheck`    | PASS   | includes the web app              |
| `npm run lint`         | PASS   | exit 0                            |
| `npm run format:check` | PASS   | after this document was formatted |

## 13. Manual verification

Headless Chrome opened `http://localhost:3000` and analyzed the Witch fixture.

- The selected path reads `1. Spell Damage (1755)` then `2. Spell Damage (41965)`.
- Already-allocated nodes are listed separately.
- The local sketch is present, with the note that gray is already allocated and blue is the path.
- Comparing the first two paths shows a node comparison and says it does not decide which path is better.
- The page does not overflow at the default width or at 390px.

## 14. Errors/issues encountered

- symptom: a layout helper declared a set it never read.
- root cause: the shared-node role is computed from the comparison result, so the extra set was unused.
- resolution: the unused set was removed.
- regression test: yes, the path-layout tests still pass.

## 15. Security/privacy impact

No secrets, auth, tokens, or new network calls. The catalog is the same tree data already loaded for analysis.

## 16. Performance impact

The catalog covers allocated nodes plus nodes that appear in the returned paths. The Witch result still returns 309 incomplete paths, and each one can be drawn from that catalog. The sketch itself is a handful of circles.

## 17. Data provenance / reproducibility impact

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. Positions are the export `x` and `y` values. The same path produces the same step numbers.

## 18. Known limitations

The sketch is a local cluster, not the full passive tree and not the official tree artwork. Two nodes can share the name Spell Damage, so the id stays visible. If the first new node touches several allocated nodes, the sketch uses the lowest id. Step numbers on a two-path sketch follow the first selected path. The numbered lists still show both orders.

## 19. Decisions made

D-062 visualization follows the recommendation's node order and does not rank. The numbered list remains when positions are missing. Comparison is a node-set difference.

## 20. Deviations from planning docs

Full visual tree rendering is not included. The roadmap allows the view to stay usable without it. The readable order and the local sketch are the visualization for this step.

## 21. Remaining risks

A reader can still treat the incomplete-path list as a ranking. The sketch can look disconnected from the rest of the tree because only the path and its attachment node are drawn. Shared node names can be confused until the id is read.

## 22. Rollback notes

Remove `path-layout.ts` and its test, and restore the analysis result and screen to the STEP-010 lists of node ids. The passive-tree pin does not need to be restored.

## 23. Recommended next step

Do not start STEP-012 until it is explicitly approved. The next planned step is STEP-012 — Data refresh/version pipeline. It should keep this screen's version display and should not change path order.

## 24. Completion statement

STEP-011 is complete. A recommended path can be followed by name and id, current nodes stay distinct from proposed nodes, and two paths can be compared without a new winner. STEP-012 was not started.

## Allocation Order

The selected path is an ordered list. Step 1 is the first node in `nodeIds`, which is the order returned by path search. On the Witch offensive result, that is `1. Spell Damage (1755)` then `2. Spell Damage (41965)`. The score stays 32. The recommendation order was not changed.

## Current vs Proposed

Already allocated nodes, including the class start, are listed before the path. On the sketch, the allocated node the path touches is gray. Proposed nodes are blue and labeled with their step. The Witch path attaches to allocated node `18845`.

## Local Sketch

The sketch plots export coordinates for the path and its attachment node, plus a second path when two are selected. Purple marks nodes on both selected paths. Orange marks nodes only on the second path. If a required node has no position, the sketch is replaced by a sentence and the numbered list remains.

## Comparison

Two checkboxes select paths. The comparison lists shared nodes and nodes unique to each path, in that path's order. It states that it does not decide which path is better. An incomplete path still says that its full value is unknown.
