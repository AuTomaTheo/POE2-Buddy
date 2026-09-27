# STEP-010 — Minimal analysis screen

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 3 / STEP-010  
**Authoring context:** Cursor-assisted development

## 1. Objective

Show one passive-tree analysis in the browser: choose a fixture, an objective, and a point budget, then display the scoring-engine recommendation, its breakdown, and the tree version. The page does not rank paths. Do not start STEP-011.

## 2. Acceptance criteria

- [x] A fixture can be selected or imported
- [x] The objective and passive-point budget come from the form
- [x] Analyze runs one recommendation
- [x] Fully valued paths and incomplete paths are listed separately
- [x] The score breakdown can be expanded
- [x] The tree version is shown
- [x] Invalid input and search-limit failures are shown as errors
- [x] The UI does not contain optimization logic
- [x] Required repository checks pass

## 3. Implementation summary

The form posts to a server action. `runPassiveAnalysis` loads the pinned tree, reads a bundled fixture or pasted JSON, replaces the fixture goals with the form objective and budget, and calls `recommendMainTreePaths` with K of 5. The page renders the claim, the two lists, and each path's contributions in the order the scoring engine returned. It does not sort or drop paths.

## 4. Files created

| File                                                | Purpose                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| `apps/web/src/server/analyze-passive-build.ts`      | Loads a fixture and calls the recommendation API |
| `apps/web/src/app/actions.ts`                       | Server action used by the form                   |
| `apps/web/src/app/analysis-screen.tsx`              | Fixture form and result display                  |
| `apps/web/src/app/globals.css`                      | Layout for the analysis screen                   |
| `tests/analyze-passive-build.test.ts`               | Request validation and pinned fixture results    |
| `docs/progress/STEP-010-minimal-analysis-screen.md` | This record                                      |

## 5. Files changed

| File                            | Change                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| `apps/web/package.json`         | Depends on the engine packages and runs Next with webpack             |
| `apps/web/next.config.ts`       | Transpiles workspace packages and maps `.js` specifiers to TypeScript |
| `apps/web/src/app/page.tsx`     | Renders the analysis screen                                           |
| `apps/web/src/app/layout.tsx`   | Loads the stylesheet                                                  |
| `apps/web/README.md`            | Says the screen displays the recommendation                           |
| `README.md`                     | Says the local app can analyze a fixture                              |
| `package-lock.json`             | Links the web app to the workspace packages                           |
| `docs/planning/DECISION_LOG.md` | D-061                                                                 |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`runPassiveAnalysis` owns fixture loading, goal replacement, and error text. `recommendMainTreePaths` still owns enumeration, scoring, and the Top-K split. `AnalysisScreen` renders the returned lists and the claim sentences. The passive engine still does not decide desirability. The page does not compute a score.

## 8. External APIs / data sources involved

None. The screen reads the local development pin unless `POE2_PASSIVE_TREE_SNAPSHOT_DIR` is set.

- provider: local pin and the Witch and Warrior fixtures
- official export, no auth
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call

## 9. Credentials / environment variables

### Added/changed variable names

None. The existing `POE2_PASSIVE_TREE_SNAPSHOT_DIR` is optional. When it is unset, the local app uses the development pin.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

No domain type changed. The web app gained an `AnalysisResult` return type. No dependency version changed. `npm audit` reported 0 vulnerabilities.

## 11. Commands executed

```bash
npm install
npm audit
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

## 12. Automated tests

| Command/Test           | Result | Notes                             |
| ---------------------- | ------ | --------------------------------- |
| `npm test`             | PASS   | 19 files, 125 tests               |
| `npm run typecheck`    | PASS   | includes the web app              |
| `npm run lint`         | PASS   | exit 0                            |
| `npm run format:check` | PASS   | after this document was formatted |
| `npm audit`            | PASS   | 0 vulnerabilities                 |

## 13. Manual verification

The Cursor browser tool did not connect. The same flows were run in headless Chrome against `http://localhost:3000`.

- Witch, offensive, budget 5: claim `not-definitive-incomplete-valuation`, first path `1755 → 41965` at score 32, 309 incomplete paths, tree version `0.5.5`, and the expanded breakdown shows `spell-damage`.
- Warrior, defensive, budget 3: claim `no-complete-candidate`, 41 incomplete paths, first summary says full value unknown.
- Budget 6: alert `Point budget 6 exceeds the path search limit of 5.`
- Pasted `{`: alert `The fixture is not valid JSON.`
- A 390px-wide viewport shows the analyzed page without horizontal page overflow.

## 14. Errors/issues encountered

- symptom: the dev server could not resolve `./tokenize.js` inside the passive engine.
- root cause: those packages import TypeScript with a `.js` specifier. Turbopack does not apply the webpack `extensionAlias` map.
- resolution: `npm run dev` and `npm run build` for the web app use `next --webpack`, and `experimental.extensionAlias` maps `.js` to `.ts`.
- regression test: the page compiled and the browser flow above completed.

- symptom: typecheck rejected `character.name` as `string | undefined`.
- root cause: the character name is optional in the domain schema.
- resolution: a missing name is shown as `Unnamed character`.
- regression test: the Witch fixture still returns `Fixture Witch`.

- symptom: the form overflowed a 390px viewport by about 8 pixels.
- root cause: the file and text controls used their intrinsic width inside the padded page.
- resolution: form controls use the container width, and an open breakdown scrolls inside its own details element.
- regression test: the narrow Chrome check reported no page overflow after analysis.

## 15. Security/privacy impact

No secrets, auth, tokens, or new network calls. Pasted fixture JSON is parsed on the server and is not written to disk. A fixture id is accepted only when it is one of the two bundled names, so the form cannot choose an arbitrary file path. Pasted JSON larger than 1,000,000 characters is rejected.

## 16. Performance impact

The pinned tree and graph are cached for the process after the first analysis. The Witch budget of 5 still scores 311 paths. The page then renders all incomplete paths. That list is long on purpose, because incomplete paths stay visible.

## 17. Data provenance / reproducibility impact

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. The screen shows that version, the commit, the profile, and profile version 1.

## 18. Known limitations

K is fixed at 5. The screen does not draw the passive tree. It does not import a live character. A budget above 5 is rejected by the existing search limit. Many paths remain incomplete, so the second list can be hundreds of rows.

## 19. Decisions made

D-061 the screen displays `recommendMainTreePaths` and does not rank. The form objective and budget replace the fixture goals. The local app uses the development pin when the snapshot directory variable is unset.

## 20. Deviations from planning docs

None. The import area is a file picker plus a paste box. Pasted JSON is used when the box is not empty.

## 21. Remaining risks

A reader can still treat the incomplete list order as a ranking even though the claim says it is not definitive. The incomplete list is large enough to make the page long. Webpack is required for this app until the package import specifiers and Turbopack agree.

## 22. Rollback notes

Restore the scaffold page, remove the analysis modules and the web dependency on the engine packages, and return the web scripts to `next dev` and `next build`. The passive-tree pin does not need to be restored.

## 23. Recommended next step

Do not start STEP-011 until it is explicitly approved. The next planned step is STEP-011 — Passive-path visualization. It should show the node order from this screen and should not add a second ranking.

## 24. Completion statement

STEP-010 is complete. The browser can analyze a fixture, show both result lists, expand a breakdown, and show the tree version. STEP-011 was not started.
