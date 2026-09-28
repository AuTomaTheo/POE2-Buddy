# STEP-015 — Live GGG character import

**Date:** 2026-09-27  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-015  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the confidential OAuth code exchange and one-character import path, with provider-side validation and passive-tree compatibility. Keep live network authorization disabled because no approved GGG client exists. Do not start the next roadmap step.

## 2. Acceptance criteria

- [x] The user can authorize only when the explicit live gate is ready
- [x] The only scope is `account:characters`
- [x] The client secret and access token stay on the server
- [x] A validated character becomes a `CharacterBuildSnapshot`
- [x] The app still runs with the GGG variables empty
- [x] Live network authorization stays disabled in the default configuration
- [x] Required repository checks pass

## 3. Implementation summary

`readGggLiveImportReadiness` is ready only for a valid confidential client, a contact, and `GGG_LIVE_IMPORT=enabled`. Otherwise `GET /api/auth/ggg/start` returns 503 and does not redirect. When the gate is ready, start stores a 10-minute PKCE session and redirects to the documented authorize URL. The callback checks `state` before it posts the code to the token endpoint, then drops the code. The access token stays in memory for at most one hour. Refresh tokens are ignored. `GET /api/auth/ggg/characters` lists characters. `GET /api/auth/ggg/characters/import?name=` imports one character. Unknown passive ids remain on the snapshot and mark it incompatible. `POST /api/auth/ggg/disconnect` clears the local cookie and session and does not claim remote revocation. The analysis screen shows the disabled state and no connect link while the gate is closed.

## 4. Files created

| File                                                             | Purpose                                               |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/data-sources/src/oauth/ggg-character-document.ts`      | Provider schemas and deterministic normalization      |
| `packages/data-sources/src/oauth/ggg-character-document.test.ts` | List, document, compatibility, and enable-gate checks |
| `packages/data-sources/src/oauth/ggg-live-provider.ts`           | Server-only PoE2 character GET client                 |
| `apps/web/src/app/api/auth/ggg/characters/import/route.ts`       | Import one selected character                         |
| `apps/web/src/app/api/auth/ggg/disconnect/route.ts`              | Clear the local GGG session                           |
| `tests/ggg-live-import.test.ts`                                  | Redirect, state, token storage, and import isolation  |
| `docs/progress/STEP-015-live-ggg-character-import.md`            | This record                                           |

## 5. Files changed

| File                                                        | Change                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/data-sources/src/oauth/ggg-oauth.ts`              | Adds the live gate, token exchange, and access-token session |
| `packages/data-sources/src/oauth/ggg-character-provider.ts` | Mock and disabled providers return an import result          |
| `packages/data-sources/src/index.ts`                        | Exports the live import API                                  |
| `packages/domain/src/character.ts`                          | Adds optional summary id, league, and skill support names    |
| `apps/web/src/server/ggg-auth-route.ts`                     | Start, callback, list, import, and disconnect behavior       |
| `apps/web/src/app/api/auth/ggg/start/route.ts`              | Uses the live gate and production cookie rule                |
| `apps/web/src/app/api/auth/ggg/callback/route.ts`           | Passes the token store to the callback                       |
| `apps/web/src/app/api/auth/ggg/characters/route.ts`         | Lists characters only when the gate is ready                 |
| `apps/web/src/app/page.tsx`                                 | Passes the public import status to the screen                |
| `apps/web/src/app/analysis-screen.tsx`                      | Shows a connect link only when live import is enabled        |
| `packages/data-sources/README.md`                           | Documents the gate and token policy                          |
| `apps/web/README.md`                                        | Documents the import routes                                  |
| `README.md`                                                 | Mentions the enable flag                                     |
| `.env.example`                                              | Adds empty `GGG_LIVE_IMPORT` and `GGG_CONTACT`               |
| `docs/planning/DECISION_LOG.md`                             | Adds D-067, D-068, and D-069                                 |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`readGggLiveImportReadiness` owns the enable gate. `exchangeGggAuthorizationCode` owns the server token POST and schema check. `createGggAccessSessionStore` owns the access token. `normalizeGggCharacterDocument` owns the mapping into the domain snapshot and the unavailable list. `createLiveGggCharacterProvider` owns the PoE2 character GET calls. The web handlers own status codes and cookies. Passive analysis does not import the live provider.

## 8. External APIs / data sources involved

- Provider: Grinding Gear Games
- Endpoints implemented, not called by the default tests or the default server configuration: `GET https://www.pathofexile.com/oauth/authorize`, `POST https://www.pathofexile.com/oauth/token`, `GET https://api.pathofexile.com/character/poe2`, `GET https://api.pathofexile.com/character/poe2/{name}`
- Official OAuth 2.1 and account character surface. Not an SLA.
- Auth/scopes: confidential client, `account:characters` only
- Fields used from the published Character and Item objects: `id`, `name`, `class`, `level`, `league`, `equipment`, `skills`, `jewels`, `passives.hashes`, `passives.specialisations`, `passives.quest_stats`, and the item fields required to name a skill or item
- Cache/rate behavior: character GETs retry HTTP 429 and 5xx once. Token exchange is not retried. There is no polling.
- Version: no live character was fetched, so there is no new account snapshot commit
- Fallback: a closed gate returns 503. A provider failure stays on the import route.

## 9. Credentials / environment variables

### Added/changed variable names

```dotenv
GGG_CLIENT_ID=
GGG_CLIENT_SECRET=
GGG_REDIRECT_URI=
GGG_LIVE_IMPORT=
GGG_CONTACT=
```

**Never include real secret values.**

### Credential status

MISSING

No approved GGG OAuth client is available. Live network authorization remains disabled.

## 10. Data model / schema changes

`CharacterSummary` may include `id` and `league`. `NormalizedSkill` may include `supportNames`. Provider Zod schemas for the GGG list, character, item, and token response are separate from the domain schemas. No scoring or passive-tree pin schema changed.

## 11. Commands executed

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

`npm audit` was not run. Dependency versions did not change.

## 12. Automated tests

| Command/Test                     | Result | Notes                                                                                            |
| -------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| `npm test`                       | PASS   | 28 files, 173 tests                                                                              |
| `ggg-character-document.test.ts` | PASS   | Enable gate, list, normalization, unknown nodes, missing field, no retry on 401                  |
| `ggg-live-import.test.ts`        | PASS   | Secure cookie, no exchange after bad state, token absent from the response, one-character import |
| `ggg-auth-route.test.ts`         | PASS   | Empty configuration still returns 503 and does not redirect                                      |
| `npm run typecheck`              | PASS   | Root, web, domain, data-sources, passive-engine, scoring-engine                                  |
| `npm run lint`                   | PASS   | Exit 0                                                                                           |
| `npm run format:check`           | PASS   | Exit 0                                                                                           |

## 13. Manual verification

With the webpack dev server on port 3000 and the GGG variables unset, the home page states that live import is disabled and does not show "Connect GGG account". `GET /api/auth/ggg/start` and `GET /api/auth/ggg/characters` return 503. `GET /api/auth/ggg/callback` returns 400. None of those responses redirect to `pathofexile.com`. Automated tests use injected responses and do not contact Grinding Gear Games.

## 14. Errors/issues encountered

The token-exchange test first saw an empty request body because `fetch` was given a `URLSearchParams` object. The test now reads that object's form body. The secret is still absent from the browser response.

## 15. Security/privacy impact

The client secret is used only on the server token POST. The access token is kept in process memory and is not placed in the cookie, the import JSON, or logs. The authorization code is not echoed. State is checked before exchange. The cookie gains `Secure` on HTTPS and in production. Disconnect clears local state only. No account payload is written into the repository fixtures.

## 16. Performance impact

Not on the fixture analysis path. A character GET makes at most two requests. The token POST is not retried.

## 17. Data provenance / reproducibility impact

A live import records `source: "ggg"`, `importedAt`, the provider character id, the league, and the passive-tree source, version, and commit used for the unknown-node check. The same document, pin, and timestamp produce the same snapshot. Fixture analysis still uses the fixture `sourceVersion`.

## 18. Known limitations

- Approved GGG credentials are not available, so this environment does not perform a live login.
- The published character schema has not been confirmed against a real account payload.
- The published character object does not include ascendancy, so ascendancy stays unavailable.
- Refresh tokens and remote revocation are not implemented.
- The session stores are in memory and are single-process.
- Gear and skill text is imported and is not used by the current heuristic score.
- The selection UI is only the connect link, and that link is hidden while the gate is closed.

## 19. Decisions made

D-067, D-068, and D-069. Confidential client, explicit enable flag, server-only short-lived tokens, no refresh-token support, production `Secure` cookies, single-process session store, separate provider schemas, and unknown passives marked incompatible.

## 20. Deviations from planning docs

`None`

## 21. Remaining risks

A real GGG payload can omit a field the published schema marks as required, and that import will fail until the provider schema is updated from a captured response. An in-memory session is lost on restart and is unsafe for more than one server process.

## 22. Rollback notes

Remove the live provider, the import and disconnect routes, and the enable flag. The closed-gate 503 responses and fixture analysis do not require the token exchange. The approved tree pin does not depend on this step.

## 23. Recommended next step

Do not start the next roadmap step until this import is reviewed. A live login still needs an approved GGG client and `GGG_LIVE_IMPORT=enabled`.

## 24. Completion statement

STEP-015 satisfies the acceptance criteria for the code path. Live network authorization remains disabled because approved GGG credentials are not available. Fixture analysis still runs, and a tested import of a local character document produces a domain snapshot without exposing a token.

## OAuth Client Type

Confidential. `GGG_OAUTH_CLIENT_TYPE` is `confidential`. There is no public-client path.

## Scopes

`account:characters` only.

## Authorization Flow

Browser calls the PoE2 Buddy server. The server redirects to `https://www.pathofexile.com/oauth/authorize` only when the live gate is ready. The browser returns to `/api/auth/ggg/callback`. The server posts the code to `https://www.pathofexile.com/oauth/token`. The browser never calls the token endpoint.

## PKCE / State Handling

Every ready authorization creates `state`, a PKCE verifier, and an S256 challenge. The callback compares `state` before token exchange. A missing, expired, or mismatched state returns 400 and does not post the code. A matched callback consumes the pending session.

## Cookie Security

`HttpOnly`, `SameSite=Lax`, `Path=/api/auth/ggg`. `Secure` when the request is HTTPS or `NODE_ENV` is `production`. Local development over HTTP does not set `Secure`. The cookie value is the session id.

## Token Storage Policy

Server memory only. Not written to disk, `localStorage`, `sessionStorage`, a browser-readable cookie, a fixture, a log, or a URL.

## Token Lifecycle

The pending session lasts 10 minutes. The access token uses `expires_in` capped at one hour. There is no refresh. Disconnect deletes the local session. It does not revoke the token at GGG.

## Provider Boundary

`GggCharacterProvider` is the only character HTTP boundary. The web handlers call the mock, disabled, or live provider. They do not assemble character URLs themselves.

## Raw GGG Schemas

Provider schemas accept the published list, character, item, and token fields this import uses, and they strip the rest. They are not the domain schemas. They have not been confirmed on a live account response.

## Character Normalization

Class, level, passive hashes, weapon-set hashes, quest stats, skills, supports flagged `support: true`, equipment, and jewels are mapped when present. Empty item names fall back to `typeLine`. Modifier descriptions are kept as raw text.

## Passive-Tree Compatibility

Allocated and weapon-set ids are checked against the active pin. Unknown ids stay on the character. The import status becomes `incompatible`.

## Source Metadata

`source`, `importedAt`, `providerCharacterId`, `league`, and the passive-tree source, version, and commit. No token.

## Missing/Unsupported Data Policy

Absent sections are listed in `compatibility.unavailable` and are not invented. Ascendancy is always unavailable for this published schema. Unmarked socketed items are not labeled as supports.

## Logout/Disconnect Behavior

`POST /api/auth/ggg/disconnect` clears the server session and sets the cookie `Max-Age=0`. The response says the token was not revoked at Grinding Gear Games.

## Privacy / Data Minimization

The scope is character access only. One selected character is imported. Whole-account payloads are not stored. Live responses are not written over bundled fixtures.

## Mock vs Live Provider

The mock returns named fixtures and does not use the network. The live provider runs only behind a ready gate and an access token. The disabled provider is what the routes use while the gate is closed.

## Known Production Limitations

The session store is in memory. Production callbacks must reach the same process. There is no shared session database and no remote revocation.

## Character-Aware Scoring Status

Character data imported is not character-aware optimization. The current heuristic score still evaluates passive paths only. Gear and skill text are preserved and are not scored.
