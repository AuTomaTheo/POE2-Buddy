# STEP-013 — poe.ninja economy adapter

**Date:** 2026-09-26  
**Status:** COMPLETE  
**Roadmap reference:** Phase 4 / STEP-013  
**Authoring context:** Cursor-assisted development

## 1. Objective

Add a server-side adapter for the supported PoE2 poe.ninja economy endpoints. Cache the responses, identify this app in the User-Agent, and keep provider failures away from passive optimization. Do not start STEP-014.

## 2. Acceptance criteria

- [x] Only supported PoE2 economy endpoints are used
- [x] The browser does not call poe.ninja
- [x] Responses are cached and conditional requests send the stored ETag
- [x] The User-Agent includes the app and a contact
- [x] Retries use a short bounded backoff and do not poll aggressively
- [x] Price payloads are normalized into an internal model
- [x] A provider failure does not run inside passive optimization
- [x] Required repository checks pass

## 3. Implementation summary

`createPoeNinjaClient` requests leagues, the currency-exchange overview, and the stash-item overview. Category names are limited to the PoE2 lists in the poe.ninja API reference. The client stores a successful body until `Cache-Control: max-age` expires, or for 300 seconds when that directive is absent, and sends `If-None-Match` on the next request. HTTP 429 and 5xx are retried at most three times. `Retry-After` is honored up to 5 seconds. `GET /api/economy` is the web proxy. It refuses to call poe.ninja until `POE2_NINJA_CONTACT` is set. The analysis screen and passive analysis server do not call this route.

## 4. Files created

| File                                                  | Purpose                                                   |
| ----------------------------------------------------- | --------------------------------------------------------- |
| `packages/domain/src/economy.ts`                      | Normalized league and price-snapshot schemas              |
| `packages/data-sources/src/economy/poe-ninja.ts`      | Cached PoE2 economy client                                |
| `packages/data-sources/src/economy/poe-ninja.test.ts` | URL, cache, retry, and schema checks without the network  |
| `apps/web/src/server/economy-route.ts`                | Server proxy behavior for the economy route               |
| `apps/web/src/app/api/economy/route.ts`               | `GET /api/economy`                                        |
| `tests/economy-route.test.ts`                         | Missing contact, provider failure, and analysis isolation |
| `docs/progress/STEP-013-poe-ninja-economy-adapter.md` | This record                                               |

## 5. Files changed

| File                                 | Change                                    |
| ------------------------------------ | ----------------------------------------- |
| `packages/domain/src/index.ts`       | Exports the economy types                 |
| `packages/data-sources/src/index.ts` | Exports the poe.ninja client              |
| `packages/domain/README.md`          | Notes that a price is not a passive score |
| `packages/data-sources/README.md`    | Documents the economy client              |
| `apps/web/README.md`                 | Documents the server proxy                |
| `README.md`                          | Mentions the economy client               |
| `.env.example`                       | Adds empty `POE2_NINJA_CONTACT`           |
| `docs/planning/DECISION_LOG.md`      | Adds D-065                                |

## 6. Files deleted

`None`

## 7. Important code paths / responsibilities

`createPoeNinjaClient` owns the allowlisted URLs, cache, conditional request, and retry. `poeNinjaUserAgent` owns the contact check. `parseEconomySnapshot` owns the normalized shape. `handleEconomyGet` owns the proxy status codes. `serverPoeNinjaClient` keeps one client per User-Agent in the web process. Passive analysis does not import any of these.

## 8. External APIs / data sources involved

- Provider: poe.ninja
- Endpoints: `GET https://poe.ninja/poe2/api/economy/leagues`, `GET https://poe.ninja/poe2/api/economy/exchange/current/overview`, `GET https://poe.ninja/poe2/api/economy/stash/current/item/overview`
- Official public economy surface. Not an SLA.
- Auth: none
- Fields used: league `id` and `name`; exchange `lines.id`, `lines.primaryValue`, `lines.volumePrimaryValue`, `core.primary`, `core.items.id`, `core.items.name`, `core.items.category`; stash `lines.id`, `lines.name`, `lines.category`, `lines.primaryValue`, `lines.listingCount`
- Cache: in memory, `max-age` or 300 seconds, plus ETag
- Version: the response has no commit. `fetchedAt` is the time this process accepted the body
- Fallback: schema or HTTP failure throws. Passive optimization continues because it does not call this client

Builds, profiles, characters, authentication, and PoE1 routes are not requested.

## 9. Credentials / environment variables

### Added/changed variable names

```dotenv
POE2_NINJA_CONTACT=
```

**Never include real secret values.**

### Credential status

NOT REQUIRED

The supported economy API does not use a private key. `POE2_NINJA_CONTACT` is a contact string for the User-Agent, not a credential. The route does not call poe.ninja while it is empty.

## 10. Data model / schema changes

`EconomyLeague` and `EconomySnapshot` are new domain types. A line has `id`, `name`, `category`, `primaryValue`, `listingCount`, `volumePrimaryValue`, and `kind` of `exchange` or `stash-item`. No passive, scoring, or snapshot-pin schema changed.

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

| Command/Test            | Result | Notes                                                                                              |
| ----------------------- | ------ | -------------------------------------------------------------------------------------------------- |
| `npm test`              | PASS   | 24 files, 151 tests                                                                                |
| `poe-ninja.test.ts`     | PASS   | Allowlisted URL, cache, ETag, retry cap, no retry on 404, schema failure is not cached             |
| `economy-route.test.ts` | PASS   | Missing contact returns 503. Provider failure returns 503. Analysis files do not mention poe.ninja |
| `npm run typecheck`     | PASS   | Root, web, domain, data-sources, passive-engine, scoring-engine                                    |
| `npm run lint`          | PASS   | Exit 0                                                                                             |
| `npm run format:check`  | PASS   | Exit 0                                                                                             |

## 13. Manual verification

The analysis screen was not changed, so its browser flow was not re-run. The new route was checked through `handleEconomyGet`: with no client it returns 503 and does not fetch, and a provider error stays on that response. With the webpack dev server already on port 3000 and `POE2_NINJA_CONTACT` unset, `GET /api/economy?resource=leagues` returned 503 and `{"error":"Set POE2_NINJA_CONTACT before requesting economy data."}`. Automated tests do not contact poe.ninja. One manual read of the public leagues list and one exchange overview was used only to match the documented JSON field names while writing the schema.

## 14. Errors/issues encountered

`None` during the final test run.

## 15. Security/privacy impact

No API key or character token is stored. The contact string is sent only as the User-Agent on server requests. The client refuses response URLs outside `https://poe.ninja/poe2/api/economy/`. League ids cannot contain slashes or query separators. The analysis screen still does not receive account data.

## 16. Performance impact

Not on the analysis request path. An economy request hits the network only when the in-process entry is stale. Retries stop after three attempts. `Retry-After` cannot make one request sleep longer than 5 seconds.

## 17. Data provenance / reproducibility impact

An `EconomySnapshot` records `source`, league, category, reference currency, and `fetchedAt`. It has no git commit because the economy API does not publish one. Passive recommendations still record the passive-tree `dataVersion` and do not record a price snapshot, because they do not use prices.

## 18. Known limitations

- The cache is in memory and clears when the process stops.
- Stash-item lines do not name the reference currency. The exchange overview does, through `core.primary`.
- Rare-item pricing is not inferred.
- PoE1 endpoints are not implemented.
- The route is not linked from the analysis screen.
- A live call still depends on poe.ninja being reachable and on the current JSON shape.

## 19. Decisions made

D-065. Only the three supported PoE2 economy routes and their documented categories are allowed. The browser does not call poe.ninja. Cache and retry stay bounded. Price values are not scores. Passive optimization does not call the client.

## 20. Deviations from planning docs

`None`

## 21. Remaining risks

poe.ninja can change the economy JSON without notice. A schema mismatch fails the economy request and leaves passive analysis usable. The in-memory cache can serve data for up to the advertised `max-age` after the provider has newer prices.

## 22. Rollback notes

Remove the economy client, the `/api/economy` route, `POE2_NINJA_CONTACT`, and the domain economy types. Passive analysis, the approved tree pin, and rollback of that pin do not depend on this step.

## 23. Recommended next step

STEP-014, the GGG OAuth adapter shell, after explicit approval. Do not invent OAuth credentials. Do not start it as part of this step.

## 24. Completion statement

STEP-013 satisfies the acceptance criteria. Supported PoE2 economy responses can be cached and normalized on the server. The browser does not call poe.ninja, and a provider failure cannot run inside passive optimization.
