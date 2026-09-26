# PoE2 Helper — MVP Roadmap

## MVP definition

The MVP proves that we can ingest current PoE2 passive-tree/game data, represent a character/build state, find legal passive-tree choices for a specified point budget, score them according to explicit build priorities, and present explainable recommendations.

The MVP should be useful **without GGG OAuth approval**. Live account import is an integration milestone, not a prerequisite for validating the optimizer.

## MVP success criteria

A user can:

1. open the web application;
2. load a bundled/sample PoE2 character or paste/import a supported local build representation;
3. choose an optimization objective such as offensive, defensive, or balanced;
4. choose how many passive points to allocate;
5. request recommendations;
6. receive multiple legal candidate paths;
7. see every node in each recommended path;
8. see the point cost and a transparent score breakdown;
9. see the exact game-data snapshot/version used;
10. understand that heuristic scores are not automatically equivalent to exact PoB DPS.

## Phase 0 — Project foundation

### STEP-001 — Project scaffold

Substeps:
- create Next.js + TypeScript project;
- enable strict TypeScript;
- configure linting/formatting;
- configure unit testing;
- create `docs/planning`, `docs/progress`, `docs/decisions`, `tests`, `packages`/module structure as appropriate;
- create `.env.example` with placeholders only;
- add source-control secret exclusions;
- create first progress document.

Acceptance criteria:
- app starts locally;
- typecheck passes;
- lint passes;
- at least one trivial test passes;
- documentation protocol is present;
- no secrets exist in repository.

### STEP-002 — Domain model

Substeps:
- define internal IDs and version types;
- define `PassiveNode`, `PassiveEdge`, `PassiveTreeSnapshot`;
- define `CharacterBuildSnapshot`;
- define passive allocation sets and weapon-set specialisations;
- define `OptimizationObjective`, `StatContribution`, `CandidatePath`, `Recommendation`;
- create sample fixtures.

Acceptance criteria:
- all external-source fields are normalized into internal types;
- domain package has no HTTP/UI dependencies;
- fixtures validate against runtime schemas.

## Phase 1 — Passive-tree data

### STEP-003 — Official passive-tree ingestion

Substeps:
- add GGG passive-tree export adapter;
- allow pinned local snapshot for repeatable tests;
- runtime-validate JSON;
- transform source nodes into normalized internal nodes;
- record source version/commit/hash and ingestion timestamp;
- add malformed-data tests.

Acceptance criteria:
- full current tree parses successfully;
- parser fails loudly on incompatible schema changes;
- snapshot version is displayed/logged.

### STEP-004 — Passive graph construction

Substeps:
- build adjacency graph;
- classify regular/notable/keystone/ascendancy where possible;
- validate reciprocal/expected connections;
- add graph query helpers;
- unit-test graph properties.

Acceptance criteria:
- graph can return neighbors for any known node;
- disconnected/unknown references are reported;
- no UI concerns in graph module.

### STEP-005 — Character/build fixture import

Substeps:
- define a simple JSON build-fixture format;
- include class, level, allocated nodes, optional ascendancy, skills, equipment summary, and goals;
- add validation/errors;
- add at least two fixtures with different classes/build goals.

Acceptance criteria:
- invalid node IDs are reported;
- sample character loads deterministically;
- all imported allocations map to the selected tree snapshot.

## Phase 2 — Passive optimization engine

### STEP-006 — Reachability and legal path enumeration

Substeps:
- identify frontier nodes adjacent to allocated tree;
- generate legal connected candidate paths up to N points;
- deduplicate paths;
- enforce point budget;
- isolate ascendancy/specialisation rules until implemented fully;
- add complexity guards and maximum search limits.

Acceptance criteria:
- generated paths are connected and legal under implemented rules;
- no result exceeds N points;
- tests cover branches, duplicate routes, unreachable nodes, and cycles.

### STEP-007 — Stat extraction and normalization

Substeps:
- parse passive stat text/data into normalized categories where possible;
- create canonical stat identifiers;
- distinguish unsupported/unparsed stats;
- never silently drop unknown stats;
- add coverage report for parsed vs unknown passive stats.

Acceptance criteria:
- every node can report raw stats;
- recognized stats expose normalized values;
- unknown stats remain visible and are flagged.

### STEP-008 — Configurable heuristic scoring

Substeps:
- create weights for selected objectives;
- start with limited, explicit categories such as projectile damage, attack speed, crit chance, crit multiplier, evasion, energy shield, deflection, attributes/resistance only where correctly modeled;
- score each path from individual contributions;
- normalize score per point and total score;
- expose score breakdown.

Acceptance criteria:
- same input always produces same score;
- user can see exactly why one path scored above another;
- score is clearly labeled heuristic, not exact DPS/EHP.

### STEP-009 — Top-K recommendation engine

Substeps:
- rank candidate paths;
- prevent near-duplicate recommendations where possible;
- return offensive/defensive/balanced alternatives;
- attach warnings for unsupported mechanics;
- attach game-data version.

Acceptance criteria:
- engine returns deterministic top-K results;
- each result includes full node sequence, point cost, score, breakdown, warnings, and provenance.

## Phase 3 — Web UI

### STEP-010 — Minimal analysis screen

Substeps:
- fixture selector/import area;
- objective selector;
- passive-point budget input;
- Analyze button;
- results list;
- expandable score breakdown;
- data-version indicator.

Acceptance criteria:
- one complete analysis works from browser UI;
- useful error states exist;
- UI does not contain optimization logic.

### STEP-011 — Passive-path visualization

Substeps:
- begin with readable node/path list;
- add lightweight graph/tree highlighting if practical;
- show current vs proposed nodes distinctly;
- allow recommendation comparison.

Acceptance criteria:
- user can identify exact nodes to allocate in order;
- visualization remains usable if full visual tree rendering is delayed.

## Phase 4 — Current external data integrations

### STEP-012 — Data refresh/version pipeline

Substeps:
- script to fetch/pin latest approved source snapshots;
- validate schema before replacing current snapshot;
- retain previous snapshot for rollback;
- changelog generated for new data version;
- never auto-promote a broken data snapshot.

Acceptance criteria:
- data update can be tested independently;
- rollback is documented;
- optimizer result records the snapshot version.

### STEP-013 — poe.ninja economy adapter

Substeps:
- use only supported PoE2 economy endpoints;
- backend proxy only;
- response caching;
- proper User-Agent/contact;
- exponential/backoff/retry policy without abusive polling;
- normalize price data into internal model.

Acceptance criteria:
- no browser directly spams poe.ninja;
- cache headers are respected where possible;
- endpoint failures do not break passive optimization.

### STEP-014 — GGG OAuth adapter shell

Can be implemented before approval only as interfaces/routes/mocks.

Substeps:
- define OAuth/config interfaces;
- create `GggCharacterProvider` interface;
- implement mock provider;
- create callback/session architecture without fake credentials;
- document required env variables.

Acceptance criteria:
- app compiles/runs without GGG credentials;
- live provider is disabled with a clear message.

### STEP-015 — GGG live character import

**BLOCKED until GGG approves and issues the required OAuth client details.**

Substeps after approval:
- add real client configuration securely;
- implement OAuth authorization flow;
- request minimum required scopes;
- import PoE2 character through supported endpoint;
- normalize equipment, skills, jewels, passives, specialisations, quest stats;
- add token/session security and revocation handling.

Acceptance criteria:
- user can authorize voluntarily;
- minimum scopes only;
- secrets remain server-side;
- imported character generates the same internal model as fixtures.

## Phase 5 — Gear MVP extension

### STEP-016 — Item normalization

Substeps:
- normalize character equipment from GGG format and/or fixtures;
- map bases/mod text to structured stat categories where reliable;
- preserve raw item representation;
- flag unknown modifiers.

### STEP-017 — Basic gear weakness analysis

Substeps:
- define slot-specific scoring;
- compare current item against explicit target-stat profiles;
- identify missing defensive/offensive constraints;
- produce target stats, not fabricated exact trade listings.

### STEP-018 — Budget-aware upgrade prioritization

Substeps:
- consume supported economy data where it can reliably price relevant categories;
- estimate opportunity cost/rank upgrade categories;
- clearly distinguish estimates from live rare-item market quotes.

## Phase 6 — Crafting MVP extension

Only begin after passive/gear normalization is stable.

### STEP-019 — Crafting data ingestion

Substeps:
- ingest PoE2 bases/mods/stats/translations;
- model item level/requirements;
- model mod eligibility and spawn weights where source data supports it;
- add dataset-version provenance.

### STEP-020 — Craft target planner

Substeps:
- user chooses base/desired stats/budget;
- engine lists eligible desired modifiers;
- estimate chances only when underlying mechanics are implemented correctly;
- explicitly label unsupported crafting mechanics.

### STEP-021 — Craft simulation

Substeps:
- implement one crafting mechanic at a time;
- test probability math with deterministic seeded simulations;
- compare analytical vs Monte Carlo expectation where applicable;
- never generalize one mechanic to another without verification.

## Phase 7 — Optional AI explanation layer

### STEP-022 — Provider-agnostic explainer interface

Substeps:
- define prompt input strictly from deterministic recommendation JSON;
- prohibit tool from modifying numeric results;
- return natural-language explanation only;
- app remains fully usable with explainer disabled.

### STEP-023 — Add a real LLM provider

**BLOCKED until an API provider/key is intentionally selected and configured.**

Substeps:
- server-side key only;
- cost/rate limits;
- redaction/minimal data sharing;
- deterministic fallback text.

## Explicitly out of MVP

See `BACKLOG.md`, but major examples are:

- exact universal PoB-equivalent DPS for every interaction;
- live rare-item trade search via undocumented endpoints;
- automatic stash wealth calculation for PoE2 while no supported PoE2 stash API exists;
- one-click automated crafting;
- fully autonomous AI build design with no deterministic verification;
- mobile native application;
- social profiles/build sharing marketplace.
