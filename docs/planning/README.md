# PoE2 Helper — MVP Planning Pack

**Project status:** Planning / pre-MVP  
**Documentation baseline date:** 2026-09-26  
**Primary development environment:** Cursor  
**Primary product goal:** Build a web application that helps Path of Exile 2 players improve a character by analyzing the current build and suggesting better passive-tree paths, gear targets, crafting approaches, and budget-aware upgrades.

## What this pack contains

This folder is the source of truth for the MVP. Cursor should read these files before making architectural or implementation decisions.

1. `CURSOR_MASTER_PROMPT.md` — the initial prompt to paste into Cursor.
2. `MVP_ROADMAP.md` — phases, steps, substeps, acceptance criteria, and MVP boundaries.
3. `TECHNICAL_ARCHITECTURE.md` — proposed stack, modules, boundaries, data flow, and algorithm design.
4. `DATA_SOURCES_AND_ACCESS.md` — official/community data sources, authentication status, missing credentials, and prohibited/unsupported sources.
5. `RISKS_AND_KNOWN_ISSUES.md` — expected technical/product/legal/data-quality issues and mitigations.
6. `DOCUMENTATION_PROTOCOL.md` — mandatory documentation rules after every completed implementation step.
7. `STEP_COMPLETION_TEMPLATE.md` — template for one dedicated `.md` progress file per completed step.
8. `DECISION_LOG.md` — architecture/product decisions that should not be silently changed.
9. `BACKLOG.md` — features intentionally deferred beyond the first MVP.

## Non-negotiable project rules

- Do not invent API credentials, client IDs, secrets, access tokens, scopes, endpoints, or permissions.
- Do not commit secrets to Git.
- All external services must be behind an adapter/interface so they can be mocked while credentials are unavailable.
- Prefer deterministic calculations for build optimization. An LLM may explain recommendations, but should not be the source of numerical build truth.
- Every completed implementation step must create a **new, separate progress `.md` file** in `docs/progress/`.
- Every progress file must document what changed, why, files touched, tests run, results, known limitations, decisions, and the next safe step.
- Do not silently change data providers or scrape undocumented/private APIs.
- Pin external data versions/commits where practical and record the exact version used.
- The application should remain useful before GGG OAuth approval by supporting local/mock/sample build data.

## Recommended repository structure

```text
poe2-helper/
├─ README.md
├─ docs/
│  ├─ planning/
│  │  └─ <copy this planning pack here>
│  ├─ progress/
│  │  ├─ STEP-001-project-scaffold.md
│  │  ├─ STEP-002-passive-tree-ingestion.md
│  │  └─ ...
│  ├─ decisions/
│  └─ data-snapshots/
├─ apps/
│  └─ web/
├─ packages/
│  ├─ domain/
│  ├─ data-sources/
│  ├─ passive-engine/
│  ├─ gear-engine/
│  ├─ crafting-engine/
│  └─ scoring-engine/
├─ scripts/
├─ tests/
├─ .env.example
└─ package.json
```

## First success milestone

The first meaningful milestone is **not** OAuth login. It is:

> Given a sample PoE2 character state, a level/passive-point budget, and a build objective, the application can load current passive-tree data, identify legal reachable passive paths, score candidate paths, and display several explainable recommendations.

OAuth should be added only after the deterministic core works and after GGG credentials are approved.
