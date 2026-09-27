# STEP-016.5 — PoB2 build import adapter

**Date:** 2026-09-27  
**Status:** PLANNED  
**Roadmap reference:** Phase 4 / STEP-016.5  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the first Path of Building 2 import path to PoE2 Buddy.

There is currently **no PoB2 implementation** in the project.

STEP-016.5 should allow a user to paste a raw Path of Building 2 export code, decode and validate it server-side, extract useful build information, normalize it into the existing PoE2 Buddy character/build domain model, validate its passive allocations against the active official GGG passive-tree snapshot, and make the imported build available to the existing analysis flow.

This step is an **import adapter only**.

Do not implement the PoB2 calculation engine in this step.

Do not change the passive scoring formula in this step.

Do not start full character-aware optimization in this step.

---

## 2. Why this step exists

GGG OAuth is implemented behind a safe gate, but approved GGG API credentials are currently unavailable.

PoB2 therefore becomes the primary practical MVP build-import path.

The intended user flow is:

```text
Player
  ↓
Path of Building 2
  ↓
Export build
  ↓
Copy raw PoB2 export code
  ↓
PoE2 Buddy
  ↓
Paste code
  ↓
Import build
  ↓
Analyze passive tree
```

This must work without:

```text
GGG OAuth
GGG access tokens
poe.ninja
pobb.in
AI
```

---

## 3. Acceptance criteria

- [ ] A user can paste a raw PoB2 export code.
- [ ] The export is decoded server-side.
- [ ] The decompressed content is parsed as PoB2 XML.
- [ ] The PoB2 root/build structure is validated before normalization.
- [ ] PoB2 parsing is provider-specific and separate from domain schemas.
- [ ] Class is imported when present.
- [ ] Level is imported when present.
- [ ] Ascendancy is imported when present.
- [ ] Shared/main passive allocations are imported.
- [ ] Weapon-set/specialisation passive allocations are kept separate.
- [ ] Skill groups are imported.
- [ ] Support relationships are preserved when represented by PoB2.
- [ ] Equipment is imported by slot.
- [ ] Raw item modifier text is preserved.
- [ ] Relevant PoB2 configuration values are preserved as raw key/value data.
- [ ] Passive ids are validated against the active official GGG tree pin.
- [ ] Unknown passive ids are preserved and reported instead of silently discarded.
- [ ] A PoB2 import result reports compatibility/readiness.
- [ ] The normalized result can be consumed by the existing passive analysis pipeline where compatible.
- [ ] Existing fixture and GGG-provider flows still work.
- [ ] Current heuristic scoring behavior is unchanged.
- [ ] The importer is deterministic.
- [ ] Malformed and oversized imports fail safely.
- [ ] XML external entities are not resolved.
- [ ] Tests do not require Path of Building, GGG, or network access.
- [ ] Required repository checks pass.
- [ ] A completion document is created at:
      `docs/progress/STEP-016-5-pob2-build-import-adapter.md`

---

## 4. Scope

STEP-016.5 may implement:

```text
raw PoB2 export input
base64/url-safe-base64 decoding
zlib/deflate decompression
PoB2 XML parsing
PoB2-specific validation
PoB2 build normalization
passive-tree compatibility checks
skill/support import
equipment import
raw item modifier preservation
raw configuration preservation
import diagnostics/readiness
analysis-screen import entry
tests
documentation
```

STEP-016.5 must not implement:

```text
PoB2 Lua calculation engine
exact DPS
exact EHP
gear upgrade ranking
crafting
trade pricing
pobb.in fetching
GGG OAuth changes
AI build interpretation
automatic build repair
character-aware scoring
```

---

## 5. Import pipeline

Implement the import pipeline conceptually as:

```text
Raw PoB2 export string
        ↓
input validation
        ↓
URL-safe/Base64 decode
        ↓
zlib/deflate decompress
        ↓
XML parse
        ↓
PoB2-specific validation/model
        ↓
normalization
        ↓
CharacterBuildSnapshot
        ↓
passive-tree compatibility
        ↓
import result
```

Do not jump directly from raw XML nodes into application UI state.

---

## 6. Provider boundary

PoB2 must be treated as its own build provider.

Conceptually:

```text
Build / Character sources

fixture
GGG
PoB2
```

Do not modify `GggCharacterProvider` to pretend PoB2 is GGG.

Prefer a more general abstraction if one is already appropriate, for example:

```text
BuildProvider
```

or keep a distinct:

```text
Pob2BuildProvider
```

if that avoids premature refactoring.

The important rule is:

```text
PoB2-specific parsing
!=
domain model
```

---

## 7. No network dependency

The first PoB2 importer must accept:

```text
raw PoB2 export code
```

only.

Do not support:

```text
pobb.in URLs
pastebin URLs
GitHub URLs
arbitrary remote URLs
```

in this step.

Reason:

```text
raw code
→ deterministic
→ no third-party dependency
→ no SSRF/fetch surface
```

URL/share-site support can be added later.

---

## 8. Decode format

Implement the actual PoB2 export decoding used by current Path of Building 2 builds.

The decoder should support the format actually produced by PoB2, expected conceptually as:

```text
URL-safe Base64
        ↓
compressed bytes
        ↓
zlib/deflate
        ↓
XML
```

Do not guess silently if the format differs.

If STEP-016.5 discovers a different current encoding, document the exact observed format and implement that deterministic format.

---

## 9. Decode errors

Different failure stages must remain distinguishable.

Examples:

```text
invalid export encoding
invalid compressed payload
decompression limit exceeded
invalid XML
unsupported PoB2 root
unsupported PoB2 format/version
normalization failure
tree incompatibility
```

Do not reduce every failure to:

```text
Invalid build
```

The public UI can use concise messages, while tests/debug output retain precise failure categories.

---

## 10. Decompression safety

PoB2 export is user-provided compressed data.

Set a reasonable maximum decompressed payload size.

The implementation must reject a compressed payload that expands beyond the configured limit.

Document the chosen limit and why it is sufficient for normal PoB2 builds.

Do not allow unbounded decompression.

---

## 11. XML safety

Use an XML parser/configuration that does not resolve external entities.

The parser must not allow:

```text
XXE
external DTD fetches
filesystem entity resolution
network entity resolution
```

Add a regression test if the selected XML library exposes these capabilities.

Do not render raw imported XML as HTML.

---

## 12. PoB2-specific model

Create a provider-specific intermediate representation.

It should represent the PoB2 data the application cares about without immediately forcing it into `CharacterBuildSnapshot`.

Conceptually:

```text
Pob2BuildDocument

metadata
build
tree
skills
items
config
notes / unsupported sections if useful
```

The exact representation should follow the actual PoB2 XML.

Do not invent fields that are not present.

---

## 13. PoB2 metadata

Preserve available source metadata such as:

```text
PoB2 version / format version if present
build name if present
target game/version if present
tree version if present
class
ascendancy
level
```

If a field is absent:

```text
unavailable
```

rather than guessed.

---

## 14. Passive allocations

Extract passive allocations from the PoB2 tree/spec data.

Preserve distinct categories where PoB2 provides them:

```text
shared/main-tree allocation
weapon-set allocation(s)
ascendancy allocation
```

Do not flatten all ids into one set.

The existing PoE2 Buddy main-tree / weapon-set distinction must remain intact.

---

## 15. Passive-tree compatibility

Validate imported passive ids against the currently loaded official GGG passive-tree snapshot.

For every unknown id:

```text
preserve id
report it
mark import incompatible or incomplete
```

Do not:

```text
drop it
replace it
guess the modern node
map by node name
```

A version mismatch may be a warning.

Unknown actual node ids are a stronger compatibility failure.

---

## 16. Tree/version metadata

If PoB2 provides a tree or game version, preserve it.

Compare it to the active GGG pin when meaningful.

Example diagnostic:

```text
PoB2 tree version: 0.5.5
Active PoE2 Buddy tree: 0.5.5
Status: compatible
```

or:

```text
PoB2 tree version: older/unknown
Unknown node ids: 7
Status: incompatible
```

Do not assume version strings alone guarantee compatibility.

---

## 17. Class and ascendancy

Import:

```text
class
level
ascendancy
```

when PoB2 explicitly provides them.

Do not infer ascendancy from passive locations unless an existing deterministic rule explicitly supports that inference.

If absent:

```text
ascendancy unavailable
```

---

## 18. Skill groups

Preserve PoB2 skill groups rather than flattening all gems/skills.

Where represented, retain:

```text
skill-group identity
enabled/disabled state
main skill selection
active skill
supports
skill level
quality
socket/group label
weapon set association
```

Only include fields actually present in PoB2.

---

## 19. Main skill

Use explicit PoB2 metadata when it identifies the selected/main skill.

If there is no deterministic main-skill marker:

```text
main skill = unresolved
```

Do not automatically choose:

```text
first skill
highest level skill
most supports
first enabled group
```

unless a documented deterministic PoB2 rule explicitly makes that correct.

No LLM may choose the main skill.

---

## 20. Support relationships

Supports must remain associated with their skill group.

Do not normalize into:

```text
all supports on character
```

without retaining which active skill group they belong to.

If the relationship cannot be established:

```text
relationship unknown
```

Do not guess.

---

## 21. Equipment

Import equipped items by slot where PoB2 provides slot assignment.

Preserve distinctions such as:

```text
main hand
off hand
weapon set 2 if present
helmet
body armour
gloves
boots
amulet
ring 1
ring 2
belt
other supported PoE2 slots
```

Do not reduce equipment to an unordered list.

---

## 22. Item data

For each relevant item preserve as available:

```text
name
base type
rarity
slot
item level
quality
corruption
implicit modifier text
explicit modifier text
crafted/enchant/fractured text
other raw modifier sections
```

Do not require semantic item-mod parsing yet.

Raw modifier text must not be silently lost.

---

## 23. Item semantics are out of scope

Hard invariant:

```text
item imported
!=
item understood for scoring
```

Do not add gear heuristic values in this step.

Do not treat an unparsed item modifier as zero-value.

The purpose here is faithful import.

---

## 24. Configuration

Preserve PoB2 configuration values where available.

Configuration may include build assumptions such as:

```text
charges
buff states
enemy conditions
distance
combat conditions
skill-specific toggles
```

STEP-016.5 does not need to understand every key.

Preserve at minimum:

```text
key
value
source/section when useful
```

Unsupported keys should remain visible.

---

## 25. Notes

PoB2 builds may contain notes or user-authored text.

Notes are not required for current optimization.

If imported:

```text
treat as untrusted text
do not execute
do not interpret with AI
escape when rendered
```

It is acceptable to omit notes from the normalized domain snapshot if documented.

---

## 26. Normalized domain result

Map the validated PoB2 build into the existing domain model where appropriate.

Prefer reuse of:

```text
CharacterBuildSnapshot
NormalizedSkill
NormalizedItem
WeaponSetSpecialisations
```

when those types accurately represent the data.

Extend domain types only when the imported data is important and cannot be represented safely.

Do not distort PoB2 data merely to avoid a small justified schema change.

---

## 27. Source metadata

A normalized PoB2 import should carry source metadata.

Conceptually:

```text
source: "pob2"
importedAt
sourceChecksum
PoB2 version/format if known
PoB2 tree version if known
active GGG tree version used for validation
normalization version
```

Do not put the full raw export code inside ordinary domain objects unless explicitly justified.

---

## 28. Stable checksum

Recommended:

Compute a stable checksum of the decoded PoB2 source payload.

Purpose:

```text
same PoB2 export
→ same checksum
```

Use this for:

```text
debugging
reproducibility
deduplication later
```

The checksum is not a secret.

---

## 29. Import compatibility/readiness

Return a deterministic import result.

Conceptually:

```text
status:
  compatible
  partial
  incompatible

build:
  CharacterBuildSnapshot

unknownPassiveIds:
  [...]

unavailable:
  [...]

unsupported:
  [...]

warnings:
  [...]

sourceMetadata:
  ...
```

Exact type names may differ.

Do not return only the normalized build while hiding import problems.

---

## 30. Compatibility meaning

### Compatible

The imported tree and required character fields can safely enter the existing passive analysis pipeline.

### Partial

The build can be imported, but some non-tree context is unavailable or unsupported.

### Incompatible

The build cannot safely enter normal passive analysis, for example because important passive ids do not exist in the active pin.

A partial PoB2 build may still be usable for tree-only analysis if its tree allocation is compatible.

Document the final policy.

---

## 31. Current scoring remains tree-only

Do not change:

```text
heuristicScore
offensive profile
defensive profile
balanced profile
Top-K ranking
semantic completeness
search completeness
```

in STEP-016.5.

Even after PoB2 imports:

```text
skills imported
gear imported
configuration imported
```

does **not** mean those fields influence the current score.

The UI/docs must say:

```text
PoB2 character data imported
Current optimizer remains passive-tree heuristic only
```

---

## 32. Existing analysis integration

Where compatible, allow a normalized PoB2 build to be passed into the existing passive analysis pipeline.

Conceptually:

```text
fixture
   or
PoB2 import
      ↓
CharacterBuildSnapshot
      ↓
existing passive analysis
```

Do not duplicate path enumeration/scoring for PoB2.

Reuse the same engines.

---

## 33. Analysis UI

Add a simple PoB2 import option to the existing analysis screen.

Suggested MVP flow:

```text
Import source

[ Fixture ]
[ PoB2 ]

Paste PoB2 export:
┌────────────────────────────┐
│ eNrt...                    │
└────────────────────────────┘

[ Import / Analyze ]
```

Do not add final-product styling in this step.

Display at least:

```text
import status
character/build name
class
level
ascendancy if present
tree compatibility
skill count/group count
equipment count
warnings
```

Do not dump raw XML to the user.

---

## 34. No external share links yet

Do not support:

```text
pobb.in
pastebin
short URLs
arbitrary HTTP fetches
```

in this step.

A future share-link adapter can fetch and then pass the resulting raw PoB2 code into this importer.

Keep the raw-code importer as the source of truth.

---

## 35. Test fixtures

Add local PoB2 export fixtures.

At minimum include:

### Basic valid build

```text
class
level
tree
simple skills
simple gear
```

### Weapon-set build

```text
shared passives
weapon-set/specialisation passives
```

### Multi-skill build

```text
multiple groups
active skill
supports
```

### Gear-rich build

```text
multiple equipment slots
implicit/explicit modifier text
```

### Partial build

```text
missing optional sections
```

### Tree mismatch build

```text
one or more unknown passive ids
```

### Malformed input

```text
invalid base64
invalid compressed payload
invalid XML
wrong root
oversized decompressed payload
```

Use real or faithfully representative PoB2 exports where legally/practically possible.

Document fixture provenance.

---

## 36. Required tests

At minimum test:

- valid raw export decodes;
- URL-safe Base64 handling;
- decompression succeeds;
- invalid encoding fails safely;
- invalid compression fails safely;
- decompression-size limit;
- invalid XML fails safely;
- wrong root fails safely;
- external entities are not resolved;
- class preserved;
- level preserved;
- ascendancy preserved when present;
- shared passive ids preserved;
- weapon-set passive ids remain separate;
- unknown passive id preserved and reported;
- skill groups remain separate;
- support relationships preserved;
- unresolved main skill stays unresolved;
- equipment slots preserved;
- raw item modifiers preserved;
- configuration preserved;
- deterministic normalization;
- stable checksum;
- compatibility status;
- existing fixture analysis still passes;
- existing GGG mock/live-gate tests still pass;
- scoring output is unchanged for equivalent tree input.

---

## 37. No LLM parsing

Do not use an LLM for:

```text
PoB2 decoding
XML interpretation
skill identification
support assignment
item parsing
passive mapping
main-skill selection
compatibility
```

All import behavior must be deterministic.

---

## 38. Performance

PoB2 import is user-triggered.

It is acceptable to:

```text
decode
decompress
parse XML
normalize
validate passives
```

on each new import.

Do not:

```text
perform network calls
run PoB calculations
scan every possible passive path during decode
```

Path analysis remains a separate operation.

---

## 39. Security/privacy

Treat the PoB2 export as untrusted user input.

Do not:

```text
execute embedded text
render raw XML as HTML
resolve external XML entities
send the export to third parties
log the full export by default
```

Keep parsing server-side.

Apply normal output escaping in the UI.

---

## 40. Package boundaries

Recommended architecture:

```text
packages/data-sources
  pob2/
    decode
    XML/provider schemas
    normalize
    import result

packages/domain
  shared normalized build types

apps/web
  input form / server action / rendering
```

Do not put PoB2 decoding logic inside React components.

Do not put UI behavior inside the data-source package.

---

## 41. Dependencies

Before adding a new XML or compression dependency:

```text
check whether the repo/runtime already has a safe implementation
```

If a new package is needed:

- choose a maintained dependency;
- document why;
- lock its version through npm;
- run `npm audit`;
- ensure XXE/external-entity behavior is safe.

Do not add a large PoB ecosystem dependency merely to decode the export unless justified.

---

## 42. Documentation

After implementation create:

```text
docs/progress/STEP-016-5-pob2-build-import-adapter.md
```

Follow the normal progress-document protocol.

Also explicitly include:

```text
Import Flow
PoB2 Export Encoding
Input Size Limit
XML Safety
Provider-Specific Model
Domain Normalization
Passive Allocation Mapping
Weapon-Set Mapping
Skill-Group Mapping
Main-Skill Policy
Support Relationships
Equipment Mapping
Raw Item Modifier Policy
Configuration Mapping
Passive-Tree Compatibility
Import Readiness
Source Metadata / Checksum
UI Integration
Fixture Provenance
Known PoB2 Format Limitations
Current Scoring Limitation
PoB2 Calculation-Engine Status
```

---

## 43. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
raw-code-only MVP import
decode/compression format
XML parser choice
decompression-size limit
PoB2 provider boundary
weapon-set representation
main-skill resolution policy
unknown-passive behavior
raw item modifier preservation
configuration preservation
source checksum
import compatibility categories
```

---

## 44. Non-goals

Do not implement in STEP-016.5:

- PoB2 Lua/headless calculation engine;
- exact DPS;
- exact EHP;
- character-aware passive scoring;
- gear upgrade recommendations;
- crafting;
- poe.ninja gear matching;
- pobb.in fetching;
- GGG OAuth changes;
- AI build analysis;
- automatic passive-tree repair;
- automatic item-mod semantic interpretation.

---

## 45. Expected result

After STEP-016.5, PoE2 Buddy should support:

```text
Paste PoB2 code
        ↓
decode
        ↓
validate
        ↓
normalize
        ↓
check tree compatibility
        ↓
show imported build
        ↓
run existing passive-tree analysis
```

The application should be able to say:

```text
PoB2 build imported successfully.

Class: ...
Level: ...
Ascendancy: ...

Passive tree:
compatible / incompatible

Skills:
imported

Supports:
imported

Gear:
imported

Configuration:
preserved

Current optimization:
passive-tree heuristic only
```

This becomes the primary practical MVP character-import path while GGG OAuth remains unavailable.

---

## 46. Stop condition

After implementation, tests, browser verification, and documentation are complete:

**STOP.**

Do not automatically implement:

```text
PoB2 calculation engine
character-aware scoring
```

Those require explicit review and a separate next step.

Wait for explicit approval.
