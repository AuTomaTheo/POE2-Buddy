# Cursor Master Prompt — PoE2 Helper MVP

Copy the prompt below into Cursor at the start of the project. Keep this file in the repository and update it only when the product architecture intentionally changes.

---

## Prompt

You are helping me build a web application called **PoE2 Helper**. I am a beginner developer, so you must make changes in small, understandable, testable steps. Do not assume I know hidden implementation details. Explain important architecture choices in plain language before making large changes.

### Product vision

PoE2 Helper should help Path of Exile 2 players improve a character by combining current character/build state with current game data and deterministic optimization logic.

Long-term capabilities may include:

- import a PoE2 character after the user authorizes the app through GGG OAuth;
- show the current class, level, skills, equipment, jewels, passive allocations, weapon-set specialisations, and relevant build metadata;
- recommend the best next passive nodes for a selected number of passive points;
- compare offensive, defensive, and balanced passive-tree routes;
- identify weak gear slots;
- suggest stat targets for upgrades;
- estimate budget-aware upgrade priorities;
- explain possible crafting approaches using valid bases, mods, tiers, weights, and crafting mechanics;
- optionally use an LLM to explain deterministic recommendations conversationally.

### Critical MVP principle

The optimizer must be based on deterministic structured data and algorithms. **Do not ask an LLM to guess the best tree, craft, or item.** LLM functionality is an explanation layer only.

### Mandatory source-of-truth documents

Before implementing anything, read:

- `docs/planning/MVP_ROADMAP.md`
- `docs/planning/TECHNICAL_ARCHITECTURE.md`
- `docs/planning/DATA_SOURCES_AND_ACCESS.md`
- `docs/planning/RISKS_AND_KNOWN_ISSUES.md`
- `docs/planning/DOCUMENTATION_PROTOCOL.md`
- `docs/planning/DECISION_LOG.md`

If one of these files conflicts with code, stop and clearly describe the conflict before changing architecture.

### External access / credentials rule

Never invent or assume credentials.

Current access state at project start:

- **GGG OAuth application credentials: NOT AVAILABLE.** We have not yet received an approved OAuth client from Grinding Gear Games. Real authenticated character import must therefore be implemented behind an interface and initially use fixtures/mocks.
- **GGG user authorization tokens: NOT AVAILABLE.** These only exist after OAuth is approved and an end user authorizes the application.
- **poe.ninja supported economy API: no private credential is currently required**, but usage must go through our backend, be cached, use a descriptive User-Agent/contact, and stay within the documented supported economy endpoints.
- **poe.ninja builds/profiles/character/authentication endpoints: DO NOT USE.** They are documented as internal/unsupported for third-party use.
- **Optional LLM provider API key: NOT AVAILABLE unless I explicitly add one later.** The application must work without it.
- **GitHub token: OPTIONAL / NOT REQUIRED for ordinary public repository access.** If we later automate GitHub API access at scale, add a documented optional token; do not require one for the MVP unless necessary.

Use `.env.example` with placeholder variable names only. Never put real secrets in source control.

### Data-source rule

Use supported and documented sources only. Initial approved sources are:

1. Grinding Gear Games developer API for approved PoE2 account/character data after OAuth approval.
2. Grinding Gear Games official `poe2-skilltree-export` for passive-tree structure/data.
3. `repoe-fork/poe2` / RePoE-derived PoE2 structured game data for bases, mods, stats, gems, translations, and crafting-related metadata where appropriate.
4. poe.ninja **supported public PoE2 economy endpoints only** for economy/pricing information.
5. Path of Building 2 Community as a reference implementation/source of calculation knowledge where licensing and reuse permit. Do not blindly copy code without reviewing license and compatibility.

Do not scrape the Path of Exile trade website or reverse engineer private endpoints as an MVP dependency.

### Development style

Work in small atomic steps. For each step:

1. State the exact objective.
2. State which files you expect to create/change.
3. Implement only that objective.
4. Add or update tests.
5. Run the relevant tests/lint/typecheck.
6. Explain the result.
7. Create a **new separate** progress document under `docs/progress/` using the template in `STEP_COMPLETION_TEMPLATE.md`.
8. Do not combine multiple unrelated completed steps into one progress file.

Use names like:

```text
docs/progress/STEP-001-project-scaffold.md
docs/progress/STEP-002-domain-types.md
docs/progress/STEP-003-passive-tree-loader.md
```

The progress document must be detailed enough that a new developer could understand exactly what was done without reading the chat history.

### Documentation requirements after every completed step

Each progress `.md` must include:

- step ID and title;
- date;
- objective;
- status;
- implementation summary;
- files created/changed/deleted;
- important code paths and responsibilities;
- API/data assumptions;
- database/schema changes if any;
- environment variable changes if any;
- commands executed;
- tests executed and their result;
- manual verification performed;
- screenshots/manual UI observations when relevant;
- errors encountered and how they were resolved;
- known limitations;
- security/privacy considerations;
- performance considerations;
- decisions made;
- deviations from the planning docs;
- remaining risks;
- exact recommended next step.

Never say a step is complete if tests fail, required acceptance criteria are missing, or documentation has not been created.

### Technical defaults

Unless a planning document explicitly changes this, use:

- TypeScript;
- Next.js with React for the web application;
- server-side API routes/services for third-party calls;
- strict TypeScript settings;
- Zod or an equivalent runtime schema validator for external JSON;
- Vitest/Jest for unit tests;
- Playwright for a small number of key end-to-end flows later;
- ESLint + formatting;
- provider adapters/interfaces around all external services;
- immutable/versioned data snapshots for game data when practical.

Do not introduce a database before we need persistent user/project state. If persistence becomes necessary, propose it first and document the decision.

### Architecture boundaries

Keep these concerns separate:

- `domain`: game-agnostic/core PoE2 domain types and normalized internal models;
- `data-sources`: adapters that fetch/parse GGG, passive-tree exports, RePoE, and poe.ninja;
- `passive-engine`: graph construction, reachability, path generation, path cost, legal allocation rules;
- `scoring-engine`: configurable stat weights and objective scoring;
- `gear-engine`: item normalization, gear-slot analysis, upgrade target generation;
- `crafting-engine`: valid mod pools, crafting simulation/expected outcomes where supported;
- `web`: UI and presentation only;
- `ai-explainer` (later/optional): turns already-calculated results into readable explanations and must not invent numeric results.

### MVP implementation order

Follow `MVP_ROADMAP.md`. Do not jump directly to crafting or AI.

The first sequence should be approximately:

1. Repository/app scaffold + documentation folders.
2. Core domain types and test fixtures.
3. Passive-tree data ingestion and validation.
4. Passive graph construction.
5. Character/build fixture format.
6. Legal reachable path enumeration for N points.
7. Simple configurable scoring model.
8. Recommendation engine returning top candidate paths plus reasons.
9. Minimal UI that displays the sample build/tree recommendations.
10. Current-data refresh/version handling.
11. Only then begin live integrations such as poe.ninja and GGG OAuth when credentials/access allow.

### Optimization safety / correctness rules

- Never treat a node as reachable unless every connecting allocation rule is satisfied.
- Never exceed the requested passive-point budget.
- Keep weapon-set specialisation handling explicit; do not silently treat all allocations as universal.
- Keep ascendancy rules explicit.
- Keep stat transformations transparent and testable.
- Every score should be decomposable into contributing factors so the UI can explain why a path scored well.
- Do not present heuristic scores as exact DPS unless an actual calculation engine supports the value.
- Label heuristic recommendations as heuristic.
- Store the game-data version/commit used for every analysis result.

### Working with uncertainty

If a mechanic cannot be verified from the available structured data/reference implementation:

- do not invent it;
- add a documented limitation;
- isolate the unsupported mechanic;
- provide a conservative fallback;
- create a backlog item for proper implementation.

### First task

Start with **STEP-001: Project scaffold and documentation setup only**.

Create the repository structure, a minimal Next.js TypeScript app, testing/lint/typecheck configuration, `.env.example`, and the required `docs/progress/` directory. Do not implement PoE2 logic yet.

After verifying the scaffold works, create:

`docs/progress/STEP-001-project-scaffold.md`

using the required completion template.

Then stop and show me:

- the resulting folder tree;
- what commands succeeded;
- the content/summary of the STEP-001 progress file;
- any decisions or problems;
- the proposed STEP-002 objective.

Do not begin STEP-002 until I approve it.

---
