# PoE2 Buddy — UI/UX MASTER

**Date:** 2026-09-28  
**Status:** MASTER PLAN — PLANNED  
**Scope:** Post-MVP UI/UX redesign and usability program  
**Product state:** MVP COMPLETE / PRODUCTION-LAUNCH NOT READY  
**Authoring context:** Cursor-assisted development

---

# 1. Purpose

The PoE2 Buddy MVP is functionally complete, but it was built primarily to prove correctness, data flow, source validation, and deterministic engine behavior.

The current product can:

```text
load fixtures
import supported PoB2 builds
analyze passive paths
show heuristic recommendations
show character context
normalize gear text
measure selected changes through PoB2
compare explicit item upgrades
show craft-target information
display deterministic explanations
```

However, the current UI grew step-by-step around implementation milestones.

That means the product is currently much easier for a developer who knows the architecture to understand than for a normal Path of Exile 2 player opening it for the first time.

The purpose of this UI/UX program is to transform:

```text
working technical MVP
```

into:

```text
understandable
testable
coherent
player-facing
product experience
```

without changing the trusted engine logic underneath it.

---

# 2. Core UI/UX objective

A user should be able to open PoE2 Buddy and quickly understand:

```text
1. what the app does;
2. how to load a build;
3. what Buddy understood about the build;
4. what Buddy recommends;
5. how confident / complete that recommendation is;
6. what can be measured exactly;
7. what is heuristic;
8. what is unavailable;
9. what the user should do next.
```

The interface should not require knowledge of:

```text
internal package names
fixture ids
raw stat ids
engine version names
source schemas
developer-only terminology
```

unless the user intentionally opens an advanced/technical panel.

---

# 3. What this program must NOT do

UI/UX work must not silently change:

```text
passive recommendation order
heuristic weights
PoB2 calculations
gear locality rules
upgrade ranking rules
crafting probability rules
community weight data
GGG integration behavior
```

The UI can reorganize, summarize, explain, filter, or progressively disclose existing information.

It must not create new game truth.

If a feature does not exist, the UI should:

```text
hide it
disable it clearly
or label it as not available yet
```

Never simulate completeness through presentation.

---

# 4. Current UI/UX state — evidence-based review

This section summarizes the current product based on the implemented UI steps and the final MVP browser review.

## 4.1 Current analysis page

The main analysis flow currently supports:

```text
fixture selection / import
objective
point budget
Analyze
passive recommendation lists
score breakdown
tree provenance
local passive-path sketch
path comparison
build context
gear analysis
optional exact PoB2 delta
explicit upgrade comparison
deterministic explanation
```

This means a very large amount of information has accumulated on one page.

### Current strengths

```text
the core workflow works
important warnings are present
heuristic and exact values are distinguished
provenance is available
unsupported states generally fail closed
390px viewport has been smoke-tested
major flows are accessible from the browser
```

### Current weaknesses

```text
information density is high
technical and player-facing information are mixed
the page can become very long
some sections are implementation-centric
the user has to know which section matters
many result blocks compete for attention
```

---

## 4.2 Passive recommendations

The current passive result shows:

```text
fully valued paths
incomplete paths
node order
node names
node ids
heuristic score
score contribution breakdown
local coordinate sketch
optional comparison between two paths
```

Known usability problem:

```text
one analysis can return hundreds of incomplete paths
```

The Witch example historically returned more than 300 incomplete paths.

This is technically transparent but poor for normal product usability.

The local passive sketch is useful, but it is:

```text
not the full tree
not official tree artwork
only a local path cluster
```

A user can still struggle to understand where the suggested path is relative to the full build.

---

## 4.3 Build import

The product currently supports:

```text
fixtures
pasted/imported PoB2 data
future GGG flow behind a disabled gate
```

The actual product-facing import experience still exposes concepts originating from development/testing.

The user should not need to understand:

```text
Fixture A
Fixture F
tree key 0_5
normalization version
```

during the normal journey.

These can remain available in advanced/debug mode.

---

## 4.4 Character context

The product can show:

```text
class
level
ascendancy context
primary skill when resolved
relevant mechanic families
unresolved states
configuration context
```

Current challenge:

```text
partial
unresolved
no evidence
```

are technically precise but can be difficult for a normal player to interpret without explanation.

The UI needs to communicate:

```text
what Buddy understood
what Buddy could not determine
whether that matters for the recommendation
```

---

## 4.5 Gear analysis

Current gear presentation correctly distinguishes:

```text
local
global
unknown
```

and correctly warns that parser coverage is not item quality.

This is trustworthy, but still highly technical.

A normal user likely wants to see:

```text
Helmet
Body Armour
Gloves
Boots
Weapon
etc.
```

as recognizable gear slots first, then inspect technical modifier parsing only when needed.

---

## 4.6 Exact PoB2 calculation

Exact candidate measurement is one of the strongest capabilities in the product.

The current UI can expose:

```text
requested ids
verified ids
actual allocated ids
point cost
before/after metrics
runtime fingerprint
restore verification
```

This is excellent diagnostic data.

It is too much to make primary UI.

The normal user should first see:

```text
Measured impact
Total DPS +X
Average Hit +Y
EHP +Z
```

while:

```text
runtime fingerprint
verified node ids
restore diagnostics
```

belong in an expandable technical details panel.

---

## 4.7 Upgrade comparison

The product can compare explicit pasted items by:

```text
selected metric
price
budget
efficiency
measured changes
other trade-offs
```

The current logic is trustworthy.

The current UX still requires the user to understand:

```text
raw item text
manual item price
ranking metric
budget meaning
comparison currency
```

This can be made much easier through a guided item-comparison workflow.

---

## 4.8 Craft target planner

The crafting page currently asks for technical inputs such as:

```text
item class
base
item level
stat id / modifier target
```

It produces correct source-pool facts.

But for a normal user:

```text
base_maximum_life
```

is not an acceptable primary input label.

The UI should instead lead with:

```text
Maximum Life
Strength
Fire Resistance
Spirit
```

while retaining the raw stat id in advanced details.

The page also needs stronger visual separation between:

```text
eligible modifier
probability
crafting route
```

because only some of these capabilities currently exist.

---

## 4.9 Explanation layer

The deterministic explanation exists and is trustworthy.

Current limitations:

```text
primarily attached to passive analysis
not deeply integrated into upgrade and crafting pages
can appear before/around other recommendation information in ways that affect reading order
```

The explanation should eventually become contextual help, not another large block competing with the results.

---

## 4.10 Navigation

The product now has multiple meaningful workflows:

```text
Analyze Build
Upgrade Comparison
Craft Targets
```

but the experience grew organically.

A player should understand these as one product journey:

```text
Import build
→ Understand build
→ Improve passives
→ Improve gear
→ Plan crafting
```

The application needs a real information architecture and global navigation.

---

## 4.11 Accessibility

The MVP completed a smoke check only.

Known facts:

```text
major form controls have visible labels
important states are not only color-based
first keyboard focus after analysis may land on a disclosure
no full WCAG audit exists
```

Accessibility needs its own dedicated UI/UX step.

---

## 4.12 Mobile / responsive design

The early analysis page was checked at 390px.

That proves:

```text
no obvious horizontal page overflow
```

It does not prove:

```text
good mobile usability
touch-friendly controls
comfortable tables
readable result hierarchy
responsive tree visualization
usable item comparisons
```

Responsive design remains a real task.

---

## 4.13 Performance perception

Observed MVP timings included approximately:

```text
fixture analysis ~1.8s
craft target ~1.2s
exact PoB measurement ~5s
two-item comparison ~14s
```

These are technically acceptable but require good UX feedback.

A 14-second operation without excellent loading feedback feels broken.

The UI should distinguish:

```text
loading
calculating
validating
done
failed
```

and explain long-running calculations.

---

# 5. UI/UX design philosophy

PoE2 Buddy should feel:

```text
technical but not intimidating
dark but readable
dense when the user wants detail
simple when the user wants an answer
game-adjacent without copying Path of Exile UI
```

The product should emphasize:

```text
clarity
confidence
comparison
progressive disclosure
trust
actionability
```

---

# 6. Proposed visual direction

Recommended product character:

```text
dark analytical dashboard
charcoal / near-black surfaces
warm gold/amber accent
muted blue for measured/informational data
clear neutral success/warning/error states
high contrast typography
subtle borders rather than heavy panels everywhere
```

Do not recreate GGG assets or the game client UI.

The product should look like a modern build-analysis tool inspired by the game's atmosphere.

---

# 7. Primary user journey

The default journey should become:

```text
Landing / Dashboard
        ↓
Import build
        ↓
Build overview
        ↓
Recommendations
        ↓
Passive upgrades
Gear upgrades
Craft planning
        ↓
Technical details only when requested
```

The user should always know:

```text
Where am I?
What did Buddy analyze?
What should I look at next?
```

---

# 8. Proposed global information architecture

Recommended primary navigation:

```text
Dashboard
Build
Passives
Gear
Crafting
```

Optional later:

```text
History
Settings
```

Within a loaded build:

```text
Build
├─ Overview
├─ Passives
├─ Gear
├─ Upgrades
└─ Crafting
```

Technical/debug information should not be a primary navigation destination.

Use:

```text
Technical details
Data & provenance
Diagnostics
```

as secondary panels.

---

# 9. Dashboard / landing page

The landing page should immediately answer:

```text
What is PoE2 Buddy?
What can I do here?
How do I start?
```

Primary CTA:

```text
Analyze a build
```

Secondary:

```text
Try a demo build
```

Possible cards:

```text
Import from Path of Building
Try demo build
GGG account — unavailable / coming when access is configured
```

Do not make users start from an implementation fixture selector.

---

# 10. Demo / testing mode

Because the owner needs to test the product easily, add a user-friendly testing mode.

Instead of:

```text
Fixture A
Fixture F
Witch fixture
```

show:

```text
Demo — Fireball Witch
Demo — Gear Parsing Example
Demo — Upgrade Comparison Example
Demo — Crafting Example
```

Each demo card should say what it demonstrates.

Example:

```text
Fireball Witch
Tests:
• PoB import
• passive recommendations
• build context
• exact PoB measurement
```

A developer id can remain visible under:

```text
Technical details
```

---

# 11. First-run onboarding

Add a lightweight onboarding experience.

Not a long wizard.

Possible first screen:

```text
1. Import your build
2. Choose what you want to improve
3. Review recommendations
```

Explain the difference between:

```text
Heuristic recommendation
Measured by PoB2
Community-derived crafting data
```

before those labels appear in complex results.

---

# 12. Build import redesign

Create a clear source selector:

```text
Path of Building
Demo build
GGG account
```

For PoB:

```text
Paste your PoB2 export code
```

with:

```text
Where do I find this?
Example / help
Paste
Analyze
```

Do not show fixture JSON in normal user mode.

Developer fixture JSON can move into:

```text
Advanced testing
```

---

# 13. Build header / identity card

Once a build is loaded, create a persistent build header:

```text
Character / build name
Class
Ascendancy
Level
Primary skill
Import source
Analysis status
```

Example:

```text
Fireball Witch
Witch · Infernalist · Level 82
Primary skill: Fireball
Source: Path of Building
```

This gives every page context.

---

# 14. Analysis status model

Create consistent status badges.

Recommended categories:

```text
Ready
Partial
Unavailable
Experimental
```

And evidence badges:

```text
Heuristic
Measured by PoB2
Community-derived
User-entered
Pinned game data
```

These should look consistent across all workflows.

---

# 15. Results hierarchy

The current product often leads with detailed technical result blocks.

The new hierarchy should be:

```text
1. What matters
2. What changed
3. Why
4. Trade-offs
5. Limitations
6. Technical details
```

Example passive card:

```text
Recommended next path
+2 passive points

Spell Damage
Spell Damage

Heuristic score: 32

Why:
+ spell damage
+ relevant to current build

[View path]
[Measure with PoB2]
[Technical details]
```

---

# 16. Passive recommendation cards

Each recommendation should be a card.

Card content:

```text
rank / label
point cost
main node names
heuristic score
top contributions
valuation completeness
measurement status
```

Do not display dozens of numbers by default.

Technical data can expand.

---

# 17. Incomplete-path handling

The current interface can expose hundreds of incomplete candidates.

New behavior:

```text
Top recommendations
```

first.

Then:

```text
Other paths with incomplete valuation
```

collapsed by default.

Show perhaps:

```text
first 10
```

with:

```text
Show more
Search/filter
```

Do not render hundreds of rows into the main reading flow unless explicitly requested.

This does not change ranking logic.

It changes presentation only.

---

# 18. Passive tree visualization

This should become a major UI/UX track.

Current:

```text
small local path sketch
```

Desired:

```text
interactive tree canvas
```

Capabilities:

```text
pan
zoom
current allocated nodes
recommended nodes
ordered path
hover node details
compare two recommendations
fit-to-path
fit-to-current-build
legend
```

Do not require official game artwork.

Use the current exported node coordinates.

---

# 19. Passive comparison UX

Instead of checkboxes buried among result lists, provide:

```text
Compare
```

on recommendation cards.

Then open a comparison view:

```text
Path A vs Path B
```

showing:

```text
point cost
shared nodes
unique nodes
heuristic contribution differences
measurement differences when available
```

Do not create a new hidden winner.

---

# 20. Exact PoB2 measurement UX

Treat exact measurement as a premium-quality action in the interface.

Button:

```text
Measure this path with PoB2
```

States:

```text
Not available
Ready to measure
Calculating
Measured
Failed
```

While calculating:

```text
Calculating whole-build impact…
This may take several seconds.
```

Result should first show user metrics:

```text
Total DPS
Average Hit
Life
EHP
Armour
Evasion
```

Then technical details:

```text
verified node ids
runtime fingerprint
restore check
versions
```

---

# 21. Heuristic vs exact visual distinction

This distinction is critical.

Use visually consistent labels:

```text
HEURISTIC
MEASURED BY POB2
```

Potential design:

```text
Heuristic → amber
Measured → blue
Community-derived → violet
Unavailable → muted gray
```

Do not rely on color alone.

Always include the text label.

---

# 22. Character context redesign

Convert current context output into a readable summary.

Example:

```text
Buddy understands this build as:

Primary skill
Fireball

Relevant mechanics
• Spell
• Fire
• Projectile

Still uncertain
• X
• Y
```

Then:

```text
Why?
```

opens evidence.

The user should not need to interpret raw readiness terminology first.

---

# 23. Gear overview

Add a visual gear grid:

```text
Helmet
Body Armour
Gloves
Boots
Amulet
Ring 1
Ring 2
Belt
Weapon 1
Weapon 2
```

Each slot:

```text
item name
recognized modifiers
coverage state
```

Click a slot to inspect:

```text
local/global/unknown
raw lines
normalized facts
```

---

# 24. Gear uncertainty UX

Unknown parsing should not look like a software failure.

Preferred:

```text
Some modifiers could not be fully classified.
```

with:

```text
2 understood
1 uncertain
```

Then allow:

```text
View uncertain lines
```

Do not show:

```text
parser coverage
```

as the primary player label.

That can remain in advanced details.

---

# 25. Upgrade comparison redesign

Create a guided comparison flow.

Step 1:

```text
What do you want to compare?
```

Step 2:

```text
Paste candidate item
```

Step 3:

```text
Enter price
```

Step 4:

```text
Choose metric
```

Step 5:

```text
Compare
```

The user should understand why each field exists.

---

# 26. Item paste UX

Provide:

```text
Paste item from clipboard
```

with a short example/help panel:

```text
In PoE2, copy the item text and paste it here.
```

After paste, immediately preview:

```text
Item name
slot
base
recognized modifiers
```

before calculation.

This creates confidence that the correct item was pasted.

---

# 27. Upgrade comparison results

Use comparison cards/table with clear hierarchy:

```text
Candidate
Price
Within budget?
Selected metric change
Efficiency
Important trade-offs
```

User-entered price should have a badge:

```text
USER-ENTERED PRICE
```

Do not visually imply it is a live market price.

---

# 28. Upgrade trade-offs

Trade-offs should be prominent, not hidden in technical detail.

Example:

```text
Life +82
Total EHP +65
Armour -50
Mana -2
```

This is one of the most important trust features in the product.

---

# 29. Budget UX

Clarify:

```text
Budget = maximum cost for one candidate item
```

Show this near the input.

Do not rely on a warning after the comparison.

---

# 30. Crafting landing page

Crafting needs a player-facing entry point.

Possible landing options:

```text
Find modifiers for a base
Plan a craft target
Craft simulator — coming later
```

Because STEP-021 is deferred, the simulator must not look usable yet.

---

# 31. Craft target input redesign

Replace raw identifiers in primary UI.

Current technical concept:

```text
base_maximum_life
```

Player-facing:

```text
Maximum Life
```

Search input:

```text
Search a stat…
Life
Fire Resistance
Spirit
Strength
```

Raw stat id:

```text
Advanced details
```

---

# 32. Craft modifier result cards

Each result should present:

```text
Modifier name
Tier
Required item level
Roll range
Prefix / suffix
Eligibility
Community weight when applicable
```

Explain:

```text
Eligible does not mean guaranteed.
```

with a small info tooltip rather than only a long warning paragraph.

---

# 33. Crafting confidence model

Consistent states:

```text
Source-pool eligible
Probability available
Probability unavailable
Mechanic not modeled
Combination not validated
```

Avoid making all uncertainty look like the same generic warning.

---

# 34. Future crafting simulator UI placeholder

The UI master should reserve space for future STEP-021+ work.

Future structure:

```text
Craft target
Starting item
Recommended route
Step 1
Step 2
Step 3

Chance
Expected attempts
Expected cost
Recovery / restart condition
```

Do not implement this until the deterministic engine exists.

---

# 35. Explanation UX

The deterministic explanation should become contextual.

Instead of one large explanation section:

```text
Why this recommendation?
```

inside the recommendation card.

Also consider:

```text
Explain this metric
Why is this unresolved?
What does community-derived mean?
```

These can all use deterministic text initially.

---

# 36. Provenance UX

Technical provenance is important but should not dominate the normal interface.

Create one consistent component:

```text
Data & provenance
```

Collapsed by default.

Contains:

```text
GGG tree version
commit
checksum
PoB version
runtime fingerprint
crafting snapshot
community weight patch
engine/schema versions
```

This retains transparency without overwhelming normal users.

---

# 37. Advanced / technical mode

Add an optional UI preference:

```text
Show technical details
```

Normal mode:

```text
player-facing labels
summary metrics
actionable information
```

Advanced mode:

```text
node ids
stat ids
checksums
runtime fingerprint
schema versions
raw normalized lines
```

This is extremely valuable for development and testing.

---

# 38. Global navigation shell

Create a consistent application shell.

Desktop:

```text
logo / product name
Build
Passives
Gear
Crafting

current build summary
settings/help
```

Mobile:

```text
compact header
bottom navigation or menu
```

Navigation should preserve the current loaded build where technically possible.

---

# 39. Page titles and breadcrumbs

Every page should clearly answer where the user is.

Examples:

```text
Build / Overview
Build / Passives
Build / Gear
Build / Upgrades
Build / Crafting
```

Avoid standalone pages that feel unrelated.

---

# 40. Sticky current-build context

When a build is loaded, keep a compact context bar visible:

```text
Fireball Witch
Infernalist
Level 82
PoB source
```

The user should never wonder which build they are analyzing.

---

# 41. Loading states

Every async action needs a deliberate loading state.

Examples:

```text
Analyzing passive tree…
Importing Path of Building…
Measuring in PoB2…
Comparing items…
Loading crafting data…
```

For slower operations:

```text
This can take ~5–15 seconds.
```

Use current measured performance to set truthful expectations.

---

# 42. Progress perception

Where an operation has clear phases, show them.

For PoB2:

```text
Loading build
Validating candidate
Calculating
Restoring original build
Done
```

Only show stages that really exist.

Do not fake percentage progress.

---

# 43. Empty states

Design intentional empty states:

```text
No build loaded
No exact calculator available
No upgrade candidates added
No craft target selected
No comparison created
```

Each should contain:

```text
what this means
what the user can do next
```

---

# 44. Error states

Errors should be separated into:

```text
Input problem
Feature unavailable
Data unavailable
Calculation failed
Compatibility problem
```

Do not expose raw internal error codes as the main message.

Example:

```text
Could not analyze this PoB build.
```

Then:

```text
Technical details: candidate-allocation-mismatch
```

---

# 45. Warning hierarchy

Use consistent warning severity:

```text
Info
Caution
Blocking
```

Examples:

Info:

```text
This price was entered by you.
```

Caution:

```text
Some modifiers could not be classified.
```

Blocking:

```text
Crafting data is not available for this patch.
```

---

# 46. Tooltips and glossary

Complex terms need contextual definitions.

Examples:

```text
Heuristic score
PoB2 measured
Source-pool eligible
Community-derived
Partial
Unresolved
EHP
Spawn weight
```

A short tooltip can prevent entire warning paragraphs.

---

# 47. Help center / "What does this mean?"

Add a lightweight help system.

Potential content:

```text
How recommendations work
Heuristic vs PoB2 measurement
How to copy a PoB build
How to copy item text
How crafting data works
Why some data is unresolved
```

This can start as local static content.

---

# 48. Testability mode for the product owner

Add a clear owner/developer testing surface.

Possible route:

```text
/test
```

or:

```text
?testMode=1
```

Functions:

```text
load known demo scenarios
jump directly to passive test
jump directly to gear test
jump directly to upgrade comparison
jump directly to craft planner
show expected known result
```

This should be clearly marked:

```text
TEST MODE
```

and should not alter production engine behavior.

---

# 49. Demo scenario catalog

Create named demos:

```text
01 — Basic passive recommendation
02 — PoB2 import
03 — Partial skill context
04 — Gear locality
05 — Exact passive measurement
06 — Upgrade comparison
07 — No-positive-budget case
08 — Craft target
09 — Unsupported craft class
10 — Explanation disabled/error
```

Each scenario should state:

```text
what the user should observe
```

This makes manual regression testing dramatically easier.

---

# 50. Product-owner test checklist

Inside test mode, provide a checklist:

```text
[ ] Build imported
[ ] Passive recommendation visible
[ ] Explanation visible
[ ] Exact measurement works
[ ] Gear uncertainty visible
[ ] Upgrade trade-off visible
[ ] Craft warning visible
```

Do not treat this as automated test truth.

It is manual UX verification support.

---

# 51. Responsive design

Create explicit responsive targets:

```text
desktop ≥ 1280
laptop 1024–1279
tablet 768–1023
mobile < 768
```

Validate:

```text
navigation
forms
cards
tables
tree visualization
comparison views
technical detail panels
```

Do not only test for horizontal overflow.

---

# 52. Mobile priorities

On mobile:

```text
summary first
actions second
technical data collapsed
tables become stacked cards
tree canvas gets full-width focus mode
```

Avoid trying to preserve desktop density.

---

# 53. Accessibility program

Dedicated review required for:

```text
keyboard navigation
focus order
focus visibility
form labels
ARIA where required
screen reader output
table semantics
disclosures
dialog focus trapping
contrast
zoom to 200%
reduced motion
touch target sizes
```

Target:

```text
WCAG 2.2 AA where practical
```

---

# 54. Focus management

Known MVP issue:

```text
first Tab can land in a disclosure after analysis
```

Define intentional focus behavior after:

```text
Analyze
Import
Measure
Compare
Craft query
Error
```

Example:

```text
after Analyze → focus result summary heading
```

---

# 55. Design system

Create reusable tokens for:

```text
spacing
radius
surface levels
border
text hierarchy
accent
success
warning
error
measured
heuristic
community-derived
```

Avoid one-off styling per feature.

---

# 56. Typography

Define hierarchy:

```text
Page title
Section title
Card title
Primary metric
Body
Secondary text
Technical monospace
```

Use monospace selectively for:

```text
node ids
checksums
raw ids
```

not for player-facing labels.

---

# 57. Card system

Create reusable cards for:

```text
Build summary
Recommendation
Metric
Gear slot
Upgrade candidate
Craft modifier
Warning
Provenance
```

Each should have consistent:

```text
header
status
body
actions
details
```

---

# 58. Badge system

Reusable badges:

```text
Heuristic
Measured by PoB2
Community-derived
User-entered
Partial
Unavailable
Within budget
Over budget
```

No feature should invent its own unrelated wording/style for the same state.

---

# 59. Table system

Tables are useful for technical comparison but need:

```text
responsive behavior
sticky headers where useful
row hierarchy
empty state
sorting only where semantically allowed
```

Never add UI sorting that changes the meaning of a deterministic ranked list without clearly marking it as presentation-only.

---

# 60. Color usage

Color is supplemental.

Never encode:

```text
better/worse
available/unavailable
warning/error
```

with color alone.

Use:

```text
icon
label
number/sign
text
```

---

# 61. Icons

Use a consistent icon library if a dependency is appropriate.

Potential icons:

```text
build
passive
gear
craft
measure
warning
info
copy
expand
compare
```

Do not use decorative icons that imply game mechanics inaccurately.

---

# 62. Motion

Keep motion subtle.

Allowed:

```text
section expansion
card state transition
loading spinner
canvas hover
```

Avoid:

```text
large animated backgrounds
game-like effects
animations that delay data reading
```

Respect:

```text
prefers-reduced-motion
```

---

# 63. State persistence within a session

Without introducing user accounts yet, improve testing usability by preserving safe UI state locally where appropriate.

Possible:

```text
last import source
last objective
last point budget
technical-details preference
selected comparison metric
```

Do not persist:

```text
OAuth tokens
raw personal PoB data
raw pasted item text
```

without an explicit privacy/storage decision.

---

# 64. Copy actions

Useful copy buttons:

```text
Copy recommended node ids
Copy recommendation summary
Copy measured deltas
Copy craft target details
```

Copy output should be human-readable.

---

# 65. Shareable state — later

Shareable analysis links remain outside the immediate UI overhaul unless a persistence architecture is approved.

The UI should not imply a share button exists until the backend/storage model exists.

---

# 66. Search and filtering

Potential filters:

Passive paths:

```text
Complete only
Incomplete
Point cost
Search node name
```

Gear:

```text
Unknown modifiers only
Slot
```

Crafting:

```text
Prefix
Suffix
Tier
Required level
```

Filters must not alter engine results.

They alter visibility only.

---

# 67. Data density controls

Offer:

```text
Simple
Detailed
Technical
```

either explicitly or through progressive disclosure.

The normal default should not show everything the engine knows.

---

# 68. Product language

Prefer:

```text
Recommendation
Measured impact
Trade-off
Unavailable
Not enough evidence
```

Avoid overly internal terms:

```text
readiness gate
schema mismatch
candidate-allocation-mismatch
```

unless the technical panel is open.

---

# 69. Terminology consistency

Create a central UI terminology map.

Examples:

```text
Heuristic score always means the same thing.
Measured by PoB2 always means exact calculator output.
Community-derived always means non-official community data.
Unavailable never means zero.
```

---

# 70. Trust model

Trust is a primary design feature.

Every important result should make its evidence type visible without requiring a long disclaimer.

Example:

```text
Total DPS +33.3%
MEASURED BY POB2
```

Example:

```text
T1 Life chance 0.80%
COMMUNITY-DERIVED
```

Example:

```text
Passive score 32
HEURISTIC
```

---

# 71. "What should I do next?" actions

Every major page should suggest the next valid action.

Example after passive analysis:

```text
Measure this path with PoB2
Compare another path
Review gear
```

After gear:

```text
Compare replacement items
```

After craft target:

```text
Review eligible modifiers
Craft simulator coming later
```

Do not suggest actions that are unsupported.

---

# 72. Success states

Users need confirmation.

Examples:

```text
Build imported
Analysis complete
PoB measurement complete
Comparison complete
Craft target loaded
```

Success messaging should be subtle and contextual.

---

# 73. Developer diagnostics separation

Move developer-focused data behind:

```text
Technical details
```

including:

```text
checksums
commits
runtime fingerprint
schema versions
raw error codes
node id verification sets
```

This information stays available for trust and debugging.

It should not dominate normal product use.

---

# 74. Current UI technical debt to explicitly address

Known/likely issues from the MVP evolution:

```text
single page accumulated many independent sections
hundreds of incomplete passive paths can dominate page length
fixture-oriented testing language leaks into the UI
technical identifiers are exposed in primary controls
exact-calculation diagnostics are too prominent for normal users
several workflows require prior project knowledge
crafting warnings depend on users reading long text
loading operations need clearer feedback
keyboard/focus behavior has not been fully designed
mobile was smoke-tested, not designed
```

These should be treated as primary UI/UX redesign targets.

---

# 75. UI architecture rule

Do not put engine logic into components.

Recommended layering:

```text
engine output
    ↓
server/view-model adapter
    ↓
UI-specific view model
    ↓
React components
```

A view model can:

```text
group
label
format
hide behind disclosure
select presentation order
```

but it must not:

```text
recalculate
rerank
reinterpret
```

game values.

---

# 76. Component organization

Recommended high-level component groups:

```text
app-shell/
build/
passives/
gear/
upgrades/
crafting/
explanation/
shared/
technical/
```

Avoid one monolithic `analysis-screen.tsx` continuing to grow indefinitely.

---

# 77. Route architecture

Potential route model:

```text
/
  dashboard / start

/build
  overview

/build/passives

/build/gear

/build/upgrades

/build/crafting

/test
  test scenarios
```

Exact routing should be reviewed against current Next.js architecture before implementation.

---

# 78. No unnecessary backend rewrite

The UI/UX program should reuse current APIs/actions where possible.

Do not create new backend layers merely because the UI route changes.

Only add view-model adapters where needed.

---

# 79. User testing strategy

After each major UI/UX step:

```text
automated component/integration tests
headless browser check
manual product-owner test
mobile viewport check where relevant
```

The user/owner should be able to say:

```text
I can understand this page without knowing the code.
```

---

# 80. Visual regression strategy

As the UI stabilizes, add:

```text
screenshots
Playwright visual snapshots
```

for key screens.

Suggested snapshots:

```text
landing
loaded build overview
passive results
exact measurement
gear
upgrade comparison
craft planner
mobile views
error state
```

Avoid screenshot tests too early in the redesign.

---

# 81. UI/UX roadmap structure

Use UI-specific step ids to avoid confusing them with engine MVP steps.

Recommended format:

```text
UIUX-001
UIUX-002
UIUX-003
...
```

Each step must create:

```text
docs/Pre prod/UI-UX/progress/UIUX-###-<name>.md
```

Do not rewrite previous UIUX progress files.

---

# 82. UIUX-001 — Current UI inventory and application shell

Goal:

```text
establish the new global structure before redesigning individual features
```

Scope:

```text
inventory current pages/components
define routes/navigation
create global shell
create current-build context header
do not redesign feature internals yet
```

Acceptance concept:

```text
user can understand the main sections of the product
navigation is consistent
existing workflows remain functional
```

---

# 83. UIUX-002 — Design system foundation

Scope:

```text
tokens
colors
typography
spacing
surface hierarchy
buttons
inputs
badges
cards
alerts
disclosures
loading states
```

Goal:

```text
all later UI steps build from one coherent visual system
```

---

# 84. UIUX-003 — Landing page and guided start

Scope:

```text
clear product explanation
Analyze build CTA
PoB import option
Demo mode
GGG disabled state
first-run onboarding
```

Remove developer fixture language from the normal starting experience.

---

# 85. UIUX-004 — Build import experience

Scope:

```text
PoB2 paste flow
source selector
friendly validation
import help
build identity summary
advanced fixture/testing path
```

---

# 86. UIUX-005 — Build overview dashboard

Scope:

```text
build header
class / ascendancy / level
primary skill
context summary
gear summary
analysis readiness
quick links to Passives / Gear / Crafting
```

---

# 87. UIUX-006 — Passive recommendation redesign

Scope:

```text
recommendation cards
information hierarchy
collapse incomplete paths
search/filter presentation
score explanation
path actions
```

Must preserve engine ordering.

---

# 88. UIUX-007 — Passive tree canvas

Scope:

```text
interactive coordinate-based tree
pan/zoom
allocated/recommended nodes
fit path
hover details
comparison overlays
```

This may be split further if implementation size is large.

---

# 89. UIUX-008 — PoB2 exact measurement experience

Scope:

```text
Measure with PoB2 action
loading/progress states
measured metric cards
heuristic vs measured distinction
technical details disclosure
failure states
```

---

# 90. UIUX-009 — Character context redesign

Scope:

```text
primary skill summary
relevant mechanics
uncertain mechanics
why/evidence disclosures
friendly partial-state wording
```

---

# 91. UIUX-010 — Gear overview and slot experience

Scope:

```text
gear grid
slot cards
recognized/uncertain modifier display
gear item detail
technical normalization details
```

---

# 92. UIUX-011 — Upgrade comparison workflow

Scope:

```text
candidate item entry
clipboard paste guidance
price entry
metric selection
budget explanation
comparison setup
```

---

# 93. UIUX-012 — Upgrade result redesign

Scope:

```text
ranking results
trade-off presentation
within/over-budget badges
price provenance
measured metric hierarchy
empty/no-winner states
```

---

# 94. UIUX-013 — Crafting navigation and target planner redesign

Scope:

```text
crafting landing
player-facing stat search
base selection
item level
modifier cards
eligibility states
community-derived labeling
unsupported mechanics
```

Raw stat ids move to technical details.

---

# 95. UIUX-014 — Explanation and contextual help

Scope:

```text
Why this recommendation?
tooltip glossary
contextual deterministic explanation
help links
technical term definitions
```

Integrate explanation instead of using one isolated block.

---

# 96. UIUX-015 — Provenance and technical mode

Scope:

```text
advanced mode
Data & provenance panel
node ids
checksums
runtime fingerprint
schema versions
technical error codes
```

Normal mode becomes significantly cleaner.

---

# 97. UIUX-016 — Loading, empty, error, and disabled states

Scope:

```text
consistent loading
long-running PoB feedback
empty states
failure categories
disabled feature states
retry actions
```

This is a cross-product consistency pass.

---

# 98. UIUX-017 — Product-owner test mode

Scope:

```text
friendly demo scenarios
known expected outcomes
quick links
manual checklist
clear TEST MODE badge
```

Primary goal:

```text
the owner can test the complete product without remembering fixtures or hidden setup
```

---

# 99. UIUX-018 — Responsive/mobile redesign

Scope:

```text
desktop
laptop
tablet
mobile
navigation
cards
tables
tree
comparison
forms
```

Test actual usability, not only overflow.

---

# 100. UIUX-019 — Accessibility audit and closure

Scope:

```text
keyboard
focus order
screen reader
semantic structure
contrast
zoom
touch targets
reduced motion
```

Target WCAG 2.2 AA where practical.

---

# 101. UIUX-020 — Final UI/UX integration review

Equivalent to the MVP exit review, but for the redesign.

Validate complete journey:

```text
start
import
overview
passives
exact measure
gear
upgrade comparison
crafting
technical details
mobile
accessibility
test mode
```

Return:

```text
UI/UX REDESIGN COMPLETE
```

or exact blockers.

---

# 102. Possible future UI/UX steps after UIUX-020

Not part of the first redesign sequence:

```text
saved builds
analysis history
accounts
share links
localization
advanced personalization
theme selection
user preferences
craft simulator UX
full step-by-step craft guide UX
real AI conversation UI
```

These require product/backend decisions beyond presentation cleanup.

---

# 103. Recommended implementation order

Recommended order:

```text
UIUX-001  shell / information architecture
UIUX-002  design system
UIUX-003  landing / guided start
UIUX-004  import
UIUX-005  build overview
UIUX-006  passive results
UIUX-007  passive canvas
UIUX-008  exact measurement
UIUX-009  character context
UIUX-010  gear
UIUX-011  upgrade input
UIUX-012  upgrade results
UIUX-013  crafting
UIUX-014  explanation/help
UIUX-015  technical mode
UIUX-016  states/errors/loading
UIUX-017  test mode
UIUX-018  responsive/mobile
UIUX-019  accessibility
UIUX-020  final integration validation
```

---

# 104. Why shell/design system come first

Do not redesign individual screens before establishing:

```text
navigation
layout
spacing
typography
status badges
card structure
technical-details pattern
```

Otherwise every later step will repeatedly restyle the same components.

---

# 105. Why test mode is a first-class topic

A major current problem is not only visual quality.

It is:

```text
the product owner cannot easily understand which fixture to load,
which settings to enable,
or which expected result proves a feature works.
```

A good product should also be easy to test.

Test mode is therefore part of UI/UX quality, not just development tooling.

---

# 106. UX acceptance standard

For every redesigned workflow, ask:

```text
Can a PoE2 player understand what to do without reading project documentation?
```

If the answer is no:

```text
the UI is not complete
```

even if the feature technically works.

---

# 107. Engine-truth acceptance standard

For every UI step, also ask:

```text
Did presentation accidentally change the meaning of the engine result?
```

If yes:

```text
the UI change is invalid
```

No UX improvement may sacrifice correctness.

---

# 108. Required tests per UIUX step

Every UIUX step should normally run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

And where relevant:

```text
headless browser flow
responsive viewport
existing PoB2 opt-in regression
craft readiness/weight checks
```

Do not rerun heavy unrelated tests without reason, but never skip a relevant regression.

---

# 109. Browser validation protocol

Every visually significant step must include:

```text
desktop screenshot/observation
mobile screenshot/observation where relevant
normal flow
error/empty state where relevant
keyboard smoke check
```

If Cursor's IDE browser is unavailable:

```text
headless Chrome / Playwright is acceptable
```

Document the route used.

---

# 110. Documentation protocol

Every UIUX implementation step creates:

```text
docs/Pre prod/UI-UX/progress/UIUX-###-<name>.md
```

Include:

```text
objective
before-state
after-state
files changed
components created
routes changed
UI states
responsive behavior
accessibility behavior
tests
browser verification
screenshots where practical
known limitations
regressions checked
next step
```

---

# 111. Visual-change policy

Large visual changes should be intentional.

Do not:

```text
randomly add gradients
randomly add colors
change typography per page
use a new component library mid-program
```

If a UI component library is introduced:

```text
document the decision
justify bundle/dependency impact
use it consistently
```

---

# 112. Product copy policy

UI text should be:

```text
plain
short
specific
truthful
```

Prefer:

```text
Some modifiers could not be classified.
```

over:

```text
Gear readiness partial due to unresolved normalization semantics.
```

Keep the latter in technical details.

---

# 113. Security/privacy UI requirements

If future UI stores anything locally, disclose it.

Never display:

```text
tokens
secrets
raw OAuth codes
```

Do not add a remember-build function until data retention behavior is intentionally defined.

---

# 114. Performance UX requirement

If an operation commonly takes more than about one second:

```text
show immediate feedback
```

If it may take several seconds:

```text
show operation-specific wording
```

If it may take >10 seconds:

```text
make it very clear work is still running
```

Do not use fake percentage progress.

---

# 115. Accessibility language requirement

Do not use only:

```text
green
red
yellow
```

to describe state.

Use:

```text
Ready
Unavailable
Warning
Measured
Heuristic
```

along with visual treatment.

---

# 116. UI/UX success definition

The redesign succeeds when:

```text
the owner can test every major supported flow without project knowledge;
a new player can import a build and understand the primary result;
technical details remain available but do not dominate;
heuristic, measured, and community-derived evidence are visually distinct;
passive recommendations are easy to scan;
gear and upgrade flows are understandable;
crafting no longer exposes raw stat ids as the normal interaction;
loading/error states feel intentional;
mobile and keyboard usage are deliberate;
the underlying deterministic engine behavior is unchanged.
```

---

# 117. First next step

After this master plan is approved:

```text
UIUX-001 — Current UI inventory and application shell
```

Do not begin with colors or the passive tree canvas.

First create the coherent product structure into which all later redesigned experiences will fit.

---

# 118. Stop condition for this master document

This document defines the UI/UX program only.

Do not implement UI changes as part of this master-plan step.

After review:

```text
generate UIUX-001 as a separate implementation specification
```

and continue through the roadmap one reviewed step at a time, following the same discipline used for the MVP.
