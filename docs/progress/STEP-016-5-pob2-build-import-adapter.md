# STEP-016.5 — PoB2 build import adapter

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-016.5  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the first Path of Building 2 import path. A user pastes a raw export code. The server decodes it, validates the XML, normalizes the build, checks passive ids against the pinned tree, and sends a compatible or partial tree through the existing passive analysis. This step does not add a PoB2 calculation engine or change the heuristic score.

## 2. Acceptance criteria

- [x] A user can paste a raw PoB2 export code.
- [x] The export is decoded server-side.
- [x] The decompressed content is parsed as PoB2 XML.
- [x] The PoB2 root/build structure is validated before normalization.
- [x] PoB2 parsing is provider-specific and separate from domain schemas.
- [x] Class is imported when present.
- [x] Level is imported when present.
- [x] Ascendancy is imported when present.
- [x] Shared/main passive allocations are imported.
- [x] Weapon-set/specialisation passive allocations are kept separate.
- [x] Skill groups are imported.
- [x] Support relationships are preserved when represented by PoB2.
- [x] Equipment is imported by slot.
- [x] Raw item modifier text is preserved.
- [x] Relevant PoB2 configuration values are preserved as raw key/value data.
- [x] Passive ids are validated against the active official GGG tree pin.
- [x] Unknown passive ids are preserved and reported instead of silently discarded.
- [x] A PoB2 import result reports compatibility/readiness.
- [x] The normalized result can be consumed by the existing passive analysis pipeline where compatible.
- [x] Existing fixture and GGG-provider flows still work.
- [x] Current heuristic scoring behavior is unchanged.
- [x] The importer is deterministic.
- [x] Malformed and oversized imports fail safely.
- [x] XML external entities are not resolved.
- [x] Tests do not require Path of Building, GGG, or network access.
- [x] Required repository checks pass.
- [x] A completion document is created at `docs/progress/STEP-016-5-pob2-build-import-adapter.md`.

## 3. Implementation summary

`importPob2Build` accepts a raw export code only. It decodes URL-safe Base64, inflates a zlib stream up to 1 MiB, and reads the XML with a local parser that rejects document types and unknown entities. The provider model keeps class, level, ascendancy, shared passives, weapon-set passives, skill groups, equipment, and configuration. The character snapshot reuses the existing domain types. Its `sourceVersion` is the active GGG pin so the current readiness gate can accept the tree. The import result itself records `source: "pob2"` and a SHA-256 checksum of the decoded XML.

A compatible or partial tree is scored by `recommendMainTreePaths`. An incompatible tree is shown and is not ranked. The analysis screen can switch between a fixture and a PoB2 paste box. The score line still says the optimizer is a passive-tree heuristic only.

## 4. Files created

| File                                                    | Purpose                                      |
| ------------------------------------------------------- | -------------------------------------------- |
| `packages/data-sources/src/pob2/decode.ts`              | Base64 and zlib decode, size limit, errors   |
| `packages/data-sources/src/pob2/xml.ts`                 | Local XML reader with no external entities   |
| `packages/data-sources/src/pob2/import-build.ts`        | PoB2 model, normalization, readiness         |
| `packages/data-sources/src/pob2/import-build.test.ts`   | Decode, mapping, safety, and analysis checks |
| `docs/progress/STEP-016-5-pob2-build-import-adapter.md` | This record                                  |

## 5. Files changed

| File                                                       | Change                                                               |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/data-sources/src/index.ts`                       | Exports the PoB2 importer                                            |
| `packages/data-sources/README.md`                          | Describes the paste importer                                         |
| `apps/web/src/server/analyze-passive-build.ts`             | Runs a compatible or partial PoB2 tree through the existing analysis |
| `apps/web/src/app/analysis-screen.tsx`                     | Adds the fixture / PoB2 paste control and the import summary         |
| `README.md`                                                | Mentions pasted PoB2 import                                          |
| `packages/README.md`                                       | Notes the PoB2 adapter                                               |
| `docs/planning/DECISION_LOG.md`                            | Adds D-071                                                           |
| `docs/extra steps/STEP-016-5-pob2-build-import-adapter.md` | Prettier rewrapped the planned step text                             |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`decodePob2Export` owns encoding and decompression errors. `parsePob2Xml` owns the element tree and entity rules. `importPob2Build` owns the PoB2 document, the domain snapshot, and the compatible / partial / incompatible status. `runPassiveAnalysis` owns the decision to call the existing recommendation function. The analysis screen owns the paste box and the summary. It does not decode the export.

## 8. External APIs / data sources involved

The importer does not call a network API. Passive ids are checked against the already loaded official pin:

- provider: grindinggear/poe2-skilltree-export
- file: `docs/data-snapshots/passive-tree`
- official
- no auth
- fields used: node ids, source, version, commit
- no new fetch
- version `0.5.5`, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`
- a missing pin still fails through the existing snapshot loader

The XML field names follow the public Path of Building 2 save shape: `Build`, `Tree`/`Spec`, `WeaponSet1` through `WeaponSet3`, `Skills`/`Skill`/`Gem`, `Items`/`Slot`, and `Config`/`Input`. No PoB Lua was copied into this repo.

## 9. Credentials / environment variables

### Added/changed variable names

`None`

### Credential status

NOT REQUIRED

## 10. Data model / schema changes

No domain schema changed. `Pob2BuildDocument` and `Pob2ImportSuccess` live in the data-sources package. The character snapshot uses the existing `CharacterBuildSnapshot`, `NormalizedSkill`, `NormalizedItem`, and `WeaponSetSpecialisations` types. The analysis result can carry a `Pob2AnalysisView`. That view is a summary, not the raw XML.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. No dependency was added.

## 12. Automated tests

| Command/Test           | Result | Notes                                            |
| ---------------------- | ------ | ------------------------------------------------ |
| `npm test`             | PASS   | 30 files, 187 tests                              |
| `npm run typecheck`    | PASS   | Includes the web app and every workspace package |
| `npm run lint`         | PASS   |                                                  |
| `npm run format:check` | PASS   |                                                  |

The PoB2 tests cover a valid export, URL-safe Base64, a stable checksum, weapon-set separation, skill groups and supports, an unresolved main skill, equipment slots and raw modifiers, configuration, omitted notes, a partial build, an unknown passive id, invalid encoding, invalid compression, the 1 MiB limit, invalid XML, a wrong root, and a document type that is not resolved. A compatible PoB2 tree produces the same first offensive candidate and `heuristicScore` as the Witch fixture. An unknown id is reported and is not ranked. The existing fixture, GGG, and scoring tests still pass in the same run.

One full-suite run timed out on the pinned-tree compatibility test while typecheck and lint were also running. The same suite passed when run on its own.

## 13. Manual verification

The Cursor browser tools did not connect. Headless Chrome opened `http://localhost:3000` against the running dev server.

Checked:

- The page offers Fixture and PoB2, and it does not show "Connect GGG account" while OAuth is unconfigured.
- Pasting a synthetic Witch export and choosing Import / Analyze shows status compatible, build Paste Witch, class Witch, level 16, ascendancy Infernalist, the heuristic-only sentence, and score 32.
- Pasting `!!!!` shows "The PoB2 export code is not valid Base64." The page does not render raw XML.
- Switching back to Fixture and analyzing shows Fixture Witch and score 32.

React 19 resets form fields after a successful action. The first browser check then submitted the next PoB2 paste as a fixture. The screen now sends the import source from the select's change handler, so a later paste stays on the PoB2 path. That second check passed.

## 14. Errors/issues encountered

- The first typecheck failed because `Pob2ImportSuccess` was not exported, and lint failed on an unused snapshot import. Both were fixed. Regression coverage is the typecheck and lint commands.
- A parallel test run timed out on the existing pinned-tree test. The suite passed alone. No test change.
- A successful import could be followed by a form reset that submitted the next paste as a fixture. The screen now keeps the selected source outside the reset fields. The browser check covers it.

## 15. Security/privacy impact

The export is untrusted text. Parsing stays on the server. The decoder rejects `http`, `https`, pobb.in, pastebin, and GitHub URLs instead of fetching them. Decompression is capped at 1 MiB. The XML reader rejects document types and any entity other than `amp`, `lt`, `gt`, `quot`, and `apos`. Notes are not stored on the snapshot and are not rendered. The summary does not include the raw XML or the full export code. No credential was added.

## 16. Performance impact

Import runs when the user submits. It decodes, parses, and checks node ids. It does not search paths during decode. A compatible or partial tree then uses the existing search. The 1 MiB cap bounds the inflated XML. Not otherwise measured.

## 17. Data provenance / reproducibility impact

The same export code produces the same SHA-256 checksum and the same PoB2 document. `importedAt` is the only field that changes with the clock. The character snapshot's source version is the active pin (`0.5.5`, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`), because readiness compares that pin. The import result records `source: "pob2"`, the PoB2 format version, the PoB2 tree version, the active pin version, and normalization version `1`.

The test fixtures are synthetic XML compressed with Node's zlib in the same URL-safe Base64 shape Path of Building writes. They are not copied from a player build.

## 18. Known limitations

- Share links are rejected.
- Raw XML that was not Base64-and-zlib encoded is rejected.
- Only a zlib-wrapped stream is accepted. A raw deflate stream is an invalid compressed payload.
- PoB2 `treeVersion` is compared as text with the pin version. A different string is a warning and makes the import partial. It does not by itself prove the nodes are incompatible.
- Ascendancy comes only from `Build@ascendClassName`. It is not inferred from node positions.
- If several tree specs exist and `activeSpec` does not select one, the import is incompatible.
- The build main skill is unresolved unless `Build@mainSocketGroup` points at a group whose `mainActiveSkill` is in range.
- Supports are the other gems in a group with a valid `mainActiveSkill`. Otherwise the relationship is unknown and those gems are not copied onto the domain skill list.
- One identity line on an item is stored as both the name and the base type. Two identity lines become the name and the base type.
- Notes are omitted.
- Configuration keys are stored and are not interpreted.
- Item modifier text is not categorized or scored in this step.
- Skills, gear, and configuration do not affect `heuristicScore`.
- An in-memory form reset can still clear the paste box after a successful import. The selected source stays on PoB2.

## 19. Decisions made

D-071. Raw code only. URL-safe Base64 around zlib. Local XML reader. 1 MiB inflated limit. Weapon-set ids stay out of the shared allocation. Main skill and supports follow the explicit PoB2 indexes. Unknown passive ids are kept and the import is incompatible. Partial trees can still be analyzed. The checksum is the decoded XML. The snapshot records the GGG pin, and the import result records `source: "pob2"`.

## 20. Deviations from planning docs

The character snapshot's `sourceVersion.source` is the active GGG pin, not the string `pob2`. The readiness gate requires the snapshot source to match the pin. PoB2 identity is on the import result. This is recorded in D-071.

Prettier rewrapped `docs/extra steps/STEP-016-5-pob2-build-import-adapter.md`. The planned requirements were not changed.

## 21. Remaining risks

A future PoB2 save could use a different compression wrapper or different element names. Those exports will fail as invalid compression, invalid XML, or missing fields rather than being guessed. The published field names used here were checked against the public save shape, not against every community fork.

## 22. Rollback notes

Remove `packages/data-sources/src/pob2`, the index exports, the analysis-screen PoB2 control, and the `importSource` branch in `runPassiveAnalysis`. Fixture analysis does not depend on the PoB2 modules.

## 23. Recommended next step

Stop. Do not start a PoB2 calculation engine or character-aware scoring until that work is explicitly approved. The next roadmap step remains STEP-017, basic gear weakness analysis, and it is separate from this import.

## 24. Completion statement

STEP-016.5 is complete. A pasted PoB2 export can be decoded, validated, normalized, checked against the pinned tree, and analyzed with the existing passive heuristic when the tree is compatible or partial. The heuristic weights, Top-K split, and tree pin are unchanged.

## Import Flow

```text
Paste code
  -> reject URLs
  -> URL-safe Base64
  -> zlib inflate, 1 MiB cap
  -> XML parse
  -> PathOfBuilding root
  -> Pob2BuildDocument
  -> CharacterBuildSnapshot when class and level exist
  -> compare passive ids with the pin
  -> compatible, partial, or incompatible
  -> existing path analysis only for compatible and partial
```

## PoB2 Export Encoding

The accepted code is URL-safe Base64 (`-` and `_`, optional padding) around a zlib stream, which is the stream Path of Building's deflate writer produces. The inflated text is XML. The decoder does not try a second compression format when zlib fails.

## Input Size Limit

`POB2_MAX_DECODED_BYTES` is 1,048,576. Normal PoB2 XML is much smaller. The cap stops a small code from expanding without a bound. The encoded input is also rejected when it is empty or larger than twice that limit. Node reports the inflated overflow as `ERR_BUFFER_TOO_LARGE`, and the import failure kind is `decompression-limit`.

## XML Safety

`parsePob2Xml` is a local reader. It rejects `<!DOCTYPE` and `<!ENTITY`. It expands only `amp`, `lt`, `gt`, `quot`, and `apos`. Any other entity throws. It does not read files or open network entities. There is a regression test with a `file:///etc/passwd` entity declaration. The failure is `invalid-xml`, and the message does not contain file contents. Raw XML is not rendered as HTML.

## Provider-Specific Model

`Pob2BuildDocument` holds format version, tree version, build name, class, ascendancy, level, shared passive ids, weapon-set ids, skill groups, the main-skill marker, items, and configuration. Absent text stays null or is listed under `unavailable`. The document is not a `CharacterBuildSnapshot`.

## Domain Normalization

When class and level are present, the importer builds a `CharacterBuildSnapshot`. Shared ids go to `allocatedPassiveIds`. Weapon sets go to `weaponSetSpecialisations`. A skill group with a resolved active gem becomes a `NormalizedSkill`, and its supports stay on `supportNames`. Equipment becomes `NormalizedItem` records with slot, name, base type, rarity, and `rawText`. The snapshot `sourceVersion` is the pin used for the check. The import result's `source` is `"pob2"`.

## Passive Allocation Mapping

`Spec@nodes` is the full id list. `WeaponSet1`, `WeaponSet2`, and `WeaponSet3` `@nodes` are removed from that list and stored separately. An id that appears on more than one weapon set stays on each set and adds a warning. Ids are not merged back into the shared allocation.

## Weapon-Set Mapping

`WeaponSet1` is `set1`, `WeaponSet2` is `set2`, and `WeaponSet3` is `set3`. Empty attributes stay empty arrays.

## Skill-Group Mapping

The active `SkillSet` is used when `Skills@activeSkillSet` matches its id. One skill set is used directly. Several sets and no matching id are ambiguous, and no set is guessed. Each `Skill` keeps its id, label, slot, enabled flag, and gems. Gem name, skill id, level, quality, and enabled flag are kept when present.

## Main-Skill Policy

The build main skill is `Build@mainSocketGroup`, 1-based, only when that group has a `mainActiveSkill` gem in range. Otherwise `mainSkill.resolved` is false. The importer does not choose the first skill, the highest level, or the largest link group.

## Support Relationships

Inside a group with a valid `mainActiveSkill`, the other gems are supports for that group. Their names are stored on that group's domain skill as `supportNames`. If `mainActiveSkill` is missing or out of range, every gem in the group has role `unknown`, the relationship is `unknown`, and those gems are not flattened onto a character-wide support list.

## Equipment Mapping

`Slot@name` is the slot string, including `Weapon 1` and `Helmet`. `Slot@itemId` selects the `Item`. Several item sets require `Items@activeItemSet`. One item set is used directly. No matching active set means the equipment is not guessed.

## Raw Item Modifier Policy

Item text is split on `--------`. `Rarity`, `Item Level`, `Quality`, and `Corrupted` are stored as fields. `Implicits` lines stay separate from explicit lines. `{crafted}`, `{enchant}`, and `{fractured}` lines are copied into those lists and also kept in the raw explicit line. `rawText` keeps the item body. No gear heuristic is assigned. An unparsed line is not zero.

## Configuration Mapping

Each `Config/Input` keeps `name`, the string, boolean, or number attribute, and source `pob2-config`. Keys are not interpreted. The summary says configuration is preserved when at least one input exists.

## Passive-Tree Compatibility

Every shared and weapon-set id is checked against the pin's node id set. Unknown ids are kept on the document and listed on `unknownPassiveIds`. They are not dropped, replaced, or mapped by name. A PoB2 tree version that differs from the pin version adds a warning. Version text alone does not make the ids compatible.

## Import Readiness

`incompatible`: class or level is missing, any passive id is unknown, or several tree specs do not identify the active spec. Passive analysis is not run.

`partial`: the tree ids are known and class and level exist, but ascendancy, skills, equipment, the main skill, or the tree version is missing, or a warning was recorded. Passive analysis still runs.

`compatible`: the tree ids are known, class, level, ascendancy, at least one skill group, equipment, and a resolved main skill are present, and there is no version warning. Passive analysis runs.

A partial tree is still tree-only analysis. Missing gear or skills does not block that analysis and does not change the score.

## Source Metadata / Checksum

The success result includes `source: "pob2"`, `importedAt`, `checksum` (`sha256:` plus the hex SHA-256 of the inflated bytes), `normalizationVersion: 1`, and `activeTreeVersion`. Format version and PoB2 tree version stay on the document. The full export code is not stored on the domain snapshot.

## UI Integration

The analysis screen has an Import source select. Fixture keeps the existing fixture controls. PoB2 shows a paste box and an Import / Analyze button. The summary shows status, name, class, level, ascendancy, tree status, skill-group count, support count, equipment count, configuration preserved or unavailable, unknown ids, warnings, and the sentence that the optimizer remains a passive-tree heuristic only.

## Fixture Provenance

The automated fixtures are synthetic XML written for this step and compressed in-process. They use Witch, level 16, ascendancy Infernalist, and passive ids `54447`, `4739`, and `18845` from the existing Witch fixture so the scoring comparison is against a known tree. They are not player exports and they are not copied from Path of Building source code.

## Known PoB2 Format Limitations

See section 18. The important format limits are zlib-only decompression, no share links, no guessed active spec, and no guessed main skill.

## Current Scoring Limitation

Imported skills, gear, and configuration do not change `heuristicScore`, the offensive, defensive, or balanced profiles, Top-K, or semantic completeness. The Witch comparison expects the same first candidate node ids and the same heuristic score, with profile version 1.

## PoB2 Calculation-Engine Status

Not implemented. This step stops before a PoB2 calculation engine and before character-aware scoring.
