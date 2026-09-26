# PoE2 Helper — Decision Log

Use this file for concise project-wide decisions. Large decisions may get a dedicated ADR in `docs/decisions/`.

## D-001 — Deterministic optimizer before LLM explanation

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Core recommendations must come from structured data and deterministic/testable algorithms. LLM usage, if added, is for explanation and interaction only.

**Reason:** Prevent hallucinated game mechanics, fake numbers, and untraceable recommendations.

## D-002 — OAuth is not required for first MVP milestone

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Build fixture/local import and the passive optimizer before live GGG account login.

**Reason:** GGG OAuth credentials are not yet available, while most optimizer work is independent of OAuth.

## D-003 — External services require adapters

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** GGG, poe.ninja, RePoE and other sources must be accessed through provider interfaces/adapters.

**Reason:** APIs/data formats can change, and blocked integrations need mock implementations.

## D-004 — Do not depend on undocumented trade/private APIs

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** No reverse-engineered/private PoE trade or poe.ninja builds/profile/auth endpoints as production MVP dependencies.

**Reason:** Stability, policy, privacy, and maintainability risk.

## D-005 — Heuristic score is not exact DPS

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Early optimizer outputs must be labeled heuristic and expose their components. Exact DPS/EHP claims require a validated calculation engine.

## D-006 — No database until required

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Initial MVP uses fixtures/versioned snapshots and in-process analysis. A database is added only after a persistent-state requirement is identified and documented.

## D-007 — Extremely detailed step-by-step documentation is mandatory

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Every completed implementation step creates a separate progress `.md` file. Chat history is never treated as sufficient project documentation.

## D-008 — Version/provenance accompanies recommendations

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Analysis results should record the game-data versions and optimizer/scoring version used.

**Reason:** PoE2 changes frequently and recommendations must be reproducible/debuggable.

## D-009 — npm workspaces with the Next.js app in `apps/web`

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** The repository is an npm workspace. The web application lives in `apps/web`. Future domain and engine code will live under `packages/`. pnpm is not used because it is not installed in the current development environment.

**Reason:** This matches the planned module boundaries and keeps UI code separate from later optimizer packages. npm is already available.

**Consequences:** Root scripts delegate to the `web` workspace. Next.js environment files are read from `apps/web`, while `.env.example` stays at the repository root.

## D-010 — Vitest for unit tests

**Status:** Accepted  
**Date:** 2026-09-26

**Decision:** Unit tests use Vitest. Playwright is still deferred until there is a browser flow to cover.

**Reason:** The planning documents allow Vitest or Jest. Vitest runs TypeScript tests directly and fits the current scaffold.

**Consequences:** `npm test` at the repository root runs `tests/**/*.test.ts`. Vitest is pinned to 4.1.11 because 3.2.x is affected by advisory GHSA-82fw-gwwq-j7x9.

---

## Template for new decision

### D-XXX — <Decision title>

**Status:** Proposed | Accepted | Superseded | Rejected  
**Date:** YYYY-MM-DD

**Decision:** ...

**Reason:** ...

**Consequences:** ...

**Supersedes / superseded by:** ...
