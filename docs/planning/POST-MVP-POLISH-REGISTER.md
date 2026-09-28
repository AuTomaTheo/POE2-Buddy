# PoE2 Buddy — Post-MVP Polish & Incomplete-Capability Register

**Created:** 2026-09-28  
**Purpose:** Persistent checklist of capabilities that are currently partial, intentionally scoped, externally blocked, or not yet production-ready.

## 1. How to use this file

This file is **not** a list of failed implementation steps.

Most referenced steps are correctly complete within their approved scope.

The purpose is to preserve everything that is still:

```text
not modeled
partially modeled
limited to a narrow scope
dependent on local tooling/data
externally blocked
not production-proven
or intentionally deferred
```

After the MVP is finished, review this file systematically instead of relying on chat history.

Suggested statuses:

```text
OPEN
PARTIAL
EXTERNAL BLOCKER
DEFERRED
PRODUCTION GAP
RESEARCH NEEDED
```

When an item is fully resolved:

```text
mark RESOLVED
link the closing STEP/decision
do not delete the history
```

---

# A. Passive-tree optimizer

## A1. Passive-point search is still deliberately bounded

**Status:** PARTIAL  
**Origin:** STEP-006

Current search limits include a small point-budget scope and hard candidate/expansion caps.

Known behavior:

```text
default maximum point budget: small/bounded
path cap
expansion cap
truncated result can occur
```

Impact:

```text
the engine may stop before enumerating every legal combination
```

Post-MVP work:

```text
benchmark larger budgets
beam/A*/best-first alternatives
dominance pruning
cache shortest paths
clear UI when search is truncated
```

---

## A2. Free passive nodes are not modeled as free

**Status:** OPEN  
**Origin:** STEP-006

Current path search charges:

```text
1 point per newly allocated node
```

even where source data may mark a node as free.

Post-MVP:

```text
verify current PoE2 semantics for free nodes
implement explicit point-cost rules
add regression fixtures
```

---

## A3. Weapon-set passive specialisation optimization is not implemented

**Status:** OPEN / HIGH VALUE  
**Origins:** STEP-005A, STEP-006, STEP-016.5C

Weapon-set-specific ids are preserved/separated, but normal candidate search does not optimize them.

Current conservative behavior includes:

```text
weapon-set-only ids excluded from normal path search
weapon-set legality not modeled
```

Needed:

```text
weapon-set budgets
set-specific allocation legality
shared vs set-specific cost accounting
exact PoB2 verification
UI for weapon-set recommendations
```

---

## A4. Ascendancy optimization is not implemented

**Status:** OPEN / HIGH VALUE  
**Origins:** STEP-005A, STEP-006, STEP-016.5C

Ascendancy nodes can be identified/preserved from PoB2, but:

```text
they are not scored
they do not alter normal path search
ascendancy point budgets are not modeled
```

Needed:

```text
ascendancy graph/rules
class/ascendancy eligibility
ascendancy point budget
separate recommendation flow
PoB2 validation
```

---

## A5. Character-level and quest passive-point legality is incomplete

**Status:** OPEN  
**Origins:** STEP-005A, STEP-006

Current search takes an explicit point budget.

It does not fully derive/validate:

```text
available passive points from level
quest passive points
respec state
all passive-point acquisition rules
```

---

## A6. Jewel-specific passive-tree rules are not modeled

**Status:** OPEN  
**Origin:** STEP-006

Jewel sockets are treated conservatively as normal main-tree nodes where applicable.

Missing:

```text
jewel effects
radius interactions
socketed-jewel build impact
jewel-specific legal/optimization rules
```

---

## A7. Main passive ranking remains heuristic

**Status:** PARTIAL / HIGH VALUE  
**Origins:** STEP-007 through STEP-009, STEP-018B.1

The main Top-K engine is deliberately heuristic.

It is **not** equivalent to:

```text
exact PoB2 DPS ranking
exact PoB2 EHP ranking
```

The PoB2 calculator can measure explicit candidates, but the main Top-K recommendation order is not globally reranked by PoB2.

Post-MVP option:

```text
heuristic search
→ shortlist
→ exact PoB2 re-evaluation
→ final character-aware ordering
```

This was part of the intended advanced architecture and remains one of the highest-value fidelity upgrades.

---

## A8. Passive stat normalization is not universal

**Status:** PARTIAL  
**Origins:** STEP-007 family, RISKS_AND_KNOWN_ISSUES

Complex passive effects remain difficult to normalize, including:

```text
conditional mechanics
transforms
skill-specific behavior
ailment-specific behavior
weapon-specific conditions
other complex interactions
```

Policy should remain:

```text
raw source preserved
unsupported semantics visible
never silently treat unknown as fully modeled
```

Post-MVP:

```text
expand grammar/mechanic coverage
coverage dashboards
regression builds for newly supported mechanics
```

---

## A9. Full passive-tree visual canvas is not implemented

**Status:** DEFERRED UX  
**Origin:** STEP-011 / backlog

Current visualization is sufficient to identify proposed nodes, but a full game-like interactive tree/canvas is still a future UX feature.

Potential work:

```text
pan/zoom canvas
full tree graphics
current/proposed path overlays
hover detail
weapon-set/ascendancy overlays
```

---

# B. Character import and build context

## B1. Real GGG OAuth login is externally blocked

**Status:** EXTERNAL BLOCKER  
**Origins:** STEP-014, STEP-015

Current code path exists, but approved GGG client credentials are not available.

Therefore:

```text
no real production login has been validated
```

Post-blocker work:

```text
obtain approved GGG client
enable live gate
validate real authorization flow
capture real response shape
regression-test normalization
```

---

## B2. GGG character schema is not validated against a real live payload

**Status:** EXTERNAL BLOCKER  
**Origin:** STEP-015

The implementation follows the published schema and mocked/local responses.

Risk:

```text
real payload may differ in optional/required field behavior
```

Resolve only with approved live access.

---

## B3. GGG ascendancy is unavailable from the current published character object

**Status:** EXTERNAL / DATA LIMITATION  
**Origin:** STEP-015

Do not infer it from unrelated data without evidence.

---

## B4. GGG OAuth session storage is development-grade

**Status:** PRODUCTION GAP  
**Origins:** STEP-014, STEP-015

Current limitations:

```text
in-memory session store
single-process assumption
sessions disappear on restart
no refresh-token flow
remote revocation not implemented
```

Before production multi-instance deployment:

```text
choose persistent/secure session architecture
review token lifecycle
review revocation
```

---

## B5. GGG connect/character-selection UX is minimal

**Status:** PARTIAL UX  
**Origin:** STEP-015

The live connect flow is hidden while unavailable.

After credentials:

```text
proper account state
character selector
disconnect/reconnect states
error recovery
loading states
```

---

## B6. Automatic PoE2 stash wealth is unavailable

**Status:** EXTERNAL API LIMITATION  
**Origins:** planning risks/data access

The documented stash support does not provide the required PoE2 account-wide wealth workflow.

Current safe approach:

```text
user-supplied budget
supported economy normalization
```

Do not promise automatic whole-stash budget detection.

---

## B7. PoB2 skill metadata remains incomplete

**Status:** PARTIAL / HIGH VALUE  
**Origins:** STEP-016.5C, STEP-018

Real PoB imports can contain skills that are outside the checked fact table.

Current effects:

```text
some gems unresolved
mechanic tags may be empty
primary-skill readiness can remain partial
```

Post-MVP:

```text
build/version a checked skill metadata table
skill tags
damage types
projectile/melee/spell/attack tags
support relations
secondary/utility roles if deterministically supported
```

---

## B8. CharacterContext only has conservative role semantics

**Status:** PARTIAL  
**Origin:** STEP-018

Current skill role is essentially:

```text
primary
or
unresolved
```

Secondary/utility classifications are intentionally not guessed.

---

## B9. CharacterContext can mark mechanic families unresolved

**Status:** PARTIAL  
**Origin:** STEP-018

Unknown locality, conditional lines, and unrecognized gear/passive text can keep relevance unresolved.

This is correct fail-safe behavior, but coverage can be improved later.

---

## B10. Imported configuration is preserved but not semantically interpreted by CharacterContext

**Status:** PARTIAL  
**Origin:** STEP-016.5C

PoB2 configuration values are stored and displayed.

They are not generally converted into deterministic character-context mechanic facts.

The exact PoB2 calculator still evaluates the build when it loads the actual PoB document; this item concerns Buddy's own context/semantic model.

---

# C. PoB2 calculator integration

## C1. PoB2 runtime is a local prepared dependency, not a production deployment story

**Status:** PRODUCTION GAP / HIGH VALUE  
**Origins:** STEP-018A through STEP-018B.1

The exact calculator is tied to a validated local PoB2 runtime/fingerprint.

Before production deployment, decide:

```text
where PoB2 runs
supported OS/runtime
installation/preparation lifecycle
version refresh policy
server resource limits
concurrency
```

Do not assume a local developer PoB installation is equivalent to cloud production.

---

## C2. PoB2 calculator performance can be substantial

**Status:** PERFORMANCE POLISH  
**Origin:** STEP-018B.1

Recorded work showed roughly:

```text
cold baseline: seconds
small candidate: hundreds of ms after warm-up
50 evaluations: tens of seconds
```

Before exact shortlist reranking at scale:

```text
benchmark realistic concurrency
worker pooling
batch behavior
caching
timeouts
resource isolation
```

---

## C3. OS-level outbound network blocking is not enforced for PoB2

**Status:** SECURITY HARDENING  
**Origin:** STEP-018B.1

Current protections include:

```text
localhost Buddy worker protocol
known PoB auto-update disabled
controlled environment
runtime fingerprint
```

But:

```text
the OS does not currently firewall the PoB process from outbound access
```

Consider sandbox/firewall/container isolation before production if needed.

---

## C4. FullDPS is not in the supported calculator metric catalog

**Status:** PARTIAL  
**Origin:** STEP-018B.1

Only validated named metrics should be exposed.

Investigate FullDPS separately before adding it.

---

## C5. PoB item-editor visual parity was not fully checked

**Status:** LOW-PRIORITY VALIDATION  
**Origin:** STEP-018B.1

The programmatic item replacement is tested and restore-verified.

The planned manual item-editor-window comparison was not completed.

Useful as an extra confidence check, not an MVP blocker.

---

## C6. Some passive candidates may fail exact allocation

**Status:** EXPECTED LIMITATION  
**Origin:** STEP-018B.1

If PoB automatically allocates a different node set, Buddy correctly returns:

```text
candidate-allocation-mismatch
```

Future exact reranking must handle these failures without silently substituting another path.

---

# D. Gear normalization and upgrade analysis

## D1. Gear modifier grammar/locality coverage is incomplete

**Status:** PARTIAL / HIGH VALUE  
**Origins:** STEP-017, STEP-017A, STEP-017B

Known conservative cases include:

```text
bare increased Elemental Damage → unknown
Armour locality → unresolved in some contexts
Evasion locality → unresolved in some contexts
Deflection locality → unresolved in some contexts
other unrecognized lines → unknown
```

Unknown must remain unknown until evidence exists.

Post-MVP:

```text
integrate stronger mod-domain/id evidence
reduce text-only ambiguity
expand regression fixtures
```

---

## D2. Gear normalization is not a character-total calculator

**Status:** INTENTIONAL SCOPE  
**Origin:** STEP-017B

The gear engine itself does not calculate:

```text
weapon DPS
whole-character damage
whole-character defence totals
```

Whole-character comparisons use PoB2 instead.

This separation is intentional but can be improved in UX/documentation.

---

## D3. Automatic upgrade candidate sourcing is absent

**Status:** OPEN / HIGH VALUE  
**Origin:** STEP-018C.1

Current comparison requires:

```text
explicit pasted item candidates
```

Buddy does not yet:

```text
find items for the user
generate candidate rares
search live rare-item trade listings
search user's stash
```

Any future trade work must respect supported APIs/policies.

---

## D4. Rare-item live market pricing is absent

**Status:** OPEN / DATA/API LIMITATION  
**Origins:** STEP-013, STEP-018C

Current pricing supports:

```text
user-entered price
supported currency normalization
```

It does not fabricate or fetch arbitrary rare-item market prices.

---

## D5. User-entered prices may be inaccurate

**Status:** EXPECTED LIMITATION  
**Origin:** STEP-018C

They are correctly labeled as user-entered.

Future UX could:

```text
timestamp prices
save currency
validate formatting
integrate a supported candidate-price source if one becomes available
```

---

## D6. Cross-currency comparison depends on an available exchange snapshot

**Status:** PARTIAL  
**Origin:** STEP-018C

If a usable chaos/divine rate is unavailable:

```text
cross-currency ranking is unavailable
```

Do not guess a conversion.

---

## D7. Upgrade ranking is one metric at a time

**Status:** INTENTIONAL / FUTURE POLISH  
**Origins:** STEP-018C, STEP-018C.1

Current rankable metrics are intentionally conservative.

There is no hidden universal item score.

Missing features that could be researched later:

```text
constraint-aware ranking
resistance-cap requirements
minimum attribute constraints
breakpoints
multi-objective Pareto display
```

Do not simply add arbitrary weights.

---

## D8. Resistances and other visible trade-offs are not ranking metrics

**Status:** INTENTIONAL / FUTURE REQUIREMENT  
**Origin:** STEP-018C.1

They remain visible, which is correct.

Future richer optimization may treat them as:

```text
hard constraints
caps
minimum requirements
```

rather than generic weighted score terms.

---

## D9. Multi-item / whole-loadout optimization is absent

**Status:** OPEN / HIGH VALUE  
**Origin:** STEP-018C.1

Current budget means:

```text
maximum cost of one candidate item
```

Current comparisons are:

```text
one replacement at a time
```

Do not add two separate item deltas together.

Future system may need:

```text
multi-slot candidate combinations
budget allocation across slots
constraint preservation
exact PoB2 re-evaluation of combinations
```

---

## D10. Metrics omitted by PoB2 are not shown

**Status:** EXPECTED LIMITATION  
**Origin:** STEP-018C.1

Buddy correctly does not turn missing metrics into zero.

Coverage can expand only when calculator support is validated.

---

# E. Economy and external pricing

## E1. poe.ninja integration covers supported economy categories, not arbitrary rares

**Status:** INTENTIONAL / API LIMITATION  
**Origin:** STEP-013

Do not use unsupported/private profile/trade endpoints.

---

## E2. Economy data can be stale/unavailable

**Status:** EXPECTED EXTERNAL RISK  
**Origin:** STEP-013

Continue to use:

```text
cache
timestamp
provenance
graceful failure
```

Future polish:

```text
better stale-data UI
retry observability
coverage dashboards
```

---

# F. Crafting data and planner

## F1. Crafting simulation is deliberately deferred until post-MVP

**Status:** DEFERRED / HIGH VALUE  
**Origins:** STEP-020.9 decision, original STEP-021

Current state:

```text
crafting data: available
craft target planner: available
Augmentation weights for selected classes: available
random craft simulation: not implemented
```

Post-MVP sequence should begin with STEP-021.

---

## F2. Step-by-step crafting guides do not exist yet

**Status:** DEFERRED / VERY HIGH VALUE

Target product:

```text
choose target
choose starting base
show exact craft sequence
show branch/stop/restart conditions
show success probability per step
show expected attempts
show expected currency cost
```

This must be generated from deterministic mechanic models, not from AI intuition.

---

## F3. Only one crafting mechanic has deep research

**Status:** PARTIAL

The project deeply investigated:

```text
Orb of Augmentation
```

Other currencies/mechanics still require their own validated semantics.

Examples to research later:

```text
Exalted Orb
Regal Orb
Chaos-style actions
Essences
Greater/Perfect variants
other current PoE2 crafting systems
```

Never generalize Augmentation behavior to them.

---

## F4. Current community weight promotion covers only selected classes

**Status:** PARTIAL  
**Origin:** STEP-020.9

Validated current weight coverage currently includes:

```text
STR body armour
ring
wand
```

Other item classes remain unpromoted for current community probability use.

Post-MVP:

```text
extract/map current CoE weights for more classes
100% candidate-weight coverage per promoted scope
version/checksum each promotion
```

---

## F5. Direct/official crafting probability remains unavailable

**Status:** DATA LIMITATION  
**Origins:** STEP-020.8A, STEP-020.9

Current probabilities are:

```text
community-derived
```

They must never be labeled as official hidden GGG odds.

---

## F6. Mod-group exclusivity is not generally validated

**Status:** RESEARCH NEEDED  
**Origins:** STEP-019A, STEP-020.x

RePoE and PoB evidence disagreed for some defence modifier families.

For Magic Augmentation, side closure avoids many conflict questions.

For richer crafting mechanics, this must be solved.

---

## F7. Same-group conflict beyond Magic side closure remains unisolated

**Status:** RESEARCH NEEDED  
**Origins:** STEP-020.8A, STEP-020.9

Do not assume a group rule for mechanics where both conflicting mods could otherwise be present.

---

## F8. Generation-weight semantics remain incomplete

**Status:** RESEARCH NEEDED  
**Origins:** STEP-019 / STEP-019A

The RePoE pin did not provide a proven general mechanic selection model through generation weights.

Current Augmentation uses separately validated community class weights.

Other mechanics may need different weighting rules.

---

## F9. Crafting planner does not prove modifier coexistence

**Status:** PARTIAL  
**Origin:** STEP-020

The planner lists individual source-pool candidates.

It does not mean:

```text
all requested modifiers can coexist
the combination is craftable
the route is practical
```

This should remain visible until coexistence/conflict logic is implemented.

---

## F10. Crafting planner budget is absent

**Status:** DEFERRED  
**Origin:** STEP-020

Budget/expected cost belongs after:

```text
mechanic model
probability model
currency price model
```

---

## F11. Crafting source presentation is partial

**Status:** PARTIAL  
**Origins:** STEP-019, STEP-019A

Known data issues include:

```text
many unresolved/fallback translations
some modifiers with no stats
some grants-effects not individually interpreted
```

The fallback is deterministic, but UX quality can improve.

---

## F12. Some crafting item classes are unsupported

**Status:** OPEN  
**Origin:** STEP-019A / STEP-020

Known unsupported classes include:

```text
Buckler
FishingRod
Warstaff
```

Do not map them to "nearby" classes.

---

## F13. Full crafting snapshot redistribution is blocked/unclear

**Status:** PRODUCTION GAP / LICENSING  
**Origins:** STEP-019, STEP-019A

The full RePoE-derived normalized snapshot is local/gitignored.

Current policy does not approve:

```text
bundled public snapshot
server-prepared redistribution
automatic runtime download
```

Before public deployment, choose a compliant production provisioning strategy.

---

## F14. Community weight tables are local/gitignored

**Status:** PRODUCTION GAP  
**Origin:** STEP-020.9

The promoted manifest/checksum is committed, while full weight tables remain local.

Before production:

```text
define safe provisioning
validate redistribution rights
or regenerate during controlled deployment
```

---

## F15. Crafting weights are patch-pinned

**Status:** EXPECTED MAINTENANCE  
**Origin:** STEP-020.9

Current community weight snapshot:

```text
Craft of Exile community patch 4.5.5.3
```

A later patch must trigger:

```text
new extraction
new diff
new promotion
new probability regression
```

No silent carry-forward.

---

## F16. Historical Ring/Wand sheet mapping is unresolved

**Status:** LOW-PRIORITY RESEARCH  
**Origin:** STEP-020.9

Their current CoE weight coverage is complete for the tested pools, but historical family ladders did not align by item level.

This affects historical cross-validation, not the current promoted probability scope.

---

## F17. PoE2DB did not provide a per-modifier numeric weight cross-check

**Status:** EXTERNAL DATA LIMITATION  
**Origin:** STEP-020.9

Absence is not disagreement.

If PoE2DB exposes structured current values later, add an independent comparison.

---

## F18. Greater / Perfect Augmentation variants are not implemented

**Status:** OPEN  
**Origin:** STEP-020.8A

Observed minimum-mod-level behavior was not adopted into the engine.

Treat them as separate mechanics/variants later.

---

## F19. Expected attempts and expected cost do not exist

**Status:** DEFERRED  
**Origin:** STEP-021 not implemented

After simulator readiness:

```text
analytical expectation
Monte Carlo validation where useful
currency price integration
cost distribution
```

---

## F20. Multi-step craft-route optimization does not exist

**Status:** DEFERRED / VERY HIGH VALUE

Future architecture should support:

```text
item state
→ action
→ probabilistic states
→ target satisfaction
→ recovery/restart decisions
→ route cost
```

This is the foundation of the desired user-facing crafting guide feature.

---

# G. Data refresh, versioning, and patch maintenance

## G1. Game patches remain a global invalidation risk

**Status:** ONGOING  
**Origin:** project risk register

Affected:

```text
passive tree
PoB2 compatibility
gear semantics
crafting data
community weights
currency prices
```

Post-MVP production should have a single patch-readiness dashboard/checklist.

---

## G2. Cross-source versions use different namespaces

**Status:** ONGOING COMPLEXITY

Examples:

```text
GGG passive pin 0.5.5
PoB tree key 0_5
RePoE export 4.5.5.2
CoE internal data 4.5.5.3
```

Never compare these as raw strings.

Maintain explicit compatibility evidence.

---

## G3. Crafting/community-source refresh is not yet one production pipeline

**Status:** PRODUCTION GAP

The project has good local refresh/validation commands, but public deployment still needs a unified procedure for:

```text
fetch
validate
diff
regress
promote
rollback
deploy
```

across all source types.

---

## G4. Regression coverage across old/new game snapshots can be expanded

**Status:** FUTURE QUALITY

Keep known builds and known crafting cases across patches to detect behavioral drift.

---

# H. Testing, performance, and production readiness

## H1. Test runtime/load has shown contention

**Status:** PERFORMANCE POLISH  
**Origins:** STEP-016.5C, STEP-017B, STEP-020.9

Examples encountered:

```text
parallel tree loads caused timeouts
Vitest worker count was reduced
later suites passed
```

Not a current failing test, but before CI/production:

```text
profile test suite
separate heavy integration tests
cache immutable snapshots
set stable CI budgets
```

---

## H2. Opt-in PoB2 tests are slow and environment-specific

**Status:** EXPECTED / CI GAP

They should remain separated from default unit tests.

Post-MVP decide:

```text
dedicated Windows CI
nightly integration test
manual release gate
```

---

## H3. Broad browser E2E coverage is not comprehensive

**Status:** QUALITY POLISH

Many important flows were manually/headlessly verified step-by-step.

A final product should add stable E2E coverage for:

```text
fixture analysis
PoB import
passive recommendation
PoB exact delta
upgrade comparison
craft planner
explanation
major error states
```

---

## H4. Public production deployment has not been proven end-to-end

**Status:** PRODUCTION GAP

Before launch verify:

```text
build
deployment environment
PoB runtime strategy
local data snapshot provisioning
secret handling
session persistence
memory/concurrency
error logging
health checks
rollback
```

---

## H5. No persistent user database/accounts

**Status:** INTENTIONAL MVP / POST-MVP

Current architecture deliberately avoided a database until needed.

Future features requiring persistence:

```text
saved builds
history
preferences
saved budgets
shared analyses
user accounts
```

should trigger a separate architecture decision.

---

# I. UX / product completeness

## I1. Saved builds and analysis history are absent

**Status:** POST-MVP

---

## I2. Shareable analysis links are absent

**Status:** POST-MVP

---

## I3. Mobile-specific optimization is not a completed product feature

**Status:** POST-MVP

---

## I4. Accessibility deserves a dedicated audit

**Status:** POST-MVP QUALITY

Some individual UI decisions already avoid color-only meaning, but a full audit is still needed.

Review:

```text
keyboard flow
screen reader labels
focus
contrast
responsive zoom
semantic tables/forms
```

---

## I5. Localization is absent

**Status:** POST-MVP

---

## I6. Error-state and onboarding polish can be expanded

**Status:** POST-MVP UX

Especially:

```text
what PoB code to paste
why a build is partial
what a heuristic score means
how to provide an item candidate
why crafting data may be unavailable
```

---

# J. AI / explanation layer

## J1. Provider-agnostic explainer uses the local template

**Status:** COMPLETE FOR THE DETERMINISTIC PROVIDER  
**Roadmap:** STEP-022

The analysis page can show a deterministic explanation of structured facts. A remote model is still STEP-023 and is not connected.

---

## J2. No real LLM provider is selected/configured

**Status:** OPTIONAL / EXTERNAL CONFIG  
**Roadmap:** STEP-023

A provider/key should only be added intentionally.

The application must continue to work without it.

---

## J3. AI must never become numerical source of truth

**Status:** PERMANENT ARCHITECTURE RULE

Any future AI layer may explain deterministic results.

It may not invent:

```text
DPS
weights
craft odds
item prices
rankings
legal passive paths
```

---

# K. Features explicitly outside the first MVP

These were already identified in planning/backlog and remain future work unless separately promoted.

## K1. Exact universal PoB-equivalent coverage

**Status:** POST-MVP

The current PoB2 integration can calculate selected validated metrics, but universal modeling of every interaction is not claimed.

---

## K2. Gem/support optimization

**Status:** POST-MVP / HIGH VALUE

---

## K3. Compare current build to an arbitrary target build

**Status:** POST-MVP

---

## K4. Respec-cost planning

**Status:** POST-MVP

---

## K5. Leveling-tree generation across level bands

**Status:** POST-MVP

---

## K6. Advanced unique-item substitution analysis

**Status:** POST-MVP

---

## K7. Breakpoint/constraint-aware gear optimization

**Status:** POST-MVP / HIGH VALUE

---

## K8. Native mobile app

**Status:** OUT OF CURRENT PLAN

---

## K9. Social profiles/build-sharing marketplace

**Status:** OUT OF CURRENT MVP

---

# L. Recommended post-MVP polish order

This ordering is a proposed work plan, not a statement that lower items are unimportant.

## Priority 1 — Production correctness and deployability

```text
1. current-patch regression / source refresh audit
2. production data-snapshot provisioning
3. PoB2 production runtime strategy
4. broader E2E/release tests
5. OAuth/session production architecture when GGG access exists
```

---

## Priority 2 — Passive/build fidelity

```text
1. PoB2 exact reranking of heuristic shortlist
2. weapon-set specialisation rules
3. ascendancy optimization
4. free-node/point legality
5. richer skill metadata
```

---

## Priority 3 — Crafting

Resume the saved crafting sequence:

```text
STEP-021
single-action Augmentation simulator
```

then:

```text
expand current weights across classes
validate additional crafting mechanics
multi-step state search
expected attempts/cost
route optimization
step-by-step crafting guides
```

Crafting is a major product pillar and should be one of the first large post-MVP tracks.

---

## Priority 4 — Gear/upgrades

```text
candidate sourcing
constraint-aware ranking
multi-item/loadout optimization
trade workflow research where supported
```

---

## Priority 5 — UX and persistence

```text
saved builds/history
shareable results
full tree visualization
mobile/accessibility polish
onboarding/error-state polish
```

---

## Priority 6 — Optional AI

```text
STEP-023 real provider
conversation/explanation UX
```

Only after deterministic results remain the source of truth.

---

# M. MVP exit checklist

Before declaring the MVP finished, verify:

Checked in STEP-022A on 2026-09-28. Historical entries above stay in place.

```text
[x] canonical npm test passes
[x] typecheck passes
[x] lint passes
[x] format check passes
[x] fixture analysis browser flow works
[x] PoB2 import flow works in supported environment
[x] passive recommendations render with provenance
[x] exact PoB2 delta flow is correctly gated
[x] explicit upgrade comparison flow works
[x] crafting target planner works in its documented scope
[x] unsupported features fail closed
[x] STEP-022 explanation layer works or is intentionally disabled
[x] no secrets committed
[x] all current data pins/checksums documented
[x] this polish register is retained for post-MVP work
```

---

# N. Permanent rules while polishing

Do not "improve" coverage by guessing.

Keep these invariants:

```text
unknown != zero
unresolved != irrelevant
community-derived != official
heuristic != exact PoB measurement
eligible modifier != guaranteed craft outcome
user-entered price != live market quote
visible trade-off != ranking weight
AI explanation != numerical truth
```

These rules are part of the product's correctness model and should survive every post-MVP polish step.

---

# O. MVP exit review — 2026-09-28

**Result:** MVP COMPLETE. PRODUCTION-LAUNCH NOT READY.

The local fixture and pasted-build workflow meets the current MVP. Production launch remains blocked by provisioning, not by a local product defect.

No historical entry in this register was deleted. No open limitation was marked resolved by this review. J1 was already complete for the deterministic provider. GGG login, craft simulation, and a real language-model provider stay open.

Browser evidence used headless Chrome because the IDE browser was unavailable. That is a review method, not a product defect.

New non-blocking note:

- The accessibility check was a smoke pass. After analysis, the first Tab landed on a disclosure summary. Form controls still have readable labels, and status is written in text. A deeper keyboard and WCAG review stays under Priority 5.

Production-launch gaps that remain open:

- cloud or server Path of Building 2 runtime strategy (C1)
- crafting snapshot and community-weight provisioning (F13, F14)
- real GGG credentials and persistent multi-instance sessions (B1, B4)
- production observability and security hardening
