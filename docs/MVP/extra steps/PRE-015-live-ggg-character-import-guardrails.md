# PRE-015 — Live GGG character import guardrails

**Date:** 2026-09-27  
**Purpose:** Mandatory pre-implementation rules for STEP-015  
**Status:** APPROVED PRE-STEP REQUIREMENT

Read and apply this file before implementing STEP-015.

This is not a separate roadmap implementation step. It is the security, OAuth, and normalization contract for enabling live Grinding Gear Games character import.

---

## 1. Scope of STEP-015

STEP-015 may enable:

```text
GGG authorization
→ token exchange
→ character list
→ one selected character
→ server-side normalization
→ CharacterBuildSnapshot
```

STEP-015 must not silently expand into:

```text
gear recommendations
PoB2 calculations
crafting
trade pricing
AI analysis
automatic passive allocation
account-wide data collection beyond required scope
```

Keep the step focused on secure live character import.

---

## 2. Live activation requires approved GGG credentials

Do not invent, fake, hard-code, or infer:

```text
GGG_CLIENT_ID
GGG_CLIENT_SECRET
GGG_REDIRECT_URI
access tokens
refresh tokens
```

If approved credentials are not available, live network authorization must remain disabled.

Mocks and fixture-based tests may still be implemented.

The application must continue to work without GGG credentials.

---

## 3. OAuth client type must be explicit

PoE2 Buddy is a server-backed web application and should treat the GGG integration as a:

```text
confidential OAuth client
```

unless GGG explicitly approves a different client type.

Document the chosen client type.

The redirect URI used for production must match the URI registered with GGG exactly.

Do not silently switch client type or OAuth assumptions in code.

---

## 4. Authorization scope must stay minimal

Use only the minimum scope required for the character import flow.

Current intended scope:

```text
account:characters
```

Do not add extra scopes unless a later feature explicitly requires them.

Any future scope addition requires a documented purpose, code change, tests, and a decision-log entry.

---

## 5. PKCE and state remain mandatory

Preserve the STEP-014 protections.

Authorization must use:

```text
state
PKCE verifier
PKCE S256 challenge
```

The callback must verify `state` before token exchange.

A missing, expired, malformed, or mismatched state must fail safely.

Do not exchange an authorization code after failed state validation.

---

## 6. Authorization codes are one-time sensitive data

The callback must:

```text
receive code
validate state/session
exchange code server-side
discard code
```

Do not log, echo, persist, or return authorization codes to the browser.

---

## 7. Client secret stays server-side

`GGG_CLIENT_SECRET` must never appear in:

```text
browser JavaScript
authorization URL
cookies
HTML
client-visible JSON
logs
analytics
error responses
```

Only the server-side token exchange may use it.

Add a regression test protecting this invariant.

---

## 8. Token exchange is server-only

The browser must never call GGG's token endpoint directly.

The flow must remain:

```text
browser
   ↓
PoE2 Buddy server
   ↓
GGG token endpoint
```

The server must validate the token response before accepting it.

Do not trust raw provider JSON without schema validation.

---

## 9. Access-token storage

Treat access tokens as secrets.

For the MVP, choose and document one explicit token-storage policy.

Preferred local-development policy:

```text
server-side session only
short-lived
not persisted to disk
```

Do not store access tokens in:

```text
localStorage
sessionStorage
browser-readable cookies
fixture files
logs
URL query parameters
```

If persistent token storage is introduced later, it requires a separate security review.

---

## 10. Refresh tokens

Do not assume refresh tokens exist.

If GGG returns one and STEP-015 supports it, keep it server-side only, document rotation/expiry behavior, and add tests.

If refresh-token behavior is not required for the MVP, do not implement it speculatively.

---

## 11. Session cookie security

The OAuth session cookie must remain:

```text
HttpOnly
SameSite=Lax
scoped to the GGG auth path
```

For production HTTPS, it must also be:

```text
Secure
```

The code should explicitly distinguish local development from production behavior.

Do not weaken cookie settings to make testing easier.

---

## 12. Session lifetime

Pending authorization sessions must remain short-lived.

The existing approximately 10-minute pending-session lifetime is acceptable.

Expired sessions must fail safely.

A successful callback must consume the pending authorization session so the same state/session cannot be reused.

---

## 13. Production session-store warning

The current in-memory pending-session store is acceptable for:

```text
local development
single-process MVP testing
```

It is not reliable for horizontally scaled production.

If STEP-015 keeps the in-memory store, document that production callbacks must reach the same process/store.

Do not add Redis/database infrastructure unless required by the step.

---

## 14. Explicit live-provider boundary

Preserve the provider abstraction:

```text
GggCharacterProvider
├── mock
└── live
```

The rest of the application should consume the provider interface rather than call GGG endpoints directly.

Do not scatter GGG HTTP calls through the web app.

---

## 15. Raw GGG schemas must be provider-specific

Do not map unvalidated provider JSON directly into the domain model.

Use:

```text
GGG raw response
      ↓
provider-specific schema validation
      ↓
provider-specific normalized representation
      ↓
domain CharacterBuildSnapshot
```

Provider schemas and domain schemas must remain separate.

A GGG field rename or omission should fail at the provider boundary rather than corrupt the optimizer.

---

## 16. Character list schema

Validate the live character-list response.

Only retain fields needed for character selection, such as those actually returned and required by the application.

Conceptually:

```text
character id / stable provider identifier if available
name
level
class / class name
league if available
```

Do not assume exact field names before inspecting the real response.

Document the actual live schema once credentials are available.

---

## 17. Selected-character document schema

Validate the selected-character payload before normalization.

The normalized build must eventually preserve, when available:

```text
character identity
class / ascendancy
level
passive allocations
weapon-set passive allocations
skills
supports
equipment
source metadata
```

Do not silently drop data required by later character-aware optimization.

If GGG does not provide one of these, record it as unavailable rather than inventing it.

---

## 18. Passive-tree version compatibility

A live character's passive ids must be validated against the currently loaded passive-tree snapshot.

Do not silently accept unknown passive ids.

If a character references nodes absent from the active pin:

```text
live import must become incompatible / incomplete
```

and the API/UI must explain the version mismatch.

Do not coerce or discard unknown nodes to force analysis to continue.

---

## 19. Character source metadata

A live imported character should carry enough source metadata to reproduce or diagnose the import.

Conceptually:

```text
source: "ggg"
importedAt
character/provider identifier
league if available
passive-tree data version used for validation
```

Do not store access tokens inside source metadata.

---

## 20. Normalization must remain deterministic

The same validated GGG character payload plus the same tree snapshot must produce the same normalized character snapshot.

Do not use an LLM for:

```text
field mapping
skill detection
gear parsing
passive normalization
ascendancy inference
```

AI may explain normalized results later, but it must not be the import source of truth.

---

## 21. Missing or unsupported data

Do not fill gaps with guesses.

Examples:

```text
unknown support relationship
missing skill metadata
unrecognized item modifier
unknown passive id
missing weapon-set allocation
```

must remain explicit as unsupported, unknown, unavailable, or incomplete.

Do not convert missing data into zero-value data.

---

## 22. Error isolation

GGG provider failures must not break:

```text
fixture analysis
passive-tree refresh
poe.ninja economy access
existing local analysis screen
```

Live character import is an optional provider path.

Provider failure should return a clear import/auth error, not crash the application.

---

## 23. HTTP and provider errors

Handle at minimum:

```text
401
403
404
429
5xx
network timeout
invalid JSON
schema mismatch
expired token
```

Do not retry authentication failures blindly.

Retries, if added for provider GET calls, must be bounded.

Do not poll character endpoints aggressively.

---

## 24. Logout / disconnect behavior

If live authorization is enabled, provide an explicit way to clear local GGG session/token state.

At minimum:

```text
clear server-side token/session state
clear browser session cookie
```

If GGG supports token revocation and it is used, document and test it.

Do not claim remote revocation happened unless it actually did.

---

## 25. Logging rules

Never log:

```text
client secret
authorization code
access token
refresh token
PKCE verifier
full sensitive provider responses
```

Safe logs may include non-sensitive request outcome/status metadata.

Prefer avoiding personal character data in logs unless useful for debugging.

---

## 26. Privacy / data minimization

Request and retain only data needed for character analysis.

Do not persist whole account payloads automatically.

Do not collect unrelated account information unless a future feature explicitly requires it under an approved scope.

---

## 27. Live data should not automatically mutate fixtures

Do not overwrite bundled test fixtures with live character data.

If a developer wants to capture a fixture later, that must be an explicit redacted/export workflow.

Live account data and repository fixtures must remain separate.

---

## 28. Character normalization tests

Tests must cover at minimum:

- valid character list;
- malformed character list;
- valid selected-character payload;
- missing required field;
- unknown passive node id;
- weapon-set passive ids kept separate;
- missing optional skill/item data;
- deterministic normalization;
- live import source metadata;
- provider failure isolation.

Tests should use local fixture responses.

Do not require live GGG access in the default test suite.

---

## 29. OAuth security tests

Add tests for at least:

- missing credentials;
- invalid state;
- expired pending session;
- successful state validation;
- authorization code not echoed;
- client secret absent from authorize URL;
- PKCE S256 used;
- callback session consumed after success;
- production cookie is `Secure`;
- token never appears in browser-readable state;
- token exchange is not attempted after failed state validation.

---

## 30. No silent live enablement

Setting environment variables alone must not accidentally enable an unreviewed live path unless STEP-015 explicitly changes that behavior.

Use an explicit documented readiness/enablement decision.

Conceptually:

```text
credentials present
AND
live provider enabled
AND
configuration valid
→ live auth available
```

Do not enable live OAuth accidentally in a developer environment.

---

## 31. UI behavior

If credentials are unavailable or live import is disabled, the UI should say so clearly.

Do not show a login button that can only fail.

If live import is enabled:

```text
Connect GGG account
→ authorize
→ list characters
→ select character
→ import
```

Do not automatically import every character on the account.

---

## 32. Relationship to current passive optimizer

STEP-015 should end with a normalized character snapshot that can be consumed by the existing analysis pipeline.

It must not modify scoring rules merely to make live character import pass.

If the live character exposes unsupported mechanics:

```text
preserve them
mark them incomplete
```

Do not weaken STEP-007 through STEP-009 reliability contracts.

---

## 33. Gear and skill context

Import gear and skills if the approved GGG character endpoint provides them.

However, STEP-015 should not pretend that the current tree-only heuristic score fully uses that context.

Document the distinction:

```text
character data imported
≠
character-aware optimization implemented
```

---

## 34. PoB2 is out of scope

Do not add PoB2 integration as part of STEP-015.

GGG character import and PoB2 calculation integration are separate concerns.

---

## 35. Required result contract

A successful live import should conceptually return:

```text
characterSummary
normalizedCharacterBuild
sourceMetadata
compatibility/readiness information
```

Do not return access tokens as part of the public character result.

---

## 36. Required commands

Run:

```bash
npm run format
npm test
npm run typecheck
npm run lint
npm run format:check
```

Run `npm audit` only if dependency files change.

The default test suite must not require real GGG credentials or network access.

---

## 37. Documentation requirement

After STEP-015 is complete, create:

```text
docs/progress/STEP-015-live-ggg-character-import.md
```

In addition to the normal progress sections, explicitly document:

```text
OAuth Client Type
Scopes
Authorization Flow
PKCE / State Handling
Cookie Security
Token Storage Policy
Token Lifecycle
Provider Boundary
Raw GGG Schemas
Character Normalization
Passive-Tree Compatibility
Source Metadata
Missing/Unsupported Data Policy
Logout/Disconnect Behavior
Privacy / Data Minimization
Mock vs Live Provider
Known Production Limitations
Character-Aware Scoring Status
```

---

## 38. Decision log

Update:

```text
docs/planning/DECISION_LOG.md
```

for material decisions including:

```text
confidential-client choice
live-enable policy
token-storage policy
refresh-token policy
production cookie behavior
session-store limitation
character normalization rules
source metadata
unknown-passive behavior
```

---

## 39. Non-goals

Do not implement in STEP-015:

- gear upgrade recommendations;
- PoB2 calculations;
- exact DPS/EHP;
- crafting;
- poe.ninja item matching;
- automatic passive reallocation;
- AI build analysis;
- persistent account database;
- multi-user production auth infrastructure;
- automatic fixture capture from live accounts.

---

## 40. Stop condition

After STEP-015 implementation, tests, and documentation are complete:

**STOP.**

Do not automatically begin the next roadmap step.

If approved GGG credentials are still unavailable, live network authorization must remain disabled and the completion document must state that clearly.

Wait for explicit review and approval.
