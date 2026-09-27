# STEP-018B.1 — Delta fidelity and item-candidate readiness

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018B.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Harden STEP-018B before budget-aware upgrade prioritization depends on it.

STEP-018B successfully added:

```text
isolated PoB2 worker
version compatibility gate
baseline calculation
passive candidate mutation
restore verification
named metric deltas
structured errors
feature-gated UI
real-runtime integration tests
```

Before STEP-018C, close four remaining readiness gaps:

```text
1. prove that the exact requested passive candidate was evaluated;
2. fingerprint the full calculation-relevant runtime/data, not only the executable and worker;
3. make network-isolation claims match what is actually enforced;
4. add a minimal explicit item-replacement delta API so later gear-budget work can measure item changes.
```

This is a correctness/readiness step. It must not rank upgrades or use prices.

---

## 2. Why this step is required

STEP-018C will eventually depend on:

```text
candidate identity
        ↓
trusted whole-build delta
        ↓
cost estimate
        ↓
opportunity-cost comparison
```

If PoB2 silently auto-allocates extra path nodes, or if runtime data drifts while provenance appears unchanged, future ranking can become incorrect.

STEP-018B also exposes passive deltas only. Budget-aware gear prioritization needs the primitive:

```text
current item
→ explicit replacement item
→ measured build delta
```

without returning to generic item scoring.

---

## 3. Core invariants

```text
requested passive candidate
=
evaluated passive candidate
```

```text
calculator provenance
=
actual calculation-runtime contents
```

```text
item delta
!=
item recommendation
```

---

## 4. Acceptance criteria

- [ ] Passive evaluation verifies the exact newly allocated node set.
- [ ] Unexpected auto-path nodes cause a structured candidate-allocation mismatch.
- [ ] Server-side point cost is recomputed or verified.
- [ ] Allocation mode is verified.
- [ ] Result records requested, verified, and actually allocated node ids.
- [ ] Runtime integrity covers calculation-relevant Lua/data/tree files.
- [ ] Runtime fingerprint is included in calculation provenance.
- [ ] Runtime fingerprint mismatch fails closed.
- [ ] Network policy documentation distinguishes localhost protocol from OS-level outbound blocking.
- [ ] Known PoB auto-update remains disabled.
- [ ] A minimal explicit item-replacement delta API exists.
- [ ] Item replacement uses explicit slot + raw item text.
- [ ] Item mutation restores the original equipped item and baseline metrics.
- [ ] Item delta uses the same named metric/delta model as passive delta.
- [ ] No item search, scoring, ranking, pricing, or recommendation is added.
- [ ] Default tests still require no PoB2 executable.
- [ ] Opt-in PoB2 tests cover passive exactness and one item replacement.
- [ ] Passive heuristic ranking remains unchanged.
- [ ] Gear normalization remains unchanged.
- [ ] CharacterContext remains unchanged.
- [ ] Create `docs/progress/STEP-018B-1-delta-fidelity-and-item-candidate-readiness.md`.

---

## 5. Scope

May change:

```text
pob2-calculator candidate validation
worker protocol/response
runtime manifest/fingerprint
calculator provenance
structured error codes
item replacement evaluator
real-runtime tests
server adapters
documentation
```

Must not implement:

```text
budget ranking
poe.ninja usage
trade search
item generation
crafting
AI explanation
composite score
passive reranking
```

---

## 6. Passive candidate exactness

Before mutation, capture the relevant baseline allocation set.

After mutation derive:

```text
newlyAllocatedIds =
afterAllocatedIds - baselineAllocatedIds
```

Compare that to the server-verified expected new node ids.

If:

```text
newlyAllocatedIds != expectedNewIds
```

return:

```text
candidate-allocation-mismatch
```

Restore baseline and do not expose the delta as a successful candidate result.

---

## 7. Auto-path behavior

PoB2 may allocate connecting/path nodes while processing `AllocNode`.

Do not silently include unexpected nodes.

Internal diagnostics should preserve:

```text
requested ids
expected ids
actual new ids
unexpected ids
missing ids
allocation mode
```

User-facing wording should remain concise.

---

## 8. Already-allocated nodes

For the current Buddy recommendation contract, candidate node ids represent new allocations.

A requested id already allocated at baseline should normally be treated as stale/mismatched input.

Do not silently lower point cost.

If a future API needs mixed old/new ids, create a separate explicit contract later.

---

## 9. Server-authoritative point cost

Do not trust browser-supplied `pointCost`.

Use existing passive-engine/game-data rules to recompute or verify:

```text
verifiedPointCost
```

A mismatch fails before the worker mutation.

---

## 10. Candidate provenance

Successful passive delta results should expose conceptually:

```text
requestedNodeIds
verifiedNodeIds
actuallyAllocatedNodeIds
allocationMode
verifiedPointCost
```

Do not display a character delta without enough identity to prove what was evaluated.

---

## 11. Server-authoritative UI candidate

Where the UI evaluates an existing Buddy recommendation, prefer:

```text
server-side candidate identifier
```

or revalidate the node set against the submitted build/recommendation server-side.

Do not treat arbitrary browser-provided node ids and point cost as authoritative display provenance.

---

## 12. New structured error

Add an error such as:

```text
candidate-allocation-mismatch
```

This differs from `candidate-invalid`: PoB2 may accept the mutation but produce a different allocation set.

On mismatch:

```text
restore
verify restore
discard worker if restore fails
```

---

## 13. Passive exactness tests

Real runtime:

```text
fixture B
candidate [4739]
expected new ids [4739]
actual new ids [4739]
```

Also test one legal multi-node candidate.

Mock worker:

```text
requested [4739]
actual [4739, 18845]
→ candidate-allocation-mismatch
```

---

## 14. Runtime pinning gap

The calculator currently verifies key files such as:

```text
PoB2 executable
Buddy worker script
bootstrap marker
```

PoB calculations also depend on:

```text
Modules/**/*.lua
Classes/**/*.lua
Data/**
TreeData/**
skill/game data
manifest/version files
```

Those semantics must be represented by runtime provenance.

---

## 15. Runtime fingerprint

Create a deterministic SHA-256 fingerprint over calculation-relevant immutable runtime files.

Acceptable designs:

### A. Explicit allowlist

Hash inventoried calculation paths.

### B. Runtime-tree hash

Hash the isolated runtime copy while explicitly excluding known writable/non-semantic files.

Whichever approach is used, document:

```text
included paths
excluded paths
sort order
per-file hashing method
aggregate method
```

Do not include logs/temp/user state in the semantic fingerprint.

---

## 16. Runtime manifest

Extend `poe2-buddy-runtime.json` conceptually with:

```text
PoB2 version
tree key
platform
adapter/protocol version
runtimeFingerprint
executableChecksum
workerChecksum
preparedAt
source/provenance notes
```

The runtime fingerprint is the semantic identity.

---

## 17. Fail closed on runtime drift

Before starting a worker, verify the runtime fingerprint.

Mismatch:

```text
runtime-integrity-mismatch
```

or equivalent.

Do not calculate.

Do not silently regenerate the manifest during normal app execution.

---

## 18. Fingerprint lifecycle

It is acceptable to verify once per worker start and bind that verified identity to the worker lifecycle.

Do not rehash the full runtime per candidate.

Every new worker must verify again.

---

## 19. Provenance

Every successful calculator result should now include:

```text
runtimeFingerprint
```

alongside existing:

```text
PoB2 version
PoB2 tree key
Buddy tree version/commit/checksum
adapter version
build checksum
```

---

## 20. Network-policy correction

The worker protocol is localhost-only:

```text
127.0.0.1
```

and the known PoB updater is disabled.

But unless OS-level outbound access is actually blocked, do not claim:

```text
the process can only access localhost
```

Document instead:

```text
Buddy worker protocol is localhost-only.
Known PoB auto-update is disabled.
OS-level outbound access is not currently blocked.
```

This wording correction is mandatory.

---

## 21. Optional OS-level blocking

If an unprivileged, stable Windows-local restriction is easy to add, it may be implemented.

Do not modify the user's firewall globally or require administrator privileges merely to satisfy this step.

Correct security claims are more important than pretending the worker is fully network-sandboxed.

---

## 22. Why item delta is required before STEP-018C

STEP-018C should eventually compare budget-aware gear opportunities using measured build effects.

It must not regress to:

```text
generic gear stat weights
```

Therefore STEP-018B.1 adds only:

```text
evaluate one explicit replacement item
```

The candidate item is supplied by the caller. This step does not decide how to find it.

---

## 23. Item candidate API

Add a narrow function conceptually:

```text
evaluateItemReplacement(build, candidate)
```

Candidate:

```text
slot
rawItemText
optional id/label
```

No search, synthesis, pricing, or recommendation.

---

## 24. Slot mapping

Use deterministic Buddy canonical slot → PoB2 slot mapping.

Unknown/unsupported slot:

```text
item-slot-unsupported
```

Do not guess.

Document the slots supported in this version.

---

## 25. Item input

Prefer the PoB-compatible raw text already preserved by Buddy.

Validate:

```text
non-empty
size limit
supported slot
worker parser accepts item
```

Treat item text as untrusted input.

Do not interpret item quality in TypeScript.

---

## 26. Item baseline identity

Before replacement, record where available:

```text
slot
baseline item id
baseline item raw-text checksum
```

Do not log the full raw item text by default.

---

## 27. Item mutation flow

```text
load original build
calculate baseline
record original slot item
parse/add candidate item
equip candidate
recalculate
capture candidate metrics
restore original item
recalculate
verify restore
```

Any failure returns a structured error.

---

## 28. Item restore verification

Require:

```text
restored metric map
==
baseline metric map
```

where the calculator is deterministic.

Also verify the original slot item identity is restored when the runtime exposes it.

Failure:

```text
restore-failed
```

and discard the worker.

---

## 29. Item delta result

Conceptually:

```text
ItemDeltaResult {
  slot
  baselineItemIdentity
  candidateItemIdentity
  selectedSkill
  metrics[]
  restoreVerified
  provenance
  warnings
}
```

No:

```text
item score
upgrade score
price
recommendation
```

---

## 30. Item error model

Add/clarify errors such as:

```text
item-invalid
item-slot-unsupported
item-replacement-failed
```

Exact names may differ, but causes must remain structured.

---

## 31. Item metric semantics

Reuse the exact same:

```text
metric catalog
absolute delta rules
percent policy
chance/resistance point rules
```

as passive evaluation.

Do not create gear-specific hidden weights.

---

## 32. Real item integration test

Reuse fixture F or another stored non-private geared fixture.

Example:

```text
Helmet baseline
→ explicit rare Wrapped Greathelm
```

Verify known movements in:

```text
Life
Armour
TotalEHP
```

and verify restore.

The exact values should be pinned only to the same runtime fingerprint/version.

---

## 33. Item regression provenance

The real integration result/test should include:

```text
runtime fingerprint
PoB2 version
tree key
build checksum
slot
candidate raw-item checksum
restore verified
```

---

## 34. Default-test item mocks

Default `npm test` should cover:

```text
valid item response
malformed item
unsupported slot
replacement failure
restore mismatch
runtime integrity mismatch
```

with fake workers only.

---

## 35. Public UI scope

An item-delta UI is not required here.

The API/server boundary plus integration tests are enough.

If a debug UI is added, it must not say:

```text
best
upgrade
buy
replace first
```

---

## 36. Passive UI regression

The existing passive delta UI must continue to work.

It should display or retain server-verified candidate identity/point cost where useful.

Heuristic ranking must remain unchanged.

---

## 37. Adapter/protocol versioning

Because candidate identity, runtime provenance, and item requests change the calculator contract, increment:

```text
CALCULATOR_ADAPTER_VERSION
```

Recommended:

```text
1 → 2
```

If an explicit protocol version exists, increment it too.

Reject host/worker protocol version mismatches explicitly.

---

## 38. Structured error inventory

Conceptually include:

```text
runtime-unavailable
runtime-integrity-mismatch
version-incompatible
build-load-failed
skill-unresolved
candidate-invalid
candidate-allocation-mismatch
passive-node-unknown
item-invalid
item-slot-unsupported
item-replacement-failed
calculation-failed
restore-failed
timeout
worker-crashed
protocol-invalid
```

---

## 39. Security/privacy

Preserve:

```text
isolated runtime copy
minimal child environment
no app secrets
no raw XML logging
no raw item logging by default
known updater disabled
```

Ensure request fields cannot control arbitrary filesystem paths.

Do not describe the process as an OS-level sandbox unless one exists.

---

## 40. Performance

Measure incremental cost for:

```text
runtime fingerprint verification
one item replacement
```

Fingerprint verification should occur at worker start, not per candidate.

Do not increase batch sizes in this step.

---

## 41. Licensing boundary

Do not change redistribution strategy.

Runtime remains:

```text
prepared locally from an installed PoB2 copy
not committed to Buddy
```

STEP-018B.1 does not resolve redistribution licensing.

STEP-018C must not assume Buddy can ship PoB2 assets.

---

## 42. CharacterContext boundary

Do not feed runtime skill tags back into CharacterContext in this step.

No context version change.

---

## 43. Gear-engine boundary

Item delta consumes explicit raw item text only.

Do not change:

```text
gear normalization
modifier semantics
locality rules
gear readiness
```

No gear normalization version bump unless those semantics actually change.

---

## 44. Passive-engine boundary

Buddy remains authoritative for:

```text
path generation
path legality
point cost
```

PoB2 evaluates the verified candidate.

Do not let PoB2 become the candidate generator.

---

## 45. Required tests — passive fidelity

Add tests for:

- exact expected/actual allocation equality;
- unexpected extra node;
- missing requested node;
- stale already-allocated node;
- server point-cost mismatch;
- restore after candidate mismatch;
- worker discard after restore failure.

---

## 46. Required tests — runtime integrity

Add tests for:

- stable fingerprint on unchanged runtime;
- changed Lua module changes fingerprint;
- changed TreeData/game-data file changes fingerprint;
- changed excluded log/temp file does not change fingerprint;
- manifest fingerprint mismatch fails closed;
- fingerprint included in successful provenance.

---

## 47. Required tests — item delta

Add tests for:

- valid replacement;
- malformed item;
- unsupported slot;
- worker parser rejection;
- metric delta;
- restore success;
- restore mismatch;
- same percent policy as passive delta;
- no item score/ranking field.

---

## 48. Required real-runtime tests

Extend:

```text
npm run test:pob2-calculator
```

to cover:

```text
fixture B
passive exact-set verification

fixture F
explicit helmet replacement
metric changes
restore

runtime fingerprint
present/stable
```

Keep these opt-in.

---

## 49. Repository checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm run test:pob2-calculator
```

Run `npm audit` if dependency files change.

---

## 50. Documentation

Create:

```text
docs/progress/STEP-018B-1-delta-fidelity-and-item-candidate-readiness.md
```

Include:

```text
Why STEP-018B Needed Closure
Passive Candidate Identity
Baseline Allocation Snapshot
Exact Allocation Verification
Auto-Path Mismatch Policy
Server Point-Cost Verification
Runtime Fingerprint Design
Fingerprint Include/Exclude Rules
Runtime Integrity Gate
Network Policy Correction
Item Replacement API
Item Slot Mapping
Item Mutation Flow
Item Restore Verification
Item Delta Metrics
Real PoB2 Item Regression
Calculator Adapter Version
Protocol Version
Security / Privacy
Passive UI Regression
Performance Impact
Remaining Runtime Risks
STEP-018C Readiness
```

---

## 51. Decision log

Update `docs/planning/DECISION_LOG.md` for durable decisions including:

```text
exact requested/applied passive-set equality
runtime content fingerprint policy
network-policy wording
explicit item replacement as delta primitive
no item generation/ranking in calculator
adapter/protocol version change
```

---

## 52. Non-goals

Do not implement:

- item search;
- rare-item generation;
- target-item synthesis;
- market matching;
- budget ranking;
- poe.ninja usage;
- trade search;
- crafting;
- passive reranking;
- weighted offense/defense score;
- AI explanations.

---

## 53. Expected passive result

```text
Requested candidate:
[4739]

Verified point cost:
1

Actually newly allocated:
[4739]

Allocation identity:
verified

Total DPS:
4.4583 → 4.9042
+10.0%

Restore:
verified

Runtime fingerprint:
sha256:...
```

If PoB2 instead allocates:

```text
[4739, 18845]
```

return:

```text
candidate-allocation-mismatch
```

and no successful delta.

---

## 54. Expected item result

```text
Item replacement:
Helmet

Baseline:
<current helmet>

Candidate:
<Test Greathelm>

Life:
382 → 464
+82

Armour:
194 → 144
-50

Total EHP:
331.5453 → 396.6382
+65.0929

Restore:
verified

Runtime fingerprint:
sha256:...
```

No recommendation or price is attached.

---

## 55. STEP-018C gate

STEP-018C may begin only after STEP-018B.1 confirms:

```text
passive candidate identity is exact
runtime integrity is pinned
explicit item replacement can be measured
restore is trustworthy
provenance includes runtime identity
```

At that point the system has the primitive required for budget-aware gear work:

```text
explicit item candidate
→ actual whole-build delta
```

STEP-018C can then focus on candidate sourcing, cost estimation, and opportunity cost without reopening calculator correctness.

---

## 56. Stop condition

After passive exactness, runtime fingerprinting, item-replacement support, real-worker regressions, and documentation are complete:

**STOP.**

Do not automatically start STEP-018C.

Wait for explicit review and approval.
