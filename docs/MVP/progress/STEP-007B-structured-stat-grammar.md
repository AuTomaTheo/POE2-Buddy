# STEP-007B — Structured PoE stat grammar

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-007B  
**Authoring context:** Cursor-assisted development

## 1. Objective

Replace one-off stat templates with a tokenizer and a grammar that keep numbers, markup, operations, conditions, scopes, and multiple effects. Recalculate coverage on the pinned tree. Reassess scoring readiness. Do not score, and do not start STEP-008.

## 2. Acceptance criteria

- [x] A deterministic tokenizer exists
- [x] Markup tokens keep the source id and the display text
- [x] A line with more than one markup can be represented when the grammar understands the relationship
- [x] Numbers, percentages, and ranges are explicit tokens
- [x] increased, reduced, more, less, penetration, conversion, and gain-as-extra stay distinct
- [x] while, if, when, against, per, with, and for are kept as clauses
- [x] Scopes and actor prefixes are kept
- [x] `increased [Armour] and [Evasion] Rating` is two effects; other `and` lines stay unrecognized
- [x] No rule accepts a line unless every token is consumed
- [x] Raw strings are unchanged
- [x] STEP-007A stat ids still come from the old templates
- [x] Coverage was measured after implementation: 5,963 lines, 4,717 structural, 2,758 semantic, 1,246 unrecognized
- [x] Scoring readiness is `not-ready`
- [x] Required checks pass
- [x] This completion document exists

## 3. Implementation summary

`tokenizePassiveStat` splits a raw line into numbers, ranges, markup, words, and punctuation. `parsePassiveStatExpression` matches one grammar rule against that stream and fails if anything is left over. `parsePassiveStatLine` still tries the STEP-007A templates first, so those stat ids do not move. Lines the templates reject are recognized from the grammar, including their clauses and, for the armour-and-evasion shape, two effects.

`semanticPassiveStat` still uses the old id table for template lines. Grammar lines get a family only when the subject words and markup ids name that family. Conditions and scopes are copied onto the semantic result. `assessStatScoringReadiness` is `not-ready` because damage-type conversion is only partly represented, even though structural coverage is 79.1%.

## 4. Files created

| File                                                 | Purpose                        |
| ---------------------------------------------------- | ------------------------------ |
| `packages/passive-engine/src/tokenize.ts`            | Tokenizer                      |
| `packages/passive-engine/src/tokenize.test.ts`       | Tokenizer tests                |
| `packages/passive-engine/src/grammar.ts`             | Grammar and structured effects |
| `packages/passive-engine/src/grammar.test.ts`        | Grammar tests                  |
| `docs/progress/STEP-007B-structured-stat-grammar.md` | This record                    |

## 5. Files changed

| File                                                | Change                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/passive-engine/src/stats.ts`              | Grammar fills lines the old templates reject                          |
| `packages/passive-engine/src/stats.test.ts`         | Pinned recognized count updated to the measured 4,717                 |
| `packages/passive-engine/src/semantic.ts`           | Structured effects map to families; readiness uses the grammar report |
| `packages/passive-engine/src/stat-coverage.test.ts` | Conditions, scopes, and the new pinned totals                         |
| `packages/passive-engine/src/index.ts`              | Exports the tokenizer, grammar, and readiness report                  |
| `packages/passive-engine/README.md`                 | Describes the grammar and the not-ready result                        |
| `packages/README.md`                                | Passive-engine row mentions the grammar                               |
| `README.md`                                         | Layout line mentions the grammar                                      |
| `docs/planning/DECISION_LOG.md`                     | D-029 through D-036                                                   |

## 6. Files deleted

Temporary inventory scripts under `scripts/` were used to inspect the pin and then deleted. No project file was removed.

## 7. Important code paths / responsibilities

`tokenizePassiveStat` owns tokens. It does not decide what a line means.

`parsePassiveStatExpression` owns the grammar. It returns effects or null.

`parsePassiveStatLine` owns the compatibility view. Template matches stay as they were. Grammar matches become one recognized line, with `effects` when the grammar produced them.

`semanticFamilyForEffect` owns family names for a structured effect. `semanticPassiveStats` returns one semantic stat per effect, or null if any effect has no family.

`highPriorityFamilyReport` classifies the nine STEP-007A blocking families. `assessStatScoringReadiness` uses that report.

## 8. External APIs / data sources involved

- provider: the existing pinned tree in `@poe2-helper/data-sources`
- file: `docs/data-snapshots/passive-tree/data.json`
- official export: grindinggear/poe2-skilltree-export commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, version `0.5.5`
- checksum: `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`
- auth: none
- fields used: node `stats` text already stored as `rawStats`, plus node id and name for unrecognized occurrences
- fetchedAt: `2026-09-26T14:45:00.000Z`
- fallback: none. This step does not fetch

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`StatToken` is a number, range, markup, word, or punctuation. Markup stores `sourceId` and optional `displayText`.

`ParsedPassiveEffect` stores amount, unit, operation, direction, subject text, subject words, markups, clauses, and optional source and target text. `StatClause` stores role, type, text, and markup refs.

`PassiveStatForm` now includes `conversion`, `gain-as-extra`, `chance`, and `regeneration`. A recognized grammar line may include `effects`.

`SemanticPassiveStat` may include `conditions`, `structuredScopes`, and `direction`. Template results omit those fields when they are empty.

`HighPriorityFamilyReport` is a family id plus `supported-semantically`, `supported-structurally`, `partially-supported`, or `still-unsupported`.

No snapshot file and no domain schema changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. Dependency files did not change.

## 12. Automated tests

| Command/Test           | Result | Notes                                               |
| ---------------------- | ------ | --------------------------------------------------- |
| `npm test`             | PASS   | 13 files, 74 tests                                  |
| `npm run typecheck`    | PASS   | Root, web, domain, data-sources, and passive-engine |
| `npm run lint`         | PASS   |                                                     |
| `npm run format:check` | PASS   |                                                     |

Pinned assertions lock 5,963 lines, 4,717 structurally parsed, 2,758 semantically normalized, 1,246 unrecognized, the unrecognized family totals, and readiness `not-ready` because damage-conversion is only partially supported.

## 13. Manual verification

Grammar examples were taken from the pin: conditional attack damage, attack speed with daggers, armour and evasion, gain physical as extra fire, mana-cost conversion, elemental penetration, `Take 30% less Damage`, reservation efficiency, maximum cold resistance, and chance to daze. The deflection-equal-to line, the attack-and-cast-speed line, and the newline damage-conversion line stay unsupported. No browser UI exists for this step.

## 14. Errors/issues encountered

The first coverage run expected the STEP-007A totals of 2,616 recognized lines. The grammar recognizes 4,717. The tests were updated to the measured totals.

`npm run format` also rewrapped `docs/extra steps/STEP-007B-structured-stat-grammar.md`. That file is the step note. The rewrap did not change the instructions that were implemented.

`10% less Damage taken...` would have been counted as outgoing less damage because it does not start with `Take`. The outgoing less-damage flag is still set by `Mirages deal 50% less Damage`, which the grammar stores as direction `dealt`.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or network calls were added. Stat lines are not sent to an LLM.

## 16. Performance impact

Each line is tokenized once per parse. Coverage walks 5,963 lines. The readiness report walks them again. That is acceptable for this pin. Not otherwise measured.

## 17. Data provenance / reproducibility impact

The pin is unchanged. The same raw strings produce the same tokens, effects, semantic ids, and inventory order. Family examples stay the first three distinct lines in locale order.

## 18. Known limitations

1,246 lines are still unrecognized. The largest remainder is `multiple-markup-tokens` at 658 occurrences, then lines with two numbers (133) and lines with no number (101). Damage-type conversion is not parsed, because the pinned sentence has a second clause. `Gain Deflection equal to N% of Evasion` stays unrecognized. A numeric range is tokenized and then left unrecognized. This step does not score.

## 19. Decisions made

- D-029 — tokenizer model
- D-030 — whole-line grammar, with the old templates kept first
- D-031 — conditions and scopes are clauses
- D-032 — armour and evasion coordination
- D-033 — conversion versus gain-as-extra
- D-034 — damage taken versus damage dealt
- D-035 — semantic ids stay stable
- D-036 — readiness needs operations and family support, not only 70%

## 20. Deviations from planning docs

The example type names in the step note were shortened to the names already used in this package (`ParsedPassiveEffect`, `damage` rather than `SPELL_DAMAGE`). The meaning matches the note.

`ParseStatus` values such as `recognized-conditional` were not added. A recognized line with `effects` and clauses is the structured result. A null expression is unsupported. Downstream code can tell those apart without a third status string.

## 21. Remaining risks

A later scorer could ignore `conditions` or `direction` and treat conditional or taken damage as generic damage. Damage-type conversion is still missing, so a damage score would not see that mechanic. 79.1% structural coverage is not the same as 79.1% of scoring-relevant meaning: semantic coverage is 46.3%.

## 22. Rollback notes

Revert the tokenizer, grammar, semantic, and stat changes, their tests and exports, the README lines, and D-029 through D-036. The passive-tree pin does not need to change. STEP-007A behavior returns if the grammar fallback is removed.

## 23. Recommended next step

Do not start STEP-008. Scoring readiness is `not-ready` because damage-type conversion is only partially supported. The next work is a grammar step that can represent that conversion, including a second clause when both clauses are fully parsed, or an explicit decision to score without it. Wait for approval before either.

## 24. Completion statement

STEP-007B is complete. The tokenizer, grammar, semantic mapping, coverage, and readiness report are in place. Scoring readiness is `not-ready`. STEP-008 was not started.

## Tokenizer Design

`tokenizePassiveStat` scans left to right. Spaces and tabs are skipped. A newline is a punctuation token, so a two-clause line cannot be parsed as if the second clause were absent. `+10`, `-7%`, `0.2%`, and `10-20` are numeric tokens. `[Spell]` and `[EnergyShield|Energy Shield]` are markup tokens with `sourceId` and optional `displayText`. Other letters are words. Any other character is punctuation. The tokenizer is pure and has no semantic table.

## Grammar Design

Rules run in a fixed order. The first rule that consumes every token wins. The order is gain-as-extra, penetration, `Take`, actor `deal`/`have`, chance, regeneration, conversion, added values, then percent increased/reduced/more/less.

Qualifier words end the subject and start a clause. `while`, `if`, and `when` are conditions. `against`, `per`, `with`, and `for` are scopes. The only coordination rule is `markup and markup`, plus words on the second markup. Any other `and`, any second number, any newline, and any leftover punctuation fail the line.

STEP-007A templates still match first. Their stat ids are unchanged. Grammar stat ids include the clauses, so `increased Attack Speed with Daggers` does not reuse the bare attack-speed id.

## Coverage Before vs After

| Measure                 |    STEP-007A |    STEP-007B |
| ----------------------- | -----------: | -----------: |
| Total lines             |         5963 |         5963 |
| Structurally parsed     | 2616 (43.9%) | 4717 (79.1%) |
| Semantically normalized | 1845 (30.9%) | 2758 (46.3%) |
| Unrecognized            | 3347 (56.1%) | 1246 (20.9%) |

Percentages are one decimal place, half up. 1,959 structurally parsed lines do not all map to a semantic family. The pin did not change.

## Remaining Unknown Stat Inventory

| Family                  | STEP-007A | STEP-007B | Distinct lines now |
| ----------------------- | --------: | --------: | -----------------: |
| multiple-markup-tokens  |      1859 |       658 |                425 |
| multiple-numeric-values |       133 |       133 |                120 |
| no-numeric-value        |       101 |       101 |                100 |
| unclassified            |        89 |        87 |                 46 |
| energy-shield           |        83 |        81 |                 13 |
| life                    |       144 |        68 |                 33 |
| when                    |        32 |        26 |                 22 |
| per                     |        36 |        20 |                 14 |
| chance                  |        87 |        16 |                 13 |
| for                     |        73 |        12 |                 10 |
| while                   |       133 |         9 |                  8 |
| armour                  |        18 |         6 |                  6 |
| with                    |       107 |         6 |                  4 |
| flat-unstructured       |        44 |         4 |                  3 |
| minion                  |        14 |         3 |                  3 |
| conversion              |        16 |         2 |                  2 |
| evasion                 |         3 |         2 |                  2 |
| increased-unstructured  |       255 |         2 |                  2 |
| resistance              |         8 |         2 |                  2 |
| against                 |        38 |         1 |                  1 |
| cast-speed              |         1 |         1 |                  1 |
| critical                |         1 |         1 |                  1 |
| if                      |         8 |         1 |                  1 |
| less                    |         2 |         1 |                  1 |
| more                    |         3 |         1 |                  1 |
| movement-speed          |         4 |         1 |                  1 |
| projectile              |         1 |         1 |                  1 |

`while`, `with`, `for`, `against`, and `if` shrank because those words are now clauses when the rest of the line parses. `multiple-numeric-values` did not shrink. Two numbers still fail the line. `reduced` and `penetration` left the unrecognized inventory. `multiple-markup-tokens` is still the largest remainder.

## High-Priority Family Status

| Family                           | Status                 | Reason                                                                                                                                |
| -------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| more-damage                      | supported semantically | `N% more Damage` keeps operation `more` and any against/with clauses                                                                  |
| less-damage                      | supported semantically | `Mirages deal 50% less Damage` is direction `dealt`                                                                                   |
| damage-reduction                 | supported semantically | `Take 30% less Damage` is direction `taken` and semantic id `damage-taken`                                                            |
| gain-as-extra                    | supported semantically | Source and target markup are both stored, separate from conversion                                                                    |
| damage-conversion                | partially supported    | Mana or life cost conversion parses. `75% of Damage Converted to Fire Damage` is followed by another clause, so it stays unrecognized |
| conditional-damage               | supported semantically | The condition clause is stored and the line is not unconditional damage                                                               |
| elemental-resistance-penetration | supported semantically | `Damage Penetrates N% of Enemy Elemental Resistances` is separate from fire, cold, and lightning penetration                          |
| maximum-resistance               | supported semantically | `+N% to [MaximumResistances\|...]` keeps the maximum display text                                                                     |
| reservation                      | supported semantically | Reservation, efficiency, and the related skill markup are all kept                                                                    |

## Semantic Coverage

2,758 of 5,963 lines (46.3%) have a semantic family for every effect on the line. Template lines still use the STEP-007A ids, including separate ids for Critical Damage Bonus and Critical Spell Damage Bonus, and for critical chance versus critical chance for spells or attacks. Grammar lines add the family only from an explicit subject rule. A multi-effect line counts once, and only when both effects have a family. 1,959 recognized lines stay structurally parsed without a semantic family.

## STEP-008 Scoring Readiness

Status: **not-ready**.

Extraction coverage: 79.1%. Semantic coverage: 46.3%.

The 70% structural target is met. Every required common family is present. `more`, `less`, `conversion`, and `gain-as-extra` all occur as operations. That is not enough to score. `damage-conversion` is only partially supported, and that family blocks STEP-008. STEP-008 was not started.
