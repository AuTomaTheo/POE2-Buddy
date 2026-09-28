# STEP-007 — Stat extraction and normalization

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-007  
**Authoring context:** Cursor-assisted development

## 1. Objective

Turn passive stat text into canonical stat ids where the whole line matches an explicit template. Keep every raw line. Flag lines that were not parsed. Report how many lines were recognized and how many were not. Do not score the values.

## 2. Acceptance criteria

- [x] Every node still reports its raw stats
- [x] Recognized stats expose a canonical id, label, amount, unit, and form
- [x] Unrecognized stats stay visible and are flagged
- [x] Unknown lines are not dropped
- [x] A coverage report counts parsed and unparsed lines on the pinned tree
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`extractPassiveNodeStats` returns a node's `rawStats` and one result line per raw string, in the same order. `parsePassiveStatLine` recognizes a line only when the entire string matches one of four templates:

- `+N to [Id]` or `+N to [Id|Name]`
- `+N to any [Id|Name]`
- `+N to maximum [Id|Name]`
- `N% increased [Id]` or `N% increased [Id|Name]`, with at most one trailing word

The canonical id is `form.sourceId.visible-words`. `CriticalDamageBonus` used for critical damage bonus and for critical spell damage bonus therefore stays two stats. The amount is the integer in the line. `unit` is `percent` or `flat`. `form` is `increased` or `added`, which records the template, not a damage calculation.

Any other line, including lines with two markup tokens or a conditional clause, is `{ status: "unrecognized", raw }`.

`passiveStatCoverage` counts nodes, lines, recognized ids, and unrecognized raw strings. On the pinned tree that is 5,963 lines, 1,821 recognized and 4,142 unrecognized.

## 4. Files created

| File                                        | Purpose                                       |
| ------------------------------------------- | --------------------------------------------- |
| `packages/passive-engine/src/stats.ts`      | Stat line parser and coverage report          |
| `packages/passive-engine/src/stats.test.ts` | Template, unknown-line, and pinned-tree tests |
| `docs/progress/STEP-007-stat-extraction.md` | This progress record                          |

## 5. Files changed

| File                                   | Change                                          |
| -------------------------------------- | ----------------------------------------------- |
| `packages/passive-engine/src/index.ts` | Exports the parser and coverage types           |
| `packages/passive-engine/README.md`    | Describes the templates and the lack of scoring |
| `packages/README.md`                   | Notes stat extraction on the passive-engine row |
| `README.md`                            | Layout line for passive-engine                  |
| `docs/planning/DECISION_LOG.md`        | D-023                                           |

## 6. Files deleted

`None`. A temporary script that counted stat templates was removed before this document.

## 7. Important code paths / responsibilities

- `rawStats` on `PassiveNode` is unchanged. Extraction does not rewrite the snapshot.
- `parsePassiveStatLine` owns the templates. Search and scoring do not parse text themselves.
- `extractPassiveNodeStats` preserves order and length. An empty node returns an empty line list.
- `passiveStatCoverage` is the recognized-versus-unrecognized report. It does not drop unrecognized text. The distinct unrecognized strings are listed with counts.
- No score, weight, or path ranking is produced.

## 8. External APIs / data sources involved

No new download. Counts come from the STEP-003 pin.

- Source: https://github.com/grindinggear/poe2-skilltree-export
- Commit: `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- Version: `0.5.5`
- Checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- Skill nodes: 5,152
- Stat lines: 5,963
- Recognized lines: 1,821
- Unrecognized lines: 4,142

Spell Damage node `4739` has the single raw line `10% increased [Spell] Damage`, recognized as `increased.Spell.increased-spell-damage` with amount 10. There are 43 lines with that stat id on the pin.

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`RecognizedPassiveStat` and `UnrecognizedPassiveStat` are analysis results in the passive engine. They are not stored on `PassiveNode`. `PassiveStatCoverage` is the report shape.

No domain schema change. No database change.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Dependencies did not change, so `npm audit` was not run again. The previous audit reported 0 vulnerabilities.

## 12. Automated tests

| Command/Test           | Result | Notes                                                                                                                                                                                                                        |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`             | PASS   | 10 files, 51 tests. Adds spell damage, the two Critical Damage Bonus displays, flat Strength, any Attribute, maximum Energy Shield, a two-token line that stays unrecognized, an empty node, and the pinned coverage counts. |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine                                                                                                                                                                          |
| `npm run lint`         | PASS   | Exit code 0                                                                                                                                                                                                                  |
| `npm run format:check` | PASS   |                                                                                                                                                                                                                              |

## 13. Manual verification

No UI changed. The template list was chosen by reading distinct stat strings on the pinned export. The unit test checks node `4739` and the 5,963 / 1,821 / 4,142 split.

## 14. Errors/issues encountered

None. The first stat-extraction test run passed.

## 15. Security/privacy impact

No secrets, account data, or network calls. Parsing uses stat text already stored on the snapshot.

## 16. Performance impact

Not measured as a budget. Coverage walks each stat line once. The full suite, including that walk over the pinned tree, finished in about 4 seconds.

## 17. Data provenance / reproducibility impact

The pin did not change. The same raw string always produces the same stat line. Recognized ids are sorted by `statId`. Unrecognized rows are sorted by count, then by raw text.

## 18. Known limitations

- 4,142 of 5,963 lines are unrecognized. That includes conditional text, minion lines, "more" and "reduced" lines, and lines with more than one markup token.
- `increased` and `added` name the template. They are not an increased-versus-more damage calculation.
- A trailing word is recognized only when it is a single word. A longer suffix stays unrecognized.
- Markup ids that contain a character other than a letter are unrecognized.
- Nothing is scored. An unrecognized line is not zero.

## 19. Decisions made

- D-023: only whole-line templates are recognized. The stat id includes the export markup id and the visible words. Unknown lines stay in the result and in the coverage report.

## 20. Deviations from planning docs

The architecture example puts normalized contributions in the scoring engine. This step stops at extraction. `StatContribution` in the domain recommendation schema is unchanged and is not filled in.

Stat parsing lives in `passive-engine` beside the graph, because it reads passive node text and does not score it.

## 21. Remaining risks

- A later template can merge two different lines if it is looser than a whole-string match. D-023 requires a regression test for each new whole line.
- Scoring that treats unrecognized lines as zero would hide most of the tree. STEP-008 has to keep those lines visible.
- The same visible words with a different markup id would be different stat ids. That is intentional, and a later alias list would be a new decision.

## 22. Rollback notes

Delete `packages/passive-engine/src/stats.ts` and its test, remove the exports, and remove D-023. `rawStats` on the snapshot stays as it was.

## 23. Recommended next step

STEP-008 — Configurable heuristic scoring.

Score only recognized stats, keep unrecognized lines visible, and use `candidateSelectionClaim` for truncated searches. Do not start that step until it is approved.

## 24. Completion statement

STEP-007 satisfies the acceptance criteria. Every node still exposes its raw stats, recognized lines have canonical ids and amounts, unrecognized lines are flagged and counted, and no score was calculated.
