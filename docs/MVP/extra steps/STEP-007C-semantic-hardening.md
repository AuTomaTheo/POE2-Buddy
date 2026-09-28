# STEP-007C — Semantic hardening and path-level scoring confidence

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-007C  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the remaining high-impact stat-understanding gaps before heuristic scoring begins.

STEP-007B successfully raised structural parsing coverage to 79.1%, but the scorer is still blocked by several correctness issues:

1. some multi-clause lines are rejected even when both clauses could be parsed safely;
2. incoming damage wording such as `Damage taken` can be confused with outgoing damage;
3. the important Evasion → Deflection relationship is still unsupported;
4. 1,959 structurally parsed lines still have no semantic family;
5. future path scoring needs to report how much of each candidate path is actually understood.

This step must fix those issues without turning into another broad parser rewrite.

Do **not** begin STEP-008 scoring in this task.

---

## 2. Acceptance criteria

- [ ] Multi-clause stat lines can be parsed when **every clause** is fully understood.
- [ ] A multi-clause line is rejected if any clause would be partially ignored or ambiguously parsed.
- [ ] Incoming damage and outgoing damage are distinguished reliably.
- [ ] `Damage taken` wording is not interpreted as outgoing damage.
- [ ] Evasion → Deflection relationship stats are structurally represented.
- [ ] Evasion → Deflection relationship stats receive a semantic representation when safe.
- [ ] The 1,959 structurally parsed-but-semantic-unmapped lines from STEP-007B are inventoried by frequency/family.
- [ ] High-frequency semantic gaps are documented.
- [ ] A candidate-path semantic coverage/confidence metric exists.
- [ ] Path-level coverage counts unknown/unmapped effects instead of treating them as zero.
- [ ] Downstream scoring can tell whether a path is fully, partially, or weakly understood.
- [ ] Existing STEP-007B tokenizer/grammar behavior remains deterministic.
- [ ] Existing semantic ids remain stable unless a documented migration is required.
- [ ] Required tests pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-007C-semantic-hardening.md`

---

## 3. Current baseline

Use the STEP-007B baseline:

```text
PoE2 version:              0.5.5
Skill nodes:               5,152
Total stat lines:          5,963
Structurally parsed:       4,717 (79.1%)
Semantically normalized:   2,758 (46.3%)
Unrecognized:              1,246 (20.9%)
Structured-but-unmapped:   1,959
```

Important remaining issues documented in STEP-007B include:

```text
damage-type conversion with a second clause
10% less Damage taken... direction ambiguity
Gain Deflection equal to N% of Evasion
1,959 structurally parsed lines without semantic family
```

Do not change the passive-tree pin.

Source provenance remains:

```text
Repository:
https://github.com/grindinggear/poe2-skilltree-export

Commit:
bd87e6512c92b868542eddfb1ba4ea8b6dc2da36

Version:
0.5.5

Checksum:
sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642
```

---

## 4. Multi-clause parsing

STEP-007B deliberately rejects lines containing a newline or second clause if the grammar cannot consume the entire line.

Keep that safety rule.

Extend the grammar so a line with multiple clauses can be represented **only if every clause is fully parsed**.

Conceptually:

```text
clause 1
newline
clause 2
```

may become:

```ts
{
  effects: [effectFromClause1, effectFromClause2];
}
```

### Required invariant

```text
all clauses parsed
→ line recognized

any clause unsupported
→ whole line remains unsupported
```

Do not accept a first clause and silently discard the second.

---

## 5. Damage-conversion multi-clause support

Revisit the STEP-007B blocking conversion case.

The report identifies a line conceptually equivalent to:

```text
75% of Damage Converted to Fire Damage
<second clause>
```

Investigate the exact pinned raw string.

If both clauses can be represented safely:

- parse both;
- preserve both effects;
- mark damage conversion as fully supported for that form.

If the second clause cannot be represented safely:

- leave the full line unsupported;
- document why.

Do not strip the second clause merely to make damage conversion appear supported.

---

## 6. Incoming vs outgoing damage direction

Fix damage-direction interpretation.

The parser must distinguish at minimum:

```text
Damage dealt / actor deals Damage
```

from:

```text
Damage taken / Take Damage
```

Examples conceptually:

```text
Mirages deal 50% less Damage
→ direction: dealt
```

```text
Take 30% less Damage
→ direction: taken
```

```text
10% less Damage taken
→ direction: taken
```

Do not rely only on whether a line starts with the word `Take`.

The grammar should recognize both prefix and suffix forms where the pinned corpus supports them.

### Direction model

Use the existing direction field or equivalent:

```ts
direction: "dealt" | "taken" | "unspecified";
```

Do not invent additional direction categories unless needed by actual pinned data.

---

## 7. Evasion → Deflection relationship

Investigate and support the pinned stat form reported in STEP-007B:

```text
Gain Deflection equal to N% of Evasion
```

The parser must preserve the relationship rather than flatten it into:

```text
+N Deflection
```

or:

```text
N% increased Deflection
```

Conceptually, this is a derived relationship:

```ts
{
  operation: "derived-from",
  target: "deflection",
  source: "evasion",
  ratioPercent: N
}
```

The exact type may differ.

### Important

Do not calculate the final amount of Deflection in STEP-007C.

This step only needs to preserve enough structure that a future build-context engine can calculate it correctly.

---

## 8. Semantic normalization for derived relationships

Add a semantic representation for the Evasion → Deflection relationship if its meaning is clear from the raw line.

Example conceptual semantic family:

```text
deflection-from-evasion
```

or equivalent.

Keep it distinct from:

```text
flat deflection
increased deflection
```

Do not merge them.

If other similar `equal to N% of X` relationships exist in the pin, inspect them, but do not generalize beyond evidence.

---

## 9. Inventory the 1,959 structured-but-unmapped lines

Create a deterministic inventory specifically for lines that:

```text
parse structurally
BUT
semanticPassiveStats(...) == null
```

This is different from the existing unrecognized inventory.

Create a report conceptually like:

```ts
type UnmappedStructuredFamily = {
  familyId: string;
  totalOccurrences: number;
  distinctLines: number;
  examples: string[];
};
```

Group by meaningful structural/subject features where possible.

At minimum report:

```text
total structured-but-unmapped lines
top families by frequency
top distinct raw strings
examples
```

The goal is to identify whether most of the remaining semantic gap is:

- special mechanics;
- unsupported aliases;
- complex conditions;
- resources;
- minions;
- charges;
- ailment mechanics;
- skill-specific effects;
- weapon-specific effects;
- other categories.

Do not force every line into a false category.

---

## 10. High-frequency semantic-gap review

After creating the inventory, review the highest-frequency groups.

For each high-frequency group, classify it as:

```text
safe-to-map-now
needs-build-context
special-mechanic
insufficient-evidence
```

Only add semantic mappings for `safe-to-map-now`.

Do not expand STEP-007C into a full semantic-mapping marathon.

The purpose is to understand the remaining 1,959-line gap before scoring.

---

## 11. Path-level semantic coverage

Introduce a deterministic path-level coverage report.

Given a candidate main-tree path, the engine must be able to answer:

```text
How much of the stat content on this path can the current semantic layer understand?
```

Conceptually:

```ts
type PathSemanticCoverage = {
  nodeCount: number;
  totalStatLines: number;
  semanticallyMappedLines: number;
  structurallyParsedOnlyLines: number;
  unrecognizedLines: number;
  semanticCoverageRatio: number;
  structuralCoverageRatio: number;
  unsupportedRawLines: string[];
};
```

The exact structure may differ.

---

## 12. Coverage must be based on stat lines, not nodes alone

Do not calculate confidence merely as:

```text
understood nodes / total nodes
```

A single node may contain:

```text
1 easy stat
```

while another contains:

```text
5 complex effects
```

Coverage should primarily reflect stat-line/effect understanding.

Node-level summary may be included as additional information.

---

## 13. Path scoring-confidence classification

Introduce a simple deterministic confidence/status classification for later scoring.

Conceptually:

```text
full
high
partial
low
```

or:

```text
complete
incomplete
```

The exact labels are up to the implementation.

The classification must be based on documented thresholds/rules.

For example conceptually:

```text
100% semantic coverage
→ complete

>= 90%
→ high

>= 70%
→ partial

< 70%
→ low
```

These are examples only.

Do not hardcode these exact thresholds without documenting why they were chosen.

The decision must be recorded in the decision log.

---

## 14. Unknown/unmapped effects are not zero

This remains a hard invariant:

```text
unsupported effect != zero value
```

Path coverage must expose the missing effects.

Do not calculate:

```text
knownScore + 0 for unknown lines
```

and then present that as a complete score.

STEP-008 will need to incorporate the path confidence/coverage result into its recommendation output.

---

## 15. Future scorer contract

Add a documented contract for STEP-008:

A score may be computed from known semantic effects, but the result must also include path semantic coverage.

Conceptually:

```text
Path A
score: 84
semantic coverage: 100%
confidence: complete
```

versus:

```text
Path B
score: 91
semantic coverage: 78%
confidence: partial
3 stat lines were not evaluated
```

The later scorer must not claim Path B is definitively superior merely because `91 > 84`.

STEP-007C does **not** implement the score itself.

---

## 16. Interaction with truncated path search

STEP-006A already distinguishes:

```text
exhaustive
truncated
```

Path confidence is separate from search completeness.

A future recommendation may therefore have two different dimensions:

```text
Search completeness:
exhaustive / truncated

Semantic coverage:
complete / partial / low
```

Do not merge them into one generic `confidence` value unless both dimensions remain separately available.

---

## 17. Semantic coverage and structural coverage

Continue reporting both:

```text
structural coverage
semantic coverage
```

Do not allow high structural coverage to hide low semantic understanding.

The completion document must provide updated corpus-wide totals after STEP-007C.

---

## 18. Scoring readiness reassessment

Re-run the scoring-readiness logic after:

- multi-clause conversion handling;
- damage-direction correction;
- Evasion → Deflection support;
- semantic-gap review.

Readiness should consider:

1. current structural coverage;
2. current semantic coverage;
3. high-priority family support;
4. whether path-level coverage can now expose uncertainty honestly;
5. whether any remaining unsupported family makes MVP scoring misleading.

### Important

STEP-007C may conclude:

```text
ready
```

even if global semantic coverage is far below 100%, **provided**:

- common MVP stat families are represented;
- unsupported effects remain visible;
- path-level coverage/confidence is mandatory;
- the scorer is prohibited from claiming complete certainty on partially understood paths.

Document the reasoning carefully.

---

## 19. Tests

Add tests covering at minimum:

### Multi-clause parsing

- a two-clause line where both clauses parse succeeds;
- a two-clause line where one clause is unsupported fails completely;
- no second clause is silently discarded.

### Damage direction

- prefix `Take ... Damage` → `taken`;
- suffix `Damage taken` → `taken`;
- actor `deal ... Damage` → `dealt`;
- direction remains separate from operation (`more`, `less`, etc.).

### Evasion → Deflection

- pinned raw example parses;
- Evasion remains the source;
- Deflection remains the target;
- ratio/percentage is preserved;
- it maps to a distinct semantic family;
- it is not treated as flat or increased Deflection.

### Structured-but-unmapped inventory

- counts are deterministic;
- examples come from actual pinned lines;
- repeated runs match.

### Path semantic coverage

Create small controlled graph/path fixtures with:

- all stats semantic;
- some structurally parsed but unmapped;
- some completely unrecognized;
- multi-effect lines.

Verify totals and ratios.

### Confidence/status

Test exact boundary behavior for the chosen classification rules.

### Regression

All STEP-007, STEP-007A, STEP-007B, STEP-006A, and path-search tests must continue to pass unless a deliberate documented migration changes an expected representation.

---

## 20. Performance

Path-level coverage should operate on the nodes in one candidate path, not rescan the entire tree.

Corpus inventories may scan all 5,963 lines.

Avoid:

```text
for every candidate path
    rescan every node in the passive tree
```

Prefer existing graph/node lookups and parsed stat helpers.

No database or caching layer is needed solely for this step unless clearly justified.

---

## 21. Package boundaries

### `packages/passive-engine`

May own:

- multi-clause grammar;
- direction handling;
- derived-stat structure;
- semantic-gap inventory;
- path semantic coverage;
- scoring-readiness analysis.

### `packages/domain`

Only add stable domain types if necessary.

### `packages/data-sources`

Do not add semantic or scoring logic.

---

## 22. External APIs / credentials

No new credentials are required.

### Official GGG passive-tree export

Status:

```text
AVAILABLE
NO AUTH REQUIRED
```

Use the existing pinned snapshot only.

### GGG OAuth

Status:

```text
NOT AVAILABLE YET
REQUIRES GGG APPLICATION REGISTRATION / APPROVAL
NOT REQUIRED FOR STEP-007C
```

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-007C
```

### AI provider

Status:

```text
NOT REQUIRED FOR STEP-007C
```

No LLM may determine stat semantics at runtime.

---

## 23. Non-goals

Do **not** implement:

- heuristic weights;
- final path scores;
- DPS calculation;
- effective-health calculation;
- PoB integration;
- gear analysis;
- crafting;
- GGG OAuth;
- live character import;
- poe.ninja pricing;
- AI recommendation text;
- recommendation UI.

This step prepares the final reliability layer before scoring.

---

## 24. Decision-log requirements

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

- multi-clause parsing behavior;
- suffix `Damage taken` direction rule;
- derived-stat representation;
- Evasion → Deflection semantic id;
- structured-but-unmapped family strategy;
- path semantic coverage formula;
- path scoring-confidence/status thresholds;
- revised STEP-008 readiness rule.

---

## 25. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run:

```bash
npm audit
```

only if dependency files change.

Document all failures and resolutions.

---

## 26. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-007C-semantic-hardening.md
```

Follow the repository documentation protocol in full.

The completion document must include at minimum:

1. Objective
2. Acceptance criteria
3. Implementation summary
4. Files created
5. Files changed
6. Files deleted
7. Important code paths / responsibilities
8. External APIs / data sources involved
9. Credentials / environment variables
10. Data model / schema changes
11. Commands executed
12. Automated test results
13. Manual verification
14. Errors/issues encountered
15. Security/privacy impact
16. Performance impact
17. Data provenance / reproducibility impact
18. Known limitations
19. Decisions made
20. Deviations from planning docs
21. Remaining risks
22. Rollback notes
23. Recommended next step
24. Completion statement

Additionally include:

```text
Multi-Clause Parsing Result
Damage Direction Result
Evasion → Deflection Result
Structured-but-Unmapped Inventory
Corpus Coverage Before vs After
Path Semantic Coverage Design
STEP-008 Scoring Readiness
```

---

## 27. Expected result

At completion:

```text
Raw stat
    ↓
tokenizer
    ↓
grammar
    ↓
multi-clause / direction / derived relationship support
    ↓
semantic normalization
    ↓
candidate path
    ↓
PathSemanticCoverage
    ├── mapped effects
    ├── structured-only effects
    ├── unknown effects
    └── coverage/confidence
```

This should give STEP-008 enough information to score known effects without pretending unsupported effects are zero.

---

## 28. Stop condition

After implementation and documentation:

**STOP.**

Do not automatically begin STEP-008.

If scoring readiness is:

```text
not-ready
```

document the blocking issue and stop.

If scoring readiness is:

```text
ready
```

the next planned step is:

```text
STEP-008 — Configurable heuristic scoring
```

Wait for explicit approval before starting it.
