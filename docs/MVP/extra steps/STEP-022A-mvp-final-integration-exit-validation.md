# STEP-022A — MVP final integration and exit validation

**Date:** 2026-09-28  
**Status:** PLANNED  
**Roadmap reference:** MVP exit review after STEP-022  
**Authoring context:** Cursor-assisted development

## 1. Objective

Perform the final end-to-end validation of the current PoE2 Buddy MVP.

This is **not a feature-development step**. Its purpose is to answer one question:

```text
Does the current repository satisfy the MVP as it is now defined,
with all deferred/post-MVP limitations explicitly preserved?
```

The review must validate the major user flows together rather than only as isolated package tests, and must classify every issue as one of:

```text
MVP blocker
known limitation
external blocker
post-MVP polish item
production-launch gap
```

The final result must be one of:

```text
MVP COMPLETE
PRODUCTION-LAUNCH READY
```

or:

```text
MVP COMPLETE
PRODUCTION-LAUNCH NOT READY
```

or:

```text
MVP BLOCKED
```

---

## 2. MVP definition used for this review

The original MVP proved that Buddy could:

```text
load a PoE2 build
use pinned current game data
find legal main-tree passive candidates
score/rank them deterministically
show the exact proposed nodes
show transparent score breakdown/provenance
```

The project has since added significant MVP extensions:

```text
PoB2 build import
gear normalization
character context
PoB2 whole-character candidate measurement
explicit item replacement measurement
budget-aware explicit-item comparison
crafting data
craft-target planning
community-derived crafting weights for selected classes
deterministic explanation layer
```

The following are intentionally deferred and are not MVP blockers when clearly scoped:

```text
STEP-021 crafting simulation
multi-step craft routes
step-by-step crafting guides
full exact PoB2 reranking of all passive paths
real GGG OAuth login while approved credentials are unavailable
real LLM provider
```

---

## 3. Required source-of-truth review

Before changing or validating code, read:

```text
docs/planning/MVP_ROADMAP.md
docs/planning/POST-MVP-POLISH-REGISTER.md
docs/planning/DECISION_LOG.md
docs/planning/RISKS_AND_KNOWN_ISSUES.md
docs/planning/DATA_SOURCES_AND_ACCESS.md
docs/planning/DOCUMENTATION_PROTOCOL.md
```

Also read the latest relevant completion docs for:

```text
STEP-012 / STEP-012A
STEP-013
STEP-015
STEP-016.5C
STEP-017B
STEP-018
STEP-018A.1
STEP-018B.1
STEP-018C.1
STEP-019A
STEP-020
STEP-020.9
STEP-022
```

Do not use chat history as the implementation source of truth.

---

## 4. Scope rule

This step validates the product **as implemented**.

Do not silently:

```text
add new algorithms
change passive weights
change ranking semantics
change crafting mechanics
add trade search
add a real LLM
add OAuth credentials
change external data providers
```

A small blocker fix is allowed only when:

```text
the intended behavior is already unambiguous
the fix is narrow/local
a regression test is added
no architecture decision is introduced
```

Large issues must be documented and moved to a separate closure step.

---

## 5. Issue classification

Every issue discovered must be classified.

### MVP BLOCKER

The current MVP cannot be declared complete.

Examples:

```text
canonical tests fail
main analysis crashes
PoB import corrupts passive allocation
important flow returns wrong values
provenance disappears
unsupported feature silently guesses
```

### KNOWN LIMITATION

Incomplete behavior that is correctly scoped and disclosed.

Example:

```text
weapon-set optimization not implemented
```

### EXTERNAL BLOCKER

Cannot currently be closed because an external provider/access dependency is unavailable.

Example:

```text
GGG OAuth approval/credentials
```

### POST-MVP POLISH

Useful improvement that is not required for MVP exit.

### PRODUCTION-LAUNCH GAP

MVP works locally/in the validated environment but a public deployment requires further work.

---

# Part A — Repository health

## 6. Canonical repository checks

Run:

```bash
npm install
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
npm audit
```

Record:

```text
test file count
test count
typecheck result
lint result
format result
audit result
```

Any failing canonical command is an MVP blocker unless it is proven to be an environment-only issue with an existing documented release gate.

---

## 7. Heavy / opt-in calculator regression

Run the current documented PoB2 integration suite:

```bash
npm run test:pob2-calculator
```

or the repository's current equivalent.

Record:

```text
PoB2 version
tree key
runtime fingerprint
test count
duration
```

An existing approved calculator regression failure is an MVP blocker for features depending on the calculator.

---

## 8. Working-tree / generated-data audit

Check that the repository has not accidentally committed:

```text
raw Craft of Exile datasets
full RePoE exports
local PoB installation/runtime files
OAuth tokens
real secrets
personal PoB/build files
Google Sheet exports not approved for redistribution
```

Verify expected local/generated files remain ignored.

---

# Part B — Version and snapshot validation

## 9. Passive-tree data validation

Validate the currently pinned official passive-tree snapshot.

Confirm analysis provenance still includes the current repository's pinned:

```text
source
version
commit
checksum where applicable
```

Do not upgrade to a newer game snapshot during this review unless the repository has already intentionally changed its supported pin.

---

## 10. Crafting-data readiness

Run the current readiness command, expected to be similar to:

```bash
npm run crafting:readiness
```

Confirm:

```text
planner readiness is valid for the current checksum
unsupported classes stay unsupported
new/stale checksum fails closed
```

---

## 11. Community-weight readiness

Run:

```bash
npm run crafting:weights:validate
```

Record:

```text
community patch
schema version
manifest/snapshot checksum
promoted classes
coverage
```

Do not implement crafting simulation.

---

## 12. PoB2 runtime integrity

Confirm the prepared PoB2 runtime still matches the approved runtime fingerprint.

A fingerprint mismatch must fail closed.

Do not silently regenerate/re-pin the runtime as part of exit validation without documenting that as a separate data/runtime update.

---

# Part C — Main passive-analysis journey

## 13. Fixture browser flow

Use the stable canonical fixture already used by the repository's regression tests, preferably the Witch fixture.

From the browser:

```text
open analysis
load fixture
choose the known objective
use the known point budget
run analysis
```

Verify:

```text
analysis succeeds
recommendations render
node sequence is visible
point cost is visible
heuristic score is visible
score breakdown is visible
warnings/readiness are visible
data provenance is visible
```

Use the repository's known expected ranking/result. Do not invent a new expected value.

---

## 14. Passive recommendation regression

Confirm the known canonical passive recommendation remains unchanged unless a previously documented intentional change explains it.

An unexplained ranking regression is an MVP blocker.

---

## 15. Truncation / bounded-search wording

If the selected case returns a truncated/bounded search indicator, verify the UI does not imply the result is an exhaustive global optimum.

The current bounded-search design remains acceptable if truthfully labeled.

---

# Part D — STEP-022 browser closure

## 16. Deterministic explanation browser smoke test

STEP-022 did not complete a live browser click-through. Close that gap here.

With:

```text
EXPLAINER_MODE=deterministic
```

verify:

```text
analysis succeeds
"Deterministic explanation" is visible
explanation contains factual structured wording
passive recommendation order is unchanged
heuristic score is unchanged
```

---

## 17. Explanation-disabled browser test

With:

```text
EXPLAINER_MODE=disabled
```

verify:

```text
analysis succeeds
explanation is absent/disabled
recommendations remain unchanged
```

---

## 18. Explanation failure isolation

Use existing automated coverage or a safe test hook to verify:

```text
renderer failure
→ core analysis remains available
```

Do not add a production failure switch solely for this review.

---

# Part E — PoB2 import and context

## 19. Real PoB2 import browser flow

Use one approved real PoB2 fixture/export already in the repository.

Verify:

```text
class
level
ascendancy context where present
main-tree passives
weapon-set allocations
ascendancy ids
skills
configuration
tree compatibility
```

are handled according to the current normalization contract.

---

## 20. Ascendancy/main-tree separation regression

Confirm ascendancy ids are preserved but do not appear in the normal main-tree allocation.

This regression must remain closed.

---

## 21. Version namespace regression

Confirm:

```text
PoB tree key
GGG active passive-tree version
```

remain separate namespaces.

A textual mismatch such as:

```text
0_5
vs
0.5.5
```

must not by itself make the import incompatible.

Node-id compatibility remains authoritative.

---

## 22. Character-context browser flow

Verify the Build Context section remains truthful:

```text
primary skill state
relevant families
no-evidence families
unresolved families
readiness
```

Do not require unresolved skill metadata to be magically resolved for MVP exit.

---

# Part F — Gear normalization

## 23. Gear normalization browser regression

Use the approved gear/locality fixture.

Verify:

```text
recognized modifiers remain recognized
unknown locality remains unknown
coverage/readiness is visible
coverage is not described as item quality
```

Preserve the approved regression behavior for examples such as:

```text
ordinary Cast Speed → global
bare increased Elemental Damage → unknown
Elemental Damage with Attacks/Spells → global
```

Use current fixture truth rather than new assumptions.

---

# Part G — Exact PoB2 measurement

## 24. Exact passive candidate measurement

Where the current UI exposes it, measure a supported displayed passive candidate through PoB2.

Verify the result preserves:

```text
requested node ids
verified node ids
actually allocated node ids
verified point cost
baseline metrics
candidate metrics
deltas
runtime provenance/fingerprint
```

The measured result must remain clearly separate from the heuristic score.

---

## 25. Candidate-allocation mismatch regression

Existing tests must continue to prove:

```text
unexpected PoB2 allocation
→ candidate-allocation-mismatch
```

Buddy must never silently claim it measured one path after PoB measured another.

---

## 26. Restore verification

Confirm calculator tests still prove the build/item state is restored after mutation.

A failed restore must fail closed and discard the worker.

---

# Part H — Upgrade comparison

## 27. Explicit item comparison browser flow

Use existing approved candidate items.

Verify a comparison containing:

```text
at least 2 candidates
selected ranking metric
budget
prices
at least 1 visible non-ranking trade-off
```

Confirm:

```text
candidate measurements succeed
ordering follows selected metric/cost policy only
price provenance is visible
within/over-budget state is visible
other measured changes remain visible
```

---

## 28. No-positive-within-budget regression

Exercise the known case where no positive candidate fits the budget.

Expected:

```text
no winner id
no false winner sentence
positive-but-over-budget candidate remains labeled over budget
```

This is a critical STEP-018C.1 regression.

---

## 29. Missing metric/price behavior

Use existing tests to confirm:

```text
missing price != zero
missing metric != zero
failed candidate does not get fabricated trade-off rows
```

---

# Part I — Economy integration

## 30. poe.ninja adapter validation

Validate only the supported economy integration.

Confirm:

```text
server-side access
cache behavior
graceful failure
currency conversion path
```

Do not use unsupported/private build/profile/trade endpoints.

A live network call is optional if existing deterministic adapter tests sufficiently validate the current code path.

---

# Part J — GGG live import gate

## 31. Disabled live-import behavior

With approved credentials still unavailable, verify:

```text
live import remains disabled
no fake credentials are used
no redirect occurs when configuration is unavailable/disabled
clear disabled state/message exists
fixture and PoB2 analysis continue to work
```

This external blocker does **not** block MVP completion.

---

## 32. GGG production-gap classification

Confirm the polish register still records the current known limitations such as:

```text
real payload not yet validated
in-memory/single-process sessions
no refresh-token flow
no remote revocation
```

These should be classified as external or production-launch gaps, not local-MVP failures.

---

# Part K — Craft target planner

## 33. Supported craft-target browser flow

Open the craft-target planner and use a known supported case from existing regressions.

Verify:

```text
supported item class/base loads
item level is accepted
known stat target resolves
candidate modifiers appear
source-pool eligibility wording appears
provenance appears
coexistence/unsupported warning appears
```

The page must not imply:

```text
guaranteed outcome
complete crafting route
expected cost
```

---

## 34. Unsupported crafting class regression

Use a known unsupported class from the repository's existing tests/verification.

Expected:

```text
explicit unsupported result
no mapping to a similar/nearby class
```

---

## 35. Missing crafting snapshot behavior

Validate or inspect the missing-local-snapshot path.

Expected behavior:

```text
actionable error / preparation instruction
```

Not:

```text
silent empty result
uncaught 500
blank page
```

The production provisioning problem can remain a post-MVP gap, but the local error path must be truthful.

---

# Part L — Community crafting weights

## 36. Existing probability sanity regression

Using the already approved STEP-020.9 scope, validate at least one current deterministic probability case through current APIs/tests.

Preferred regression:

```text
STR body armour
Rusted Cuirass
ilvl 82
Magic
0 explicit modifiers
```

Use the exact expected candidate count, total weight, and sum-to-1 invariant already stored in STEP-020.9.

Do not invent/recalculate a new canonical expectation from memory.

---

## 37. Community-derived wording

Confirm documentation/UI/API wording still distinguishes:

```text
community-derived probability
```

from:

```text
official GGG probability
```

STEP-021 remains deferred.

---

# Part M — Fail-closed behavior

## 38. Error-state audit

Exercise or verify automated coverage for:

```text
invalid fixture/build input
invalid PoB2 code
unknown passive id
unsupported crafting class
missing crafting snapshot
PoB2 calculator disabled/unavailable
economy rate unavailable
explainer disabled
explainer rendering error
GGG live import disabled
stale/mismatched snapshot or patch
runtime fingerprint mismatch
```

Expected principle:

```text
fail clearly
preserve unaffected functionality
never guess
```

---

## 39. Unsupported-feature truthfulness audit

Search major user-facing wording for claims using terms such as:

```text
best
optimal
exact
guaranteed
official
live
current price
craft success
full build
```

Review every suspicious use.

Safer scoped wording includes:

```text
heuristic
measured by PoB2
among supplied candidates
community-derived
source-pool eligible
current pinned snapshot
```

A materially false product claim is an MVP blocker until corrected.

---

# Part N — Security and privacy

## 40. Secrets audit

Verify:

```text
no real API keys/secrets committed
no OAuth token/code logged
no raw PoB XML logged
no raw pasted item text logged
no explanation payload telemetry
```

Review `.env.example`, gitignored paths, and diagnostics.

---

## 41. Untrusted-content handling

Confirm imported/user labels remain display data rather than instructions.

The explainer must not let a build/item label control sections, winner selection, or numerical output.

---

# Part O — Browser usability and accessibility

## 42. MVP browser journey

Perform one normal user-style journey:

```text
Analysis
→ load fixture or PoB2 build
→ passive recommendations
→ deterministic explanation
→ context/gear
→ exact candidate measurement if enabled
→ explicit upgrade comparison
→ craft target planner
```

Record:

```text
broken links
confusing dead ends
uncaught errors
missing controls
obvious clipping/overflow
```

Do not redesign the UI in this step.

---

## 43. Accessibility smoke pass

This is not a full WCAG audit.

Check obvious issues:

```text
form controls have readable labels
buttons have meaningful names
important status is not color-only
keyboard focus works for main actions
sections/tables have understandable headings
```

Add deeper accessibility work to the polish register.

---

# Part P — Performance observations

## 44. Performance smoke pass

Record rough observed times for:

```text
initial page load
fixture analysis
PoB2 import
exact passive measurement
upgrade comparison
craft-target query
```

Do not optimize unless the current supported flow is unusably slow or fails/timeouts.

Otherwise add performance work to post-MVP polish.

---

# Part Q — Planning/documentation consistency

## 45. Post-MVP polish register review

Open:

```text
docs/planning/POST-MVP-POLISH-REGISTER.md
```

For every currently open item:

```text
confirm classification
add newly discovered non-blocking gaps
mark RESOLVED only with evidence
never delete historical entries
```

Add a section:

```text
MVP exit review — 2026-09-28
```

with findings from this step.

---

## 46. Roadmap consistency

Ensure current planning accurately shows:

```text
STEP-021 deferred post-MVP
STEP-022 complete
STEP-023 optional / provider not selected
MVP exit review status
```

Do not rewrite historical progress docs.

---

## 47. README project status

If final result is:

```text
MVP COMPLETE
```

update the project status so it no longer says `planning / pre-MVP`.

If blocked, use wording such as:

```text
MVP exit validation blocked
```

and name the blocker.

---

# Part R — Explicit non-blockers

## 48. Real LLM provider is not required

STEP-023 is optional.

The deterministic explainer satisfies the current MVP explanation requirement.

Do not select or connect a real provider in this step.

---

## 49. Craft simulator is not required

STEP-021 was intentionally deferred after the crafting foundations were completed.

Current MVP crafting scope is:

```text
crafting-data ingestion
craft target planning
current community-weight infrastructure
```

not:

```text
random simulator
expected attempts/cost
multi-step route optimization
step-by-step crafting guide
```

Those remain high-priority post-MVP work.

---

## 50. Known valid non-blockers

The following do not block MVP completion when clearly disclosed:

```text
no real GGG OAuth credentials
no automatic PoE2 stash wealth
no weapon-set optimization
no ascendancy optimization
no full passive-tree canvas
no universal exact PoB2 reranking
no automatic rare-item trade candidate sourcing
no multi-item optimization
no craft simulation
no step-by-step crafting guide
no real LLM provider
production deployment/provisioning gaps
```

---

# Part S — Production readiness distinction

## 51. MVP complete is not production ready

A valid final result may be:

```text
MVP COMPLETE
PRODUCTION-LAUNCH NOT READY
```

This is expected if remaining gaps include:

```text
cloud/server PoB2 runtime strategy
crafting data/weight provisioning
persistent/multi-instance OAuth sessions
real GGG credentials
production observability/security hardening
```

Do not weaken production criteria to obtain a green MVP status.

---

# Part T — Required completion document

## 52. Progress file

Create:

```text
docs/progress/STEP-022A-mvp-final-integration-exit-validation.md
```

Include at least:

```text
Objective
MVP Definition Used
Repository Checks
Opt-in PoB2 Tests
Snapshot / Version Validation
Fixture Browser Flow
STEP-022 Browser Verification
PoB2 Import Flow
Character Context
Gear Flow
Exact Passive Measurement
Item Replacement
Upgrade Comparison
Economy
GGG Gate
Craft Target Planner
Community Weights
Error-State Audit
Truthfulness/Wording Audit
Privacy/Secrets Audit
Generated-Data Audit
Accessibility Smoke Check
Performance Observations
Polish Register Updates
New Issues Found
Blocker Classification
Production-Launch Gaps
MVP Exit Decision
Recommended Next Step
```

---

## 53. Evidence table

Include a table like:

| Capability                | Status           | Evidence | MVP blocker? |
| ------------------------- | ---------------- | -------- | ------------ |
| Fixture analysis          |                  |          |              |
| Passive recommendations   |                  |          |              |
| Provenance                |                  |          |              |
| PoB2 import               |                  |          |              |
| Character context         |                  |          |              |
| Gear normalization        |                  |          |              |
| Exact PoB2 delta          |                  |          |              |
| Upgrade comparison        |                  |          |              |
| Economy normalization     |                  |          |              |
| Craft target planner      |                  |          |              |
| Community weights         |                  |          |              |
| Deterministic explanation |                  |          |              |
| GGG live OAuth            | external blocker |          | No           |
| Craft simulation          | deferred         |          | No           |
| Real LLM provider         | optional         |          | No           |

Add rows where useful.

---

## 54. Severity labels

Use:

```text
BLOCKER
MAJOR NON-BLOCKER
MINOR NON-BLOCKER
EXTERNAL
DEFERRED
```

For every blocker record:

```text
affected flow
reproduction
expected behavior
actual behavior
smallest safe fix
```

---

# Part U — Exit gate

## 55. MVP COMPLETE criteria

Return `MVP COMPLETE` only when all are true:

```text
canonical checks pass
main fixture browser flow works
PoB2 import works in supported environment
passive recommendation regression passes
provenance is visible
exact PoB2 measurement path remains intact
explicit upgrade comparison remains intact
craft target planner works in documented scope
community-weight validation passes
deterministic explanation live browser smoke passes
unsupported/deferred capabilities fail closed or are clearly labeled
no critical secret/security issue is found
```

---

## 56. Automatic blocker examples

These block MVP exit:

```text
npm test fails
typecheck fails
main browser analysis crashes
known fixture recommendation changes unexpectedly
PoB import corrupts allocation
PoB measurement cannot restore baseline
upgrade comparison fabricates missing price/metric
craft planner silently accepts unsupported class
community-weight checksum/patch validation fails
explainer alters underlying recommendation
secret/token is committed/logged
UI materially claims unsupported functionality
```

---

## 57. Small bug-fix policy

A blocker may be fixed inside this step only when:

```text
fix is small and local
existing intended behavior is clear
regression test is added
no architecture change is needed
```

Otherwise:

```text
document blocker
stop
recommend a separate closure step
```

---

## 58. Final rerun after fixes

If any code/config/docs are changed, rerun at the end:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Also rerun when relevant:

```bash
npm run test:pob2-calculator
npm run crafting:weights:validate
```

Do not finish on stale pre-fix test results.

---

## 59. Recommended next action if MVP completes

Do not automatically begin another feature.

Recommended process:

```text
1. freeze/tag the MVP state;
2. record current data/runtime provenance;
3. review POST-MVP-POLISH-REGISTER.md;
4. choose one post-MVP track deliberately;
5. create a separate scoped implementation step.
```

Given the product goals, crafting/STEP-021 is a likely high-value first post-MVP track, but this review must not start it.

---

## 60. Recommended next action if MVP is blocked

Do not start unrelated work.

Return:

```text
exact blocker list
smallest recommended closure step
```

Then stop.

---

## 61. Stop condition

After the full review and completion document are written:

**STOP.**

Do not start:

```text
STEP-021
STEP-023
production deployment work
```

Return exactly one top-level status:

```text
MVP COMPLETE
PRODUCTION-LAUNCH READY
```

or:

```text
MVP COMPLETE
PRODUCTION-LAUNCH NOT READY
```

or:

```text
MVP BLOCKED
```

Then summarize:

```text
blockers
major non-blockers
new polish-register entries
production-launch gaps
recommended next step
```
