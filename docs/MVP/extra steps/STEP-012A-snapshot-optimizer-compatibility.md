# STEP-012A — Snapshot optimizer compatibility gate

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 4 / STEP-012A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Extend the STEP-012 passive-tree refresh pipeline so a downloaded snapshot is promoted only when it is both:

1. structurally valid GGG data; and
2. compatible with the current optimizer stack.

A valid JSON/export schema is not enough.

Before promotion, the candidate snapshot must pass the optimizer checks already built in earlier steps, including graph diagnostics, semantic/parser readiness, and scoring-readiness rules.

If optimizer compatibility fails:

```text
DO NOT PROMOTE
```

Do not start STEP-013 in this task.

---

## 2. Acceptance criteria

- [ ] A candidate snapshot is normalized before compatibility analysis.
- [ ] A graph is built from the candidate snapshot before promotion.
- [ ] Blocking graph diagnostics prevent promotion.
- [ ] Passive stat coverage is analyzed on the candidate snapshot.
- [ ] High-priority scoring-readiness rules are run against the candidate snapshot.
- [ ] Any blocking optimizer-readiness failure prevents promotion.
- [ ] Non-blocking limitations are reported explicitly.
- [ ] The compatibility result is deterministic.
- [ ] The current pin remains unchanged when compatibility fails.
- [ ] `previous/` remains unchanged when compatibility fails.
- [ ] The changelog is not appended when compatibility fails.
- [ ] A machine-readable compatibility result is available.
- [ ] A human-readable compatibility summary is printed by the refresh CLI.
- [ ] Tests run without contacting GitHub.
- [ ] Existing STEP-012 rollback behavior remains unchanged.
- [ ] Required repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-012A-snapshot-optimizer-compatibility.md`

---

## 3. Promotion pipeline

The refresh flow should become:

```text
download candidate data.json
        ↓
raw JSON parse
        ↓
export/schema normalization
        ↓
candidate checksum / snapshot load validation
        ↓
build passive graph
        ↓
graph diagnostics
        ↓
stat extraction / structured parsing
        ↓
semantic coverage analysis
        ↓
high-priority family readiness
        ↓
optimizer compatibility result
        ↓
PASS?
   ├── no  → reject candidate, change nothing
   └── yes → promote using STEP-012 pipeline
```

Do not bypass this gate from the normal refresh command.

---

## 4. Reuse existing readiness logic

Do not create a second independent definition of optimizer readiness.

Reuse the logic introduced by earlier steps wherever possible, including:

```text
graph diagnostics
optimization readiness
high-priority family report
semantic/path scoring readiness concepts
```

If existing functions are too tied to the current loaded pin, refactor them so they can analyze an arbitrary candidate snapshot.

Do not copy/paste the same readiness rules into the refresh module.

There should be one source of truth for each readiness rule.

---

## 5. Graph compatibility gate

Build the passive graph from the candidate snapshot.

Blocking graph conditions should remain aligned with the existing optimizer-readiness policy.

At minimum, the gate must reject candidate snapshots with serious diagnostics such as:

```text
duplicate-node
unknown-reference
non-reciprocal
edge-mismatch
```

Existing intentionally non-blocking diagnostics, such as known isolated-node behavior, should remain non-blocking unless prior policy changes explicitly.

The compatibility report must separate:

```text
blockingGraphDiagnostics
nonBlockingGraphDiagnostics
```

---

## 6. Class-start compatibility

Validate candidate class starts against the current class-start assumptions.

The gate must detect cases such as:

```text
missing expected class index
missing shared class-start node
class start points to a node that does not exist
```

Do not silently reuse stale class-start ids if the candidate export contradicts them.

If class-start metadata is derived from the export, derive and compare it deterministically.

If a change is detected, report it explicitly.

A change may be:

```text
compatible but changed
```

or:

```text
blocking
```

depending on whether the current runtime can consume the new mapping safely.

Document the final policy.

---

## 7. Stat-parser compatibility analysis

Run the stat extraction / grammar pipeline against all passive-node `rawStats` in the candidate tree.

Record at minimum:

```text
totalStatLines
structurallyParsedLines
structuralCoverageRatio
semanticallyMappedLines
semanticCoverageRatio
unrecognizedLines
structuredButUnmappedLines
```

Also report deltas versus the currently approved snapshot when available.

Example:

```text
current semantic coverage:   48.8%
candidate semantic coverage: 46.1%
delta:                       -2.7 pp
```

Coverage change by itself does not necessarily block promotion.

Blocking must follow explicit readiness rules rather than an arbitrary percentage drop unless this step deliberately introduces and documents such a threshold.

---

## 8. High-priority family readiness

Run the same high-priority-family policy established in STEP-007D against the candidate passive-node scoring domain.

For each required family, record at minimum:

```text
family
support status
presentInScoringDomain
omissionExposed
blocking
reason
```

If a new candidate introduces a high-priority mechanic that:

```text
is present in passive-node stats
AND matters to MVP scoring
AND is unsupported
AND its omission would not be safely exposed by path coverage
```

promotion must be blocked.

Do not treat absence of a mechanic as a failure.

Do not treat unsupported-but-safely-exposed mechanics as zero-value effects.

---

## 9. New semantic/mechanic inventory

Generate a compatibility inventory of mechanics that are new relative to the current approved snapshot.

At minimum distinguish:

```text
new recognized semantic ids
new structured-but-unmapped patterns
new fully unrecognized raw-stat patterns
removed semantic ids
```

This is primarily diagnostic.

Do not block every new mechanic automatically.

The blocking decision must come from the readiness policy.

---

## 10. Scoring-profile compatibility

Inspect whether candidate passive stats introduce semantic ids that are mapped but absent from scoring profiles.

Report at minimum:

```text
mapped-but-unweighted semantic ids present in candidate
```

Do not automatically add weights.

Do not automatically block all such ids.

Use the existing valuation-completeness model.

However, if a newly introduced mapped mechanic violates the high-priority readiness rules, it may block promotion.

---

## 11. Maximum-resistance behavior

Preserve the STEP-009 decision unless deliberately changed.

Maximum resistance may remain:

```text
semantically understood
but unscored
```

and therefore produce incomplete valuation.

Its presence must not be interpreted as zero value.

Do not add maximum-resistance weights as part of STEP-012A unless separately justified and documented.

This step is a compatibility gate, not a scoring recalibration step.

---

## 12. Candidate compatibility result

Create a deterministic compatibility result type.

Conceptually:

```text
compatible: boolean

graph:
  blockingDiagnostics
  nonBlockingDiagnostics

classes:
  compatible
  changes

coverage:
  totalStatLines
  structuralCoverageRatio
  semanticCoverageRatio
  deltas

highPriorityFamilies:
  ...

mechanics:
  newSemanticIds
  newStructuredUnmapped
  newUnrecognizedPatterns
  removedSemanticIds

scoring:
  mappedButUnweighted

blockingReasons:
  ...
warnings:
  ...
```

The exact TypeScript shape may differ.

The normal refresh path must rely on `compatible`, not on parsing CLI text.

---

## 13. Human-readable CLI summary

Before promotion, print a concise compatibility summary.

Example structure:

```text
Passive-tree candidate compatibility

Version: 0.5.6
Commit: <commit>

Graph:
  blocking diagnostics: 0
  warnings: 22

Coverage:
  structural: 80.4%
  semantic:   49.2%

High-priority families:
  blocking: 0

New mechanics:
  recognized: 3
  structured-unmapped: 2
  unrecognized families: 1

Optimizer compatibility:
  PASS
```

On rejection:

```text
Optimizer compatibility:
  FAIL

Blocking reasons:
- ...
- ...

Current snapshot was not changed.
```

Do not print "success" before the promotion gate has passed.

---

## 14. Promotion semantics

Only when all of these pass:

```text
raw validation
schema normalization
snapshot/checksum validation
optimizer compatibility
```

may the existing STEP-012 promotion logic execute.

On compatibility failure:

```text
current/data.json      unchanged
current/manifest.json  unchanged
previous/              unchanged
changelog.md           unchanged
```

No partial promotion.

---

## 15. Rollback

Do not weaken STEP-012 rollback validation.

Rollback should continue to validate the previous snapshot before restoring it.

STEP-012A does not need to reject rollback merely because the previous version would fail today's newer optimizer compatibility rules, unless that behavior is deliberately specified.

The default safe policy should be:

```text
rollback restores a previously known stored snapshot
after existing snapshot validation
```

Do not silently change rollback semantics without documenting the reason.

---

## 16. Compatibility baseline

Use the currently approved passive tree as the baseline:

```text
version:
0.5.5

commit:
bd87e6512c92b868542eddfb1ba4ea8b6dc2da36

checksum:
sha256:b52be9c4f17e4114064255ef1b8c58292e9db0e395d95af235a8d3fef0d44642
```

The current baseline should pass the new compatibility gate.

Add a regression test proving this.

Do not modify the approved pin as part of this step.

---

## 17. Test fixtures

Tests must not depend on GitHub.

Use temporary snapshot directories and local/constructed candidate exports.

Include at least:

### Compatible candidate

A structurally valid candidate that passes all optimizer-readiness checks.

Expected:

```text
compatible = true
promotion allowed
```

### Blocking graph failure

Example:

```text
unknown node reference
```

Expected:

```text
compatible = false
current pin unchanged
```

### New unsupported high-priority family

Construct or modify a node raw stat so the family is:

```text
present
required
unsupported
not safely exposed
```

Expected:

```text
compatible = false
```

### New non-blocking mechanic

A new unsupported mechanic whose omission is safely exposed through semantic/path coverage.

Expected:

```text
compatible = true
warning present
```

### Coverage regression without blocking family

Candidate has lower semantic coverage but no blocking readiness issue.

Recommended:

```text
compatible = true
warning present
```

unless a different documented threshold is intentionally introduced.

### Class-start incompatibility

Missing/broken class start.

Expected:

```text
compatible = false
```

### Failed candidate leaves files unchanged

Verify byte-for-byte or checksum-equivalent preservation of:

```text
data.json
manifest.json
previous/
changelog.md
```

---

## 18. Current-snapshot comparison

When a valid current snapshot exists, compare candidate versus current.

Report useful deltas such as:

```text
node count
edge count
isolated node count
total stat lines
structural coverage
semantic coverage
new semantic ids
new unknown patterns
class-start changes
```

This comparison is for operator visibility.

Do not turn every delta into a failure.

---

## 19. No LLM compatibility decisions

Do not use an LLM to decide whether a snapshot is compatible.

All compatibility decisions must be deterministic.

AI may later summarize a generated compatibility report, but it must not decide promotion.

---

## 20. Security

Preserve STEP-012 download restrictions.

Do not weaken:

```text
explicit 40-character commit
approved raw GitHub repository
no credentials
no arbitrary remote URL
```

No new network source is needed for STEP-012A.

---

## 21. Performance

Compatibility analysis runs only during explicit snapshot refresh.

It is not part of a normal user analysis request.

Reasonable extra work during refresh is acceptable, including:

```text
graph construction
full passive stat scan
semantic inventory
readiness analysis
```

Do not add this work to every browser request.

---

## 22. Package boundaries

Prefer keeping compatibility analysis close to the relevant existing engines.

Possible structure:

```text
data-sources
  refresh orchestration

passive-engine
  graph diagnostics
  readiness

scoring/stat layer
  semantic/readiness analysis
```

The refresh module may orchestrate these checks.

Do not duplicate parser/scorer logic inside `data-sources`.

If dependency direction prevents clean reuse, document and make the smallest architecture change needed.

Avoid circular package dependencies.

---

## 23. Required commands

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

Also run the refresh command against a temporary/local candidate path if the CLI supports such a test mode.

Do not promote the real approved development pin.

---

## 24. Documentation

After implementation create:

```text
docs/progress/STEP-012A-snapshot-optimizer-compatibility.md
```

Follow the existing progress-document protocol.

In addition to the normal sections, include:

```text
Compatibility Pipeline
Blocking Conditions
Non-Blocking Warnings
Graph Gate
Class-Start Gate
Semantic Coverage Comparison
High-Priority Family Report
New Mechanic Inventory
Scoring-Profile Compatibility
Promotion Atomicity / File-Safety Behavior
Baseline 0.5.5 Result
Synthetic Failure Cases
Rollback Behavior
STEP-013 Readiness
```

---

## 25. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions such as:

```text
which graph diagnostics block promotion
class-start compatibility policy
coverage-regression policy
high-priority readiness reuse
whether mapped-but-unweighted mechanics block or warn
rollback compatibility behavior
```

Do not create hidden promotion policy only in test assertions.

---

## 26. Non-goals

Do not implement:

- STEP-013;
- poe.ninja price data;
- automatic "latest release" discovery;
- automatic fixture migration;
- automatic scoring-weight changes;
- automatic parser-rule generation;
- AI compatibility decisions;
- OAuth;
- gear/skill import;
- UI for snapshot administration.

This step only makes passive-tree promotion optimizer-safe.

---

## 27. Expected result

After STEP-012A, a future passive-tree refresh should mean:

```text
candidate is valid GGG data
AND
candidate can be safely consumed by the current optimizer
```

rather than merely:

```text
candidate JSON is structurally valid
```

The refresh command should be able to answer:

```text
What changed?
Can the graph engine still use it?
Can the stat parser still understand it safely?
Did a new blocking scoring mechanic appear?
Will incomplete mechanics remain visibly incomplete?
Can this snapshot be promoted without silently degrading the optimizer?
```

---

## 28. Stop condition

After implementation, tests, compatibility reporting, and documentation are complete:

**STOP.**

Do not automatically begin STEP-013.

Do not update the approved `0.5.5` development pin as part of this step.

Wait for explicit review and approval.
