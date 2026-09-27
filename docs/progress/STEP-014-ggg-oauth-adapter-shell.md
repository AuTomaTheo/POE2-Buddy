# STEP-014 — GGG OAuth adapter shell

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-014  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add the GGG OAuth and character-provider boundary so the app still runs without approved client credentials. Keep the live authorization and character import disabled. Do not start STEP-015.

## 2. Acceptance criteria

- [x] OAuth configuration and `GggCharacterProvider` exist
- [x] A mock provider returns named fixture characters
- [x] Callback and session handling exist without a token exchange
- [x] Required environment names are documented and remain empty
- [x] The app runs without GGG credentials
- [x] The live provider is disabled with a clear message
- [x] Required repository checks pass

## 3. Implementation summary

`readGggOAuthConfig` reads `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, and `GGG_REDIRECT_URI`. Empty values are missing. A pending session stores `state` and a PKCE verifier in memory for 10 minutes. The cookie stores only the session id and is `HttpOnly`. `GET /api/auth/ggg/start` returns 503 and does not redirect to Grinding Gear Games. `GET /api/auth/ggg/callback` checks `state` and does not post the authorization code to the token endpoint. `createMockGggCharacterProvider` lists and loads named character snapshots. `createDisabledGggCharacterProvider` is what `GET /api/auth/ggg/characters` calls, and it always returns 503. Passive analysis does not call these routes.

## 4. Files created

| File                                                        | Purpose                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/data-sources/src/oauth/ggg-oauth.ts`              | Config, PKCE session, and authorization URL builder        |
| `packages/data-sources/src/oauth/ggg-character-provider.ts` | Provider interface, mock, and disabled live provider       |
| `packages/data-sources/src/oauth/ggg-oauth.test.ts`         | Config, PKCE, session expiry, mock, and disabled provider  |
| `apps/web/src/server/ggg-auth-route.ts`                     | Start, callback, and character route behavior              |
| `apps/web/src/app/api/auth/ggg/start/route.ts`              | `GET /api/auth/ggg/start`                                  |
| `apps/web/src/app/api/auth/ggg/callback/route.ts`           | `GET /api/auth/ggg/callback`                               |
| `apps/web/src/app/api/auth/ggg/characters/route.ts`         | `GET /api/auth/ggg/characters`                             |
| `tests/ggg-auth-route.test.ts`                              | Missing credentials, no token exchange, analysis isolation |
| `docs/progress/STEP-014-ggg-oauth-adapter-shell.md`         | This record                                                |

## 5. Files changed

| File                                 | Change                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `packages/domain/src/character.ts`   | Adds `CharacterSummary`                                                  |
| `packages/domain/src/index.ts`       | Exports `CharacterSummary`                                               |
| `packages/data-sources/src/index.ts` | Exports the OAuth shell                                                  |
| `packages/domain/README.md`          | Notes that a summary is not a token                                      |
| `packages/data-sources/README.md`    | Documents the provider and session                                       |
| `apps/web/README.md`                 | Documents the disabled auth routes                                       |
| `README.md`                          | Mentions the OAuth shell                                                 |
| `.env.example`                       | States that setting the GGG variables does not enable live authorization |
| `docs/planning/DECISION_LOG.md`      | Adds D-066                                                               |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`readGggOAuthConfig` owns the three environment names and refuses to treat an empty or unusable value as configured. `createGggOAuthPendingSession` owns `state` and the PKCE pair. `createGggOAuthSessionStore` owns the 10-minute server memory. `buildGggAuthorizeUrl` owns the documented authorize query, including `scope=account:characters` and `code_challenge_method=S256`. The web handlers do not send that URL to the browser. `handleGggAuthCallback` owns state comparison and refuses the code exchange. `createMockGggCharacterProvider` owns fixture lookup. `createDisabledGggCharacterProvider` owns the live-import refusal. Passive analysis does not import these modules.

## 8. External APIs / data sources involved

- Provider: Grinding Gear Games OAuth, documented at `https://www.pathofexile.com/developer/docs/authorization`
- Endpoints named, not called: `GET https://www.pathofexile.com/oauth/authorize` and `POST https://www.pathofexile.com/oauth/token`
- Official OAuth 2.1 surface. Not an SLA.
- Auth/scopes: the only scope constant is `account:characters`. No token is requested.
- Fields used: none from a live response
- Cache/rate behavior: pending sessions live in memory for 10 minutes. There is no provider polling.
- Version: no character document is fetched, so there is no new snapshot commit
- Fallback: missing configuration and the disabled provider both return HTTP 503. Passive analysis does not use this path.

The character list and character document endpoints are not called. That import remains STEP-015.

## 9. Credentials / environment variables

### Added/changed variable names

```dotenv
GGG_CLIENT_ID=
GGG_CLIENT_SECRET=
GGG_REDIRECT_URI=
```

These names already existed. This step did not add a value. **Never include real secret values.**

### Credential status

MISSING

No approved GGG OAuth client is available. The shell does not invent a client id, secret, or access token.

## 10. Data model / schema changes

`CharacterSummary` is a new domain type with `name`, `level`, and `className`. `GggOAuthPendingSession` is server state, not a character document. No passive, scoring, economy, or snapshot-pin schema changed.

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

| Command/Test             | Result | Notes                                                                                                                                                      |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`               | PASS   | 26 files, 162 tests                                                                                                                                        |
| `ggg-oauth.test.ts`      | PASS   | Missing config, PKCE S256, character scope only, secret stays off the authorize URL, expired session, mock lookup, disabled provider                       |
| `ggg-auth-route.test.ts` | PASS   | Missing credentials return 503 with no cookie. A matching callback returns 503 and does not echo the code. Analysis files do not reference the auth routes |
| `npm run typecheck`      | PASS   | Root, web, domain, data-sources, passive-engine, scoring-engine                                                                                            |
| `npm run lint`           | PASS   | Exit 0                                                                                                                                                     |
| `npm run format:check`   | PASS   | Exit 0                                                                                                                                                     |

## 13. Manual verification

The analysis screen was not changed, so its browser flow was not re-run. With the webpack dev server already on port 3000 and the GGG variables unset, `GET /api/auth/ggg/start` and `GET /api/auth/ggg/characters` returned 503, and `GET /api/auth/ggg/callback` returned 400. None of those responses redirected to `pathofexile.com`. Automated tests do not contact Grinding Gear Games.

## 14. Errors/issues encountered

The first PKCE assertion failed because the test supplied the same bytes for the session id, state, and verifier, so the authorize URL contained that shared value as `state`. The test now uses a different buffer for each call. Production session creation already asks for three separate random values.

## 15. Security/privacy impact

The client secret is read only on the server and is not written into the authorization URL, the cookie, or the route JSON. The PKCE verifier stays in the server session. The cookie is `HttpOnly`, `SameSite=Lax`, and scoped to `/api/auth/ggg`. State is compared with a length check and `timingSafeEqual`. A mismatched state does not consume the session. A matched callback consumes it and still does not exchange the code. The response does not echo the code. Passive analysis still does not receive account data.

## 16. Performance impact

Not on the analysis request path. A start request with missing configuration does not allocate a session. A configured start stores one session for 10 minutes and still does not call GGG.

## 17. Data provenance / reproducibility impact

Mock characters keep the `sourceVersion` already on the fixture. No live character import is recorded because none is performed. Passive recommendations still record the passive-tree `dataVersion`.

## 18. Known limitations

- The session store is in memory and clears when the process stops.
- Setting the three environment variables does not enable a redirect or a token exchange.
- The authorize URL builder is tested and is not returned by the start route.
- Character normalization from a GGG document is not implemented.
- Token revocation and refresh are not implemented.
- The routes are not linked from the analysis screen.

## 19. Decisions made

D-066. The live provider stays disabled. The mock provider is the only character source behind this interface. The session holds state and the PKCE verifier on the server. The cookie holds the session id. The only scope is `account:characters`. No authorization code is exchanged. No credential is invented.

## 20. Deviations from planning docs

`None`

## 21. Remaining risks

A later change could call `/oauth/token` from this shell before the security review that STEP-015 requires. The current routes do not reference that endpoint. An in-memory session can disappear on restart, which only matters after live authorization exists.

## 22. Rollback notes

Remove the OAuth modules, the `/api/auth/ggg` routes, and `CharacterSummary`. Passive analysis, the economy proxy, and the approved tree pin do not depend on this step. Leave the empty GGG names in `.env.example` if other docs still mention them.

## 23. Recommended next step

STEP-015, live GGG character import, only after Grinding Gear Games approves a client and the user explicitly asks for that step. Do not invent OAuth credentials. Do not start it as part of this step.

## 24. Completion statement

STEP-014 satisfies the acceptance criteria. The app runs without GGG credentials. The live character provider and the authorization routes stay disabled with an explicit message, and a mock provider can return a named fixture.
