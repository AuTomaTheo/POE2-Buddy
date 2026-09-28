# STEP-007C — Semantic hardening

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 2 / STEP-007C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden passive-stat meaning so a multi-clause line is kept only when every clause parses, incoming and outgoing damage stay distinct, Evasion-to-Deflection stays a ratio, unmapped structured lines are inventoried, and a path has its own semantic coverage and confidence. Scoring readiness is reassessed. Scoring itself is not implemented.

## 2. Acceptance criteria

- [x] A multi-clause line parses only when every clause is fully understood
- [x] An unsupported clause rejects the whole line
- [x] Prefix `Take`, suffix `Damage taken`, and actor `deal` set direction
- [x] Direction stays separate from more, less, increased, and reduced
- [x] Evasion to Deflection is a derived ratio with its own semantic id
- [x] The structured-but-unmapped inventory is deterministic
- [x] Only safe-to-map-now groups received new semantic ids
- [x] Path coverage counts stat lines and keeps unknown lines visible
- [x] Confidence thresholds are recorded, and search completeness stays separate
- [x] The STEP-008 contract is documented
- [x] Scoring readiness is reassessed and is `not-ready`
- [x] STEP-008 was not started

## 3. Implementation summary

Newline-separated clauses are parsed one at a time. If any clause fails, the line stays unrecognized. A subject word `taken` sets direction `taken` when the direction was unspecified. `Take` and `deal` keep their existing directions. `Gain Deflection Rating equal to N% of Evasion Rating` is operation `derived-from` and semantic id `deflection-from-evasion`. The same shape from Armour is `deflection-from-armour`. The percent is stored as the ratio. No Deflection total is calculated.

`unmappedStructuredInventory` groups recognized lines that still have no semantic family. Three unambiguous groups were mapped: skill effect duration, area of effect, and skill speed. `pathSemanticCoverage` reports mapped, structurally parsed only, and unrecognized stat lines for the nodes it is given. Confidence is complete, high, partial, or low from the thresholds in D-042. `assessStatScoringReadiness` no longer treats a partial family as a blocker. On this pin it is still `not-ready` because outgoing less-damage does not occur on a passive node.

## 4. Files created

| File                                                | Purpose                                               |
| --------------------------------------------------- | ----------------------------------------------------- |
| `packages/passive-engine/src/unmapped-inventory.ts` | Inventory of recognized lines with no semantic family |
| `packages/passive-engine/src/path-coverage.ts`      | Path stat-line coverage and confidence                |
| `packages/passive-engine/src/path-coverage.test.ts` | Direction, ratio, confidence, and path coverage tests |
| `docs/progress/STEP-007C-semantic-hardening.md`     | This record                                           |

## 5. Files changed

| File                                                | Change                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `packages/passive-engine/src/grammar.ts`            | Multi-clause split, suffix `taken`, `derived-from`                       |
| `packages/passive-engine/src/grammar.test.ts`       | Clause, direction, and deflection cases                                  |
| `packages/passive-engine/src/stats.ts`              | Percent templates no longer swallow trailing `taken`                     |
| `packages/passive-engine/src/stats.test.ts`         | Pinned recognized and unrecognized totals                                |
| `packages/passive-engine/src/semantic.ts`           | Deflection families, damage-taken markup, readiness rule, three safe ids |
| `packages/passive-engine/src/stat-coverage.test.ts` | Pinned coverage, unmapped count, readiness                               |
| `packages/passive-engine/src/index.ts`              | Exports the new modules                                                  |
| `packages/passive-engine/README.md`                 | Describes the new result                                                 |
| `docs/planning/DECISION_LOG.md`                     | D-037 through D-043                                                      |
| `docs/extra steps/STEP-007C-semantic-hardening.md`  | Prettier rewrapped the spec                                              |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`parsePassiveStatExpression` splits on newlines and calls the single-clause grammar for each clause. `parseDerived` matches only `Gain <markup> equal to N% of <markup>`. `semanticFamilyForEffect` assigns `deflection-from-evasion`, `deflection-from-armour`, or `damage-taken`. `unmappedStructuredInventory` does not reuse unrecognized family ids. `pathSemanticCoverage` reads only the nodes passed in. `decideStatScoringReadiness` lists partial families and blocks on still-unsupported families. data-sources still only loads the pin. This package still does not score.

## 8. External APIs / data sources involved

None. The existing pinned passive-tree snapshot was read and not changed.

- provider: local file from the grindinggear/poe2-skilltree-export pin
- file: `docs/data-snapshots/passive-tree/data.json`
- official export, no auth
- fields used: node `rawStats` already normalized by data-sources
- version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- no network call in this step

## 9. Credentials / environment variables

### Added/changed variable names

None.

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

`PassiveOperation` gained `derived-from`. `StatScoringReadiness` gained `partiallySupportedFamilies`. New types: `UnmappedStructuredInventory`, `PathSemanticCoverage`, and `PathScoringConfidence`. No domain schema change. The passive-tree pin is unchanged.

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

| Command/Test           | Result | Notes                                                  |
| ---------------------- | ------ | ------------------------------------------------------ |
| `npm test`             | PASS   | 14 files, 85 tests                                     |
| `npm run typecheck`    | PASS   | root, web, domain, data-sources, passive-engine        |
| `npm run lint`         | PASS   | exit 0                                                 |
| `npm run format:check` | PASS   | after the progress doc and decision log were formatted |

Pinned assertions now lock 5,963 lines, 4,775 structurally parsed, 2,907 semantically normalized, 1,188 unrecognized, 1,868 structured-but-unmapped, and readiness `not-ready` because `less-damage` is still unsupported.

## 13. Manual verification

Grammar examples were taken from the pin: both clauses of the critical-damage-bonus line, the fire-conversion line with its second clause, `Take 30% less Damage`, `10% less Damage taken`, elemental damage taken, `Mirages deal 50% less Damage`, and deflection equal to evasion. The conversion line stays unrecognized. The first clause of that line parses when it is tested alone, which shows the second clause is what rejects the full line. No browser UI exists for this step.

## 14. Errors/issues encountered

- symptom: `10% less Damage taken` had no semantic id.
- root cause: the STEP-007A percent template matched the line before the grammar and did not store direction.
- resolution: a trailing word `taken` falls through to the grammar.
- regression test: yes.

- symptom: typecheck failed on optional markup arrays and a missing `buildPassiveGraph` export.
- root cause: the test imported the graph module, which does not export the builder, and indexed optional markup arrays directly.
- resolution: import `buildPassiveGraph` from the package index and use optional chaining.
- regression test: yes, the path coverage test typechecks.

- symptom: readiness reported `less-damage` as unsupported after the direction fix.
- root cause: the previous support flag came from suffix `Damage taken` lines. `Mirages deal 50% less Damage` is a gem-tab stat, not a passive-node `rawStats` line.
- resolution: documented in D-039. The family stays `still-unsupported` on this pin.
- regression test: yes, the pinned readiness assertion.

## 15. Security/privacy impact

No secrets, auth, tokens, user data, uploads, or new network calls.

## 16. Performance impact

Corpus inventory walks each raw stat line once. Path coverage walks only the nodes it is given. No nested scan of all 5,152 nodes per path. Not benchmarked beyond the test suite.

## 17. Data provenance / reproducibility

The pin is unchanged: version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, checksum `sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642`. Unmapped inventory and path coverage are deterministic for the same input. `npm run format` rewrapped `docs/extra steps/STEP-007C-semantic-hardening.md`. That is formatting only.

## 18. Known limitations

`75% of Damage Converted to Fire Damage\nDeal no Non-Fire Damage` stays unrecognized. `Deal no Non-Fire Damage` has no number and a hyphen, so it is not represented as zero damage. Outgoing less-damage does not appear on passive nodes. 1,868 structured lines still have no semantic family. Global semantic coverage is 48.8%. Other `equal to` sentences were not folded into deflection-from-evasion.

## 19. Decisions made

D-037 multi-clause parsing. D-038 suffix `Damage taken`. D-039 outgoing less-damage on this pin. D-040 derived deflection. D-041 unmapped inventory and the three safe mappings. D-042 path coverage formula and confidence thresholds. D-043 readiness: a partial family is listed, and a still-unsupported family still blocks. D-036 is superseded in part by D-043.

## 20. Deviations from planning docs

`npm run format` rewrapped the STEP-007C spec. The implementation did not add a production for `Deal no Non-Fire Damage`. Readiness stayed `not-ready` because outgoing less-damage is absent from passive nodes, even though damage-conversion is no longer the blocker by itself.

## 21. Remaining risks

A later scorer could ignore path confidence and treat a higher number on a partly understood path as better. Damage-type conversion on the fire-conversion node is still invisible to a semantic sum. Outgoing less-damage will be missed if a future tree adds it and the family report is not rerun. Ailment, flask, minion, and charge lines remain unmapped.

## 22. Rollback notes

Revert the passive-engine grammar, semantic, stats, inventory, and path-coverage changes, and restore the STEP-007B pinned totals. The passive-tree pin does not need to be restored.

## 23. Recommended next step

Do not start STEP-008. Scoring readiness is `not-ready` because high-priority family `less-damage` has no passive-node line. `damage-conversion` remains partially supported and must stay visible. Wait for approval before any scoring work.

## 24. Completion statement

STEP-007C is complete. Multi-clause parsing, damage direction, derived deflection, the unmapped inventory, and path semantic coverage are in place. Scoring readiness is `not-ready`. STEP-008 was not started.

## Multi-Clause Parsing Result

A line with two clauses is recognized only when both clauses parse. `30% less Critical Damage Bonus when on Full Life` followed by `30% more Critical Damage Bonus when on Low Life` returns two effects, `less` then `more`. `10% increased Spell Damage` followed by `Deal no Non-Fire Damage` returns nothing.

The pinned conversion line is `75% of Damage Converted to Fire Damage` and then `Deal no Non-Fire Damage`. The first sentence parses as conversion when it is alone. The second sentence has no number and the hyphen in `Non-Fire` is punctuation, so the clause fails. The full line stays unrecognized. The first clause is not kept.

## Damage Direction Result

| Line                                                 | Direction   | Operation |
| ---------------------------------------------------- | ----------- | --------- |
| `Take 30% less Damage`                               | taken       | less      |
| `10% less Damage taken`                              | taken       | less      |
| `10% less [ElementalDamage\|Elemental Damage] taken` | taken       | less      |
| `Mirages deal 50% less Damage`                       | dealt       | less      |
| `20% more [Spell] Damage`                            | unspecified | more      |

`10% less Damage taken` maps to semantic id `damage-taken`. `Mirages deal 50% less Damage` maps to `damage` with operation `less`. That mirage line is not on a passive node. After the suffix rule, no passive-node line is outgoing less-damage, so the family report is `still-unsupported` for `less-damage`.

## Evasion → Deflection Result

`Gain [Deflect|Deflection Rating] equal to 4% of [Evasion|Evasion Rating]` parses as operation `derived-from`, amount 4, unit percent, source Evasion Rating, target Deflection Rating. Semantic id `deflection-from-evasion`. The same shape from Armour is `deflection-from-armour`. These are not increased or added Deflection. The engine does not multiply the ratio by Evasion. Other `equal to` lines, including Guard per Jade and Accuracy equal to Strength, do not use this production.

## Structured-but-Unmapped Inventory

1,868 recognized lines have no semantic family. The inventory is stable across two calls. The largest groups, and how they were classified:

| Family id                                                   | Occurrences | Distinct | Classification      |
| ----------------------------------------------------------- | ----------- | -------- | ------------------- |
| `increased.plain.scope`                                     | 123         | 46       | needs-build-context |
| `template.increased.Stun.increased-stun-buildup`            | 50          | 7        | special-mechanic    |
| `increased.Flask.none`                                      | 49          | 16       | special-mechanic    |
| `template.increased.Freeze.increased-freeze-buildup`        | 47          | 9        | special-mechanic    |
| `template.increased.StunThreshold.increased-stun-threshold` | 43          | 13       | special-mechanic    |
| `increased.Flammability+BuffMagnitude.none`                 | 39          | 9        | special-mechanic    |
| `reduced.Slow+Debuff.none`                                  | 32          | 8        | special-mechanic    |
| `increased.Presence.none`                                   | 30          | 7        | special-mechanic    |
| `increased.Shock.none`                                      | 28          | 8        | special-mechanic    |
| `increased.Ailments.none`                                   | 24          | 8        | special-mechanic    |

Banner, aura, minion, and companion scopes need the skill or actor. Stun, freeze, shock, ailments, flasks, leech, and magnitude lines are special mechanics. They were not mapped.

Safe-to-map-now, and mapped:

| Stat                            | Semantic id             | Occurrences before mapping |
| ------------------------------- | ----------------------- | -------------------------- |
| increased Skill Effect Duration | `skill-effect-duration` | 39                         |
| increased Area of Effect        | `area-of-effect`        | 25                         |
| increased Skill Speed           | `skill-speed`           | 24                         |

Attack Area Damage was left unmapped so it would not be merged into generic attack damage.

## Corpus Coverage Before vs After

| Measure                 | STEP-007B    | STEP-007C    |
| ----------------------- | ------------ | ------------ |
| Stat lines              | 5963         | 5963         |
| Structurally parsed     | 4717 (79.1%) | 4775 (80.1%) |
| Semantically mapped     | 2758 (46.3%) | 2907 (48.8%) |
| Unrecognized            | 1246         | 1188         |
| Structured but unmapped | 1959         | 1868         |

Unrecognized families that changed: `multiple-markup-tokens` 658/425 to 602/418, and `multiple-numeric-values` 133/120 to 131/118. The other unrecognized family totals are unchanged.

## Path Semantic Coverage Design

`pathSemanticCoverage` takes the nodes on a candidate path. Class start is included only when the caller passes it. Counts are stat lines, not nodes.

- `semanticCoverageRatio` = mapped lines / total lines
- `structuralCoverageRatio` = (mapped + structurally parsed only) / total lines
- total lines 0: both ratios are 1, confidence `complete`
- 100% mapped: `complete`
- 90% or more: `high`
- 70% or more: `partial`
- below 70%: `low`

`unsupportedRawLines` lists unrecognized and unmapped raw lines. They are not given amount 0. `searchCompleteness` stays on `enumerateMainTreePaths`. A test covers the first Witch offensive candidate path and checks that the coverage object does not carry search completeness.

## STEP-008 Scoring Readiness

Status: **not-ready**.

Extraction coverage: 80.1%. Semantic coverage: 48.8%.

Blocking family: `less-damage` (`still-unsupported`).

Listed, and not the blocker: `damage-conversion` (`partially-supported`).

The 70% structural target is met. Required semantic families in `REQUIRED_SEMANTIC_IDS` are present. `more`, `less`, `conversion`, and `gain-as-extra` occur as operations. That is not enough to score. Outgoing less-damage has no passive-node example after suffix `taken` was corrected.

STEP-008 contract, for when scoring is approved:

- A score may use known semantic effects.
- The same result must include `pathSemanticCoverage`.
- A higher score on a path whose confidence is not `complete` is not definitively better.
- Unknown and unmapped lines stay visible. They are not zero.
- `searchCompleteness` stays a separate field from semantic confidence.

STEP-008 was not started.
