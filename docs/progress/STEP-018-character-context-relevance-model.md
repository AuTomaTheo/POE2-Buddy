# STEP-018 — Character-context relevance model

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 5 / STEP-018  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a deterministic, provider-neutral character context that says which mechanic families have evidence in the imported build. Relevance is not a numerical value.

## 2. Acceptance criteria

- [x] Context is built from normalized skills, passives, gear, ascendancy identity, and stored configuration
- [x] The context layer does not parse PoB2 XML
- [x] The same builder is used for PoB2 imports and fixtures
- [x] A resolved primary skill is not replaced by another skill group
- [x] An unresolved or missing primary skill stays unresolved or missing
- [x] Unknown skill roles are not used as family evidence
- [x] Production imports do not infer mechanic tags from gem display names
- [x] Ascendancy name and passive ids are preserved
- [x] Ascendancy node stats use the same semantic extraction as other passives
- [x] Understood gear and passive lines are supporting evidence
- [x] Unknown locality and conditional lines are unresolved, not relevant
- [x] Configuration text is stored and is not relevance evidence
- [x] `no-evidence` and `unresolved` stay separate
- [x] Readiness is `ready`, `partial`, or `insufficient`, with counts rather than weights
- [x] `CHARACTER_CONTEXT_VERSION` is 1
- [x] The Witch fixture still scores 32 on nodes `[1755, 41965]`
- [x] Gear normalization stays 3 and PoB2 normalization stays 3
- [x] The analysis screen shows a Build Context section
- [x] No DPS, EHP, gear score, worst-slot ranking, or upgrade recommendation
- [x] `npm test`, typecheck, lint, format, and format check pass
- [x] This completion note exists

## 3. Implementation summary

`@poe2-helper/character-context` builds `CharacterContext` from an explicit input. The web adapter maps a fixture or a PoB2 document, the passive graph, and analyzed gear into that input. The analysis screen shows the result between the PoB2 summary and the gear section. The passive heuristic is unchanged. D-078 records the boundary.

## 4. Files created

| File                                                          | Purpose                                         |
| ------------------------------------------------------------- | ----------------------------------------------- |
| `packages/character-context/package.json`                     | Workspace package. Depends only on Zod          |
| `packages/character-context/tsconfig.json`                    | Strict typecheck for the package                |
| `packages/character-context/README.md`                        | States version 1 and the three relevance states |
| `packages/character-context/src/mechanics.ts`                 | Checked mechanic lists and semantic-id maps     |
| `packages/character-context/src/model.ts`                     | Input and result schemas, version 1             |
| `packages/character-context/src/build-context.ts`             | Deterministic builder                           |
| `packages/character-context/src/index.ts`                     | Public exports                                  |
| `packages/character-context/src/build-context.test.ts`        | Synthetic relevance cases                       |
| `apps/web/src/server/context-from-analysis.ts`                | Maps normalized analysis into the input         |
| `tests/character-context.test.ts`                             | Witch, fixture B, and fixture E integration     |
| `docs/progress/STEP-018-character-context-relevance-model.md` | This completion note                            |

## 5. Files changed

| File                                           | Change                                       |
| ---------------------------------------------- | -------------------------------------------- |
| `apps/web/src/server/analyze-passive-build.ts` | Keeps the PoB2 document and attaches context |
| `apps/web/src/app/analysis-screen.tsx`         | Build Context section                        |
| `apps/web/package.json`                        | Depends on `@poe2-helper/character-context`  |
| `apps/web/next.config.ts`                      | Transpiles the new package                   |
| `package.json`                                 | Typecheck includes the new workspace         |
| `package-lock.json`                            | Links the new workspace                      |
| `docs/planning/DECISION_LOG.md`                | Added D-078                                  |

## 6. Files deleted

None.

## 7. Important code paths / responsibilities

`buildCharacterContext` fills one bucket per mechanic. A primary-skill mechanic tag is direct evidence. Other skills, supports, understood passives, and understood gear are supporting evidence. A conditional semantic id, an unrecognized line, or a parsed gear line that is not semantically understood marks the mapped family unresolved and does not add evidence. Configuration is copied to `preservedConfiguration` and is not scanned. Relevance is `relevant` when any evidence exists, otherwise `unresolved` when an uninterpretable signal exists, otherwise `no-evidence`.

`characterContextForAnalysis` reads skill groups and the main-skill flag from the PoB2 document. Fixture skills have no main-skill flag, so the primary skill stays unresolved. Passive lines go through `extractPassiveNodeStats` and `semanticPassiveStats`. Gear lines are the modifiers already produced by `analyzeEquipment`.

## 8. External APIs / data sources involved

No network calls during tests. No new PoB export. Fixtures B and E are the existing 0.23.1 Generate codes. The Witch fixture is the existing JSON build.

## 9. Credentials / environment variables

No new variables. Live GGG import stays disabled. No GGG token was added.

## 10. Data model / schema changes

`CHARACTER_CONTEXT_VERSION` is 1. `POB2_NORMALIZATION_VERSION` stays 3. `GEAR_NORMALIZATION_VERSION` stays 3. The passive scoring profile stays version 1. The character snapshot schema is unchanged. Context is attached to the analysis result and is not stored.

## 11. Commands executed

- `npm install` — added 2 packages and audited 403 packages. 0 vulnerabilities.
- `npm test` — passed. 36 files, 244 tests, 11.78s.
- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run format:check`
- `npm audit` — 0 vulnerabilities. The install audit reported the same result.

An earlier `npm test` timed out the existing lint-coverage test while the dev server was compiling. That test passed alone in 2.48s, and the idle full suite passed. The 20 second timeout was not raised.

## 12. Automated tests

The package tests cover a resolved Fireball in group 2 beside Spark, projectile evidence from skill, support, passive, and gear, local weapon physical damage, unknown-locality elemental damage, life, energy shield, evasion, deflection, unknown armour, minion no-evidence versus an unresolved minion line, configuration text, and the absence of score or rank fields.

The integration test keeps the Witch offensive candidate at nodes `[1755, 41965]` and heuristic score 32. The fixture skill name stays on the group and is not the primary skill. Fixture B keeps Fireball as the primary skill, two groups, and Rapid Attacks III, without attack evidence. Fixture E stores `customMods` = `Added fire damage` and does not mark fire relevant. Gear version stays 3.

## 13. Manual verification

Headless Chrome opened `http://localhost:3000` and submitted the default Witch fixture at point budget 5. The page showed heuristic score 32 and nodes 1755 and 41965. Build Context showed primary skill status `unresolved`, readiness `partial`, and offensive spell as "Relevant based on imported build evidence" from two passive lines named Spell Damage. The closed no-evidence summary used "No supported evidence found". The section did not show the fixture skill as the primary name, and it did not use best, bad, must-have, useless, weak, or optimal. The debug Chrome process was stopped. The dev server was restarted once so it could resolve the new workspace, then left running.

## 14. Errors/issues encountered

The builder first imported the mechanic-list helpers from the wrong module, so every context call threw. Typecheck then rejected pushing the label `unknown skill role` into an array inferred as mechanic names. Both are fixed.

The dev server that was already running returned 500 with `Can't resolve '@poe2-helper/character-context'` because it had started before `npm install` linked the package. Restarting that server cleared it.

## 15. Security/privacy impact

Context is computed in the existing analysis action and is not sent to another service. Imported modifier and configuration text is displayed as text. No personal build was copied. No credentials were added.

## 16. Performance impact

Context walks the allocated nodes, weapon-set nodes, and already parsed gear lines once per analysis. The idle test suite finished in about 12 seconds with `maxWorkers` still 2.

## 17. Data provenance / reproducibility impact

No new export and no change to fixtures A–G. Fixture B supplies the resolved Fireball group, the other Spark group, Rapid Attacks III, and Infernalist node 32699. Fixture E supplies the stored configuration, including `Added fire damage`. The Witch fixture supplies an unresolved skill name and allocated spell-damage nodes.

## 18. Known limitations

Gem display names do not become mechanic tags. The checked skill table from STEP-016.5A has no tags, so real PoB imports pass an empty mechanics list and readiness stays partial for that reason. Unknown locality, conditional stats, and unrecognized lines can mark a family unresolved without making it relevant. Armour, evasion, and deflection gear rules are unchanged. This step does not calculate damage, defence totals, or an upgrade.

## 19. Decisions made

D-078. Budget-aware upgrade ranking stays deferred. Character context comes first. Relevance is not a value. There are no context weights. `no-evidence` is not `unresolved`. The builder is provider-neutral. `CHARACTER_CONTEXT_VERSION` is 1.

## 20. Deviations from planning docs

The package does not depend on `@poe2-helper/domain`. Its input is its own schema, and the web adapter maps domain, passive, and gear results into that schema. That keeps PoB2 types and engine packages out of the context package. Skill-group role is only `primary` or `unresolved`. Secondary and utility are not assigned, because the current data does not determine them.

## 21. Remaining risks

A later checked skill-tag table can fill mechanics without changing the builder. Until then, a Fireball import does not by itself make fire or projectile relevant. A keyword on an unrecognized line can mark a family unresolved even when the line is not that mechanic. Those lines stay unresolved rather than relevant.

## 22. Rollback notes

Remove `packages/character-context`, the web adapter, the Build Context section, the workspace dependency, and D-078. Passive weights, Top-K, the tree pin, gear locality, and PoB2 normalization were not changed.

## 23. Recommended next step

Stop. Do not start STEP-018A, STEP-018B, or STEP-018C without a separate approval.

## 24. Completion statement

STEP-018 is complete. Analysis now reports which mechanic families have imported evidence, and the Witch passive recommendation is unchanged.

## Why Original STEP-018 Changed

The original step was a budget-aware upgrade ranking. That ranking needs a statement of which mechanics the build uses. This step adds that statement and leaves the ranking for a later step.

## Current Build Source Architecture

Fixtures become a character snapshot. PoB2 codes become a `Pob2BuildDocument` plus the same snapshot. Passive optimization and gear analysis already consume that snapshot. Context is a third result. It reads the document for skill groups, the main-skill flag, ascendancy ids, and configuration, and it reads the graph and gear analysis for semantic lines.

## Provider-Neutral Context Boundary

`buildCharacterContext` accepts `CharacterContextInput`. It does not import the PoB2 parser, the passive engine, or the gear engine. `source` may be `pob2`, `ggg`, or `fixture`. The current web adapter fills `pob2` and `fixture`. Live GGG import is still disabled, so no GGG payload is passed in this step.

## Primary Skill Policy

Resolved means the document has a resolved main skill with a skill id. Unresolved means skill groups or fixture skills exist and the main skill is not resolved. Missing means there are no skill groups. The first gem, the highest level, and the fixture skill name are not used as a guess. Fixture Witch therefore stays unresolved even though its skill is named Fixture Spell.

## Skill-Mechanic Inventory

Offensive families are attack, spell, projectile, melee, area, critical strike, elemental, physical, fire, cold, lightning, chaos, minion, totem, duration, ailment, channelled, movement, and triggered. Defensive families are life, energy shield, armour, evasion, deflection, block, resistances, avoidance, recovery, and movement. A tag is used only when the caller supplies it from a checked table. The production adapter supplies none.

## Support Evidence Policy

Support gems are listed on the skill group. A support contributes evidence only when its mechanics array is non-empty. Rapid Attacks III is preserved on fixture B and does not create attack evidence. An unknown gem role adds the warning that unknown skill roles were not used as evidence.

## Ascendancy Evidence Policy

Class name, ascendancy name, and ascendancy passive ids are stored. The name is not turned into mechanics. Node 32699 stays out of the main-tree allocation. If that node is on the graph, its extracted stats are evidence with source type `ascendancy`.

## Passive Evidence Policy

Allocated ids, weapon-set ids, and ascendancy ids are looked up on the graph. Recognized unconditional semantic ids are supporting evidence. Conditional semantic ids and unrecognized lines mark the mapped family unresolved. Heuristic weights are not copied into the context.

## Gear Evidence Policy

A semantically understood modifier is supporting evidence for its mapped family. A known semantic id that is not understood, including unknown locality, marks that family unresolved. An unparsed line is scanned only for unresolved keywords. Understood local physical, fire, cold, and lightning damage text is copied to `weaponContext.localDamageLabels`. Gear normalization is not changed.

## Configuration Evidence Policy

Configuration keys and values are stored on `preservedConfiguration`. They are not scanned and they are not evidence. Fixture E's `Added fire damage` custom mod does not make fire relevant. Any stored configuration keeps readiness from being `ready`.

## Offensive Relevance Model

Each offensive mechanic is `relevant`, `unresolved`, or `no-evidence`. Direct evidence is a mechanic tag on the resolved primary group. Supporting evidence is any other skill, support, passive, ascendancy node, or understood gear line. The Witch fixture's spell relevance comes from the two allocated Spell Damage passives, not from the skill name.

## Defensive Relevance Model

Defensive mechanics use the same three states. Life, energy shield, evasion, deflection, armour, block, resistances, avoidance, recovery, and movement are reported separately. The result has no life total and no energy shield total.

## No-Evidence vs Unresolved

No evidence means nothing in the import mentioned that family. Unresolved means a line or an unknown skill role could not be interpreted as confirmed evidence. A family with both evidence and an unresolved signal stays relevant. Empty minion is no-evidence. The text "Summoned minions are larger" is unresolved minion and leaves totem as no-evidence.

## Evidence Model

Each evidence record has `sourceType`, `sourceId`, `rawLabel`, `semanticFamily`, and `strength`. Source types are skill, support, passive, gear, and ascendancy. Configuration is not an evidence source in the builder. Strength is `direct` or `supporting`.

## Context Confidence / Readiness

Readiness is separate from passive selection and gear readiness. `ready` requires a resolved primary skill, mechanic tags on every active skill, no unresolved mechanics, and no stored configuration. Otherwise a build with a class, skills, passives, gear, or configuration is `partial`. A completely empty input is `insufficient`. Counts are `skillMechanicsKnown` / `skillMechanicsTotal`, `gearLinesUnderstood` / `gearLinesTotal`, and `passiveLinesRecognized` / `passiveLinesTotal`. There is no 0–100 score.

## No-Weight Rule

The mechanic maps say which family a semantic id belongs to. They do not rank families or change the passive heuristic.

## No-Ranking Rule

The context object has no equipment score, gear rank, worst item, or replacement recommendation. The screen does not add one.

## Fixture Provenance

No new PoB Generate was required. Fixture B already has a resolved primary skill, a second group, a support, and an ascendancy node. Fixture E already has configuration. The Witch fixture already has offensive passive evidence and an unresolved skill. Fixtures F and G remain the gear-locality exports from STEP-017A and STEP-017B.

## UI Integration

The analysis screen renders Build Context when the result includes context, including an incompatible PoB import that still has a character. Visible families are those that are relevant or unresolved. Families with no evidence stay inside one details block. Evidence is inside each family's details. The default view does not show a number for relevance.

## Passive Regression

The Witch offensive recommendation is still nodes `[1755, 41965]`, heuristic score 32, profile version 1, and Top-K 5. Fixture B still keeps node 32699 out of `allocatedNodeIds`.

## Gear Regression

`GEAR_NORMALIZATION_VERSION` is still 3. Locality rules from D-077 are unchanged. Context only reads the modifiers gear analysis already returns.

## Context Version

`CHARACTER_CONTEXT_VERSION` is 1. It is not reused from PoB2 version 3, gear version 3, or passive profile version 1.

## Known Context Limitations

Real imports do not yet carry checked skill mechanic tags, so skill-based offensive relevance waits for a later fact table. Unrecognized text can only mark a family unresolved. The context does not say whether a relevant family is enough, too low, or worth spending currency on.

## PoB2 Calculation-Engine Status

STEP-018A was not started. No PoB2 calculation engine is invoked. No damage or defence total is calculated.

## Budget-Aware Upgrade Status

STEP-018C was not started. There is no point-budget upgrade ranking and no currency or trade recommendation. Pricing remains unused for this result.
