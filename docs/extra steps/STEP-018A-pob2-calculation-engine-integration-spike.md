# STEP-018A — PoB2 calculation-engine integration spike

**Date:** 2026-09-27  
**Status:** PLANNED / RESEARCH SPIKE  
**Roadmap reference:** Phase 5 / STEP-018A  
**Authoring context:** Cursor-assisted development

## 1. Objective

Determine whether Path of Building for Path of Exile 2 can be integrated as a deterministic whole-build calculation engine for PoE2 Buddy.

This step is a **feasibility and architecture spike**.

It must answer, with evidence:

```text
Can we load a real PoB2 build programmatically?
Can we run the same calculations PoB2 uses?
Can we extract resolved skill/effect metadata?
Can we read baseline offensive and defensive outputs?
Can we apply controlled candidate changes?
Can we recalculate after those changes?
Can we compare before/after results deterministically?
How fast is that process?
How should it be deployed?
What licensing/redistribution constraints exist?
How do PoB2 versions map to our pinned game-data versions?
```

This step must **not** yet become the production recommendation engine.

Do not implement STEP-018B character-aware delta ranking.

Do not implement STEP-018C budget-aware upgrade prioritization.

---

## 2. Why this step exists

PoE2 Buddy now has three deterministic layers:

```text
passive-tree semantics
gear semantics
character-context relevance
```

Those layers deliberately avoid pretending that:

```text
relevant stat
=
exactly valuable stat
```

The next missing capability is whole-build measurement.

The desired future flow is:

```text
current build
    ↓
baseline PoB2 calculation
    ↓
candidate passive/item change
    ↓
recalculate
    ↓
measure actual build delta
```

STEP-018A determines whether PoB2 can safely provide that calculation layer.

---

## 3. Core rule

This is a research spike.

A valid result is:

```text
integration feasible
```

or:

```text
integration feasible only with constraints
```

or:

```text
integration not practical for MVP
```

Do not force a positive result.

Do not choose an architecture before the evidence supports it.

---

## 4. Acceptance criteria

- [ ] Current PoB2 calculation architecture is documented.
- [ ] Exact PoB2 version/commit inspected is recorded.
- [ ] The build-load path is identified.
- [ ] The calculation entry points are identified.
- [ ] Baseline output extraction is demonstrated.
- [ ] Primary-skill/effect metadata extraction is investigated.
- [ ] Passive-node mutation is investigated.
- [ ] Equipment mutation is investigated.
- [ ] Skill/support mutation is investigated at least conceptually.
- [ ] Recalculation after mutation is demonstrated for at least one safe case, if feasible.
- [ ] Before/after deterministic delta output is demonstrated, if feasible.
- [ ] Weapon-set handling is investigated.
- [ ] Ascendancy handling is investigated.
- [ ] Configuration handling is investigated.
- [ ] Performance is measured on representative operations.
- [ ] Concurrency/process-isolation implications are documented.
- [ ] Deployment options are compared.
- [ ] Licensing/redistribution implications are documented.
- [ ] Version compatibility/mapping strategy is documented.
- [ ] Security boundaries are documented.
- [ ] No production recommendation behavior is changed.
- [ ] Existing passive scoring remains unchanged.
- [ ] Existing gear/context layers remain unchanged.
- [ ] Default repository tests remain offline and deterministic.
- [ ] Create:
      `docs/progress/STEP-018A-pob2-calculation-engine-integration-spike.md`

---

## 5. Scope

STEP-018A may:

```text
inspect PoB2 source
run PoB2 locally
create development-only scripts
prototype calculator invocation
prototype build loading
prototype calculation output extraction
prototype passive/item mutation
benchmark candidate recalculation
compare architecture options
create research fixtures
document licensing/deployment constraints
```

STEP-018A must not:

```text
replace current passive scoring
rerank production recommendations
score production gear
recommend upgrades
perform economy-aware ranking
ship a new production service automatically
commit to WASM/LuaJIT/service architecture without review
```

---

## 6. Research target

Use the current supported PoB2 version already used by the project's real export fixtures.

Record:

```text
PoB2 version
commit/tag
source files inspected
local executable version if used
operating system
Lua runtime / embedded runtime details
```

If the installed version differs from the repository tag:

```text
record both
do not silently mix them
```

---

## 7. PoB2 build-load path

Identify exactly how PoB2 loads a build from:

```text
XML
build code
saved build
```

Document the relevant functions/modules.

The spike should determine whether a prototype can:

```text
take one of our stored real PoB2 export fixtures
decode/load it
instantiate PoB2's own build state
```

without requiring UI clicks.

---

## 8. Calculator entry point

Identify the actual calculation flow responsible for producing build outputs.

Document:

```text
main calculation entry point
supporting modules
required initialization
required data tables
build-state dependencies
skill selection dependencies
configuration dependencies
```

Do not reimplement those formulas in TypeScript.

The purpose is to discover whether the real PoB2 engine can be invoked directly.

---

## 9. Baseline calculation proof

Using a stored test build, demonstrate whether the prototype can obtain baseline calculated outputs.

At minimum investigate:

```text
main skill name/effect
damage-related output
critical strike chance
attack/cast rate where applicable
life
energy shield
evasion
armour
deflection where available
resistances
other clearly available defensive totals
```

Do not require every metric to exist.

Document exactly which values are available and from which PoB2 structures.

---

## 10. Metric taxonomy

Do not hard-code one ambiguous field called:

```text
DPS
```

PoB2 may expose different metrics depending on the skill.

Record metric identity explicitly.

Examples conceptually:

```text
average hit
total DPS
combined DPS
attack rate
cast rate
crit chance
ailment DPS
trigger rate
effective hit pool
maximum hit
life
energy shield
evasion
```

Only record metrics actually found in PoB2.

---

## 11. Skill/effect metadata investigation

This is a major goal.

STEP-018 showed that current production imports do not yet have checked mechanic tags for real skills.

Investigate whether PoB2's runtime can expose, for the selected active skill/effect:

```text
skill id
effect id
display name
source gem
active/support role
skill tags
damage types
attack/spell
projectile
melee
area
duration
minion
totem
triggered
other available flags
```

Document:

```text
which fields are available
where they come from
whether they are reliable after build load
```

This may become the preferred future source for character-context enrichment.

Do not wire it into production context yet.

---

## 12. Primary active effect fidelity

Validate at least one non-trivial display-skill case.

Prefer the existing Shockwave Totem / Shockwave Slam-style fixture or equivalent.

Prove that the runtime-selected calculation target corresponds to PoB2's actual selected display skill/effect.

Do not assume:

```text
raw gem
=
active effect
```

---

## 13. Passive mutation prototype

Investigate whether a prototype can:

```text
load baseline build
add one legal passive node
recalculate
remove/revert that node
recalculate
```

At minimum record:

```text
how allocation is represented
which function mutates it
whether path legality is PoB2's concern or ours
what recalculation must be triggered
```

The existing PoE2 Buddy passive engine remains responsible for generating legal candidate paths.

PoB2 should be investigated primarily as the evaluator.

---

## 14. Multi-node passive mutation

If single-node mutation works, test one multi-node path.

Conceptually:

```text
baseline
→ add candidate path nodes
→ recalculate
→ extract metrics
→ restore baseline
```

Verify no state leaks between runs.

---

## 15. Weapon-set passive handling

Investigate how PoB2 stores and calculates:

```text
shared passive nodes
weapon-set 1
weapon-set 2
weapon-set 3
```

Determine whether:

```text
candidate passive mutation
```

must specify an active weapon set or specialization context.

Do not simplify away weapon-set semantics.

---

## 16. Ascendancy handling

Confirm how ascendancy nodes participate in calculations.

The current Buddy optimizer keeps ascendancy allocations separate from main-tree allocations.

Determine whether a PoB2 calculation instance automatically includes:

```text
class
ascendancy
ascendancy node allocation
```

when loaded from the build.

Document the result.

---

## 17. Equipment mutation prototype

Investigate whether the engine can safely replace an equipped item in memory.

At minimum attempt:

```text
baseline item
→ replace with test item
→ recalculate
→ extract metrics
→ restore original
```

Use a locally-created test item.

Do not connect trade/economy data.

---

## 18. Raw item text compatibility

Determine whether PoB2 can ingest the raw item representation already preserved by PoE2 Buddy.

Ideal future flow:

```text
NormalizedItem.rawText
→ PoB2 item parser/runtime
→ equipped candidate
```

Document:

```text
required item format
required slot
required item id/index
limitations
```

---

## 19. Skill/support mutation investigation

Investigate how skill groups can be modified programmatically.

Questions:

```text
Can a support be added/removed?
Can gem level/quality be changed?
Can mainActiveSkill be changed?
Can a skill group be enabled/disabled?
What recalculation must follow?
```

A proof-of-concept is useful but not required if passive/item mutation already proves the calculation interface.

Document what is feasible.

---

## 20. Configuration handling

Investigate how loaded configuration affects calculations.

Confirm how PoB2 applies:

```text
ConfigSet
Input
activeConfigSet
condition flags
custom modifiers
```

Important:

```text
current Buddy stores configuration
but does not interpret it
```

Determine whether the PoB2 runtime can apply it directly during calculation.

This is preferred over reimplementing configuration semantics.

---

## 21. Baseline snapshot result

Define a prototype result object for research only.

Conceptually:

```text
Pob2CalculationSnapshot {
  pobVersion
  buildChecksum
  activeSkill
  metrics
  warnings
}
```

Do not finalize public production schemas yet.

The prototype shape may evolve during the spike.

---

## 22. Delta prototype

If mutation is feasible, define a research-only delta output.

Conceptually:

```text
Pob2CalculationDelta {
  baseline
  candidate
  changes:
    metric
    before
    after
    absoluteDelta
    percentDelta?
}
```

Only compute percentage delta where mathematically meaningful and safe.

Do not combine different metrics into one score.

---

## 23. No composite score

STEP-018A must not produce:

```text
overall upgrade score
```

or:

```text
DPS + EHP weighted total
```

A future layer may decide how to compare tradeoffs.

This spike should expose raw calculated metric deltas.

---

## 24. Determinism test

Run the same baseline calculation multiple times.

Verify:

```text
same build
same PoB2 version
same configuration
→ same outputs
```

If results vary:

```text
identify why
```

Do not hide non-determinism.

---

## 25. Mutation isolation test

Run:

```text
baseline
candidate A
restore
candidate B
restore
baseline again
```

Verify the final baseline matches the first baseline.

This is critical before any future candidate-loop evaluation.

---

## 26. Performance benchmark

Measure at least:

```text
cold startup
build load
first calculation
single passive mutation + recalc
multi-node mutation + recalc
item replacement + recalc if supported
reset/restore
```

Record:

```text
median
rough min/max
number of trials
hardware/environment
```

Do not over-engineer benchmarking.

We need enough data to choose architecture.

---

## 27. Candidate-scale estimate

Using measured performance, estimate feasibility for:

```text
10 candidates
50 candidates
100 candidates
500 candidates
```

Do not extrapolate blindly if runtime behavior is nonlinear.

State assumptions.

This directly informs whether the future approach should be:

```text
evaluate every candidate
```

or:

```text
heuristic shortlist
→ PoB2 rerank top N
```

---

## 28. Preferred future evaluation pattern

Investigate the likely architecture:

```text
PoE2 Buddy passive engine
    ↓
enumerate many legal candidates
    ↓
existing fast heuristic
    ↓
shortlist top N
    ↓
PoB2 exact evaluator
    ↓
character-aware result
```

Do not implement production reranking yet.

The spike should determine whether this pattern is practical.

---

## 29. Runtime architecture options

Compare at minimum:

```text
A. Spawn PoB2/Lua process per calculation
B. Long-lived local/server-side LuaJIT worker
C. Long-lived sidecar calculation service
D. Embedded Lua runtime
E. WASM-based runtime if technically feasible
F. Other justified architecture discovered during research
```

Do not assume all are feasible.

---

## 30. Architecture comparison criteria

For each viable option compare:

```text
implementation complexity
startup cost
calculation latency
memory usage
concurrency
process isolation
crash containment
deployment compatibility
platform support
licensing implications
upgrade/versioning complexity
security
observability
```

End with:

```text
recommended prototype direction
```

not a forced permanent architecture.

---

## 31. Server deployment constraints

Investigate whether the current Next.js deployment model can realistically host the required runtime.

Questions:

```text
Does it require native LuaJIT?
Does it require a writable filesystem?
Does it require many PoB data files?
Does it work in serverless environments?
Does it require a persistent process?
Does it require Windows-specific behavior?
Can it run on Linux?
```

Document explicitly.

---

## 32. Local-desktop possibility

Because PoB2 is normally a desktop application, briefly assess whether a future desktop/local companion architecture would materially simplify integration.

Do not implement one.

Only record whether:

```text
local engine
```

is materially easier or safer than:

```text
server-hosted engine
```

---

## 33. Licensing review

Inspect the PoB2 repository's current license and relevant notices.

Document:

```text
license
redistribution implications
modification obligations
source-code obligations if any
attribution requirements
whether bundling PoB2 data/runtime is permitted
whether a separate service changes obligations
```

Do not make unsupported legal conclusions.

If interpretation is uncertain:

```text
flag for legal review
```

---

## 34. Third-party data/license inventory

Identify any major bundled datasets/runtime components required by the calculation engine.

For each, record:

```text
source
license/notices if available
whether redistribution is needed
```

Do not copy assets into the production repository during this spike unless necessary and permitted.

---

## 35. Version compatibility

PoE2 Buddy currently has its own pinned official GGG tree snapshot and PoB2 build provenance.

Investigate how PoB2 identifies:

```text
game version
tree version
data version
```

Define a future compatibility rule that does not fake equivalence between unrelated version namespaces.

---

## 36. Node-id mapping

Verify whether passive node ids used by our pinned GGG tree map directly to the ids PoB2 uses internally for the same version.

Test:

```text
class start
normal passive
notable
weapon-set node
ascendancy node
```

Record any transformations.

This is critical for future passive candidate evaluation.

---

## 37. Unsupported version behavior

Decide what future behavior should be when:

```text
Buddy tree pin
and
PoB2 calculation data
```

refer to incompatible game versions.

Preferred direction:

```text
fail closed / mark calculation incompatible
```

rather than silently evaluating a candidate on mismatched data.

Do not implement production gating yet; document it.

---

## 38. Error model

Document expected prototype failures such as:

```text
build failed to load
skill cannot calculate
missing game data
unknown passive id
invalid item
unsupported configuration
engine crash
timeout
```

Future integration should return structured errors rather than raw Lua stack traces.

---

## 39. Timeout and cancellation

Determine whether a calculation can hang or become extremely expensive.

Prototype a timeout boundary if practical.

Document future requirements for:

```text
calculation timeout
worker reset
process kill
request cancellation
```

---

## 40. Concurrency

Investigate whether one PoB2 runtime/build object can safely evaluate multiple requests concurrently.

Assume:

```text
no
```

until proven otherwise.

Document whether future architecture needs:

```text
one build per worker
worker pool
request queue
process isolation
```

---

## 41. State contamination

Specifically test or inspect global/module state.

PoB code may rely on mutable global/runtime state.

Determine whether:

```text
two builds in one process
```

can interfere with each other.

This is a critical production architecture concern.

---

## 42. Caching opportunities

Document safe future cache keys such as:

```text
PoB2 version
build checksum
configuration checksum
candidate mutation id
```

Do not implement production caching in this step.

---

## 43. Security boundary

Treat imported PoB2 builds and item text as untrusted input.

Investigate whether PoB2 loading/calculation can execute arbitrary code or unsafe expressions from build contents.

Document:

```text
XML handling
custom mods
configuration strings
Lua expression/evaluation risks
filesystem access
process access
network access
```

If sandboxing is required:

```text
say so explicitly
```

---

## 44. No network requirement for calculations

Determine whether PoB2 calculations can run entirely from pinned/local data.

Preferred future requirement:

```text
calculation runtime
→ no live network dependency
```

If PoB2 tries to update/download data at startup:

```text
document how to disable or isolate it
```

---

## 45. Prototype location

Keep spike code clearly isolated.

Suggested locations:

```text
spikes/pob2-calculator/
scripts/spikes/pob2-calculator/
packages/pob2-calculator-spike/
```

Do not expose unstable prototype APIs as production public package APIs.

---

## 46. Production code boundary

Existing production behavior must remain unchanged.

Hard regression rules:

```text
passive heuristic unchanged
gear analysis unchanged
character context unchanged
PoB2 import unchanged
no new required runtime dependency for normal app startup
```

The app must continue to work if the spike runtime is absent.

---

## 47. Test fixture selection

Use local, non-private test builds.

Prefer existing real fixtures where possible.

At minimum use:

```text
one simple skill build
one non-trivial active-effect build
one geared build
one build with configuration
```

Do not use private account exports.

---

## 48. Validation against PoB2 UI

For at least one baseline build:

```text
calculate via spike
open same build in PoB2 UI
compare selected outputs
```

Record exact fields compared.

Allow tiny formatting/rounding differences only where justified.

Do not claim exact equivalence without checking.

---

## 49. Passive delta validation

If passive mutation works:

```text
baseline
→ add one known passive
→ spike calculation
```

Then make the same change in PoB2 UI and compare selected outputs.

This is the strongest proof that the spike is using the real calculation semantics correctly.

---

## 50. Item delta validation

If equipment mutation works:

```text
baseline item
→ replacement item
→ spike calculation
```

Compare the same item swap in PoB2 UI.

If this cannot be completed safely during the spike:

```text
document why
```

rather than faking it.

---

## 51. Skill metadata validation

For at least one resolved skill, compare runtime metadata against PoB2 UI/source.

Confirm whether the runtime can provide enough trusted information to improve STEP-018 context.

Specifically investigate:

```text
projectile
attack/spell
damage type
skill/effect id
source gem
support relationships
```

---

## 52. Research result categories

The completion report must assign each capability one status:

```text
proven
feasible-but-not-prototyped
blocked
not-supported
unknown
```

Capabilities:

```text
build loading
baseline calculation
metric extraction
skill metadata
passive mutation
weapon-set mutation
item mutation
skill/support mutation
configuration application
determinism
reset/isolation
server deployment
licensing/redistribution
```

---

## 53. Go / no-go recommendation

The spike must end with one of:

```text
GO
Proceed to STEP-018B using PoB2 calculator.

GO WITH CONDITIONS
Proceed only if listed architecture/security/version conditions are met.

NO-GO FOR MVP
Do not integrate PoB2 calculator into MVP; use another strategy.

MORE RESEARCH
A specific unanswered blocker prevents decision.
```

The recommendation must be supported by measured evidence.

---

## 54. No STEP-018B implementation

Even if the spike is successful:

```text
do not implement production character-aware delta evaluation
```

That is STEP-018B and requires separate approval.

---

## 55. Documentation

Create:

```text
docs/progress/STEP-018A-pob2-calculation-engine-integration-spike.md
```

Follow the normal progress-document protocol.

Also explicitly include:

```text
PoB2 Version / Commit
Research Environment
Calculation Architecture
Build Load Path
Calculation Entry Point
Initialization Requirements
Baseline Metrics Available
Skill / Effect Metadata Available
Primary Active Effect Fidelity
Passive Mutation
Weapon-Set Handling
Ascendancy Handling
Item Mutation
Skill / Support Mutation
Configuration Handling
Delta Prototype
Determinism
Mutation Isolation
Performance Benchmarks
Candidate-Scale Estimate
Runtime Architecture Options
Recommended Runtime Direction
Server Deployment Constraints
Local/Desktop Option
Licensing Review
Third-Party Data / Licensing
Version Compatibility
Passive Node-ID Mapping
Error Model
Timeout / Cancellation
Concurrency
State Contamination
Security Boundary
Network Dependency
UI Cross-Validation
Passive Delta Cross-Validation
Item Delta Cross-Validation
Capability Matrix
Go / No-Go Recommendation
Remaining Blockers
STEP-018B Readiness
```

---

## 56. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

only for material conclusions that should persist.

Potential decisions:

```text
PoB2 calculator is/is not viable
recommended runtime model
PoB2 version pin policy
node-id mapping rule
calculation compatibility gating
worker isolation requirement
licensing constraints
```

Do not log speculative choices as final decisions.

---

## 57. Required commands

Run existing repository checks after spike work:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Canonical `npm test` must still pass.

If spike code uses a separate runtime/toolchain, record those commands independently.

Do not make the normal test suite depend on:

```text
PoB2 executable
LuaJIT
network access
GGG credentials
AI keys
```

unless separately approved later.

---

## 58. Non-goals

Do not implement:

- production PoB2 calculator service;
- production passive reranking;
- exact upgrade recommendations;
- item upgrade ranking;
- price-aware ranking;
- crafting;
- trade search;
- generic weighted DPS/EHP score;
- AI-based build evaluation;
- auto-update of PoB2 runtime;
- account import changes.

---

## 59. Expected successful outcome

A successful spike should be able to demonstrate something conceptually like:

```text
Load stored PoB2 fixture
    ↓
PoB2 engine initializes
    ↓
Selected skill:
Shockwave Slam

Baseline:
Damage metric X = ...
Crit Chance = ...
Life = ...
Energy Shield = ...

Add passive node N
    ↓
Recalculate

Candidate:
Damage metric X = ...
Crit Chance = ...
Life = ...

Delta:
Damage metric X +...
Crit Chance +...
```

with the same result reproduced by PoB2 itself.

The exact metrics depend on what PoB2 exposes.

---

## 60. Expected partial-success outcome

A valid result may also be:

```text
build loading         proven
baseline calculation  proven
skill metadata        proven
passive mutation      proven
item mutation         blocked
serverless deploy     not viable
Linux worker          viable
licensing             acceptable with obligations
```

That can still be enough to proceed with a constrained STEP-018B.

---

## 61. Readiness target

STEP-018A is complete only when we know:

```text
what PoB2 can calculate
how to invoke it
how to mutate a build
how deterministic it is
how fast it is
how to isolate it
how to deploy it
how versions map
what licensing constraints apply
```

We do not need production polish.

We do need enough evidence to make the next architecture decision confidently.

---

## 62. Stop condition

After research, prototype validation, benchmarks, capability matrix, and documentation are complete:

**STOP.**

Do not automatically implement:

```text
STEP-018B
Character-aware delta evaluator

STEP-018C
Budget-aware upgrade prioritization
```

Wait for explicit review and approval.
