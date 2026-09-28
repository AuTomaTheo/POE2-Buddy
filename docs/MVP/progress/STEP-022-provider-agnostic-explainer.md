# STEP-022 — Provider-agnostic explanation layer

**Date:** 2026-09-28  
**Status:** COMPLETE  
**Roadmap reference:** Phase 7 / STEP-022  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a provider-agnostic explanation layer that turns already calculated facts into readable wording, without an LLM provider or any new numerical decision.

## 2. Acceptance criteria

- [x] The explainer package does not import engine, UI, or network clients.
- [x] Input and output are runtime-validated structured facts.
- [x] The deterministic provider repeats supplied numbers and does not calculate new ones.
- [x] Heuristic scores stay distinct from PoB2 measurements.
- [x] Partial, unresolved, and no-winner states stay explicit.
- [x] Community craft wording does not claim an official probability.
- [x] User labels are quoted as data.
- [x] Over-limit input fails validation.
- [x] Analysis still succeeds when explanation is disabled or rendering throws.
- [x] The analysis page labels the section as a deterministic explanation.
- [x] No remote model, API key, or craft simulator was added.

## 3. Implementation summary

`@poe2-helper/ai-explainer` validates `ExplanationInput` and renders it with `deterministic-fallback`. The web adapter builds that input from a successful passive analysis. The analysis page shows the wording under "Deterministic explanation". A rendering failure leaves the recommendation in place.

## 4. Files created

| File                                                    | Purpose                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| `packages/ai-explainer/src/version.ts`                  | Schema version, interface version, and limits. |
| `packages/ai-explainer/src/schema.ts`                   | Fact, input, and document schemas.             |
| `packages/ai-explainer/src/sanitize.ts`                 | Quotes user text as data.                      |
| `packages/ai-explainer/src/provider.ts`                 | Provider interface and mode flag.              |
| `packages/ai-explainer/src/deterministic.ts`            | Local template renderer.                       |
| `packages/ai-explainer/src/deterministic.test.ts`       | Boundary tests.                                |
| `packages/ai-explainer/src/index.ts`                    | Public exports.                                |
| `apps/web/src/server/explanation-from-analysis.ts`      | Analysis-to-fact adapter.                      |
| `tests/explanation.test.ts`                             | Analysis isolation tests.                      |
| `docs/progress/STEP-022-provider-agnostic-explainer.md` | Step record.                                   |

## 5. Files changed

| File                                        | Change                                      |
| ------------------------------------------- | ------------------------------------------- |
| `apps/web/src/app/actions.ts`               | Attaches an explanation after analysis.     |
| `apps/web/src/app/analysis-screen.tsx`      | Shows the explanation section.              |
| `apps/web/src/app/globals.css`              | Styles the explanation section.             |
| `apps/web/package.json`                     | Depends on the explainer package.           |
| `apps/web/next.config.ts`                   | Transpiles the explainer package.           |
| `package.json`                              | Typechecks the explainer package.           |
| `.env.example`                              | Documents `EXPLAINER_MODE`.                 |
| `docs/planning/DECISION_LOG.md`             | Adds D-094.                                 |
| `docs/planning/POST-MVP-POLISH-REGISTER.md` | Records the deterministic provider as done. |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`explanationInputFromAnalysis` chooses the facts. `renderDeterministicExplanation` only interpolates those facts. `attachAnalysisExplanation` catches renderer failures. `readExplainerMode` accepts `disabled` or `deterministic`.

## 8. External APIs / data sources involved

None. The renderer does not call a model, Craft of Exile, poe.ninja, or GGG.

## 9. Credentials / environment variables

### Added/changed variable names

`EXPLAINER_MODE`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`EXPLANATION_SCHEMA_VERSION` is 1. `EXPLAINER_INTERFACE_VERSION` is 1. Engine schemas were not changed.

## 11. Commands executed

```text
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm test` passed: 52 files, 412 tests. Dependency install added the local workspace package. `npm audit` reported 0 vulnerabilities.

## 12. Automated tests

The package tests cover determinism, supplied numbers, heuristic versus measured wording, partial readiness, a no-winner comparison, community craft provenance, an instruction-like label, input limits, a rejected raw payload field, and the mode flag. The web test checks the Witch ranking, disabled mode, and a thrown renderer.

## 13. Manual verification

The in-IDE browser was unavailable (`Server not found: cursor-ide-browser`). The automated analysis test is the check that ran: the Witch fixture still ranks node ids 1755 then 41965 with heuristic score 32, and the attached document uses provider `deterministic-fallback`. Disabled mode and a thrown renderer were checked in that same test. The running app at `http://localhost:3000` was not clicked.

## 14. Errors/issues encountered

The browser MCP did not register, so the page click-through was not repeated in this step.

## 15. Security/privacy impact

Explanation input excludes raw PoB text, export codes, OAuth material, and full item text. User labels are quoted and do not change section structure. No explanation content is sent to telemetry.

## 16. Performance impact

The default path formats a small fact list in process. It does not add a network call.

## 17. Data provenance / reproducibility impact

The document carries provider id `deterministic-fallback`, kind `local-template`, schema version 1, and interface version 1. Provenance labels repeat the scoring profile, tree version, gear normalization version, and character-context version already on the analysis result.

## 18. Known limitations

The analysis adapter explains the passive analysis result. Upgrade and craft wording exist for supplied facts and are not attached to the separate upgrade or craft-target requests. The template does not write a craft route, an expected cost, or a new ranking.

## 19. Decisions made

D-094. STEP-021 stays deferred. The local template is the only provider.

## 20. Deviations from planning docs

`EXPLAINER_MODE` values other than empty or `deterministic` are treated as disabled, so an unknown name cannot select a remote provider.

## 21. Remaining risks

A future provider could ignore the fact boundary. STEP-023 has to keep system policy, facts, and user labels separate.

## 22. Rollback notes

Remove `@poe2-helper/ai-explainer`, the adapter, and the explanation section. Analysis returns to the previous action result.

## 23. Recommended next step

Choose whether to connect a real provider. That choice is STEP-023 and was not made here.

## 24. Completion statement

STEP-022 is complete. The deterministic explanation repeats supplied facts and leaves the Witch ranking unchanged.

## Why STEP-022 Exists

The engines already produce recommendations, context, gear readiness, and craft-target facts. Readers need those facts in sentences without a model inventing a score.

## STEP-021 Deferral

Craft simulation stays in the post-MVP polish register. This step does not cancel it and does not implement it.

## Explanation Boundary

Engine result, then structured facts, then wording. The explainer is not a source of rankings, prices, probabilities, or mechanic rules.

## Fact Schema

A fact has a stable id, category, label, optional value, unit, text, direction, and a source kind of engine, user-label, or provenance. Limits are 48 facts, 240 characters, 12 warnings, and 5 candidates.

## Provider Interface

`ExplainerProvider.explain` returns an `ExplanationDocument`. The current capability is provider id `deterministic-fallback`, kind `local-template`, network not required, and configured.

## Deterministic Provider

The same input produces the same document. Templates interpolate supplied values and do not multiply, rank, or round a new percentage.

## Data Minimization

The adapter sends the objective, the fully valued candidate order up to five paths, the first path's node ids and up to three supported contributions, skill and gear readiness, a few mechanic and item labels, and short provenance labels. It does not send the whole application state.

## Untrusted Text Handling

Character, skill, and item labels use `sourceKind: "user-label"` and are rendered in quotes. Their text does not choose a section or a winner.

## Heuristic vs Measured Language

A heuristic score is described as a heuristic score. A calculator fact is described as a separate PoB2 measurement.

## Upgrade Wording

`no-positive-within-budget` produces no winner sentence. A winner sentence is used only when the supplied summary is positive and a winner id is present. User-entered and normalized prices keep those words.

## Crafting Wording

Eligible targets can be described as source-pool eligible. A community chance must say community-derived and can repeat the supplied patch. The template does not say official or exact GGG probability.

## Disabled Mode

`EXPLAINER_MODE=disabled` returns the analysis with explanation status disabled. The recommendation is unchanged.

## Failure Isolation

If rendering throws, the response status is an explanation error and the recommendation fields stay in the response.

## Versioning

`EXPLANATION_SCHEMA_VERSION` is 1. `EXPLAINER_INTERFACE_VERSION` is 1.

## UI Verification

The explanation section is rendered when the analysis response status is ready, and it includes the text "Deterministic explanation". The Witch ranking assertion is in `tests/explanation.test.ts`. A live browser click was not available in this session.

## Security / Privacy

No new secret is required. Existing `AI_API_KEY` is unused. No analytics provider was added.

## Known Limitations

Upgrade comparison and the craft-target page do not yet build explanation facts. The passive analysis page does.

## STEP-023 Readiness

The provider interface, fact boundary, deterministic fallback, analysis-page integration, and input limits are ready. STEP-023 still needs an intentional provider choice and credentials.

## MVP Status

The explanation checklist item is in place. This step did not re-run the full MVP exit checklist, so the MVP is ready to enter that review and is not declared finished here.

STEP-022 COMPLETE  
STEP-023 READY FOR PROVIDER-SELECTION DECISION
