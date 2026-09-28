# PoE2 Helper — Decision Log

Use this file for concise project-wide decisions. Large decisions may get a dedicated ADR in `docs/decisions/`.

## D-001 — Deterministic optimizer before LLM explanation

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Core recommendations must come from structured data and deterministic/testable algorithms. LLM usage, if added, is for explanation and interaction only.

**Reason:** Prevent hallucinated game mechanics, fake numbers, and untraceable recommendations.

## D-002 — OAuth is not required for first MVP milestone

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Build fixture/local import and the passive optimizer before live GGG account login.

**Reason:** GGG OAuth credentials are not yet available, while most optimizer work is independent of OAuth.

## D-003 — External services require adapters

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** GGG, poe.ninja, RePoE and other sources must be accessed through provider interfaces/adapters.

**Reason:** APIs/data formats can change, and blocked integrations need mock implementations.

## D-004 — Do not depend on undocumented trade/private APIs

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** No reverse-engineered/private PoE trade or poe.ninja builds/profile/auth endpoints as production MVP dependencies.

**Reason:** Stability, policy, privacy, and maintainability risk.

## D-005 — Heuristic score is not exact DPS

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Early optimizer outputs must be labeled heuristic and expose their components. Exact DPS/EHP claims require a validated calculation engine.

## D-006 — No database until required

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Initial MVP uses fixtures/versioned snapshots and in-process analysis. A database is added only after a persistent-state requirement is identified and documented.

## D-007 — Extremely detailed step-by-step documentation is mandatory

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Every completed implementation step creates a separate progress `.md` file. Chat history is never treated as sufficient project documentation.

## D-008 — Version/provenance accompanies recommendations

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Analysis results should record the game-data versions and optimizer/scoring version used.

**Reason:** PoE2 changes frequently and recommendations must be reproducible/debuggable.

## D-009 — npm workspaces with the Next.js app in `apps/web`

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The repository is an npm workspace. The web application lives in `apps/web`. Future domain and engine code will live under `packages/`. pnpm is not used because it is not installed in the current development environment.

**Reason:** This matches the planned module boundaries and keeps UI code separate from later optimizer packages. npm is already available.

**Consequences:** Root scripts delegate to the `web` workspace. Next.js environment files are read from `apps/web`, while `.env.example` stays at the repository root.

## D-010 — Vitest for unit tests

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Unit tests use Vitest. Playwright is still deferred until there is a browser flow to cover.

**Reason:** The planning documents allow Vitest or Jest. Vitest runs TypeScript tests directly and fits the current scaffold.

**Consequences:** `npm test` at the repository root runs `tests/**/*.test.ts`. Vitest is pinned to 4.1.11 because 3.2.x is affected by advisory GHSA-82fw-gwwq-j7x9.

## D-011 — Normalized passive kinds and explicit weapon sets

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A passive node's structural kind and its ascendancy membership are separate fields. Weapon-set specialisations are always stored as `set1`, `set2`, and `set3`, matching the official character document, and are not merged into the shared allocation. Recommendation scores include `scoreKind: "heuristic"`.

**Reason:** The official tree export can mark a node as a notable and also assign it to an ascendancy. The character API lists three weapon-set specialisation keys. Collapsing either of those would hide rules the optimizer must handle later.

**Consequences:** Sample fixtures and later ingestion must satisfy the domain Zod schemas. Extra source fields are rejected until a schema explicitly allows them.

**Superseded in part by:** D-012, which replaces the single `kind` field with `kinds` after the official export showed a node that is both a notable and a jewel socket.

## D-012 — Passive nodes can have more than one structural kind

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `PassiveNode.kinds` is a list of structural kinds. Ascendancy membership remains `ascendancyId`. Recognized non-structural export flags are kept on `sourceFlags` instead of being dropped.

**Reason:** The pinned official tree contains "Crystalline Phylactery", which is both `isNotable` and `isJewelSocket`. Choosing only one kind would hide a socket.

**Consequences:** Ingestion must fail when it sees an `is*` flag that is not on the known list. `small` and `unknown` cannot be combined with another kind.

**Supersedes:** the single `kind` field described in D-011.

## D-013 — Passive-tree runtime data is an explicit directory

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The pinned GGG export stays in `docs/data-snapshots/passive-tree` as the development and provenance copy. Loaders do not default to that folder. Callers pass `snapshotDirectory`, or set `POE2_PASSIVE_TREE_SNAPSHOT_DIR`. A later deployment step must copy or emit the snapshot into a runtime directory. That copy step is not part of this change.

**Reason:** A production build must not assume the `docs/` tree is bundled or present on disk.

**Consequences:** Tests pass the development directory explicitly. Production configuration fails loudly until the directory is set.

## D-014 — Passive-tree snapshots are cached in process memory

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `getPinnedPassiveTreeSnapshot` loads, verifies, and normalizes a directory once per process, freezes the result, and returns that same object. There is no database or shared cache. `resetPinnedPassiveTreeSnapshotCacheForTests` is for tests.

**Reason:** Reading and validating the 5 MB export on every future request would repeat the same work.

**Consequences:** A long-running process keeps one snapshot per directory until restart. Tests that need a fresh load must reset the cache.

## D-015 — Class starts come from the export indexes

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `PassiveTreeSnapshot.classStarts` is a list of `{ classIndex, className, nodeId }`. `classIndex` is the position in the export `classes` array. `nodeId` is the skill on the node whose `classStartIndex` contains that position. `root` is not a node in the graph. A root edge must point at the same nodes that declare `classStartIndex`.

**Reason:** The pinned export gives both the class names and the start skill ids. Several PoE1 and PoE2 class names share one start node. A name-only map would hide that, and guessing a single modern class name would drop export data.

**Consequences:** Later graph code can ask which node a named class starts on without treating `root` as an allocatable passive.

## D-016 — The passive graph reports structural problems

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `buildPassiveGraph` keeps a queryable adjacency map and records unknown references, one-way links, edge mismatches, duplicate ids, and nodes with no neighbors on `issues`. Asking for neighbors of an id that is not in the graph throws. The graph does not search paths or score nodes.

**Reason:** Callers need neighbors for known nodes, and broken connections must stay visible instead of being repaired silently.

**Consequences:** A valid pinned snapshot should have no unknown or one-way issues. Isolated nodes from the export remain listed. Path search stays in a later step.

## D-017 — Build fixtures keep goals beside the character

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A build fixture is a `CharacterBuildSnapshot` plus `goals`. Goals are an `objective` of `offensive`, `defensive`, or `balanced`, and a nonnegative `pointBudget`. Goals are not fields on the character snapshot. `loadBuildFixture` reports passive ids that are missing from the selected tree snapshot, and weapon-set ids are reported separately from `allocatedPassiveIds`. Unknown ids stay on the loaded character.

**Reason:** A later live character import should produce the same character shape without inventing a build goal. The sample domain fixtures still use invented node ids to test the schema. The build files under data-sources are the ones checked against the pinned tree.

**Consequences:** Path legality, ascendancy rules, and point costs calculated from level are not part of fixture import. Skill and equipment entries in the build files are labels until gear and skill normalization exist.

## D-018 — Optimization starts only from a readiness gate

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `compareGameDataSources` treats a fixture and a tree as the same pin only when source, version, and commit are all present and equal. If both checksums are present they must also be equal. A missing version or commit blocks the comparison. `fetchedAt` is not compared. `assessOptimizationReadiness` is not ready when the class is unknown, any shared or weapon-set passive id is missing, the sources are incompatible, or the graph has a blocking issue. `isolated-node` is diagnostic. `duplicate-node`, `unknown-reference`, `non-reciprocal`, and `edge-mismatch` block path search. `requireOptimizationReadiness` throws when the result is not ready. It does not enumerate paths.

**Reason:** STEP-004 records graph problems without throwing, and STEP-005 reports unknown ids without removing them. A later path search must not ignore those results or run a build against a different tree pin. Connectivity on a broken graph would be ambiguous.

**Consequences:** STEP-006 must call `requireOptimizationReadiness` before any path enumeration. Readiness covers the main passive tree's structure only. It does not decide ascendancy access, weapon-set legality, or how many points a level or quest grants. `pointBudget` stays a nonnegative integer on `BuildGoals`.

## D-019 — Main-tree path search charges one point per new node

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `enumerateMainTreePaths` calls `requireOptimizationReadiness` and then lists connected main-tree paths. The class start is the origin. Already allocated main-tree nodes count only when they are connected to that start through other allocated main-tree nodes. Each new node costs one point. No path costs more than `goals.pointBudget`. The same set of nodes is kept once, in the first discovered order. Ascendancy members and ids that appear only in weapon-set specialisations are excluded. The search stops at a point-budget cap of 5, 500 paths, or 20,000 expansions. A requested budget above the cap throws. The search does not score paths.

**Reason:** STEP-006 needs connected candidates without inventing ascendancy, weapon-set, quest, or level point rules. An uncapped walk of the official tree is large enough to need a hard stop.

**Consequences:** A result with scope `main-passive-tree` is not a claim of full PoE2 build legality. Scoring stays in a later step. Raising the budget cap requires a new decision. D-021 supersedes the part of this decision that kept searching after a disconnected shared allocation.

## D-020 — `isFree` is not a verified point cost

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The pinned PoE2 `0.5.5` export has three nodes with `isFree: true`: Sanguimancy (`8415`, ascendancy `Witch2`), Smith's Masterwork (`9988`, ascendancy `Warrior3`), and Sacred Unity (`28254`, ascendancy `Huntress2`). All three are notables. None is a main-tree node. The export has no point-cost field. `passiveNodePointCost` returns 1 for every other node and throws `UnpricedPassiveNodeError` for `isFree`. Main-tree search excludes `isFree` neighbors and lists them on `excludedUnpricedNodeIds`. A shared allocation that includes an `isFree` node throws. The flag is not treated as zero cost.

**Reason:** The name `isFree` is not a statement of passive-point cost. Sacred Unity also has an `unlockConstraint`, and Sanguimancy carries an unverified `grantedSkill`. Those fields do not say how many points the node costs.

**Consequences:** Paths from this search do not contain `isFree` nodes, and their `pointCost` is the sum of `passiveNodePointCost`. Ascendancy legality is still not modeled. A later verified cost rule can replace this decision.

## D-021 — Disconnected shared allocations stop path search

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `enumerateMainTreePaths` throws `DisconnectedAllocationError` when an id in `allocatedPassiveIds` is a main-tree node and is not connected to the class start through the character's other shared main-tree allocations. The error lists those ids. The search does not continue from the connected subset. Ids that appear only in `set1`, `set2`, or `set3`, and ascendancy allocations, are not treated as this error.

**Reason:** Dropping a disconnected shared node would optimize a different build from the one that was imported.

**Consequences:** This supersedes the STEP-006 behavior that reported those ids and kept searching. Weapon-set legality and ascendancy access stay out of scope.

**Supersedes / superseded by:** Supersedes the disconnected-allocation portion of D-019.

## D-022 — A truncated search is not an exhaustive optimum

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `MainTreePathSearch.searchCompleteness` is `exhaustive` only when `truncated` is false. That means every path allowed by the implemented main-tree rules for that budget was enumerated. It does not mean full PoE2 legality. `candidateSelectionClaim` returns `highest-scoring path among enumerated candidates` for an exhaustive search and `best path found within search limits` for a truncated search. It never returns a globally optimal claim.

**Reason:** A cap on paths or expansions omits candidates. Later scoring must not describe that subset as the best possible path.

**Consequences:** STEP-008 and later recommendation code must use `candidateSelectionClaim` or an equivalent check. UI copy is not part of this step.

## D-023 — Passive stat lines are recognized only by whole-line templates

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `parsePassiveStatLine` recognizes a passive stat only when the entire raw string matches one explicit template: `+N to [Id]`, `+N to any [Id|Name]`, `+N to maximum [Id|Name]`, or `N% increased [Id]` with at most one trailing word. The canonical `statId` is the form, the export markup id, and a slug of the visible words. Two different display texts that share a markup id stay different stats. Every other line is `unrecognized` and keeps its raw text. `passiveStatCoverage` counts both groups. Recognized amounts are not scores.

**Reason:** The pinned export stores stat text, not a stat-value table. A partial match would hide a conditional or a second clause. The visible words have to be part of the id because one markup id, `CriticalDamageBonus`, is used for both critical damage bonus and critical spell damage bonus.

**Consequences:** Most stat lines on the `0.5.5` pin stay unrecognized. Later scoring must not treat an unrecognized line as zero. Adding a template requires a regression test for the whole line.

---

## D-024 — More whole-line stat templates, still no partial matches

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** STEP-007A adds whole-line templates on top of D-023. New templates are: `+N to all [Id|Name]`, `+N% to [Resistances|Name]`, `+N to [Id] <one word>`, `N% increased maximum [Id|Name]`, `N% increased|reduced|more|less` with one markup and at most two trailing words, the same four operations with a plain-English subject and no markup, two exact minion lines, two exact critical-chance lines scoped to spells or attacks, and `Damage Penetrates N% [Resistances|Fire|Cold|Lightning Resistance]`. A trailing or plain subject that contains `while`, `if`, `when`, `against`, `per`, `with`, or `for` stays unrecognized. `plain` is the source id only when the line has no markup id. `reduced`, `more`, `less`, and `penetration` are separate forms from `increased` and `added`.

**Reason:** Those sentences are unambiguous as a whole line. A broader substring match would hide a condition or a second effect.

**Consequences:** Extraction coverage on the `0.5.5` pin rises from 1,821 of 5,963 lines to 2,616. The rest stay unrecognized.

---

## D-025 — Semantic stat ids come from an explicit table

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `semanticPassiveStat` maps an extracted `statId` to a semantic family only when that id is listed in `SEMANTIC_BY_STAT_ID`. The semantic result keeps the extracted operation, amount, unit, scopes, and raw line. Unrecognized lines have no semantic stat. The same semantic id may be used for flat and percent forms of one visible stat, because the operation field stays different. These pairs share a family on purpose: Strength, Dexterity, and Intelligence added versus increased; maximum Energy Shield added versus increased; Evasion Rating added versus increased; maximum Life increased, more, and less. These do not share a family: Critical Damage Bonus and Critical Spell Damage Bonus; any Attribute and all Attributes; generic Critical Hit Chance and Critical Hit Chance for spells or attacks; generic Damage and minion Damage. Projectile Damage is not aliased to any other projectile phrase. No "Projectile Attack Damage" line exists on this pin.

**Reason:** Scoring needs categories, but similar wording is not evidence that two stats are the same.

**Consequences:** Semantic coverage is a subset of extraction coverage. On this pin, 1,845 lines have a semantic id and 771 recognized lines do not.

---

## D-026 — Conditions and multiple effects stay unrecognized unless the template stores them

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A condition or scope is stored only when a template names it. Minion lines store scope `minions`. Critical chance for spells or attacks stores `spells` or `attacks`. A line with `while`, `if`, `when`, `against`, `per`, `with`, or `for` in the variable part stays unrecognized, including `20% increased Damage while on Full Life`. A line with two markup tokens stays unrecognized unless an exact template represents one effect, as with elemental penetration and scoped critical chance. `N% increased [Armour] and [Evasion] Rating` stays unrecognized. Derived lines such as "Gain Deflection Rating equal to N% of Evasion Rating" stay unrecognized.

**Reason:** Dropping the qualifier would turn a conditional or a pair of effects into a generic stat.

**Consequences:** Conditional damage, gain-as-extra, and conversion are not available to scoring yet.

---

## D-027 — Increased, reduced, more, and less stay different operations

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `20% increased Damage` and `20% more Damage` are different forms and different stat ids. Only the increased line is mapped to the semantic family `damage`. `more` and `less` are not converted into `increased` or `reduced`. This step does not calculate damage.

**Reason:** In Path of Exile, increased and more are different operations. The text already says which one it is.

**Consequences:** A later scorer can read `operation` and must not treat those words as interchangeable.

---

## D-028 — Scoring readiness requires family support and the 70% working target

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `assessStatScoringReadiness` returns `ready` only when every id in `REQUIRED_SEMANTIC_IDS` has at least one line, extraction coverage is at least 70% of stat lines, and `UNSUPPORTED_HIGH_PRIORITY_FAMILIES` is empty. The 70% figure is the STEP-007A working target, not a permanent rule, and it is not sufficient by itself. The unsupported families for this step are `more-damage`, `less-damage`, `damage-reduction`, `gain-as-extra`, `damage-conversion`, `conditional-damage`, `elemental-resistance-penetration`, `maximum-resistance`, and `reservation`. On the `0.5.5` pin every required family is present, extraction coverage is 43.9%, and the status is `not-ready`.

**Reason:** An overall percentage can look acceptable while more damage, conversion, and conditional damage are still invisible. Guessing templates to reach 70% would be worse than stopping.

**Consequences:** STEP-008 stays blocked until a later step raises verified coverage or explicitly changes this readiness rule.

---

## D-029 — Passive stat text is tokenized before it is interpreted

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `tokenizePassiveStat` splits a raw passive stat into numbers, ranges, markup tokens, words, and punctuation. A markup token keeps both the source id and the display text when the export has both. Whitespace is not a token. A newline is punctuation. The tokenizer does not assign an operation or a semantic family.

**Reason:** Later grammar rules need the same pieces, instead of a new regular expression for every sentence.

**Consequences:** A line that contains punctuation or a numeric range is not parsed unless a grammar rule consumes that token. No current rule does.

---

## D-030 — The grammar must consume the whole line

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `parsePassiveStatExpression` accepts a line only when one grammar rule consumes every token. Supported shapes are gain-as-extra, penetration, damage taken (`Take`), an actor plus `deal` or `have`, chance, regeneration, conversion, added values, and `increased` / `reduced` / `more` / `less` with a subject and qualifier clauses. STEP-007A whole-line templates still run first and keep their stat ids. The grammar fills in lines those templates reject.

**Reason:** A partial match would drop a second clause. The older templates already have locked stat ids.

**Consequences:** On the `0.5.5` pin, structural coverage is 4,717 of 5,963 lines (79.1%). 1,246 lines stay unrecognized.

---

## D-031 — Conditions and scopes are clauses, not deleted words

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `while`, `if`, and `when` are condition clauses. `against`, `per`, `with`, and `for` are scope clauses. A leading actor (`Minions deal`, `Channelling Skills deal`) is an actor scope. Each clause stores its text and any markup tokens inside it. A conditional damage line keeps semantic id `damage` or the typed damage id, plus the condition. It is not unconditional damage.

**Reason:** The qualifier is part of the stat. Stripping it would inflate generic damage.

**Consequences:** `20% increased Damage while on Full Life` is recognized and still conditional. Parsing a condition does not say whether that condition is active.

---

## D-032 — Coordinated armour and evasion are two effects

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `N% increased [A] and [B] <words>` becomes two effects with the same amount and operation. Any other `and` fails the parse. The trailing words stay on the second effect. Both markup ids are kept.

**Reason:** That shape is one amount applied to two stats. A looser split would assign words to the wrong stat.

**Consequences:** `12% increased [Armour] and [Evasion] Rating` is armour plus evasion rating. `8% increased [Attack] and Cast Speed` stays unrecognized.

---

## D-033 — Conversion and gain-as-extra are different operations

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `Gain N% of X as Extra Y` is `gain-as-extra`, with source text, source markup, target text, and target markup. `N% of X Converted to Y` is `conversion`, with the same fields. Neither operation is stored as increased damage. A semantic id `damage-conversion` is used only when both sides say damage. Cost conversion, such as mana costs converted to life costs, stays operation `conversion` and has no damage-conversion id.

**Reason:** The sentences name different mechanics. The pinned damage-to-damage conversion line also has a second clause, so it is not parsed.

**Consequences:** Gain-as-extra is supported semantically. Damage-type conversion is only partially supported. That partial support blocks STEP-008.

---

## D-034 — Damage taken is a direction, not less damage dealt

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A line that starts with `Take` and then a percent operation has direction `taken`. `deal` sets direction `dealt`. Other lines are `unspecified`. `Take 30% less Damage` is semantic id `damage-taken`, operation `less`. It is not the semantic id `damage`.

**Reason:** Damage taken and damage dealt change different sides of a calculation.

**Consequences:** Damage reduction is supported as damage taken. Outgoing less damage is supported separately when a line such as `Mirages deal 50% less Damage` parses.

---

## D-035 — Semantic ids stay stable, and scoped lines do not reuse a bare stat id

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Lines recognized by the STEP-007A templates keep their stat ids and the existing semantic table. Grammar lines build a stat id from the operation, markup ids, subject, and clauses, so a scoped line does not reuse the bare id. `more.plain.more-damage`, `less.plain.less-damage`, and `reduced.plain.reduced-damage` map to semantic id `damage` with their own operation. Critical Damage Bonus and Critical Spell Damage Bonus stay different ids. Added and increased forms of the same attribute still share a semantic id and keep the operation, as in D-025.

**Reason:** Scoring needs a family, and it also needs the operation and the clause. Reusing a bare stat id would hide the clause in the coverage counts.

**Consequences:** Semantic coverage on this pin is 2,758 lines (46.3%). A recognized line with no family, or a multi-effect line whose effects do not all have families, is not counted as semantically normalized.

---

## D-036 — Scoring readiness now requires structured operations and full family support

**Status:** Superseded in part by D-043  
**Date:** 2026-09-26

**Decision:** `assessStatScoringReadiness` returns `ready` only when extraction coverage is at least 70%, every required semantic family has a line, the structured operations `more`, `less`, `conversion`, and `gain-as-extra` each occur, and no high-priority family is `still-unsupported` or `partially-supported`. The 70% figure remains a working target, not a sufficient condition. On the `0.5.5` pin the status is `not-ready` because `damage-conversion` is only partially supported.

**Reason:** 79.1% structural coverage still leaves damage-type conversion unparsed. Marking scoring ready from the percentage alone would hide that gap.

**Consequences:** STEP-008 stays blocked until D-043. D-028's fixed unsupported list is no longer the pin result; the grammar report is. D-043 changes which partial family blocks readiness.

---

## D-037 — A multi-clause line is recognized only when every clause parses

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A passive stat line is split on newlines. Each clause is parsed with the existing single-clause grammar. The line is recognized only when every clause returns effects. If any clause fails, the whole line stays unrecognized. The first clause is not kept on its own.

**Reason:** Keeping the first clause and dropping the second would hide a restriction the tree actually states.

**Consequences:** `75% of Damage Converted to Fire Damage` parses alone as conversion. The pinned line continues `Deal no Non-Fire Damage`. That second clause has no number and contains a hyphen, so it does not parse. The full line stays unrecognized. Damage-type conversion stays partially supported.

---

## D-038 — Suffix “Damage taken” is incoming damage

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Direction stays separate from `increased`, `reduced`, `more`, and `less`. A leading `Take` sets direction `taken`. An actor verb `deal` sets direction `dealt`. If direction is still unspecified and the subject contains the word `taken`, direction becomes `taken`. The STEP-007A percent templates do not consume a trailing `taken`; those lines go to the grammar. `taken as` conversion is a different sentence and is not turned into less-damage.

**Reason:** `10% less Damage taken` is damage the character receives. Treating it as outgoing less-damage scored the wrong side.

**Consequences:** Incoming less damage uses semantic id `damage-taken`. `Mirages deal 50% less Damage` stays operation `less` and direction `dealt`. That mirage line is a gem-tab stat, not a passive-node stat.

---

## D-039 — Outgoing less-damage has no passive-node line on this pin

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** High-priority family `less-damage` means outgoing damage with operation `less` and direction other than `taken`. After D-038, the pinned passive nodes do not contain such a line. The earlier `supported-semantically` flag came from suffix `Damage taken` lines whose direction was unspecified. The grammar still represents `Mirages deal 50% less Damage` in tests. The family report, which scans passive nodes only, marks `less-damage` as `still-unsupported`.

**Reason:** D-034 named a gem-tab line as the corpus example. That line is not in `rawStats`.

**Consequences:** `less` still occurs as a structural operation, on lines such as `Take 30% less Damage`. Those lines are damage taken, not outgoing less-damage.

---

## D-040 — Evasion to Deflection is a derived ratio

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `Gain [Deflect|Deflection Rating] equal to N% of [Evasion|Evasion Rating]` uses operation `derived-from`. The amount is the percent ratio. Source markup is Evasion. Target markup is Deflect. The semantic id is `deflection-from-evasion`. The same shape with source Armour uses `deflection-from-armour`. Neither id is `deflection`, and neither form is `increased` or `added`. The engine does not calculate a Deflection total. Other `equal to` lines that are not this exact shape stay unrecognized.

**Reason:** The pin uses this sentence for a relationship, not a flat Deflection bonus. Armour uses the same shape once. Lines such as Guard per Jade, Accuracy equal to Strength, and thorns do not match it.

**Consequences:** These lines leave the unrecognized inventory and count as semantically mapped. A later scorer must not add `N` to Deflection.

---

## D-041 — Structured-but-unmapped lines have their own inventory

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `unmappedStructuredInventory` lists recognized lines whose semantic result is null. It is separate from the unrecognized inventory. The family id is the operation, the markup source ids, and the clause roles. A template line with no parsed effect uses `template.` plus its stat id. Only three groups were mapped in this step, because the words name one stat and the line has no extra condition: `skill-effect-duration`, `area-of-effect`, and `skill-speed`. Ailment magnitude, charges, minions, flasks, and weapon or skill conditionals stay unmapped.

**Reason:** STEP-007B left 1,959 recognized lines without a family. Mapping all of them would invent meanings.

**Consequences:** On this pin, 1,868 lines stay structurally parsed and semantically unmapped.

---

## D-042 — Path confidence is separate from search completeness

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `pathSemanticCoverage` counts stat lines on the nodes it is given. It does not scan the rest of the tree and it does not call path search. A line is semantically mapped when `semanticPassiveStats` returns a family for it, structurally parsed only when it is recognized but unmapped, and unrecognized otherwise. `unsupportedRawLines` contains the unrecognized and structurally-parsed-only raw strings, in path order. No amount `0` is stored for them. Ratios divide by `totalStatLines`. When that total is 0, both ratios are 1 and confidence is `complete`. Otherwise confidence is `complete` at 100% mapped lines, `high` at 90% or more, `partial` at 70% or more, and `low` below 70%. Comparison uses integer percents (`mapped * 100 >= total * threshold`). `searchCompleteness` stays on the search result.

**Reason:** A path can be exhaustively searched and still be poorly understood. An empty stat path has nothing unknown. 100% is the only complete understanding. 90% leaves a small gap. 70% matches the extraction working target. Below that, the unseen lines can outweigh the known ones.

**Consequences:** A score that ignores this report can hide missing effects. STEP-008 must keep both dimensions.

---

## D-043 — A partial family is reported, and an unsupported family still blocks

**Status:** Superseded in part by D-048  
**Date:** 2026-09-26

**Decision:** This supersedes the D-036 rule that a `partially-supported` family blocks readiness. `decideStatScoringReadiness` is `ready` when extraction is at least 70%, every required semantic family has a line, `more`, `less`, `conversion`, and `gain-as-extra` each occur, and no high-priority family is `still-unsupported`. Partial families are returned on `partiallySupportedFamilies` and do not block by themselves. On the `0.5.5` pin the status is still `not-ready` because `less-damage` is `still-unsupported` (D-039). `damage-conversion` remains `partially-supported` (D-037) and is listed, not used as the blocker. STEP-008, when it is approved, may use known semantic effects only together with `pathSemanticCoverage`. A higher score on a path whose confidence is not `complete` is not a definitive improvement. Unknown lines are not zero. This step does not implement a score.

**Reason:** Cost conversion parses, and the one damage-to-damage line stays visible as unrecognized. That partial gap should stay visible without being the only blocker. Outgoing less-damage is absent from passive nodes, so a scorer cannot claim that family is covered.

**Consequences:** Scoring readiness stayed `not-ready` until D-048. STEP-008 did not start in STEP-007C.

---

## D-044 — The scoring domain is passive-node raw stats

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** For STEP-007D and later MVP scoring readiness, the scoring domain is the `rawStats` on passive nodes from the pinned passive tree. It does not include gems, skill descriptions, gear modifiers, trade data, Path of Building calculations, or a future tree. Readiness is recalculated when the pin changes.

**Reason:** A mechanic that appears only on a gem tab cannot be allocated by the current passive-tree search.

**Consequences:** `Mirages deal 50% less Damage` stays outside the domain. Presence detection reads passive-node stats only.

---

## D-045 — Family support and domain presence are separate

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Each high-priority family report records `supportStatus`, `presentInScoringDomain`, `omissionExposed`, and `blocking`. Support is whether the parser and semantic map represent the mechanic. Presence is whether a passive-node line in the current pin states it. A family blocks only when it is present, not supported, material to MVP scoring, and path coverage would not show the missing line.

**Reason:** An unsupported mechanic that the current tree never states should not stop scoring of the lines the tree does state.

**Consequences:** `highPriorityFamilyReport` is the source of those fields. `assessStatScoringReadiness` blocks only on `blocking: true`.

---

## D-046 — Outgoing less-damage does not block this pin

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** On the `0.5.5` passive nodes, outgoing less-damage has `presentInScoringDomain: false` and does not block. `Take 30% less Damage` and `10% less Damage taken` are incoming damage. They are not evidence of outgoing less-damage. The grammar and the semantic id for a dealt less-damage line stay in place. A later pin that adds an outgoing less-damage passive line must be reassessed by the same report.

**Reason:** D-039 showed the earlier blocker was a gem-tab line plus misread `taken` lines.

**Consequences:** This supersedes the D-043 rule that every `still-unsupported` family blocks. An absent family does not block. A present unsupported family whose line would be hidden still blocks.

---

## D-047 — Partial damage conversion stays visible and does not block

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `damage-conversion` remains `partially-supported` and `presentInScoringDomain: true`. It does not block, because `75% of Damage Converted to Fire Damage\nDeal no Non-Fire Damage` stays unrecognized and `pathSemanticCoverage` lists that raw line. No meaning is invented for `Deal no Non-Fire Damage`. A path that includes that node cannot have confidence `complete`.

**Reason:** The supported cost-conversion portion is represented. The missing second clause stays on the node as text, so a later score cannot treat the path as fully understood.

**Consequences:** Partial families are listed on `partiallySupportedFamilies`. They block only when the gap would not appear in path coverage.

---

## D-048 — Scoring may start, and a score must keep both reliability fields

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** On the `0.5.5` pin, `assessStatScoringReadiness` is `ready`. Extraction coverage is 80.1%. Required semantic families are present. Outgoing less-damage is absent. Damage conversion is partial and visible. Unknown lines are not zero. STEP-008, when approved, must return `pathSemanticCoverage` and `searchCompleteness` as separate fields. A confidence of `complete` may be compared with other complete paths, subject to search completeness. Incomplete semantic coverage may score known effects only, and a higher number is not proof that the path is better than a complete path. A truncated search may be called only the highest-scoring path found within search limits. If both limits apply, both stay visible. This step does not implement a score.

**Reason:** The remaining gaps are either absent from passive nodes or left visible on the path. Blocking STEP-008 on an absent family would wait for a line the optimizer cannot encounter.

**Consequences:** STEP-008 is the next planned step and waits for approval. D-043's `not-ready` result is superseded for this pin.

---

## D-049 — A heuristic score is never returned alone

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `scorePassivePath` returns `heuristicScore`, `scorePerPoint`, contributions, `pathSemanticCoverage`, semantic confidence, `unsupportedRawLines`, and `searchCompleteness` together. No public function returns only a number. Candidate comparison uses `heuristicScore`. `scorePerPoint` is `heuristicScore / pointCost`, or the raw score when the cost is 0. It is not the ranking value, so path length is not applied twice.

**Reason:** A lone number hides missing stats and can be mistaken for DPS.

**Consequences:** Callers that rank paths must read the comparison claim as well as the score.

---

## D-050 — Only increased, reduced, and added are valued, and only from profile weights

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Profiles `offensive`, `defensive`, and `balanced` store a separate weight for `increased`, `reduced`, and `added` on each semantic id. A missing weight, or `null`, leaves that operation unscored. `more`, `less`, `penetration`, `conversion`, `gain-as-extra`, `derived-from`, `chance`, and `regeneration` are never given a weight. `derived-from` is not scored as increased or flat deflection. Changing a weight is a profile edit. The scoring function does not contain objective-specific numbers.

**Reason:** Those operations are not the same modifier. Inventing one multiplier would hide that.

**Consequences:** A mapped but unscored effect stays in the breakdown with `supported: false` and is excluded from the sum. `valuationComplete` is false when any contribution is unsupported.

---

## D-051 — Conditional stats are unscored

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** An effect with a condition, or a scope of type `while`, `if`, `when`, `against`, `with`, `for`, or `per`, does not receive its unconditional weight. There is no hidden "always active" factor. Actor scopes can still be scored when the semantic id has a weight.

**Reason:** The tree does not say the condition is active for the whole build.

**Consequences:** Those lines remain visible in the contribution list and keep the path from being valuation-complete.

---

## D-052 — Mixed confidence is not a definitive win, and ties are mechanical

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A comparison is definitive only when every candidate has semantic confidence `complete`, `valuationComplete` is true, and search completeness is `exhaustive`. The winner is the higher `heuristicScore`. Equal scores then prefer the higher semantic-confidence rank, then the lower point cost, then ascending node-id text. If confidence or valuation differs, the claim is `not-definitive` and there is no preferred winner, even when one score is higher. If the search is truncated and the paths are otherwise complete, the claim is `best-path-found-within-search-limits`. That wording is not a global optimum. `searchCompleteness` stays its own field.

**Reason:** PRE-008 forbids treating `92 > 84` as proof when one path is only partly understood, and it forbids merging search completeness into semantic confidence.

**Consequences:** `compareScoredCandidates` and `selectScoredCandidates` implement this rule. STEP-009 must keep the claim.

---

## D-053 — Weights normalize unit scale; they are not combat math

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** A profile weight is a heuristic scale factor for `amount * weight`. The same raw amount is not the same value across families. `+10` Strength, `10%` increased Evasion, `10%` increased Projectile Damage, `1%` Maximum Resistance, `10%` Movement Speed, and `10%` Critical Hit Chance are different units, so their weights differ on purpose. That difference is normalization, not a claim that one percent of one stat equals a measured multiple of another.

**Reason:** Leaving every family at the same weight would let a large raw number, such as a flat attribute or a flat rating, outrank a smaller percentage that the profile treats as more important.

**Consequences:** Relative weights in `profiles.ts` must stay explicit. A later change that treats two families as equal combat value needs a real model and a new decision. STEP-008A did not add one.

---

## D-054 — The three profiles are written tables, not copies of each other

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `offensive` contains offense families and no life pool. `defensive` contains defense families and no spell damage. `balanced` is a separate written table that includes both headline families at about half the specialist increased weight. It is not computed as the average of the other two profiles. A stat missing from a profile is unscored for that objective. `reduced` stays the negation of `increased` when `increased` is a number. `added` is a different number, or `null`.

**Reason:** An objective that silently contains the other objective's families, or a balanced profile that is only an unreviewed average, would hide the calibration choice.

**Consequences:** `10%` increased Spell Damage and `10%` increased maximum Life score 20 and 0 on `offensive`, 0 and 20 on `defensive`, and 10 and 10 on `balanced`. The balanced tie is then broken by the existing node-id rule. A mapped stat with no weight keeps `valuationComplete` false, so that cross-profile comparison is not a definitive winner.

---

## D-055 — Flat critical-hit chance uses a larger added weight

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The `added` weight for `critical-hit-chance` is 8 on `offensive` and 4 on `balanced`. The matching `added` weights for `critical-hit-chance-for-spells` and `critical-hit-chance-for-attacks` on `offensive` are also 8. STEP-008 used 1, 1, 1, and 0.5. Increased critical-hit chance stays 1.5 on `offensive` and 0.8 on `balanced`.

**Reason:** Flat critical chance on these lines is a small percentage. Weight 1 made `+1%` critical chance worth 1 beside `10%` increased Spell Damage at 20. Weight 8 makes `+1%` worth 8, still below `10%` increased Spell Damage (20) and below `10%` increased Critical Hit Chance (15). This compensates for the unit. It does not say that 1% flat critical chance equals 8/1.5 percent increased critical chance in combat.

**Consequences:** The `for spells` and `for attacks` rows stay in the offensive table, but D-051 still refuses to score a `for` scope, so those two rows are unreachable until that policy changes. STEP-008A does not change D-051. No pinned Witch score changed, because that path is `8%` increased Spell Damage.

---

## D-056 — Scoring profiles carry calibration version 1

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `SCORING_PROFILE_VERSION` is 1. Each profile stores that version, and `scorePassivePath` copies it onto `profileVersion`. The version identifies this weight set. It is not a domain type.

**Reason:** Later weight edits need a visible label so a score can be tied to the table that produced it.

**Consequences:** A future weight change should bump the version and record the old score, the new score, and the reason when a locked number moves.

---

## D-057 — Ranking stays on heuristicScore

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Primary ranking remains `heuristicScore`, as in D-049. `scorePerPoint` stays a reported field. A 1-point path scoring 20 does not outrank a 5-point path scoring 60.

**Reason:** STEP-008A reviewed point cost and did not find a reason to switch the sort key. Score per point would prefer the smaller path even when the larger path scores higher inside the same budget.

**Consequences:** `compareScoredCandidates` is unchanged. STEP-009 must keep this ranking key.

---

## D-058 — Maximum resistance stays unscored

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Do not add heuristic weights for maximum resistance. Scoring profile version stays 1. A path that contains a maximum-resistance line stays out of the complete Top-K.

**Reason:** The pinned tree has 28 maximum-resistance lines. Three are unconditional player stats: `+1%` maximum cold resistance, `+1%` maximum lightning resistance, and `+10%` maximum chaos resistance. Eight more are minion lines, which would become scored if a weight existed, because an actor scope is still eligible. Four are `while` conditions and stay unscored under D-051 even with a weight. The rest are unrecognized or unmapped. A shared `added` weight would also treat `+1%` and `+10%` as the same unit. STEP-008A already refused to treat 1% maximum resistance as a measured multiple of armour or life. That is not a safe heuristic value.

**Consequences:** Mapped maximum resistance stays in the contribution list with `supported: false` and contribution 0. That 0 means the stat was not valued. It does not mean the path is fully valued at zero. Unrecognized maximum-resistance lines stay on `unsupportedRawLines`. Both kinds of path go to `incompleteCandidates` with `fullValueUnknown: true`.

---

## D-059 — Top-K ranks fully valued paths separately from incomplete paths

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `recommendScoredCandidates` splits candidates. `rankedCompleteCandidates` contains only paths whose semantic confidence is `complete` and whose `valuationComplete` is true, ordered by `heuristicScore` descending and then the D-052 tie-break, sliced to K. Every other path is returned in `incompleteCandidates` with `fullValueUnknown: true`. An incomplete path is not moved into the complete list to fill K. The incomplete list is stably ordered for reproducibility. That order is not a claim that one incomplete path is better.

**Reason:** PRE-009 forbids one leaderboard sorted only by heuristic score. A higher known score on a partial path is not a definitive win.

**Consequences:** The public result keeps the scored candidate fields, the search completeness, the claim, the passive-tree version, and the profile version. `compareCandidateOrder` is an internal sort. The package index does not offer a function that returns only node ids. Near-duplicate paths are not removed. PRE-009 gives no similarity rule, and dropping a path would be an extra preference.

---

## D-060 — Recommendation claims name the reliability limit

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The recommendation claim is one of: `no-candidates`, `no-complete-candidate`, `not-definitive-incomplete-valuation`, `highest-scoring-complete-path-found-within-search-limits`, or `highest-scoring-complete-path-among-enumerated-candidates`. `definitive` is true only for the last claim when K is greater than 0. Search completeness stays its own field. If any candidate or the search is truncated, the result's search completeness is `truncated`. When incomplete paths and a truncated search both apply, the claim names the incomplete valuation and the search field still says truncated.

**Reason:** A truncated search must not be called a global optimum. An incomplete valuation must not be called a win over a fully valued path.

**Consequences:** STEP-010 and later UI must show the claim and the two lists. They must not replace them with a single sorted score.

---

## D-061 — The analysis screen displays the recommendation and does not rank

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The web app calls `recommendMainTreePaths` and renders `rankedCompleteCandidates` and `incompleteCandidates` in that order. It does not sort, drop, or promote paths. The form's objective and point budget replace the fixture goals for that request. The screen shows up to 5 fully valued paths. When `POE2_PASSIVE_TREE_SNAPSHOT_DIR` is unset, the local app reads the development pin under `docs/data-snapshots/passive-tree`.

**Reason:** STEP-010 requires one analysis from the browser, useful errors, and a UI with no optimization logic. D-060 requires both lists and the claim to stay visible.

**Consequences:** A later UI step can change presentation. It still must not invent a ranking or hide incomplete paths. A deployed app should set the snapshot directory instead of relying on `docs/`.

---

## D-062 — Path visualization shows allocation order and does not rank

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The analysis screen shows each returned path as a numbered list of node names and ids, in the path's existing order. A local sketch draws that path and the already-allocated node it touches, using export coordinates. When a node has no position, the sketch is omitted and the numbered list remains. Comparing two paths lists shared nodes and nodes unique to each path, in path order. It does not create a score or a winner. If the first proposed node touches more than one allocated node, the sketch attaches to the lowest node id.

**Reason:** STEP-011 needs an allocation order the player can follow, a distinction between current and proposed nodes, and a comparison. A full passive-tree rendering is not required for that, and a new ranking would break D-061.

**Consequences:** STEP-012 and later screens can replace the sketch with official tree art. They still must keep the numbered order and must not hide incomplete paths or invent a comparison winner.

---

## D-063 — A passive-tree refresh promotes only a validated snapshot

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** `refreshPassiveTreeSnapshot` downloads one named commit of `grindinggear/poe2-skilltree-export` and promotes it only after `normalizeSkillTreeExport` and `loadPinnedPassiveTreeSnapshot` both succeed. The command requires the snapshot directory, the 40-character commit, and the version. It does not choose the latest branch. A failed download, JSON parse, schema check, or checksum reload leaves the current `data.json` and `manifest.json` unchanged. A successful promote copies the previous pin into `previous/` and appends `changelog.md`. `rollbackPassiveTreeSnapshot` restores that previous pin after validating it. The approved development pin remains version 0.5.5, commit `bd87e6512c92b868542eddfb1ba4ea8b6dc2da36`, until that command is pointed at it. Tests use a temporary directory. Recommendation results keep recording the loaded snapshot as `dataVersion`.

**Reason:** STEP-012 needs an update path that cannot replace a known-good snapshot with a broken download, and the current pin is already the approved source for the fixtures and scores.

**Consequences:** Only one previous generation is kept. A running app keeps its in-memory snapshot until restart. poe.ninja and other sources are not part of this command. Promoting a new official commit also requires updating fixture source versions before analysis will accept them.

---

## D-064 — Snapshot promotion also requires optimizer compatibility

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** After the STEP-012 schema and checksum checks, `refreshPassiveTreeSnapshot` promotes only when the compatibility result it is given has `compatible: true`. The refresh command passes `assessPassiveTreeRefreshCandidate`, which calls `assessPassiveTreeCompatibility` with `weightedSemanticIds`. data-sources does not take a runtime dependency on the passive or scoring engines. The gate reuses `graphIssueBlocksOptimization` and `highPriorityFamilyReport` / `highPriorityFamilyBlocks`. It does not copy those rules. `duplicate-node`, `unknown-reference`, `non-reciprocal`, and `edge-mismatch` block promotion. `isolated-node` stays a warning. A lower semantic or structural coverage ratio warns and does not block. Absence of a mechanic does not block. A high-priority family blocks only when that existing report marks it blocking. Mapped semantic ids that are missing from the scoring profiles are listed and do not block by themselves; maximum resistance stays unscored. Class starts are derived from the candidate export. A missing class index, a class start whose node is absent, or a current class that disappears blocks promotion. A shared class-start that loses one of its classes blocks. A class-start node id that changes, while the class still starts on an existing node, is a warning. Rollback still restores `previous/` after the existing snapshot validation and does not apply this newer gate. A failed gate leaves `data.json`, `manifest.json`, `previous/`, and `changelog.md` unchanged.

**Reason:** A structurally valid export can still add a graph break or a hidden unsupported scoring mechanic. STEP-012A needs that case to stay off the current pin without a second readiness policy.

**Consequences:** The normal refresh command cannot skip the gate. The approved 0.5.5 pin passes it and is not replaced by this step. A future pin that only drops coverage can still be promoted. A future pin that hides an unsupported high-priority family cannot.

---

## D-065 — poe.ninja economy stays behind a cached server client

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Economy data comes only from the supported PoE2 endpoints `GET /poe2/api/economy/leagues`, `GET /poe2/api/economy/exchange/current/overview`, and `GET /poe2/api/economy/stash/current/item/overview`, and only for the category names documented for those PoE2 routes. Builds, profiles, characters, authentication, and PoE1 routes are not called. The browser does not call poe.ninja. `GET /api/economy` on the web app is the proxy. The client sends `PoE2-Helper/0.1.0` plus `POE2_NINJA_CONTACT`, caches a response for `Cache-Control: max-age` or 300 seconds, and revalidates with `If-None-Match`. It retries HTTP 429 and 5xx at most three times, with backoff, and caps `Retry-After` at 5 seconds. A schema or provider failure throws `PoeNinjaError` and is not used by passive analysis. Normalized lines keep `primaryValue` as a market price. They are not heuristic scores. No poe.ninja credential is required.

**Reason:** STEP-013 needs current economy data without letting each browser poll poe.ninja, and without making passive optimization depend on that service.

**Consequences:** Set `POE2_NINJA_CONTACT` before the route will call poe.ninja. The in-process cache lasts until the server restarts. Price data is available to later gear steps and is not an input to the current passive optimizer.

---

## D-066 — GGG OAuth stays a disabled server shell

**Status:** Accepted  
**Date:** 2026-09-26  
**Superseded in part by:** D-067 for when live authorization may start. The provider boundary, server-only secret, and absence of invented credentials still stand.

**Decision:** Account character access goes through `GggCharacterProvider`. The live provider always fails with a clear disabled message and does not call `https://www.pathofexile.com`. The mock provider returns named `CharacterBuildSnapshot` fixtures. OAuth configuration is only `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, and `GGG_REDIRECT_URI`. Empty values stay missing. The only scope constant is `account:characters`. A pending session keeps `state` and the PKCE `code_verifier` in server memory for 10 minutes. The browser cookie stores the session id and is `HttpOnly`. `GET /api/auth/ggg/start` returns 503 and does not redirect. `GET /api/auth/ggg/callback` checks `state` and does not post the code to `/oauth/token`. `GET /api/auth/ggg/characters` returns the disabled-provider message. No client id, secret, or access token is invented. Passive analysis does not call these routes.

**Reason:** STEP-014 needs the OAuth boundary before GGG approval. STEP-015 is still blocked, so this build must run with the three variables empty and must not start a live authorization.

**Consequences:** Filling in the environment variables does not enable character import. A later step has to replace the disabled provider and perform the documented code exchange. The in-memory session store ends when the process stops.

---

## D-067 — Live GGG import uses a confidential client and an explicit enable flag

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** PoE2 Buddy is a confidential OAuth client. The only scope is `account:characters`. Live authorization is available only when `readGggLiveImportReadiness` is ready: `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, and `GGG_REDIRECT_URI` are valid, `GGG_CONTACT` is set, and `GGG_LIVE_IMPORT` is exactly `enabled`. Credentials alone do not redirect or exchange a code. The redirect URI is sent unchanged and must match the URI registered with GGG. No client id, secret, or token is invented. Approved credentials are still not available, so the default configuration leaves live network authorization disabled.

**Reason:** STEP-015 needs a real authorization path without turning it on in a normal developer environment.

**Consequences:** D-066's rule that the three client variables never start authorization is replaced by this gate. The app still runs while the gate is closed. A future scope needs its own decision.

---

## D-068 — GGG tokens stay in a short-lived server session

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The pending authorization session still lasts 10 minutes and keeps `state` plus the PKCE verifier in server memory. The callback checks `state` before any token POST and does not call the token endpoint after a missing, expired, or mismatched state. A successful callback consumes that pending session. The access token is stored only in a second in-memory session, capped at one hour, and is not written to disk, the cookie, logs, or the JSON result. The cookie stays `HttpOnly`, `SameSite=Lax`, and `Path=/api/auth/ggg`. It is `Secure` for HTTPS and for `NODE_ENV=production`. Refresh tokens are discarded and not implemented. `POST /api/auth/ggg/disconnect` deletes the local session and cookie and does not claim that GGG revoked the token. The in-memory stores are for one process. A production callback must hit that same process. No shared session database is added.

**Reason:** The MVP needs a token long enough to list and import one character, without a persistent account store.

**Consequences:** Restarting the server drops both the pending login and the access token. Horizontal scaling can lose the callback. Remote revocation is a later review.

---

## D-069 — A live character is normalized separately from the domain snapshot

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** GGG list and character payloads are validated with provider schemas based on the published Character and Item objects, then mapped into `CharacterBuildSnapshot`. Those schemas are not the domain schemas. Ascendancy is unavailable because the published character object has no ascendancy field. Missing skills, equipment, jewels, weapon-set specialisations, quest stats, or passive allocation stay empty on the snapshot and are listed as unavailable. Support gems are recorded only when `support` is true. Other socketed items stay unmarked. Unknown passive ids are kept and the import is `incompatible`. The same payload, tree pin, and timestamp normalize to the same result. Source metadata records `ggg` or `fixture`, the import time, the provider character id, the league, and the passive-tree pin. It does not record a token. Live data does not overwrite bundled fixtures. Importing a character does not change heuristic scores. Character data imported is not character-aware optimization.

**Reason:** A field rename or an unknown node should fail or be marked incomplete at the provider boundary instead of being coerced into a score.

**Consequences:** The published schema has not been confirmed against a live account response, because no approved client exists. A live payload that omits a documented required field fails the import. Gear text is preserved and not scored.

---

## D-070 — Item modifiers are categorized only by the existing semantic map

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `normalizeGearItem` keeps the slot, name, base type, rarity, and raw modifier text. Modifier lines come from `modifierLines` when that list is present, otherwise from `rawText` split on newlines. A line is `categorized` only when `parsePassiveStatLine` and `semanticPassiveStats` already return one or more semantic ids. A recognized line with no semantic id is `unknown` with reason `unmapped`. An unrecognized line is `unknown` with reason `unrecognized`. Unknown lines stay on the item and are not zero. Item bases are stored as text and are not given a stat category. This result is not a slot score and is not an input to the passive heuristic.

**Reason:** STEP-016 needs a deterministic item record without inventing modifier categories or treating missing gear data as zero.

**Consequences:** Plain item text such as `10% increased Spell Damage` stays unmapped until the passive grammar and semantic map name that exact line. Upgrade targets, slot scores, and economy matching remain later steps.

---

## D-071 — PoB2 import accepts only a raw export code

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The first PoB2 importer accepts a raw export code only. The code is URL-safe Base64 around a zlib stream, then XML whose root is `PathOfBuilding`. Share links and other URLs are rejected and are not fetched. Decompression stops at 1 MiB. The XML reader accepts only the five predefined entities and rejects document types, so it does not resolve external entities. No new XML package is added. PoB2 parsing stays in `data-sources` and is separate from `CharacterBuildSnapshot`. Weapon-set ids are removed from the shared allocation and stored on `set1`, `set2`, and `set3`. The build main skill is `Build@mainSocketGroup` only when that group has a valid `mainActiveSkill`; otherwise it stays unresolved. Supports are the other gems in a group whose `mainActiveSkill` is valid. Unknown passive ids are kept and the import is `incompatible`. A tree with known ids can be `partial` when class and level exist but other context is missing, and that partial tree can enter the existing passive analysis. `compatible` and `partial` trees are scored by the existing heuristic. `incompatible` trees are not ranked. Item modifier text is preserved and is not scored. Configuration is stored as key, value, and source. Notes are omitted from the snapshot. The import checksum is the SHA-256 of the decoded XML. The character snapshot records the active GGG pin, because readiness requires that pin; the import result records `source: "pob2"`.

**Reason:** GGG credentials are unavailable, so a pasted PoB2 code is the practical import path. The existing analysis pipeline can score a tree only when its source version matches the pinned tree and its node ids exist.

**Consequences:** PoB2 skills, gear, and configuration do not change `heuristicScore`. A PoB2 calculation engine and character-aware scoring remain later steps. Share-link fetching can call this importer later.

---

## D-072 — PoB2 mainActiveSkill indexes the display-skill list

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `Skill@mainActiveSkill` is a 1-based index into PoB2's display-skill list, not into the raw `<Gem>` list. The display list is rebuilt only from checked gem facts: a non-support granted effect that is not hidden from the sidebar, in the gem's granted-effect order, for enabled gems. `mainActiveSkillCalcs` is stored and not interpreted. A gem is a support only when those facts say its granted effect is a support. Any other gem stays `unknown`. A missing, `nil`, invalid, or out-of-range index leaves the main skill unresolved. An unknown skill id leaves the whole group unresolved instead of skipping that gem. Unresolved skill roles make the import `partial` and do not block passive-tree analysis. The role facts are the small set in `skill-roles.ts`, taken from Path of Building (PoE2) 0.23.1. They are not inferred from gem names. Normalization version is 2. The source checksum is still the inflated XML. Real test exports use that version's save shape and gem ids, and they are not player or community builds.

**Reason:** STEP-016.5 treated every gem after the selected index as a support. PoB2's own `CalcSetup` builds `displaySkillList` from granted effects, and one gem can contribute more than one entry.

**Consequences:** The same export can now produce a different skill interpretation than normalization version 1. Skills still do not change `heuristicScore`. Gems outside the checked fact table stay unresolved until a later step adds those facts. A PoB2 calculation engine is still not part of this import.

**Supersedes / superseded by:** Supersedes the skill-role sentences in D-071. The rest of D-071 remains in force.

---

## D-073 — Real PoB2 fidelity fixtures come from the Generate action

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** Fidelity fixtures for the PoB2 importer are export codes produced by Path of Building (PoE2) 0.23.1's Generate action, `base64url(Deflate(SaveDB("code")))`, on fresh local test builds. They are not handwritten XML compressed in Node. That version emits root `PathOfBuilding2`. Root `PathOfBuilding` stays accepted for older codes. A real export's `treeVersion` is stored as emitted (`0_5` on this install) and is not rewritten to the active pin `0.5.5`. A mismatch stays a warning. A missing build name, a literal `nil` `mainActiveSkillCalcs`, and Placeholder configuration values are not filled in or interpreted. Normalization version stays 2. The checksum stays the SHA-256 of the inflated XML.

**Reason:** STEP-016.5 and STEP-016.5A checked the parser against XML this project compressed. The installed application's Generate action is the string a player pastes.

**Consequences:** The four codes under `packages/data-sources/src/pob2/fixtures/real/` are the regression inputs. Synthetic fixtures still cover invalid input. Skills, supports, items, and configuration do not change `heuristicScore`. A PoB2 calculation engine is not part of this import.

**Supersedes / superseded by:** Superseded in part by D-074. The Generate-action fixtures, the `PathOfBuilding2` root, and the decision not to rewrite `treeVersion` remain. D-074 replaces the version-mismatch warning and normalization version 2.

---

## D-074 — PoB2 normalization separates ascendancy, ConfigSet, and tree namespaces

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** Normalization version is 3. Ascendancy node ids are removed from the main-tree allocation and kept on the PoB2 document as `ascendancyPassiveIds`. A node is an ascendancy member when the active snapshot gives it `ascendancyId` or the kind `ascendancy-start`. Name, position, id ranges, and class names are not used. Those ids are not stored on `CharacterBuildSnapshot`, so the optimizer's `allocatedPassiveIds` stays main-tree only. Weapon-set ids stay on `weaponSetSpecialisations`. User configuration is read only from `Config` / `ConfigSet` / `Input`. A direct `Config` / `Input` child is ignored. Placeholder elements are counted and are not user configuration. One ConfigSet is used. Several ConfigSets use the set whose id equals `activeConfigSet` when that match is unique. Otherwise every set is kept, the selection is unresolved, and the sets are not merged. PoB `treeVersion` and the GGG pin version are stored separately and are not compared as version strings. Unknown passive ids still make the import incompatible. A version-key difference alone does not. The checksum remains the SHA-256 of the inflated XML.

**Reason:** Real Path of Building (PoE2) 0.23.1 exports put the Infernalist start node in the same serialized node list as the class start, save edited options under `ConfigSet`, and emit tree key `0_5` beside GGG pin `0.5.5`. Treating those as one allocation, as direct `Config/Input`, or as a version mismatch changed the import without a game-data reason.

**Consequences:** Fixture A allocates only `54447` on the main tree and keeps `32699` as an ascendancy passive. Fixture D still keeps weapon sets 1, 2, and 3 separate. Fixture E records a boolean, a number, and a string from the active ConfigSet. The Witch fixture score stays 32. Fixture A's first complete candidate stays nodes `[4739, 18845, 1755, 41965]` at heuristic score 72 after the ascendancy id left the allocation, because that node adds no offensive heuristic stats. The score was re-measured and locked again. `data-sources` still depends only on `@poe2-helper/domain` and `zod`.

**Supersedes / superseded by:** Supersedes the D-073 statements that a tree-version mismatch stays a warning and that normalization version stays 2.

---

## D-075 — Gear understanding is provider-neutral and unscored

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** PoB2 remains the primary MVP source for equipped items. Gear understanding lives in `@poe2-helper/gear-engine` and accepts normalized items, so the same analysis covers a PoB2 import, a GGG import, and a fixture. Canonical slot ids are explicit. Ring 1, ring 2, and weapon set 2 stay separate. Unknown provider slots are kept and diagnosed. `GEAR_NORMALIZATION_VERSION` is 1 and is not the PoB2 normalization version, the passive profile version, or the GGG tree version. A modifier is not a character total when its locality is unknown or it has a condition. Unsupported lines stay visible and are not zero. The package does not score items, rank slots, or treat price as build value.

**Reason:** Imported gear is not the same thing as understood gear, and understood gear is not a judgment that the item is good for the build. A generic point table would hide that limit.

**Consequences:** The analysis screen shows parser coverage and factual diagnostics in canonical slot order. The Witch passive recommendation stays nodes `[1755, 41965]` at heuristic score 32. Fixture F is a 0.23.1 Generate export with locally entered items. Real item text is read from `Items/Item`, while slots are read from the active `ItemSet`. No PoB2 calculation engine and no character-aware gear score is included.

**Supersedes / superseded by:** Superseded in part by D-076. D-076 replaces gear normalization version 1 and the practice of classifying maximum Energy Shield as global from the words alone. The rest of D-075 remains in force.

---

## D-076 — Modifier locality requires item context

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** A parsed modifier is semantically complete only when its family, operation, value, required scope, and locality are known and it has no unresolved condition. Locality is resolved from the item slot and from base-defence property lines in the item text. When that evidence does not prove local or global, locality is `unknown`. Flat and increased Energy Shield are local only when the item is armour or an off-hand and the text contains an `Energy Shield:` property. Flat maximum Energy Shield on a ring, amulet, or belt with no Energy Shield property is global. Bare added or increased weapon damage, attack speed, critical strike chance, critical damage bonus, and accuracy are local only on a main-hand weapon slot; `to Attacks` and `to Spells` stay global. Armour, evasion, and deflection stay unresolved. Life, resistances, attributes, movement speed, spirit, projectile skill level, and increased projectile damage stay global. `GEAR_NORMALIZATION_VERSION` is 2. PoB2 normalization stays 3. No character total, weapon DPS, or gear score is calculated.

**Reason:** STEP-017 treated `+N to maximum Energy Shield` as global because of the wording. The same words are local on an Energy Shield base and global on jewellery. Guessing either way for every item was unsafe.

**Consequences:** The same raw line can now normalize differently when the slot or the Energy Shield property differs. Fixture F's Twig Focus line `+40 to maximum Energy Shield` is local. Its body-armour fire resistance stays global. Its helmet `50% increased Armour` stays unknown. Semantic coverage and confidence follow the new locality and are not preserved from version 1. Passive heuristic scores are unchanged.

**Supersedes / superseded by:** Supersedes the D-075 statement that `GEAR_NORMALIZATION_VERSION` is 1. Superseded in part by D-077 for ordinary Cast Speed, bare increased Elemental Damage, and gear normalization version 2.

---

## D-077 — Cast Speed is global, and bare Elemental Damage is not weapon-local

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** Ordinary `N% increased Cast Speed` is global on a weapon, a focus, and a ring. A weapon slot does not make it local. Bare `N% increased Elemental Damage` stays unknown, including on a weapon. `N% increased Elemental Damage with Attacks` and `with Spells` are global because the line states the scope. Added and increased physical damage, attack speed, critical strike chance, critical damage bonus, and accuracy keep the STEP-017A weapon rule. Energy Shield, armour, evasion, and deflection rules are unchanged. `GEAR_NORMALIZATION_VERSION` is 3. The canonical test command stays `npm test`. Vitest `maxWorkers` is 2 so pinned-tree files do not all load the snapshot at once. Individual test timeouts are not raised to hide that load.

**Reason:** STEP-017A treated Cast Speed and bare increased Elemental Damage as local whenever the item was a weapon. The wording does not support that. The default test run also timed out when many files loaded the pinned tree together.

**Consequences:** A weapon line `10% increased Cast Speed` is now global instead of local. A weapon line `80% increased Elemental Damage` is now unknown instead of local, so that item is not semantically complete. Fixture F's confidence does not change, because those lines are not in it. Fixture G is a 0.23.1 Generate export of a wand, a focus, and a ring. Passive heuristic scores are unchanged.

**Supersedes / superseded by:** Supersedes the D-076 statement that `GEAR_NORMALIZATION_VERSION` is 2. Cast Speed and bare increased Elemental Damage are no longer treated as local on a weapon slot. Physical damage, attack speed, critical strike chance, critical damage bonus, and accuracy keep the D-076 weapon rule.

---

## D-078 — Character context reports relevance, not value

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The original STEP-018 budget-aware upgrade ranking is deferred to a later step. Before any upgrade valuation, the app builds a provider-neutral character context. Relevance is not a numerical value. The context has no generic weights and does not rank gear or passives. `no-evidence` and `unresolved` stay separate. The same builder accepts normalized PoB2, GGG, and fixture input. It does not parse PoB2 XML. `CHARACTER_CONTEXT_VERSION` is 1. PoB2 normalization stays 3, gear normalization stays 3, and the passive profile stays version 1.

**Reason:** A budget ranking needs to know which mechanic families the imported build actually uses. Guessing that from the first gem, an ascendancy name, configuration text, or heuristic weights would mix evidence with a value judgment.

**Consequences:** Analysis returns a `CharacterContext` beside the existing passive recommendation and gear readiness. The passive heuristic is not fed by this context. Live GGG import stays disabled. STEP-018A, STEP-018B, and STEP-018C are not started.

**Supersedes / superseded by:** None. This does not change D-077.

---

## D-079 — PoB2 can calculate builds as an external worker

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** Path of Building (PoE2) 0.23.1 can load this project's real fixtures and calculate them with its own engine. That engine stays outside the web app. The next prototype direction is one long-lived worker process with one build in memory, not a calculation inside Next.js and not a new process for every candidate. Passive node ids tested against tree `0_5` are the same integers the pinned GGG tree uses. A future calculator must fail closed when the PoB2 data version and the Buddy tree pin do not refer to the same tree. One Lua state must not serve two calculations at once.

**Reason:** A spike loaded fixtures B, C, E, and F through `buildMode:Init`, read `CalcsTab:BuildOutput`, allocated node 4739, replaced a helmet from raw text, and reloaded fixture B. The selected metrics matched across the reload. Cold startup was about 8 seconds. A recalculation inside the running process was about 20 milliseconds. The web app does not need that runtime to start.

**Consequences:** STEP-018B is not started by this decision. Production scoring, gear analysis, and character context stay as they are. Bundling the PoB2 runtime into the hosted app still needs a separate licensing review. The installed program checks for updates unless developer mode is on, so a future worker has to isolate that.

**Supersedes / superseded by:** None.

---

## D-080 — A production PoB2 worker must not modify the user's install

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The research hook in `Modules/Build.lua` is not a production request path. A future calculator must not edit the user's installed PoB2 files for each calculation. The worker is a separate pinned copy, with auto-update disabled, one build in memory, and the process recycled because the Lua heap grows across reloads. Node-id equality is only established for the sampled classes. An unknown tree mapping fails closed.

**Reason:** STEP-018A.1 loaded fixture D and read weapon-set allocation from the file, compared notable ids, and showed fixture B's sidebar in the PoB2 window. The same step used a temporary hook and then restored it. Leaving that hook as the way to request a calculation would change the user's live program.

**Consequences:** STEP-018B is not started by this decision. Support disable and the custom-mod effect are available to that step only as recorded here: Magnified Area II can be disabled and restored, and `10% increased Cast Speed` changes cast rate only after `ConfigTab:BuildModList`. The item editor was not compared in the window. A missed tree click is not a second allocation method.

**Supersedes / superseded by:** None. This does not change D-079.

---

## D-081 — Character-aware deltas come from one pinned PoB2 worker

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** A character-aware result is a set of named metric deltas for one passive candidate. It is not a score, a rank, or a replacement for the passive heuristic. The calculator is `@poe2-helper/pob2-calculator`, and the web app is the only adapter. Calculation runs in one isolated copy of Path of Building (PoE2) 0.23.1, pinned by an executable checksum and adapter version 1. The user's live install is never patched. The copy forces developer mode when `POB2_CALC_WORKER=1`, which skips auto-update and keeps settings inside the copy. The only approved mapping is PoB tree `0_5`, Buddy tree `0.5.5`, and PoB `0.23.1`. Any other triple fails closed. One worker holds one build at a time. It is recycled after 20 loaded builds or 30 minutes, and it is discarded after a timeout, a crash, or a restore mismatch. Percent change is emitted only for magnitude metrics whose baseline is greater than zero. Resistances, chances, Spirit, Mana, deflection rating, and crit multiplier stay absolute. There is no composite score.

**Reason:** STEP-018A showed that PoB2 can load these fixtures and recalculate them, and that patching the live program is not a safe request path. A delta is only trustworthy when the same pinned engine produces the before and after numbers and the build returns to the baseline.

**Consequences:** The analysis screen can show one candidate's named deltas beside the existing heuristic. The calculator is off unless `POB2_CALCULATOR_ENABLED` is exactly `true` and `POB2_CALCULATOR_DIR` points at the prepared copy. Default tests do not launch PoB2. `npm run test:pob2-calculator` is the opt-in command. STEP-018C is not started.

**Supersedes / superseded by:** Superseded in part by D-082. Adapter version 1 and an executable checksum were the STEP-018B pin. D-082 requires the runtime fingerprint, protocol version 2, exact allocation identity, and an explicit item-replacement delta.

---

## D-082 — A delta is valid only when the candidate and the runtime are the ones that were measured

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** A passive delta is accepted only when the nodes PoB2 newly allocates are exactly the requested set, in the requested allocation mode, and the point cost was recomputed by the server from the current recommendation. An extra or missing node is `candidate-allocation-mismatch`. The result keeps the requested ids, the verified ids, and the ids actually allocated, and it does not present that mismatch as a successful delta. The calculation pin is a SHA-256 fingerprint of the executable, top-level engine DLLs, `manifest.xml`, `Launch.lua`, `GameVersions.lua`, and the `Modules`, `Classes`, `Data`, `TreeData`, and `lua` trees. Logs, settings, saved builds, assets, and the manifest that stores the fingerprint are excluded. The fingerprint is checked once when a worker starts. A mismatch is `runtime-integrity-mismatch` and no calculation runs. `CALCULATOR_ADAPTER_VERSION` and `CALCULATOR_PROTOCOL_VERSION` are both 2. Buddy's worker protocol is localhost-only. Known PoB auto-update is disabled on the copy. OS-level outbound access is not blocked. An item change is a separate explicit replacement: one slot and one raw item text, the same named metric deltas, and a restore of the original equipped item. The calculator does not search, score, rank, price, or recommend items.

**Reason:** STEP-018B could report a delta after PoB2 allocated connecting nodes the candidate did not request, and it pinned only the executable and the worker file. A later budget comparison needs the measured passive set and the measured item to be the ones that were asked for, and the provenance has to name the data that actually calculated them.

**Consequences:** The passive screen shows the verified point cost, the three node lists, and the runtime fingerprint beside the unchanged heuristic. The web adapter rejects a node set that is not in a fresh server recommendation. `evaluateItemReplacement` is available to later gear work. Default tests still do not launch PoB2. STEP-018C is not started.

**Supersedes / superseded by:** Supersedes the adapter-version and executable-only pin in D-081. This does not change D-079 or D-080.

---

## D-083 — Budget ranking is metric-specific efficiency for explicit supplied items

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The first upgrade comparison accepts only items the user supplies. It does not generate, search, or price rare items. A user-entered amount and currency is valid price provenance and is labeled as a user-entered price. A fixture price is valid in tests. poe.ninja may supply one currency-conversion snapshot for that comparison, and only for converting a price into chaos. It is never used to invent a rare item's market price. Ranking uses one user-selected metric from the allowlist Total DPS, Combined DPS, Average Hit, Life, Energy Shield, Total EHP, Armour, and Evasion. Efficiency is that metric's measured percent change divided by the positive normalized price. The budget is the most the user would pay for one item, not a combined shopping list. `UPGRADE_ENGINE_VERSION` is 1.

**Reason:** A measured delta and a price are not a universal item score. Combining them is only meaningful for a metric the user chose and a cost whose source is explicit.

**Consequences:** The analysis screen can compare at least two pasted items after a PoB2 import. Other measured changes stay visible beside the selected metric. Candidates outside the budget, without a price, or without a usable percent change stay visible and are not given a fake rank. The passive heuristic, gear normalization, and character context are unchanged. Trade search, crafting, and multi-item combination optimization are not part of this step.

**Supersedes / superseded by:** None. This does not change D-077 through D-082.

---

## D-084 — Trade-offs stay visible, and a winner exists only for a positive within-budget result

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** A measured metric stays visible when its raw absolute change is non-zero, whether or not it is allowed to rank candidates. Ranking still uses only the selected allowlist metric and the existing price policy. Resistances, chances, and resources can be shown as decreased or improved without becoming ranking inputs. A winner id exists only when at least one rankable candidate is within budget and has a positive selected-metric change. A comparison with no such candidate has no winner, including when a positive candidate is over budget or an affordable candidate has a zero change. If no candidate can be ranked, the summary says so and does not pick the first row. `UPGRADE_ENGINE_VERSION` is 2.

**Reason:** STEP-018C hid non-rankable changes and could describe the first ordered row as the best gain when that row was not a positive affordable improvement.

**Consequences:** The comparison table keeps the selected metric in its own columns and lists other non-zero measured changes beside it. Headline text comes from the summary state. Candidate group ordering is unchanged. Price conversion, the PoB2 worker, and the rankable allowlist are unchanged.

**Supersedes / superseded by:** None. D-083 still describes the ranking rule. This decision adds visibility and summary rules and moves the engine version from 1 to 2.

---

## D-085 — Crafting data is a pinned factual snapshot, not a probability model

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The crafting source is the community export `repoe-fork/poe2` at commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, labeled version 4.5.5.2. There is no silent fallback to another provider. Path of Building's `GetModSpawnWeight` is evidence for first-match spawn-weight order only, and it is not merged as a second dataset. `CRAFTING_DATA_SCHEMA_VERSION` is 1, separate from that export label and from passive-tree pins 0.5.5 and `0_5`. The checksum covers normalized records and excludes fetch timestamps. The full export stays in gitignored `var/crafting-data/` because generated RePoE data is owned by Grinding Gear Games and this repository does not have a cleared right to publish it. Queries use the local snapshot. A spawn weight is not a probability. Eligibility is `eligible`, `ineligible`, or `unresolved`. Weight 0 is kept. A missing weight is not stored as 0. Compatibility `unknown` blocks planner use.

**Reason:** STEP-019 needs factual base, modifier, stat, translation, and spawn-weight records before any craft planner. The export's license does not support committing the full dataset, and the field names do not define crafting odds.

**Consequences:** `npm run refresh:crafting-data` is the only network path. Runtime lookups do not fetch. Source-pool results may say a modifier is eligible for a base and item level, and they do not say it is craftable or how many attempts it takes. STEP-020 stays closed while compatibility is unknown and translations are partial.

**Supersedes / superseded by:** Superseded in part by D-086 for the planner-approval gate. The source pin and the no-probability rule still stand.

---

## D-086 — Scoped crafting planner approval is separate from a loaded snapshot

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `CRAFTING_COMPATIBILITY_POLICY_VERSION` is 1. A crafting snapshot is not planner-ready just because it parses. Planner approval is a checksum-bound report. For this snapshot the required scoped capabilities are compatible: base identity, modifier identity, stat ranges, required item level, generation type, source-pool eligibility, and the translation fallback. That conclusion comes from record comparisons with Path of Building Community (PoE2) 0.23.1, not from similarity among the labels 4.5.5.2, 0.5.5, and `0_5`. Mod-group exclusivity is not approved, because PoB separates defence families that the snapshot places together in `BaseLocalDefences`. Generation weights stay unknown. Unresolved translations fall back to the modifier id and stat ranges, with no invented English. Unit tests use synthetic records. The full export stays local, prepared only by `npm run refresh:crafting-data`. Distribution stays blocked. Supported planner classes are the 25 item classes whose representative PoB type string matches the snapshot class. Buckler, FishingRod, and Warstaff are unsupported because those strings differ.

**Reason:** STEP-019 left compatibility unknown, a real-record fixture in git, and partial translations, which was not a precise contract for STEP-020.

**Consequences:** STEP-020 may start as local scoped development. It must not treat same-group ids as proven exclusivity, must not calculate probability, and must not bundle the full snapshot. A new snapshot does not keep this approval unless its checksum matches the report.

**Supersedes / superseded by:** Supersedes the planner-gate portion of D-085.

---

## D-087 — Craft targets are explicit and individual

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `CRAFTING_PLANNER_VERSION` is 1. The craft target planner answers only the targets a person types: a supported base, an item level, and one or more stat ids or modifier ids. It does not read CharacterContext, a PoB2 build, or a heuristic to invent a target. It does not take a budget. Duplicate stat ids collapse to one target and keep the higher minimum. Each modifier is returned once, with every target it satisfies. Candidates are ordered by eligibility, then affix kind, then required item level, then modifier id. That order is not a quality ranking. Generation weights are not applied. Spawn weight stays source metadata. Same-group modifiers are not treated as exclusive or compatible. A plan with more than one target says coexistence is not validated. Unsupported classes, including Warstaff, are refused with no nearby-class mapping. The supported class list is the STEP-019A list.

**Reason:** A budget, a probability, or a coexistence claim would invent a crafting model this project does not have yet. An automatic target would also hide the fact that the person chose the goal.

**Consequences:** STEP-020 can list source-pool matches for an explicit target on the local snapshot. It cannot say how to craft the modifier, whether two modifiers can roll together, what it costs, or which target a build should want. STEP-021 is not ready. A later mechanic step has to define one crafting action before any of those claims are allowed.

**Supersedes / superseded by:** None.

---

## D-088 — The first crafting mechanic is Orb of Augmentation, and its roll is not modeled

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `CRAFTING_MECHANIC_SEMANTICS_VERSION` is 1. The first mechanic id is `add-random-explicit`, bound only to `Metadata/Items/Currency/CurrencyAddModToMagic` in `repoe-fork/poe2` commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, source label 4.5.5.2. The item text says it augments a magic item with a new random modifier, and that magic items can have up to two random modifiers. The same file's Chaos Orb text describes a removal; the Augmentation text does not. The item stays magic. Greater and Perfect Orb of Augmentation use the same sentences and different drop levels, so they are not this mechanic. The modifier pool, spawn-weight selection, generation-weight formula, mod-group conflict, empty-pool behavior, and full-item currency consumption are not proven. Probability and expected cost stay blocked. Path of Building Community (PoE2) 0.23.1 does not implement this action. Its spawn-weight walk is not treated as this currency's sampler.

**Reason:** STEP-020 can list source-pool matches. It cannot say what one currency does. Augmentation is the smallest add-one action whose item text states both the rarity and a numeric cap. A simulator would still have to guess the pool.

**Consequences:** STEP-020.5 can validate a magic item with no explicit modifier ids and can list source-pool ids for inspection. It must not choose a modifier or return a probability. An item that already has an explicit modifier id is rejected until a conflict rule exists. STEP-021 is blocked for this mechanic.

**Supersedes / superseded by:** None.

---

## D-089 — Augmentation still has no proven pool or selection rule

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** `CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1. STEP-020.6 checked `Metadata/Items/Currency/CurrencyAddModToMagic` and `data/mods.json` in `repoe-fork/poe2` commit `b818b843337cae43b090b272fd98bbc0fd3a34f3`, and Path of Building Community (PoE2) 0.23.1 `Classes`. The currency record states a magic item, one added random modifier, and a total cap of two random modifiers. It has no spawn, weight, prefix, suffix, group, or essence field. No modifier record names that currency. The export has zero generation-weight rules, which is not a multiplier of 1. PoB does not name this currency record. Its magic `affixLimit` of 2 is an editor layout, not an Augmentation sampler. Same-id exclusion, mod-group exclusion, and a prefix/suffix slot split stay unproven. `BaseLocalDefences` stays a group mismatch and is not used. Final mechanic candidate ids stay empty. Probability stays blocked.

**Reason:** A source-pool inspection list is still not an Augmentation outcome. Filling it in from PoE1 habits or from the PoB editor would invent the roll.

**Consequences:** STEP-020.6 can reject an occupied magic item and can list inspection ids for a magic item with no explicit modifiers. It must not choose a modifier or return a probability. Greater and Perfect Orb of Augmentation stay out of this mechanic. STEP-021 is blocked.

**Supersedes / superseded by:** None.

---

## D-090 — No current crafting mechanic is safe to simulate

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** STEP-021 stays blocked. The first simulation mechanic is not selected. `add-random-explicit` stays ready only as a magic, zero-explicit transition. PoE2DB's weightings page and Craft of Exile's PoE2 weightings page, both read on 2026-09-27, state that modifier weights are not in the game files. `pyoe2-craftpath` (MIT, README on `main`) targets PoE2 0.4.0, takes weights from Craft of Exile, and uses Greater and Perfect Augmentation item levels 55 and 70 in commit `8acb17c0bac048d0a16f780f71313aef4bb4a2af`. This export's item text states no such tier rule. Those sources are not adopted. Transmutation, Regal, Exalted, Chaos, Essence of the Body, Annulment, Alchemy, and Scouring were compared from the pinned item text. None has a proven pool and a proven selection rule together. Scouring says it removes all modifiers and does not state the resulting rarity. Essence of the Body matches four monster-domain records and no item modifier id. Imported gear still cannot build `CraftingItemState`.

**Reason:** STEP-020.6 had already exhausted the pinned export and Path of Building for Augmentation. The new sources describe extrapolated weights and a different game version. Using them as the selection rule would invent the roll.

**Consequences:** The simulation registry answers `NO CRAFTING MECHANIC IS CURRENTLY SAFE TO SIMULATE`. No probability is stored. STEP-021 must not start until a later source proves one mechanic's transition, pool, required conflicts, and selection rule for a named scope. Another pass over the same Augmentation question is not the next step.

**Supersedes / superseded by:** None.

---

## D-091 — The Craft of Exile differential does not approve a community Augmentation model

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** A community-derived crafting model is allowed only when it is pinned, reproducible, cross-checked, and labeled as an estimate. It is not official game truth. On 2026-09-27 the public Craft of Exile PoE2 page reported patch `4.5.5.3` (label `0.5.5.3`, Forbidden Rites). Its public `json/poe2/4.5.5.3/data.json` uses the same base metadata ids and the same modifier ids as this snapshot for the checked examples. Every current inspection id for Rusted Cuirass (144), Iron Ring (203), and Withered Wand (118) is in that dictionary. Craft of Exile `power` is not one scale of the RePoE spawn weight: 134 distinct ratios on Rusted Cuirass and 121 on Iron Ring. The developers page says there is no API. No source license was found, so no Craft of Exile code or dataset was copied. Calculator probabilities were not reproduced. Greater and Perfect Augmentation are stored there with minimum modifier levels 44 and 70, which the item text does not state. The direct-evidence model stays blocked. The community model stays blocked. `CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1.

**Reason:** Dictionary overlap does not name the Augmentation pool, and a weight field that is not a scale of the spawn weight is not a selection formula. Approving either would present a community estimate as a finished model.

**Consequences:** STEP-021 stays blocked. Buddy does not call Craft of Exile at runtime. Another Augmentation evidence step is not the next step. Crafting simulation stays deferred until a source provides a pool and a selection rule that can be reproduced for a named scope.

**Supersedes / superseded by:** None.

---

## D-092 — The Craft of Exile client draw still does not approve Augmentation

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** The public Craft of Exile calculator client for patch `4.5.5.3` was reconstructed on 2026-09-27. Normal Orb of Augmentation is limited to a magic item with an open affix. A magic item has one prefix slot and one suffix slot. The client draws once from the combined open sides. The draw weight is the class weight, not modifier `power` and not the RePoE spawn weight. On Rusted Cuirass, Iron Ring, and Withered Wand, the reconstructed candidate ids match this snapshot's eligible prefix and suffix inspection set at item levels 82 and 1. Adding one prefix leaves only suffixes. Adding one suffix leaves only prefixes. `ChaosResist1`, `IncreasedSpirit8`, and `Strength1` do not match a spawn-weight share within one displayed rounding unit. The class-weight table was not copied. The community model stays blocked. The direct-evidence model stays blocked. `CRAFTING_MECHANIC_SEMANTICS_VERSION` stays 1.

**Reason:** A matching candidate list is not a probability. The local snapshot can name the same modifiers and cannot supply the class weights the client rolls.

**Consequences:** STEP-021 stays blocked. This was the last planned Augmentation-only evidence step. Do not add STEP-020.8B. Crafting simulation stays deferred.

**Supersedes / superseded by:** None.

---

## D-093 — Current class weights can drive a limited community Augmentation probability

**Status:** Accepted  
**Date:** 2026-09-27

**Decision:** Community crafting probabilities use Craft of Exile class weights for patch `4.5.5.3` when the modifier id matches this snapshot exactly. The public Prohibited Library recombinator sheet `1l811uI5eXML-Iw_vNNouah9XRWZVGiLjzZOBWObxKpI` is historical lineage, not current authority. Its full table stays gitignored because no redistribution license was found. PoE2DB did not expose a numeric weight for these modifiers, so that cross-check is unavailable. A missing weight blocks the whole open pool. Unknown weight is not stored as zero. `COMMUNITY_WEIGHT_SCHEMA_VERSION` is 1. Direct-evidence probabilities stay blocked. The promoted scope is a magic item with zero or one explicit modifier on the STR body armour, ring, and wand class pools. Those three pools have a current weight for every eligible modifier.

**Reason:** STEP-020.8A already matched the candidate ids and the one-draw rule. The class weights now supply the missing denominator. On Rusted Cuirass the total is 124500, and `ChaosResist1`, `IncreasedSpirit8`, and `Strength1` reproduce the earlier chances. T1 and T2 life are both weight 1000. Spirit tiers run from 100 through 500.

**Consequences:** STEP-021 may start only for that magic scope, using the community-derived weights. It was not started here. Other classes, rare items, and any pool with a missing weight stay closed. A later Craft of Exile patch needs a new diff and a new promotion.

**Supersedes / superseded by:** None.

---

## D-094 — Explanations repeat structured facts and do not change engine results

**Status:** Accepted  
**Date:** 2026-09-28

**Decision:** The explainer cannot change rankings, scores, prices, craft probabilities, or mechanic rules. Its input is a bounded list of structured facts, not a raw build, item, or account payload. STEP-022's only provider is the local deterministic template. Analysis still succeeds when explanation is disabled or when rendering fails. A remote language model is a separate STEP-023 choice and is not connected. STEP-021 stays deferred in the post-MVP polish register.

**Reason:** The MVP needs readable wording without an API key, and that wording must not become a second optimizer.

**Consequences:** `EXPLANATION_SCHEMA_VERSION` and `EXPLAINER_INTERFACE_VERSION` are 1. Empty `EXPLAINER_MODE` means deterministic. `EXPLAINER_MODE=disabled` hides the section. STEP-023 can add a provider behind the same interface after an intentional provider choice. STEP-021 was not started.

**Supersedes / superseded by:** None.

---

## Template for new decision

### D-XXX — <Decision title>

**Status:** Proposed | Accepted | Superseded | Rejected  
**Date:** YYYY-MM-DD

**Decision:** ...

**Reason:** ...

**Consequences:** ...

**Supersedes / superseded by:** ...
