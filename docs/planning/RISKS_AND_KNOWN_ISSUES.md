# PoE2 Helper — Risks and Known Issues

This document should remain active throughout development. When a risk becomes an actual issue, link the relevant progress step and resolution.

## 1. Game patches can invalidate data and calculations

**Risk:** PoE2 changes frequently. Passive nodes, skill behavior, item mods, crafting mechanics, and balance values can change.

**Mitigation:**
- version every data snapshot;
- pin commits/releases;
- validate new snapshots before promotion;
- display analysis data version;
- keep previous known-good snapshot;
- add regression fixtures from known builds.

## 2. GGG OAuth approval is not yet available

**Risk:** Live account import cannot be completed until the application is registered/approved and credentials are available.

**Mitigation:**
- make fixtures first-class;
- implement `CharacterProvider` interface;
- use mock provider until approval;
- do not block optimizer development on OAuth;
- request only the scopes truly needed once the product is functional.

## 3. No supported PoE2 account stash API in current GGG docs

**Risk:** We cannot reliably read a user's full PoE2 stash/currency balance through the documented account stash endpoint because it is currently PoE1-only.

**Product impact:** “Optimize for my actual entire wealth” cannot be automatic.

**Mitigation:**
- ask the user for a budget manually;
- optionally let user save a preferred budget;
- do not claim automatic stash wealth detection.

## 4. Passive optimization can explode combinatorially

**Risk:** Enumerating every possible N-node path from many frontier points becomes expensive quickly.

**Mitigation:**
- bounded search;
- beam search/top-K pruning;
- shortest-path precomputation/cache;
- dominance pruning;
- candidate caps;
- performance metrics in tests;
- start with small N such as 1–5 points.

## 5. A heuristic score can be mistaken for exact DPS

**Risk:** Users may interpret an abstract build score as actual damage.

**Mitigation:**
- call it `heuristic score` until exact modeling exists;
- show contribution breakdown;
- avoid “+18% DPS” unless the calculation engine actually supports that conclusion;
- separate exact calculations from heuristics in the type system/UI.

## 6. Passive stat text is difficult to normalize perfectly

**Risk:** Many passives have conditional, transformed, skill-specific, ailment-specific, weapon-specific, or mechanically complex effects.

**Mitigation:**
- preserve raw text/data;
- maintain recognized-stat coverage report;
- flag unknown/unsupported stats;
- do not silently score unsupported effects as zero without warning;
- progressively add mechanics with regression tests.

## 7. Weapon-set specialisations can produce incorrect recommendations

**Risk:** PoE2 supports weapon-set-specific passive specialisations. A naive universal tree representation can recommend illegal or contextually wrong allocations.

**Mitigation:**
- keep specialisation sets explicit in domain model;
- do not flatten them into normal allocations;
- initially mark related analysis as limited if full rules are not modeled;
- add dedicated test fixtures.

## 8. Ascendancy handling can be wrong

**Risk:** Ascendancy nodes use different allocation/access constraints.

**Mitigation:**
- classify them separately;
- do not include them in normal passive candidate search unless ascendancy logic is implemented;
- require explicit ascendancy point budget.

## 9. Community data can change schema or contain gaps

**Risk:** RePoE-derived data is valuable but community-maintained and format stability is not guaranteed.

**Mitigation:**
- adapter layer;
- runtime schema validation;
- version pinning;
- fixture snapshots;
- fail clearly rather than silently accepting unexpected fields/types.

## 10. poe.ninja public economy API has no stability/SLA guarantee

**Risk:** Supported economy endpoints may change, rate-limit, become temporarily unavailable, or return stale-ish economy data.

**Mitigation:**
- provider adapter;
- backend cache;
- no aggressive polling;
- graceful degradation;
- timestamp all price snapshots;
- pricing is never required for passive optimization.

## 11. Rare-item pricing is much harder than currency/unique pricing

**Risk:** A rare item with many affixes cannot be reliably assigned a market price from a simple economy overview.

**Mitigation:**
- initially produce stat targets rather than pretending to find exact comparable rare listings;
- use broad estimated budgets only where supported;
- avoid undocumented trade APIs;
- make price confidence explicit.

## 12. Crafting probabilities are easy to get wrong

**Risk:** Spawn weights alone are not sufficient for every crafting mechanic. Tags, exclusions, tiers, item level, affix capacity, special currencies, meta-rules, corruption, and patch-specific behavior matter.

**Mitigation:**
- implement one crafting action at a time;
- state assumptions;
- test against known examples/reference tools;
- use seeded simulation + analytical probability where possible;
- do not expose a mechanic until verified.

## 13. Path of Building logic is large and complex

**Risk:** Attempting to reproduce PoB from scratch will balloon scope.

**Mitigation:**
- MVP uses limited heuristic optimizer;
- model high-value mechanics incrementally;
- use PoB2 as reference/test oracle where appropriate;
- evaluate licensing before code reuse;
- do not promise universal exact DPS in MVP.

## 14. AI hallucination can destroy trust

**Risk:** An LLM can confidently invent mods, crafting outcomes, passive interactions, prices, or node names.

**Mitigation:**
- LLM receives deterministic analysis result only;
- numeric values come from engine, never model free-form reasoning;
- require citations/provenance within app where practical;
- allow AI feature to be fully disabled;
- deterministic fallback explanations.

## 15. Secrets can leak through beginner workflows

**Risk:** Client secrets or API keys may accidentally be committed or pasted into generated code/documentation.

**Mitigation:**
- `.env.local` ignored;
- `.env.example` placeholders only;
- pre-commit secret scanner later;
- server-side only secret access;
- never log access tokens;
- rotate a credential immediately if exposed.

## 16. OAuth security mistakes

**Risk:** Incorrect state/PKCE/session/token handling can expose accounts.

**Mitigation:**
- follow current GGG OAuth documentation exactly;
- minimal scopes;
- server-side secret/token storage;
- CSRF/state validation;
- secure cookies/session handling;
- token expiration/revocation handling;
- security review before public release.

## 17. Terms/API policy risk

**Risk:** Convenient unofficial/private endpoints may conflict with provider policies.

**Mitigation:**
- supported/documented sources only;
- provider-specific access file kept current;
- no reverse engineering as a production dependency;
- re-check policies before launch.

## 18. Data provenance can be lost

**Risk:** A recommendation looks wrong after a patch and we cannot reproduce why.

**Mitigation:**
Every result stores:
- tree version;
- game-data version;
- market snapshot timestamp if used;
- optimizer version;
- objective/weights;
- character input hash or safe snapshot identifier.

## 19. “Best build” is subjective

**Risk:** A mathematically high offensive score may be terrible for survivability, comfort, gearing constraints, or playstyle.

**Mitigation:**
- let users choose objective;
- expose offense/defense/balanced alternatives;
- show tradeoffs, not a single absolute truth;
- eventually support custom weights/constraints.

## 20. Level alone is insufficient for a build recommendation

**Risk:** Two level-80 characters can need completely different passive paths.

**Mitigation:**
Use level together with:
- allocated tree;
- main skill/mechanics;
- existing gear/constraints;
- ascendancy;
- user objective;
- available passive points;
- budget where relevant.

## 21. Currency budget does not directly optimize passive nodes

**Risk:** Mixing tree and currency in one opaque optimization function may create nonsensical results.

**Mitigation:**
- passive optimization uses point constraints;
- currency influences gear/crafting/respec decisions where applicable;
- later a higher-level planner can compare “spend currency on gear” vs “change tree” using explicit models.

## 22. UX overload

**Risk:** PoE data is extremely dense and can overwhelm newer players.

**Mitigation:**
- default to 3 recommendations;
- show simple headline + expandable details;
- include exact node sequence;
- hide raw engine data behind advanced views;
- explain confidence/limitations concisely.
