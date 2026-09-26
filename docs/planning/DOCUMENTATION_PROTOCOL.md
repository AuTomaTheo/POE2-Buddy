# PoE2 Helper — Mandatory Development Documentation Protocol

## Purpose

The project must remain understandable even if development is heavily AI-assisted. Chat history is **not** project documentation. The repository is the source of truth.

## Golden rule

> Every completed implementation step creates one new, dedicated `.md` file under `docs/progress/` before the step can be considered complete.

No exceptions for “small” steps if they change application behavior, architecture, data handling, dependencies, schemas, provider behavior, or tests.

## File naming

Use:

```text
STEP-###-short-kebab-case-title.md
```

Examples:

```text
STEP-001-project-scaffold.md
STEP-002-domain-models.md
STEP-003-passive-tree-ingestion.md
STEP-004-passive-graph.md
```

Never overwrite an old progress file to describe a new implementation step.

## Required content

Every step file must contain all headings from `STEP_COMPLETION_TEMPLATE.md`, even if a section says `None` or `Not applicable`.

Especially important:
- what changed;
- why it changed;
- exact files touched;
- commands/tests run;
- test outputs/results;
- external API/data assumptions;
- environment-variable changes;
- known limitations;
- security/privacy impact;
- data-version/provenance impact;
- next step.

## Before starting a step

Cursor must:
1. read the latest relevant planning docs;
2. read at least the immediately previous progress step;
3. state the objective and acceptance criteria;
4. identify expected files to change;
5. flag blockers/credentials before coding.

## During a step

Cursor must:
- keep scope atomic;
- avoid unrelated refactors;
- write tests close to the implemented behavior;
- record unexpected source schema/mechanic discoveries;
- pause architecture changes until the decision is documented.

## At step completion

The progress document must be written **after implementation and test execution**, so it reflects reality rather than intention.

A step is not `COMPLETE` when:
- tests fail;
- lint/typecheck required for the step fails;
- acceptance criteria are missing;
- required credentials were assumed/faked;
- documentation is missing;
- the code works only through an undocumented workaround.

Use `PARTIAL` or `BLOCKED` instead.

## Decision records

When a step makes a meaningful architectural decision, also update `DECISION_LOG.md` or create a dedicated ADR under `docs/decisions/`.

Examples:
- adding a database;
- changing framework;
- replacing a data source;
- introducing a queue/cache provider;
- changing the optimizer algorithm;
- using PoB source code rather than only reference behavior;
- selecting an LLM provider;
- adding user accounts.

## External data/API documentation

For every provider integration, document:
- source name;
- exact endpoint/file/repository;
- whether it is official/community;
- auth type;
- scopes;
- rate/caching constraints;
- fields actually consumed;
- adapter responsible;
- fallback behavior;
- last verification date;
- source version/commit when applicable.

## Credentials documentation

Documentation may contain variable names such as `GGG_CLIENT_ID` but must never contain actual secret values.

If credentials are missing, write:

```text
Status: BLOCKED — credential not yet issued/authorized.
```

Do not replace this with a fake string that looks like a credential.

## Data changes

Whenever a game-data snapshot is changed, the progress document must include:
- previous version/commit/checksum;
- new version/commit/checksum;
- schema validation result;
- optimizer regression result;
- known gameplay changes noticed;
- rollback instructions.

## Testing documentation

Do not write only “tests passed.” Record commands and scope.

Example:

```text
pnpm test --filter passive-engine
Result: PASS — 43 tests

pnpm typecheck
Result: PASS
```

If CI is later added, link/record the CI run identifier where practical.

## Error history

Important errors should remain documented even after resolution. This prevents the same failed approach from being reintroduced by a future AI coding session.

Include:
- error message/symptom;
- root cause;
- attempted fixes;
- final fix;
- whether regression test was added.

## Documentation quality test

Before finalizing a step, ask:

> Could another developer understand what happened, reproduce it, and know what to do next without reading the Cursor chat?

If not, the progress document is incomplete.

## User approval gates

For the early MVP, Cursor should stop after each major step and ask for approval before beginning the next step, especially for:
- architecture changes;
- external integrations;
- new dependencies;
- OAuth/security work;
- scoring-model changes that affect recommendations;
- crafting probability logic.

## End-of-phase summary

At the end of each roadmap phase, add a phase summary document such as:

```text
docs/progress/PHASE-01-passive-data-summary.md
```

This is in addition to, not instead of, the individual step documents.
