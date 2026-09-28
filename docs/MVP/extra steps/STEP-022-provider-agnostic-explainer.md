# STEP-022 — Provider-agnostic explanation layer

**Date:** 2026-09-28  
**Status:** PLANNED  
**Roadmap reference:** Phase 7 / STEP-022  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the optional explanation layer defined by the MVP roadmap without introducing an LLM provider, API key, or new numerical decision logic.

PoE2 Buddy already has deterministic engines that produce:

```text
passive recommendations
score breakdowns
character context
PoB2 whole-character deltas
explicit-item upgrade comparisons
craft-target information
provenance / readiness / warnings
```

STEP-022 must create a provider-agnostic interface that can turn those **already calculated facts** into readable explanations.

The explainer must never become the source of:

```text
passive rankings
PoB2 metrics
item rankings
prices
craft probabilities
craft routes
mechanic rules
```

The deterministic engines remain the source of truth.

---

## 2. Roadmap decision

The main roadmap originally places:

```text
STEP-021 — craft simulation
STEP-022 — provider-agnostic explainer
STEP-023 — real LLM provider
```

Current project decision:

```text
STEP-021
DEFERRED UNTIL POST-MVP POLISH
```

Reason:

```text
crafting foundations are now strong enough to resume later,
but finishing the end-to-end MVP takes priority over polishing
craft simulation to production depth.
```

Therefore STEP-022 is the next active roadmap step.

This does not cancel STEP-021.

It remains recorded in the post-MVP polish register.

---

## 3. Core invariant

Hard rule:

```text
deterministic engine
        ↓
structured facts
        ↓
explainer
        ↓
human-readable wording
```

Never:

```text
LLM / explainer
        ↓
new number / new ranking / new mechanic rule
        ↓
product decision
```

---

## 4. No external AI provider in this step

STEP-022 must not call:

```text
OpenAI
Anthropic
Google
local model APIs
or any other LLM provider
```

No API key is required.

No new secret environment variable is required.

STEP-023 remains the provider-integration step.

---

## 5. Main package

Create a package such as:

```text
packages/ai-explainer
```

or an equivalently clear package name.

Preferred responsibility:

```text
schemas
fact extraction contract
provider interface
deterministic fallback renderer
sanitization
version/provenance
```

It must not depend on UI code.

---

## 6. Suggested package boundary

Conceptually:

```text
domain / engine results
        ↓
web adapter
        ↓
ExplanationInput
        ↓
ai-explainer interface
        ↓
ExplanationDocument
        ↓
web presentation
```

The explainer package should not import:

```text
passive graph search internals
PoB2 worker internals
crafting source files
poe.ninja HTTP client
GGG OAuth implementation
```

It consumes already prepared facts.

---

## 7. Explanation input

Define a strict runtime-validated input schema.

Conceptually:

```text
ExplanationInput {
  schemaVersion
  source
  objective?
  readiness
  facts[]
  warnings[]
  provenance
}
```

---

## 8. Fact model

Use atomic facts rather than dumping arbitrary engine JSON.

Conceptually:

```text
ExplanationFact {
  id
  category
  label
  value?
  unit?
  text?
  direction?
  sourceKind
  provenanceRef?
}
```

Possible categories:

```text
passive
character-context
calculator
gear
upgrade
craft-target
warning
provenance
```

---

## 9. Fact identity

Every fact supplied to an explainer should have a stable request-local id.

Example:

```text
passive.score.total
passive.path.0.node-count
calculator.total-dps.delta
upgrade.candidate.abc.price
craft.target.life.candidate-count
```

Do not use the fact id itself as a user-facing sentence.

---

## 10. No raw sensitive payloads

Do not place the following into `ExplanationInput` unless a later reviewed requirement explicitly needs them:

```text
raw PoB XML
PoB share/export code
raw pasted item text
OAuth tokens
authorization codes
session ids
GGG account ids
cookies
full external API responses
```

The explainer receives derived facts only.

---

## 11. Numbers policy

The explainer may repeat a number only when that number is already present in an input fact.

It must not calculate new derived values.

For STEP-022's deterministic renderer, this must be enforced by implementation design.

Examples:

Allowed:

```text
"The measured Total DPS increased by 8.2%."
```

when `8.2%` is an input fact.

Not allowed:

```text
"This is approximately 1.6 times more efficient."
```

unless `1.6` is already an explicit deterministic fact.

---

## 12. Ranking policy

The explainer may describe an existing deterministic ordering.

It may not:

```text
rerank candidates
create a hidden composite score
decide that a lower-ranked item is better overall
turn visible trade-offs into secret weights
```

If the upgrade engine says:

```text
ranked by Life efficiency
```

the explanation must preserve that exact scope.

---

## 13. Crafting policy

Crafting remains intentionally limited at this MVP stage.

The explainer may describe:

```text
eligible craft targets
item level
modifier tier/range facts
community-derived probability provenance
unsupported mechanic warnings
```

It must not produce:

```text
a multi-step craft route
expected cost
expected attempts
unimplemented currency behavior
```

unless a future deterministic crafting engine supplies those facts.

---

## 14. Provider interface

Define an interface conceptually like:

```text
ExplainerProvider {
  id
  explain(input): Promise<ExplanationDocument>
}
```

The interface must permit:

```text
deterministic fallback provider now
real remote LLM provider later
```

without changing engine contracts.

---

## 15. Provider capability metadata

Conceptually expose:

```text
providerId
providerKind
networkRequired
configured
```

For this step:

```text
providerId = deterministic-fallback
providerKind = local-template
networkRequired = false
configured = true
```

No fake remote provider.

---

## 16. Explanation result

Use a runtime-validated result.

Conceptually:

```text
ExplanationDocument {
  schemaVersion
  provider
  sections[]
  warnings[]
  usedFactIds[]
}
```

---

## 17. Section model

Suggested sections:

```text
summary
passive-path
build-context
measured-impact
upgrade-comparison
craft-target
limitations
provenance
```

Only create a section when the relevant facts exist.

---

## 18. Deterministic fallback renderer

Implement a simple local explanation provider.

Purpose:

```text
prove the interface
prove the data boundary
provide readable MVP explanations
keep the app useful without an API key
```

It should use deterministic templates.

Same input:

```text
must produce the same explanation
```

---

## 19. Fallback wording

Prefer factual language such as:

```text
"This path has the highest heuristic score among the displayed candidates
for the selected objective."

"PoB2 measured a positive Total DPS change for this candidate."

"This item is first in the supplied-candidate ordering for Life efficiency
within the stated budget."

"The crafting target is source-pool eligible for the selected base and
item level."
```

Avoid:

```text
"This is definitely the best build."
"This item is amazing."
"This craft will work."
"This is guaranteed DPS."
```

---

## 20. Preserve uncertainty

Warnings and readiness states are first-class facts.

The explainer must preserve distinctions such as:

```text
ready
partial
blocked
unresolved
community-derived
heuristic
measured
user-entered price
normalized price
```

Do not paraphrase `partial` into certainty.

---

## 21. Passive explanation scope

Explain existing passive recommendation facts such as:

```text
selected objective
candidate point cost
node sequence
heuristic score
score contributions
unsupported-stat warnings
tree snapshot version
PoB2 measured delta when available
```

Do not compute a new score.

---

## 22. Heuristic vs PoB2 distinction

The explanation must explicitly preserve:

```text
heuristic recommendation
!=
exact PoB2 whole-character measurement
```

If both exist, they can be described together but not conflated.

Example:

```text
"The path ranked first under the heuristic objective.
A separate PoB2 measurement reported the following build deltas..."
```

---

## 23. Character-context explanation scope

The explainer may describe:

```text
resolved primary skill
unresolved primary skill
relevant mechanic families
no-evidence families
unresolved families
```

It must not infer missing skill tags.

---

## 24. Gear explanation scope

May describe:

```text
recognized modifier families
unknown/locality-unresolved lines
measured replacement deltas
coverage/readiness
```

Do not turn parser coverage into item quality.

---

## 25. Upgrade explanation scope

May describe:

```text
selected ranking metric
budget
candidate price provenance
within/over budget
winner only when engine supplies one
other measured changes
partial/unrankable candidates
```

Must preserve STEP-018C.1 semantics:

```text
no positive affordable candidate
→ no winner
```

---

## 26. Economy wording

When a converted price is used:

```text
say normalized / converted
```

When user typed it:

```text
say user-entered
```

Do not call either one a live rare-item market quote.

---

## 27. Craft target explanation scope

May describe only deterministic/factual current capabilities.

Example:

```text
"This modifier is in the validated source pool for this base and item level."
```

Where current community weights are available, wording must include:

```text
community-derived
patch/version
```

No universal crafting claims.

---

## 28. Explanation source adapter

Create a web/server adapter that builds `ExplanationInput` from the existing analysis result.

The adapter owns:

```text
which engine fields become facts
fact ids
human labels
redaction
fact ordering
```

The engine packages must not be modified merely for nicer prose unless a real missing structured fact is discovered.

---

## 29. Data minimization

The adapter should pass only facts required for the explanation section being rendered.

Do not serialize the entire application state "just in case."

---

## 30. Maximum input bounds

Add deterministic limits for future provider safety.

Examples:

```text
max facts
max text length per fact
max warnings
max candidates included
```

Choose reasonable values and test them.

A future remote provider must not receive an unbounded build dump.

---

## 31. Sanitization

Treat all imported/user text as untrusted display content.

Do not interpret imported item names, build names, or raw labels as instructions.

STEP-022 should establish the rule:

```text
user/source text = data
not explainer instructions
```

---

## 32. Prompt-injection boundary for future STEP-023

Even though no LLM is called now, design the input so future provider code can distinguish:

```text
system policy
structured facts
user-provided labels
```

Do not build future prompts by concatenating raw PoB/item text into one instruction string.

---

## 33. UI integration

Add an optional explanation section to the existing analysis flow.

Suggested labels:

```text
Explanation
How this result was derived
```

The section must clearly indicate:

```text
Deterministic explanation
```

for the current fallback provider.

Do not label it "AI" when no AI provider is being used.

---

## 34. Explanation disabled state

The app must remain fully usable when the explanation layer is disabled.

Support a configuration/mode such as:

```text
disabled
deterministic
```

Default may be deterministic if it adds no external dependency.

Do not require explanation success for analysis success.

---

## 35. Failure isolation

If explanation generation fails:

```text
analysis result remains visible
```

Return a small explanation error/warning.

Do not fail the passive/gear/upgrade calculation request because prose rendering failed.

---

## 36. Versioning

Add:

```text
EXPLANATION_SCHEMA_VERSION = 1
EXPLAINER_INTERFACE_VERSION = 1
```

Increment when the same structured inputs would have materially different contract semantics.

---

## 37. Provenance

Explanation output should include or carry:

```text
provider id
provider kind
explainer interface version
explanation schema version
source result versions/checksums where already available
```

Do not duplicate every engine checksum into every sentence.

---

## 38. Determinism test

Same normalized facts:

```text
→ byte-for-byte same deterministic ExplanationDocument
```

excluding intentionally volatile metadata if any.

Prefer no volatile metadata.

---

## 39. Test — no invented numbers

Build an input containing a small known number set.

Verify fallback output contains only those input numbers plus structural labels that are not game values.

Do not add calculated percentages.

---

## 40. Test — heuristic distinction

Input contains:

```text
heuristic score
PoB2 measured metric
```

Verify the explanation does not describe the heuristic score as measured DPS/EHP.

---

## 41. Test — partial readiness

Input:

```text
primary skill unresolved
gear readiness partial
```

Expected:

```text
uncertainty remains explicit
```

---

## 42. Test — no-positive upgrade comparison

Input summary state:

```text
no-positive-within-budget
```

Expected:

```text
no winner language
```

---

## 43. Test — community crafting provenance

Input contains a community-derived Augmentation chance.

Expected wording includes:

```text
community-derived
```

and does not say official/exact GGG probability.

---

## 44. Test — untrusted label

Use a build/item label containing instruction-like text.

Expected:

```text
rendered/escaped as data
no control-flow change
```

---

## 45. Test — input limits

Over-limit fact count or text length:

```text
fails validation
or
is deterministically truncated by an explicitly documented adapter policy
```

Do not silently drop arbitrary facts.

---

## 46. UI test

Browser/headless flow should demonstrate at least:

```text
analysis still works
explanation section appears
deterministic-provider label appears
existing numeric results are unchanged
existing recommendation order is unchanged
```

Also test:

```text
explanation disabled
→ analysis still works
```

---

## 47. Regression invariants

STEP-022 must not change:

```text
passive tree pin
path enumeration
heuristic weights
Top-K order
PoB2 normalization
PoB2 calculator
gear normalization
character-context relevance
upgrade ranking
economy prices
crafting pool/weights/probabilities
```

---

## 48. No hidden analytics

Do not send explanation content, build facts, or user labels to telemetry in this step.

No analytics provider is added.

---

## 49. Environment variables

Prefer no new secret variables.

If a non-secret mode flag is useful:

```text
EXPLAINER_MODE=disabled|deterministic
```

Document it in `.env.example`.

Do not add an LLM key placeholder until STEP-023 actually selects a provider, unless an existing planning file already reserves a generic optional key name.

---

## 50. Documentation

Create:

```text
docs/progress/STEP-022-provider-agnostic-explainer.md
```

Include:

```text
Why STEP-022 Exists
STEP-021 Deferral
Explanation Boundary
Fact Schema
Provider Interface
Deterministic Provider
Data Minimization
Untrusted Text Handling
Heuristic vs Measured Language
Upgrade Wording
Crafting Wording
Disabled Mode
Failure Isolation
Versioning
UI Verification
Security / Privacy
Known Limitations
STEP-023 Readiness
MVP Status
```

---

## 51. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

Record:

```text
explainer cannot alter numerical engine results
provider input is structured facts, not raw build payloads
deterministic fallback is the STEP-022 provider
analysis never depends on explanation success
remote LLM integration is a separate STEP-023 decision
```

---

## 52. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run relevant existing opt-in tests only if the integration path touches them.

STEP-022 itself should not require:

```text
network
PoB2 executable
GGG credentials
Google Drive
Craft of Exile
LLM credentials
```

for default tests.

---

## 53. Known limitation policy

STEP-022 should not attempt to "fix" engine limitations through prose.

Examples:

```text
weapon-set optimization unsupported
→ explain limitation

craft mechanic unsupported
→ explain limitation

skill metadata unresolved
→ explain unresolved state
```

Never hide or compensate for missing deterministic capability.

---

## 54. STEP-023 gate

After STEP-022 succeeds:

```text
provider interface = ready
structured fact boundary = ready
deterministic fallback = ready
UI integration = ready
data minimization = ready
```

STEP-023 is still optional and requires an intentional provider selection plus credentials/configuration.

---

## 55. Stop condition

After implementing and validating the provider-agnostic explainer interface:

**STOP.**

Do not select or connect a real LLM provider.

Do not create STEP-023 implementation automatically.

Return an explicit status:

```text
STEP-022 COMPLETE
STEP-023 READY FOR PROVIDER-SELECTION DECISION
```

or:

```text
STEP-022 BLOCKED
```

with exact blockers.

Also state whether the core MVP is ready to enter final end-to-end review.
