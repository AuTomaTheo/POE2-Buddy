# STEP-003A — Passive data hardening

**Date:** 2026-09-26  
**Status:** PLANNED  
**Roadmap reference:** Phase 1 / STEP-003A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden the passive-tree data layer before building the graph/optimizer.

This step exists to fix a few architectural risks identified after STEP-003:

- TypeScript under `packages/*` is not yet covered by ESLint.
- The special GGG `root` node is intentionally excluded from the passive graph, but class-start information must not be lost.
- The pinned passive-tree snapshot currently lives under `docs/`, which must not become an implicit production-runtime dependency.
- The 5 MB passive-tree file must not be reparsed and revalidated for every optimization request.

Do **not** begin STEP-004 in this task.

---

## 2. Acceptance criteria

- [ ] ESLint covers TypeScript source under `packages/*`, not only `apps/web`.
- [ ] The official passive-tree export's `root` / class-start relationships are investigated and documented.
- [ ] `root` is still **not** treated as a normal passive graph node.
- [ ] Enough normalized metadata is preserved to identify legitimate class starting nodes later.
- [ ] Production runtime does not implicitly depend on `docs/` being available.
- [ ] A process-level cached/singleton passive-tree loader is available.
- [ ] Repeated consumers can reuse the already-loaded validated snapshot instead of reparsing the 5 MB JSON file.
- [ ] Relevant unit/regression tests are added.
- [ ] Existing STEP-003 behavior and data provenance remain intact.
- [ ] All required checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-003A-passive-data-hardening.md`

---

## 3. Scope

### 3.1 Expand lint coverage

Update the repository lint configuration/scripts so TypeScript under the following areas is linted:

```text
apps/web
packages/domain
packages/data-sources
```

The solution should also naturally support future packages such as:

```text
packages/passive-engine
packages/scoring-engine
packages/gear-engine
packages/crafting-engine
```

Avoid creating separate unrelated lint configurations unless necessary.

The root command should remain simple:

```bash
npm run lint
```

and should lint the relevant application/package TypeScript source.

### 3.2 Preserve class-start metadata

Inspect the pinned official GGG PoE2 passive-tree export already added in STEP-003.

Determine exactly how the export represents:

- the special `root` node;
- edges between `root` and class-start nodes;
- class identifiers/names associated with those starts;
- any other metadata required to know where a character of a given class may legally begin allocating passives.

Do **not** infer or hardcode class-start relationships from outside information if the official export already exposes them.

The normalized passive graph should still exclude `root` as a normal allocatable passive node.

However, preserve enough normalized metadata for future code to answer a question equivalent to:

```text
Given a character class with no passive allocations,
which node or nodes are valid starting positions?
```

Prefer a clear domain representation instead of hidden adapter-only logic.

Example conceptual shape only:

```ts
classStarts: {
  Huntress: ["..."],
  Warrior: ["..."],
  Witch: ["..."]
}
```

The exact shape must follow what the real GGG export supports. Do not copy this example blindly.

If the official export does **not** provide sufficient information to establish legal class starts, document that clearly instead of inventing data.

### 3.3 Remove implicit production dependence on `docs/`

The pinned passive-tree snapshot currently lives at:

```text
docs/data-snapshots/passive-tree/
```

That location is acceptable for development/provenance documentation, but production application code must not silently assume the `docs/` tree is always bundled by Next.js or available in every deployment environment.

For this step:

- document the runtime-data requirement explicitly;
- choose and record the intended production strategy;
- do not move the snapshot unless a move is actually required now.

Acceptable strategies could include:

- moving runtime snapshots into a package-owned `data/` directory later;
- copying the pinned data as an explicit build step;
- bundling/precompiling a normalized snapshot;
- another explicit, testable approach.

The important requirement is that this must be a deliberate architecture decision, not an accidental filesystem dependency.

Record the decision in:

```text
docs/planning/DECISION_LOG.md
```

if it qualifies as a new architectural decision.

### 3.4 Add cached/singleton snapshot loading

The existing STEP-003 loader validates and normalizes the full official snapshot.

Keep that behavior, but add a reusable process-level loading API so future request handlers and optimizer code do not repeatedly:

```text
read 5 MB JSON
→ JSON.parse
→ Zod validation
→ normalize 5,000+ nodes
→ rebuild maps
```

on every request.

Desired behavior:

```text
First consumer
    ↓
load + checksum verify + validate + normalize
    ↓
cache immutable snapshot
    ↓
later consumers reuse same loaded snapshot
```

Requirements:

- Keep the existing non-cached low-level loader if useful for tests.
- Add a clearly named cached accessor.
- Do not introduce a database or Redis for this.
- The cache is process-local only.
- Do not mutate the cached snapshot after creation.
- Make test behavior deterministic.
- If a cache reset helper is needed for tests, keep it test-oriented and do not expose unnecessary mutable production state.

### 3.5 Tests

Add tests covering at minimum:

1. Package TypeScript is included in lint coverage.
2. The official pinned tree still parses successfully.
3. Class-start/root metadata is preserved correctly, if supported by the export.
4. `root` is not present as a normal allocatable passive node.
5. Cached loading returns/reuses the loaded snapshot without reparsing the source each time.
6. Existing checksum mismatch behavior still fails loudly.
7. Existing unknown `is*` flag/schema-protection behavior still fails loudly.
8. Existing self-edge handling for `Grenade Damage` remains covered.

Do not weaken previous tests in order to make this step pass.

---

## 4. Non-goals

Do **not** implement any of the following in STEP-003A:

- passive graph traversal;
- shortest-path calculations;
- reachable-node calculations;
- scoring;
- build optimization;
- stat-line parsing;
- character OAuth;
- GGG character import;
- poe.ninja integration;
- RePoE integration;
- gear optimization;
- crafting recommendations;
- UI changes beyond anything strictly required for build/configuration correctness.

Those belong to later steps.

---

## 5. External APIs / credentials

No new external authorization is required for this step.

### Official GGG passive-tree export

Status:

```text
AVAILABLE
NO AUTH REQUIRED
```

Continue using the already pinned official snapshot from STEP-003.

### GGG OAuth

Status:

```text
NOT AVAILABLE YET
REQUIRES GGG APPLICATION REGISTRATION / APPROVAL
NOT REQUIRED FOR STEP-003A
```

Do not add fake client IDs, fake secrets, or mock production OAuth credentials.

### poe.ninja

Status:

```text
NOT REQUIRED FOR STEP-003A
```

Do not integrate it in this step.

### AI provider credentials

Status:

```text
NOT REQUIRED FOR STEP-003A
```

Do not add or use an LLM API in this step.

---

## 6. Required commands

Run all of the following before marking the step complete:

```bash
npm install
npm run format
npm run format:check
npm test
npm run typecheck
npm run lint
```

Run `npm audit` if dependency files change.

If a command fails, document:

- the exact symptom;
- the root cause if known;
- what was attempted;
- the final resolution;
- whether a regression test was added.

---

## 7. Documentation requirements

After implementation is complete, create:

```text
docs/progress/STEP-003A-passive-data-hardening.md
```

Follow the repository's existing documentation protocol in full.

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

Also update:

```text
docs/planning/DECISION_LOG.md
```

for any new architecture decisions made in this step.

Do not silently change the data model, runtime-data strategy, cache semantics, or class-start representation without documenting the reason.

---

## 8. Important implementation constraints

### Preserve provenance

Do not remove or weaken the existing STEP-003 metadata:

- source repository;
- pinned commit;
- PoE2 version;
- fetched-at timestamp;
- checksum;
- node count;
- edge count.

### Fail loudly on incompatible game-data changes

Maintain the current philosophy:

```text
known schema
→ validate
→ normalize

unknown structural change
→ fail
→ investigate
```

Do not make the loader broadly permissive simply to avoid future failures.

### Do not guess game mechanics

If the export contains ambiguous class-start or root behavior:

- inspect the data;
- document the ambiguity;
- preserve the raw/normalized information needed later;
- do not invent rules.

### Keep package boundaries clean

`packages/domain` must remain free of:

- HTTP;
- filesystem access;
- UI code;
- external API calls.

`packages/data-sources` may own:

- reading the pinned source;
- raw-source schemas;
- normalization;
- provenance validation;
- snapshot loading/caching.

Do not move network/UI responsibilities into the domain package.

---

## 9. Expected result

At the end of STEP-003A, the repository should have a hardened passive-data foundation that:

```text
official pinned GGG snapshot
        ↓
checksum verification
        ↓
strict raw validation
        ↓
normalized domain snapshot
        ↓
class-start metadata preserved
        ↓
process-level immutable cache
        ↓
ready for STEP-004 graph construction
```

The project should still contain **no optimizer logic** at this point.

---

## 10. Stop condition

When all acceptance criteria pass and the completion document has been written:

**STOP.**

Do not automatically begin STEP-004.

The next planned step is:

```text
STEP-004 — Passive graph construction
```

Wait for explicit approval before starting it.
