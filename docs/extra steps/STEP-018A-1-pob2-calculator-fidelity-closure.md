# STEP-018A.1 — PoB2 calculator fidelity closure

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 5 / STEP-018A.1  
**Authoring context:** Cursor-assisted development

## 1. Objective

Close the remaining validation gaps from STEP-018A before freezing the PoB2 calculation-engine spike and allowing STEP-018B to depend on it.

STEP-018A already proved the important architecture:

```text
build loading
baseline calculation
skill/effect metadata
passive mutation
item mutation
skill-level mutation
weapon-set allocation mode
deterministic recalculation
state restore
performance characteristics
worker-isolation requirements
```

STEP-018A.1 must **not** redo that work.

It must close only these remaining fidelity gaps:

```text
1. visible PoB2 UI cross-validation
2. support add/remove mutation proof or explicit downgrade
3. configuration effect proof or explicit downgrade
4. notable node-id mapping proof
5. weapon-set specialization node-id mapping proof
6. document production-safe invocation requirement
```

---

## 2. Core rule

This step is a **validation closure**, not a new feature step.

Do not expand into:

```text
production calculator service
character-aware ranking
gear upgrade scoring
economy integration
crafting
```

The goal is to make the STEP-018A capability matrix precise enough to trust.

---

## 3. Acceptance criteria

- [ ] At least one baseline calculated build is compared against the visible PoB2 UI.
- [ ] Exact compared fields are recorded.
- [ ] At least one passive mutation is reproduced manually in the PoB2 UI and compared.
- [ ] At least one item mutation is reproduced manually in the PoB2 UI and compared, if practical.
- [ ] Support mutation is either demonstrated or explicitly downgraded to not-proven.
- [ ] Configuration application is either demonstrated with a metric-changing input or explicitly downgraded.
- [ ] One notable passive node id is verified between Buddy and PoB2.
- [ ] One real weapon-set specialization node id is verified between Buddy and PoB2.
- [ ] Node-id mapping table is updated.
- [ ] Capability matrix is corrected so no capability is overstated.
- [ ] Production-safe invocation requirement is documented.
- [ ] Existing production behavior remains unchanged.
- [ ] Existing tests still pass.
- [ ] Create:
      `docs/progress/STEP-018A-1-pob2-calculator-fidelity-closure.md`

---

## 4. Scope

STEP-018A.1 may:

```text
run PoB2 manually
reuse the existing spike
extend spike-only scripts
add research-only fixtures if needed
compare UI values
perform one support mutation
perform one configuration mutation
inspect passive ids
update spike documentation
update D-079 if conclusions materially change
```

STEP-018A.1 must not:

```text
integrate PoB2 into production runtime
change passive ranking
change gear analysis
change character context
change PoB2 import
add upgrade ranking
add economy use
```

---

## 5. Baseline UI cross-validation

Choose at least one existing real fixture with a resolved skill.

Preferred:

```text
fixture B
Fireball
```

Open the same build in the visible PoB2 UI and compare the spike output against PoB2's displayed calculation values.

At minimum compare several fields such as:

```text
main active skill/effect
Life
Energy Shield
Average Hit or Average Damage
Total DPS
Crit Chance
Cast Rate / Speed
one resistance
```

Use only fields clearly exposed in both places.

Record:

```text
spike value
UI value
difference
rounding explanation if any
```

---

## 6. Do not fake UI equivalence

Calling the same internal functions is strong evidence, but this step specifically requires an independent visual/manual check.

Do not write:

```text
same code path therefore validated
```

as a substitute.

Actually compare values shown by PoB2.

---

## 7. Passive mutation UI validation

Use a known passive mutation from STEP-018A.

Preferred:

```text
node 4739
Spell Damage
```

Procedure:

```text
load baseline
record UI metrics
allocate the node manually in PoB2
record UI metrics
compare against spike baseline/candidate
```

At minimum compare:

```text
Average Damage / Average Hit
Total DPS
```

If another metric moves, record it too.

---

## 8. Passive restore check

After removing/reverting the node manually:

```text
UI values
→ baseline
```

Record whether they return to baseline.

This is additional confidence that the spike mutation mirrors PoB2 behavior.

---

## 9. Item mutation UI validation

Use the same or an equivalent helmet swap from STEP-018A.

Preferred:

```text
fixture F
baseline helmet
→ test Wrapped Greathelm with +maximum Life
```

Compare:

```text
Life
Armour
TotalEHP
```

between:

```text
spike
and
PoB2 UI
```

If manual item recreation is too error-prone or unsafe:

```text
document exact blocker
```

and mark item UI cross-validation as:

```text
not completed
```

Do not claim it as done.

---

## 10. Support mutation fidelity

STEP-018A proved:

```text
skill level mutation
```

but not:

```text
support add/remove mutation
```

These must be separated.

Preferred proof:

```text
load a fixture with one support
record baseline
disable/remove support
recalculate
restore support
recalculate
```

Record:

```text
support identity
mutation method
affected metrics
restore behavior
```

---

## 11. If support mutation is not completed

Update the capability matrix to:

```text
skill mutation
→ proven

support mutation
→ feasible-but-not-prototyped
```

or:

```text
support mutation
→ unknown
```

depending on the evidence.

Do not leave the combined capability labelled proven.

---

## 12. Configuration-effect proof

STEP-018A proved that configuration values load.

It did not prove that a changed config value affects calculations.

Find one deterministic PoB2 config input that should visibly change an output.

Examples may include a condition that clearly changes a supported build metric.

Use only a configuration key whose meaning is already understood from PoB2 source/runtime.

Procedure:

```text
baseline config
→ calculate
toggle/change one input
→ calculate
restore
→ calculate
```

Record the affected metric.

---

## 13. If no safe config-effect case is found

Do not force it.

Update capability wording to:

```text
configuration loading
→ proven

configuration effect/application
→ not demonstrated
```

This is acceptable.

Accuracy of the capability matrix is more important than checking every box.

---

## 14. Configuration restore check

If a config-effect case is demonstrated:

```text
restore config
→ baseline metrics
```

must match.

This should be documented in the same style as passive/item restore.

---

## 15. Notable node-id mapping

STEP-018A verified:

```text
class start
normal passive
ascendancy start
```

but not a notable.

Choose one notable present in the current pinned tree.

Verify:

```text
Buddy node id
PoB2 node id
name
node type
```

Expected:

```text
same numeric id
```

If different:

```text
record transformation/mismatch
```

---

## 16. Weapon-set specialization node-id mapping

Use a real weapon-set specialization node from an existing PoB2 fixture where possible.

Preferred source:

```text
fixture D
```

Verify one actual weapon-set-specific passive id in:

```text
Buddy normalized build
PoB2 runtime/tree
```

Record:

```text
id
name
node type
allocMode / weapon-set mode if applicable
```

This is different from merely allocating a shared node with `allocMode = 1`.

---

## 17. Node-id mapping matrix

Update the research table to include at least:

```text
class start
normal passive
notable
weapon-set specialization node
ascendancy start
```

Prefer one additional ordinary notable if easy.

Do not claim universal mapping from only five examples.

Correct wording should be:

```text
no transformation observed in sampled node classes
```

not:

```text
all ids always map directly
```

---

## 18. Capability matrix correction

Split ambiguous combined rows.

Recommended rows:

```text
Build loading
Baseline calculation
Metric extraction
Skill/effect metadata
Passive mutation
Weapon-set mutation
Item mutation
Skill-level mutation
Support mutation
Configuration loading
Configuration effect/application
Determinism
Reset/isolation
UI baseline cross-validation
UI passive-delta cross-validation
UI item-delta cross-validation
Node-id mapping
Server deployment
Licensing/redistribution
```

Use only these statuses:

```text
proven
feasible-but-not-prototyped
blocked
not-supported
unknown
```

---

## 19. Evidence standard

Use:

```text
proven
```

only when the capability was actually executed or directly verified.

Do not use `proven` for:

```text
source code suggests it should work
```

That belongs under:

```text
feasible-but-not-prototyped
```

---

## 20. Production-safe invocation requirement

STEP-018A used a temporary hook in:

```text
Modules/Build.lua
```

inside the user's installed PoB2 copy.

That is acceptable for research.

It is **not** acceptable as the future production request path.

Document this explicitly.

Future STEP-018B must not mutate the user's live PoB2 installation per request.

---

## 21. Preferred future runtime isolation

Document the required direction:

```text
isolated pinned PoB2 worker/runtime copy
```

or equivalent.

Properties:

```text
separate from user's normal PoB2 install
version pinned
auto-update disabled
one build per worker
worker queue
sandboxed filesystem/network
process recycled after bounded use
```

Do not build this runtime yet.

---

## 22. Memory-growth requirement

Carry forward the STEP-018A finding:

```text
Lua heap grows across build reloads
```

The future worker design must therefore have a reset/recycle policy.

STEP-018A.1 does not need to solve it.

It must preserve it as an explicit STEP-018B condition.

---

## 23. Update-check requirement

Carry forward:

```text
PoB2 startup can check for updates
```

Future worker requirement:

```text
auto-update disabled
```

Do not rely on external network availability.

---

## 24. Version compatibility requirement

Preserve the current rule:

```text
PoB2 tree namespace
!=
GGG tree version namespace
```

Future calculator execution must use an explicit compatibility mapping.

Do not compare version strings directly.

---

## 25. Fail-closed behavior

Document for STEP-018B:

```text
if calculator version/tree mapping is unknown
→ do not evaluate candidate
```

Return an incompatibility result rather than silently calculating against mismatched data.

---

## 26. Skill metadata result

Preserve the important STEP-018A result:

```text
PoB2 runtime mainSkill
→ trusted future source for skill/effect metadata
```

No production CharacterContext wiring is required in this closure step.

Do not expand scope.

---

## 27. No production schema changes

Do not add new required production schemas.

Research reports may be extended.

The web app must continue to start and operate without PoB2 installed.

---

## 28. Existing production regression

Verify:

```text
passive heuristic unchanged
gear normalization unchanged
character context unchanged
PoB2 import unchanged
```

No spike dependency may be introduced into normal app startup.

---

## 29. Required repository checks

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Canonical `npm test` must pass.

The normal test suite must not:

```text
launch PoB2
require PoB2 executable
use network
require GGG credentials
require AI
```

---

## 30. Spike validation commands

Document separately any manual commands used for:

```text
launching spike
opening fixture
running mutation
producing report
```

Do not put those into normal `npm test`.

---

## 31. Documentation

Create:

```text
docs/progress/STEP-018A-1-pob2-calculator-fidelity-closure.md
```

Follow the normal progress-document protocol.

Also include:

```text
Reason for Closure Step
Baseline UI Cross-Validation
Passive UI Cross-Validation
Item UI Cross-Validation
Skill Mutation Status
Support Mutation Status
Configuration Loading Status
Configuration Effect Status
Notable Node-ID Mapping
Weapon-Set Node-ID Mapping
Updated Node-ID Matrix
Updated Capability Matrix
Production Invocation Constraint
Worker Isolation Requirement
Memory-Recycle Requirement
Auto-Update Requirement
Version Compatibility Requirement
Regression Results
Remaining Blockers
Final STEP-018A Status
STEP-018B Readiness
```

---

## 32. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only if conclusions materially change D-079.

Potential durable additions:

```text
live PoB2 install must not be modified in production
runtime worker must be isolated/pinned
support mutation status
configuration-effect status
node-id mapping evidence scope
```

Do not add a new decision just to restate existing facts.

---

## 33. Final status rule

STEP-018A.1 should conclude with one of:

```text
STEP-018A FULLY VALIDATED
```

or:

```text
STEP-018A STILL CONDITIONAL
```

If conditional, list exactly which remaining blocker prevents STEP-018B.

Do not use vague wording.

---

## 34. STEP-018B gate

STEP-018B may proceed only if the closure confirms that the minimum evaluator capabilities are trustworthy:

```text
build loading
baseline calculation
metric extraction
passive mutation
restore/isolation
version mapping strategy
worker isolation strategy
```

Support mutation and configuration effect do **not** have to be proven to start 018B if they are explicitly marked unsupported/not-proven and excluded from 018B scope.

---

## 35. Non-goals

Do not implement:

- production PoB2 worker;
- production socket/service protocol;
- production candidate loop;
- production passive reranking;
- item upgrade ranking;
- support optimization;
- configuration optimization;
- economy-aware ranking;
- crafting;
- AI analysis.

---

## 36. Expected successful outcome

A successful closure report should look conceptually like:

```text
UI baseline comparison
PASS

Passive delta UI comparison
PASS

Item delta UI comparison
PASS / explicitly not completed

Skill mutation
PROVEN

Support mutation
PROVEN
or
FEASIBLE-BUT-NOT-PROTOTYPED

Configuration loading
PROVEN

Configuration effect
PROVEN
or
NOT DEMONSTRATED

Notable id mapping
PROVEN

Weapon-set specialization id mapping
PROVEN

Capability matrix
corrected

Production hook strategy
research-only
not allowed for production

Final STEP-018A status
FULLY VALIDATED
```

---

## 37. Stop condition

After the UI comparisons, capability corrections, node-id checks, repository regressions, and documentation are complete:

**STOP.**

Do not automatically start:

```text
STEP-018B
Character-aware delta evaluator
```

Wait for explicit review and approval.
