# STEP-007D — Scoring readiness policy refinement

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-007D  
**Authoring context:** Cursor-assisted development

## 1. Objective

Refine the stat-scoring readiness policy so STEP-008 is blocked only by unsupported mechanics that actually affect the current passive-tree scoring domain and cannot be surfaced safely through existing uncertainty/coverage contracts.

STEP-007C correctly reports:

- structural parsing coverage: 80.1%;
- semantic coverage: 48.8%;
- path-level semantic coverage/confidence;
- unsupported raw lines;
- search completeness separately from semantic confidence.

However, readiness is still `not-ready` because `less-damage` is classified as unsupported even though the pinned passive-tree data contains no outgoing `less-damage` passive-node stat. That should not block passive-tree scoring for the current pin.

This step must refine readiness without changing parser semantics or implementing scoring.

Do **not** begin STEP-008 in this task.

---

## 2. Acceptance criteria

- [ ] Scoring readiness distinguishes unsupported mechanics that are present in the current passive-tree scoring domain from mechanics that are absent from it.
- [ ] A family does not block STEP-008 merely because the parser does not support it globally.
- [ ] `less-damage` no longer blocks readiness on the current pin when no outgoing passive-node `less-damage` line exists.
- [ ] Incoming `less Damage taken` remains correctly represented as defensive/taken damage and is not confused with outgoing `less-damage`.
- [ ] Partially supported mechanics can be non-blocking when path-level coverage exposes the missing effect clearly.
- [ ] Damage conversion remains visible as partial/incomplete where appropriate.
- [ ] Path semantic coverage remains mandatory for future scored candidates.
- [ ] Search completeness remains mandatory and separate from semantic coverage/confidence.
- [ ] A future scorer cannot claim a partially understood path is definitively superior based only on numeric score.
- [ ] A future scorer cannot claim a truncated search found the global optimum.
- [ ] Scoring readiness is recalculated on the same pinned PoE2 `0.5.5` tree.
- [ ] The readiness decision and rationale are documented in the decision log.
- [ ] Existing parser, semantic, coverage, and path tests continue to pass.
- [ ] Required repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-007D-scoring-readiness-policy.md`

---

## 3. Current baseline

Use the STEP-007C baseline:

```text
PoE2 version:              0.5.5
Skill nodes:               5,152
Total stat lines:          5,963
Structurally parsed:       4,775 (80.1%)
Semantically mapped:       2,907 (48.8%)
Unrecognized:              1,188
Structured but unmapped:   1,868
```

Current readiness:

```text
status: not-ready
blocking family: less-damage
damage-conversion: partially-supported
```

STEP-007C also established:

```text
pathSemanticCoverage
searchCompleteness
unsupportedRawLines
path confidence
```

These must remain part of the later scoring contract.

---

## 4. Core policy change

Replace the overly broad rule:

```text
unsupported high-priority family
→ block scoring
```

with a domain-aware rule conceptually equivalent to:

```text
unsupported family
AND
family occurs in current passive-tree scoring inputs
AND
family materially affects heuristic scoring
AND
existing coverage/uncertainty mechanisms cannot expose the omission safely
→ blocker
```

A family that does not occur in the current scoring domain must not block STEP-008.

---

## 5. Define the current scoring domain

For STEP-007D and STEP-008 MVP readiness, the scoring domain is:

```text
passive-node rawStats from the pinned PoE2 passive tree
```

It does **not** include:

- gems;
- skill descriptions;
- gear modifiers;
- ascendancy-specific external data not represented as current passive-node rawStats;
- future versions of the tree;
- PoB calculations;
- trade data.

Readiness must be evaluated against what the current passive-tree optimizer can actually encounter.

---

## 6. Family presence classification

Extend the readiness report so each high-priority family records whether it occurs in the current passive-tree scoring domain.

Conceptually:

```ts
type HighPriorityFamilyReport = {
  familyId: string;
  supportStatus:
    | "supported-semantically"
    | "supported-structurally"
    | "partially-supported"
    | "still-unsupported";
  presentInScoringDomain: boolean;
  blocking: boolean;
  reason: string;
};
```

The exact type may differ.

The important requirement is that:

```text
support status
```

and:

```text
domain presence
```

are separate concepts.

---

## 7. `less-damage` rule

STEP-007C found:

```text
Mirages deal 50% less Damage
```

but that line is not a passive-node `rawStats` line.

Therefore, on the current pinned passive-tree domain:

```text
outgoing less-damage presentInScoringDomain = false
```

This family must not block passive-tree scoring.

Do not remove support for the grammar or semantic concept.

Future pins must rerun presence detection.

If a later passive-tree version adds outgoing `less-damage`, readiness must reassess it automatically.

---

## 8. Incoming less-damage remains separate

Do not treat:

```text
Take 30% less Damage
```

or:

```text
10% less Damage taken
```

as evidence that outgoing `less-damage` exists.

These are incoming/taken defensive mechanics.

Keep:

```text
direction = taken
```

separate from:

```text
direction = dealt
```

The presence check must respect direction.

---

## 9. Partial-support policy

A partially supported family should not automatically block scoring.

A partial family may be non-blocking if:

1. the supported portion is represented correctly;
2. unsupported raw effects remain visible;
3. path semantic coverage decreases appropriately;
4. path confidence reflects incomplete understanding;
5. downstream scoring cannot present the numeric score as complete or definitive.

This applies to current damage-conversion behavior.

---

## 10. Damage-conversion policy

The pinned line:

```text
75% of Damage Converted to Fire Damage
Deal no Non-Fire Damage
```

remains only partially understood because the second clause is unsupported.

Do not invent semantics for:

```text
Deal no Non-Fire Damage
```

Do not drop that clause.

For readiness:

```text
damage-conversion
→ partially-supported
→ present in scoring domain
→ non-blocking only because path-level coverage exposes the unsupported line
```

Document that decision explicitly.

If future scoring would require the missing clause to avoid a materially misleading result, the path must remain incomplete/partial.

---

## 11. Readiness blocker criteria

A family should block STEP-008 only when all of the following are true:

```text
1. present in current passive-tree scoring domain
2. materially important to MVP scoring
3. unsupported or too ambiguous to use
4. omission cannot be surfaced safely through path coverage/confidence
```

A family should not block merely because:

```text
it exists elsewhere in PoE2
```

or:

```text
it might appear in a future tree
```

Future pins must recalculate readiness.

---

## 12. Path-level uncertainty remains mandatory

STEP-007C established `pathSemanticCoverage`.

This remains mandatory for every future scored path.

At minimum, scored candidate output must retain:

```text
semanticCoverageRatio
structuralCoverageRatio
confidence/status
unsupportedRawLines
```

Unknown/unmapped lines remain:

```text
not evaluated
```

They must never silently become:

```text
0 value
```

---

## 13. Search completeness remains separate

STEP-006A established:

```text
searchCompleteness = exhaustive | truncated
```

This must remain separate from semantic path confidence.

A future scored result conceptually contains two independent reliability dimensions:

```text
search completeness
semantic coverage/confidence
```

Examples:

```text
exhaustive + complete
exhaustive + partial
truncated + complete
truncated + partial
```

Do not collapse them into one field.

---

## 14. Future STEP-008 recommendation contract

Document the following mandatory rules for STEP-008.

### Rule A — Complete semantic coverage

A path with:

```text
confidence = complete
```

may be compared normally against other complete paths, subject to search completeness.

### Rule B — Partial semantic coverage

A path with incomplete semantic coverage may receive a heuristic score for known effects, but the application must state that unsupported effects were not evaluated.

A higher numeric score does not automatically prove that the path is better than a complete path.

### Rule C — Truncated search

If search completeness is:

```text
truncated
```

the application must not claim:

- global optimum;
- best possible path;
- exhaustive best path.

Allowed wording includes:

```text
highest-scoring path found within search limits
```

### Rule D — Partial + truncated

If both apply, both limitations must remain visible.

---

## 15. Readiness result

After the policy change, rerun readiness on the pinned tree.

Expected decision if no new blocking issue appears:

```text
status: ready
```

with rationale conceptually:

```text
- structural coverage exceeds the working target;
- common MVP semantic families are present;
- outgoing less-damage is absent from the current passive-tree domain;
- conversion is partial but visible through path coverage;
- unknown effects remain visible and are not zero;
- future scoring must include semantic coverage and search completeness.
```

Do not force `ready` if implementation discovers another genuine blocker.

---

## 16. Tests

Add tests covering at minimum:

### Domain presence

- unsupported family absent from passive-node rawStats → non-blocking;
- unsupported family present in passive-node rawStats → can block;
- future/synthetic fixture containing outgoing less-damage is detected as present.

### Direction-aware presence

- incoming `Damage taken` does not satisfy outgoing `less-damage` presence;
- outgoing `deal less Damage` does.

### Partial family

- partially supported conversion remains listed;
- conversion can be non-blocking when coverage exposes the unsupported effect;
- unsupported raw line remains visible on a path containing the affected node.

### Readiness

- current pinned tree produces the measured readiness result;
- removing a required semantic family can still produce `not-ready`;
- adding a synthetic unsupported material family to the scoring domain can produce `not-ready`.

### Regression

All STEP-006A through STEP-007C tests must continue to pass.

Do not weaken existing assertions merely to make readiness return `ready`.

---

## 17. Performance

Presence detection may scan passive-node stats once during readiness assessment.

That is acceptable.

Do not introduce repeated whole-tree scanning per candidate path.

Path-level coverage must continue operating only on candidate nodes.

---

## 18. Package boundaries

### `packages/passive-engine`

May own:

- family presence detection;
- readiness policy;
- path semantic coverage;
- high-priority family report.

### `packages/domain`

No change required unless a stable readiness type truly belongs there.

### `packages/data-sources`

No readiness or scoring logic.

---

## 19. External APIs / credentials

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
NOT REQUIRED FOR STEP-007D
```

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-007D
```

### AI provider

Status:

```text
NOT REQUIRED FOR STEP-007D
```

No LLM may decide readiness or stat meaning.

---

## 20. Non-goals

Do **not** implement:

- heuristic scoring weights;
- path score calculation;
- ranking;
- DPS calculation;
- EHP calculation;
- PoB integration;
- gear scoring;
- crafting;
- OAuth;
- live character import;
- poe.ninja pricing;
- AI explanations;
- recommendation UI.

This step only refines the gate that decides whether scoring may begin.

---

## 21. Decision-log requirements

Update:

```text
docs/planning/DECISION_LOG.md
```

with material decisions including:

- scoring-domain definition;
- domain-aware family presence;
- outgoing less-damage non-blocking on current pin;
- partial-family non-blocking rule;
- conversion readiness treatment;
- mandatory path semantic coverage in scored results;
- mandatory search completeness in scored results;
- final STEP-008 readiness decision.

---

## 22. Required commands

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

## 23. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-007D-scoring-readiness-policy.md
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
Scoring Domain Definition
Family Presence Results
Blocking vs Non-Blocking Families
Damage Conversion Policy
Path Confidence Contract
Search Completeness Contract
Final STEP-008 Readiness
```

---

## 24. Expected result

At completion, readiness should conceptually evaluate:

```text
high-priority family
      ↓
supported?
      ↓
present in current scoring domain?
      ↓
material to scoring?
      ↓
can missing meaning be exposed safely?
      ↓
blocking / non-blocking
```

Future scoring then receives both:

```text
CandidatePath
PathSemanticCoverage
SearchCompleteness
```

before making recommendation claims.

---

## 25. Stop condition

After implementation and documentation:

**STOP.**

Do not automatically begin STEP-008.

If readiness is:

```text
not-ready
```

document the actual current blocker and stop.

If readiness is:

```text
ready
```

the next planned step is:

```text
STEP-008 — Configurable heuristic scoring
```

Wait for explicit approval before starting it.
