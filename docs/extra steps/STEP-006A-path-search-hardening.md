# STEP-006A — Path-search hardening

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 2 / STEP-006A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden the STEP-006 main-tree path-search layer before stat extraction and scoring begin.

This step addresses three correctness risks identified after STEP-006:

1. The current search assumes every newly allocated node costs one passive point, but the official tree export contains an `isFree` flag whose gameplay meaning has not yet been verified.
2. Disconnected shared/main-tree allocations are currently reported and ignored, which could allow optimization to proceed from a character state different from the imported build.
3. Truncated searches must never later be presented as exhaustive or globally optimal.

Do **not** begin STEP-007 in this task.

---

## 2. Acceptance criteria

- [ ] All nodes carrying the official `isFree` flag in the pinned PoE2 `0.5.5` snapshot are inspected and documented.
- [ ] The project does not guess the gameplay meaning of `isFree`.
- [ ] Point-cost behavior for `isFree` nodes is implemented only if the official data and/or verified game behavior supports it.
- [ ] If `isFree` cannot be confidently interpreted, the limitation is explicit and the path engine does not make a false legality/cost claim.
- [ ] Disconnected shared/main-tree allocations prevent normal path enumeration for the currently supported main-tree scope.
- [ ] The public path-search API does not silently ignore disconnected shared allocations and continue optimization.
- [ ] Weapon-set-only allocations remain outside this main-tree rule unless explicitly modeled later.
- [ ] Search results clearly distinguish exhaustive from truncated enumeration.
- [ ] A truncated result cannot be represented as exhaustive or globally optimal by downstream code.
- [ ] Regression tests cover all new behavior.
- [ ] Existing STEP-006 path-search behavior remains deterministic.
- [ ] Required checks pass.
- [ ] A completion document is created at `docs/progress/STEP-006A-path-search-hardening.md`.

---

## 3. Scope

### 3.1 Investigate `isFree`

Inspect the already pinned official GGG PoE2 passive-tree export.

Identify every node where the raw export indicates:

```text
isFree = true
```

For each such node, document at minimum:

- node id;
- name;
- domain kinds;
- neighbors;
- ascendancy membership, if any;
- whether it is connected to the main passive tree;
- whether it appears allocatable in the same way as ordinary passive nodes;
- any other official-export metadata that helps determine its meaning.

Do not infer point cost from the flag name alone.

The investigation should answer:

```text
Does `isFree` mean that allocating/traversing this node costs zero passive points?
```

#### Outcome A — verified zero-cost behavior

If there is sufficient evidence that `isFree` nodes cost zero passive points in the supported path-search scope:

- update the path-cost model;
- a normal node costs 1;
- a verified free node costs 0;
- path connectivity rules remain unchanged;
- point-budget enforcement must use total cost, not simply `nodeIds.length`.

Example conceptually:

```ts
pointCost = sum(nodeAllocationCost(nodeId));
```

Do not hardcode behavior by node id.

#### Outcome B — meaning remains uncertain

If the official export does not provide enough information to determine allocation cost confidently:

- do not guess;
- preserve the flag;
- document the uncertainty;
- keep the current behavior only if clearly labeled as a temporary limitation;
- do not claim exact point-cost legality for paths containing affected nodes.

Prefer blocking or excluding ambiguous affected paths over silently returning a potentially incorrect point cost.

The exact conservative policy should be documented as a decision.

---

### 3.2 Block disconnected shared/main-tree allocations

STEP-006 currently identifies:

```text
disconnectedAllocatedIds
```

These are nodes present in `allocatedPassiveIds` that do not connect back to the class start through the character's other shared/main-tree allocations.

For the currently supported main-tree scope, do not silently ignore these nodes and continue enumeration.

The public search flow must behave conceptually as:

```text
ready fixture
    ↓
build connected current allocation
    ↓
disconnected shared allocations?
    ├── YES → STOP / throw structured error
    └── NO  → continue path search
```

Reason:

The optimizer must not transform this imported character state:

```text
legal connected allocation + disconnected shared allocation
```

into:

```text
legal connected allocation only
```

and then optimize a different build without explicit refusal.

Implement a structured failure rather than a generic untyped error.

Possible conceptual names:

```ts
DisconnectedAllocationError;
```

or a path-search validation result.

Use the naming that best matches the current passive-engine architecture.

The error/report should include the disconnected node ids.

#### Important scope distinction

This rule applies to:

```text
character.allocatedPassiveIds
```

within the current shared/main-tree search model.

Do **not** automatically classify:

```text
set1
set2
set3
```

as disconnected errors.

Weapon-set legality remains explicitly out of scope.

Ascendancy allocations also remain outside this main-tree search.

---

### 3.3 Make search completeness explicit

STEP-006 currently provides:

```text
truncated: boolean
```

when `maxPaths` or `maxExpansions` stops enumeration early.

Strengthen the result contract so downstream systems can clearly determine whether the candidate space was completely enumerated within the requested supported scope.

Prefer an explicit concept such as:

```ts
searchCompleteness: "exhaustive" | "truncated";
```

or equivalent.

Keeping the existing boolean is acceptable if the type and documentation make the semantics unambiguous.

The invariant must be:

```text
truncated = false
→ all paths permitted by the implemented search rules and limits for that budget were enumerated

truncated = true
→ some possible paths may not be present
```

Be precise about what "all" means: only the currently modeled **main passive tree scope**, not full PoE2 legality.

---

## 4. Downstream optimization contract

Add an explicit contract for later scoring/recommendation code.

If path enumeration is truncated:

```text
search is non-exhaustive
```

Therefore downstream code must never describe its selected result as:

- globally optimal;
- the best possible path;
- mathematically optimal across the full candidate set;
- exhaustive.

Allowed wording conceptually includes:

```text
best path found within search limits
```

or:

```text
highest-scoring path among enumerated candidates
```

This step does **not** implement UI copy or scoring.

It only creates the typed/documented contract that STEP-008 and later code must respect.

Record this rule in the decision log.

---

## 5. Public API safety

Do not create an exported search API that bypasses the new checks.

The exported/public path-search function must internally enforce:

1. `requireOptimizationReadiness`;
2. disconnected shared-allocation validation;
3. any required `isFree` safety rule;
4. configured search limits.

If lower-level traversal helpers are needed, keep them internal/private.

Desired shape conceptually:

```text
PUBLIC
enumerateMainTreePaths(...)
    ↓
readiness
    ↓
allocation integrity
    ↓
point-cost safety
    ↓
INTERNAL enumeration
```

Do not rely on README instructions alone for correctness.

---

## 6. Search-cost semantics

After the `isFree` investigation, make path cost explicit and centralized.

Do not scatter code like:

```ts
pointCost = nodeIds.length;
```

through multiple places.

Prefer one authoritative rule/function, conceptually:

```ts
passiveNodePointCost(node): number
```

or:

```ts
calculatePathPointCost(...)
```

The exact implementation depends on the verified `isFree` result.

Tests must establish that:

```text
returned pointCost
```

matches the centralized cost model.

---

## 7. Tests

Add regression tests covering at minimum:

### `isFree`

- the pinned export's `isFree` nodes are identified;
- the chosen policy for those nodes is tested;
- if verified as zero-cost, budget calculations reflect zero-cost nodes;
- if ambiguous, affected paths are handled according to the conservative policy rather than guessed.

### Disconnected allocations

- a connected normal allocation can search;
- a fixture with a disconnected shared/main-tree allocated node cannot search normally;
- the structured failure exposes the disconnected id(s);
- current Witch and Warrior fixtures remain searchable;
- weapon-set-only ids are not incorrectly treated as disconnected shared allocations.

### Search completeness

- hitting `maxPaths` marks the result non-exhaustive/truncated;
- hitting `maxExpansions` marks the result non-exhaustive/truncated;
- a fully completed small search is marked exhaustive/non-truncated;
- deterministic ordering remains unchanged across repeated calls.

### Existing behavior

Continue covering:

- branches;
- cycles;
- duplicate route order;
- unreachable nodes;
- zero budget;
- budget cap;
- readiness failure;
- ascendancy exclusion;
- main-tree scope.

Do not weaken STEP-006 tests to satisfy this step.

---

## 8. Non-goals

Do **not** implement any of the following in STEP-006A:

- stat parsing;
- stat normalization;
- passive scoring;
- DPS calculations;
- defensive scoring;
- route ranking;
- AI recommendations;
- ascendancy legality;
- ascendancy point budgets;
- weapon-set specialization legality;
- character-level passive-point totals;
- quest passive-point totals;
- gear analysis;
- crafting;
- OAuth;
- poe.ninja integration;
- UI changes.

Those remain later work.

---

## 9. External APIs / credentials

No new authorization should be required.

### Official GGG passive-tree export

Status:

```text
AVAILABLE
NO AUTH REQUIRED
```

Use the existing pinned STEP-003 snapshot.

Do not silently switch to a different tree version during this step.

### GGG OAuth

Status:

```text
NOT AVAILABLE YET
REQUIRES GGG APPLICATION REGISTRATION / APPROVAL
NOT REQUIRED FOR STEP-006A
```

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-006A
```

### AI provider

Status:

```text
NOT REQUIRED FOR STEP-006A
```

No LLM should determine passive legality or path cost.

---

## 10. Documentation requirements

After implementation, create:

```text
docs/progress/STEP-006A-path-search-hardening.md
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

The `isFree` investigation must be documented in enough detail that a later developer can understand why the chosen cost policy exists.

Update:

```text
docs/planning/DECISION_LOG.md
```

for:

- the `isFree` cost-policy decision;
- the disconnected-allocation refusal rule;
- the truncated/non-exhaustive optimization contract.

---

## 11. Required commands

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

Document any failures and their resolutions.

---

## 12. Important correctness principles

### Do not optimize a different build from the one imported

If the build contains shared allocations the current engine cannot reconcile with the class-start-connected allocation, stop.

Do not silently delete or ignore them.

### Do not guess game mechanics

A field named `isFree` is evidence to investigate, not sufficient proof of zero passive-point cost by itself.

### Do not overclaim search completeness

A capped search is not exhaustive.

### Do not overclaim PoE2 legality

Even after STEP-006A, the search still does not model:

- ascendancy access;
- weapon-set specialization rules;
- quest passive totals;
- passive totals from level;
- other unimplemented PoE2 mechanics.

The correct claim remains:

```text
main-tree path validity under currently implemented rules
```

---

## 13. Expected result

At completion, the path pipeline should look like:

```text
BuildFixture
    ↓
OptimizationReadiness
    ↓
shared allocation integrity check
    ↓
verified point-cost policy
    ↓
bounded main-tree path enumeration
    ↓
MainTreePathSearch
    ├── paths
    ├── accurate pointCost under supported rules
    ├── exhaustive/truncated status
    └── warnings/diagnostics
```

This gives STEP-007 and STEP-008 a trustworthy candidate set without yet attempting to determine which path is best.

---

## 14. Stop condition

When all acceptance criteria pass and:

```text
docs/progress/STEP-006A-path-search-hardening.md
```

has been completed:

**STOP.**

Do not automatically begin STEP-007.

The next planned step is:

```text
STEP-007 — Stat extraction and normalization
```

Wait for explicit approval before starting it.
