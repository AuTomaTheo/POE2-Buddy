# PoE2 Helper — Data Sources, Credentials, and Access Status

**Verified:** 2026-09-26  
This file must be re-verified before production launch and after major PoE/GGG/API changes.

## Status legend

- `AVAILABLE` — can be used now within documented conditions.
- `MISSING CREDENTIALS` — integration design may proceed, but live calls cannot.
- `OPTIONAL` — not required for the MVP.
- `DO NOT USE` — unsupported/private/undesired dependency.
- `VERIFY BEFORE IMPLEMENTATION` — source/mechanic may change and requires re-check.

## 1. Grinding Gear Games developer API

### Purpose
Authenticated account/character import and selected service data.

### Current PoE2 support relevant to this project
Official GGG documentation currently lists PoE2 support for the account character endpoints. A fetched PoE2 character may include equipment, skills, jewels, passives, weapon-set specialisations, and quest passive stats.

The documentation currently marks account stashes as **PoE1 only**. Therefore the MVP must not promise automatic PoE2 stash wealth/budget detection.

### Credentials/access status

**Status: `MISSING CREDENTIALS`**

We do not currently have an approved GGG OAuth application/client configuration.

Expected integration need:
- app registration with GGG;
- OAuth client details supplied/approved by GGG;
- user authorization at runtime;
- minimum required scope for character import: `account:characters`;
- additional service scopes only if the application actually uses those service endpoints.

Do not request broad scopes “just in case.”

### Environment placeholders

```dotenv
GGG_CLIENT_ID=
GGG_CLIENT_SECRET=
GGG_REDIRECT_URI=
```

Exact values are intentionally absent.

### Development strategy while blocked

Implement:
- provider interface;
- fixtures;
- mock OAuth state/session tests;
- disabled live provider with a useful configuration error.

Do **not** invent a client ID or secret.

### Official references
- https://www.pathofexile.com/developer/docs
- https://www.pathofexile.com/developer/docs/reference

## 2. Official GGG PoE2 passive-tree export

### Purpose
Current passive nodes, tree connections/metadata, and passive-tree assets needed for graph construction and possibly visualization.

### Access status

**Status: `AVAILABLE`**

Public repository:
- https://github.com/grindinggear/poe2-skilltree-export

No application credential is required merely to consume the public export.

### Implementation requirements
- pin commit/tag/snapshot;
- store/check source version;
- validate schema at ingestion;
- keep previous known-good snapshot;
- do not fetch on every end-user request.

## 3. RePoE PoE2 structured game data

### Purpose
Potential structured sources for:
- base items;
- mods;
- stat IDs/translations;
- item classes/tags;
- gems;
- spawn weights;
- other data useful to item/crafting logic.

### Access status

**Status: `AVAILABLE`, COMMUNITY-MAINTAINED`**

Relevant organization/source:
- https://github.com/repoe-fork
- PoE2 export identified by the project: https://github.com/repoe-fork/poe2

No private credential is expected for normal public repository/export access.

### Risks
- community-maintained;
- schema may change;
- game patches can invalidate assumptions;
- not every mechanic is necessarily fully represented;
- data licensing/terms must be respected.

Use runtime validation and version pinning.

## 4. poe.ninja PoE2 economy API

### Purpose
Economy/pricing information for supported categories.

### Credential status

**Status: `AVAILABLE — NO PRIVATE API CREDENTIAL CURRENTLY REQUIRED FOR THE SUPPORTED ECONOMY ENDPOINTS`**

This is important: we are **not currently blocked on a poe.ninja API key** for the supported public economy API.

However, poe.ninja explicitly describes this surface as supported for public use but not as a versioned/SLA product. Breaking changes are possible.

### Required behavior
- call through our backend;
- cache responses;
- respect HTTP caching/ETag behavior where practical;
- do not poll aggressively;
- use a descriptive User-Agent including application/contact information;
- expect PoE2 economy source data to refresh much more slowly than individual requests;
- make provider failure non-fatal to the passive optimizer.

### Forbidden/unsupported dependency

**Status for builds/profiles/character/authentication endpoints: `DO NOT USE`**

poe.ninja documents those as internal, unsupported, and unavailable for third-party use.

### Official reference
- https://poe.ninja/docs/api

## 5. Path of Building 2 Community

### Purpose
Reference implementation for PoE2 build calculations, mechanics behavior, and test/reference comparisons.

### Access status

**Status: `AVAILABLE AS PUBLIC OPEN-SOURCE REFERENCE`, LICENSE REVIEW REQUIRED`**

Repository:
- https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2

### Important rule
Do not assume its internals can be copied directly into a TypeScript web app. Before code reuse:
- inspect current license;
- determine whether reuse/linking/translation is compatible with the project;
- document any copied/adapted logic and license obligations.

For early MVP, use it primarily as a correctness reference while implementing a deliberately smaller deterministic engine.

## 6. Optional LLM provider

### Purpose
Natural-language explanation of already-calculated recommendations.

### Access status

**Status: `OPTIONAL / MISSING KEY UNTIL INTENTIONALLY SELECTED`**

The MVP must work without an LLM provider.

Potential environment abstraction:

```dotenv
AI_PROVIDER=
AI_API_KEY=
AI_MODEL=
```

Do not choose a provider or store a key until the product intentionally adds this feature.

## 7. GitHub access

### Purpose
Fetching public source snapshots during development/update jobs.

### Access status

**Status: `AVAILABLE` for public repositories; token `OPTIONAL`**

A GitHub token may become useful for higher API rate limits or automation but should not be a hard MVP requirement unless the implementation actually requires the GitHub API rather than raw/public release assets.

Potential optional placeholder:

```dotenv
GITHUB_TOKEN=
```

## 8. Trade-site rare-item search

### Access status

**Status: `DO NOT USE AS AN UNDOCUMENTED/REVERSE-ENGINEERED MVP DEPENDENCY`**

Do not build the MVP around internal website endpoints or browser-network reverse engineering. If GGG later offers a documented approved trade API suitable for this product, re-evaluate and document it.

## Credentials checklist

| Integration | Needed for MVP core? | Current status | Secret? | Action |
|---|---:|---|---:|---|
| GGG OAuth client | No, not for deterministic fixture-based MVP | MISSING CREDENTIALS | Yes | Apply after prototype is understandable and functional |
| GGG user access token | No | Unavailable until OAuth + user consent | Yes | Runtime only after approved integration |
| GGG passive-tree export | Yes | AVAILABLE | No | Pin/version snapshot |
| RePoE PoE2 data | Later gear/crafting | AVAILABLE | No | Validate/pin schema/version |
| poe.ninja economy | Later pricing | AVAILABLE | No private key currently | Backend cache + proper User-Agent |
| poe.ninja internal builds/profile/auth | No | DO NOT USE | N/A | Never depend on it |
| LLM provider | No | OPTIONAL / NOT CONFIGURED | Yes | Add only after deterministic core works |
| GitHub token | No | OPTIONAL | Yes | Add only if automation needs it |

## When GGG credentials arrive

Do not simply paste them into Cursor chat or source files. Add them to a local/deployment secret store, confirm `.gitignore`, verify minimum scopes, and create a dedicated progress document describing the integration without printing secret values.
