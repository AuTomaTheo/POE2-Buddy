# PoE2 Helper — Technical Architecture

## Architecture objective

Keep external data access, PoE2 domain logic, optimization algorithms, and UI separate so any API/data source can change without rewriting the optimizer.

## Proposed stack

### Web
- Next.js
- React
- TypeScript
- server-side routes/actions for external services

### Validation and tests
- Zod (or equivalent) for runtime validation of external JSON
- Vitest/Jest for unit tests
- Playwright later for key browser flows
- strict TypeScript
- ESLint/formatter

### Persistence
Do **not** add a production database in the earliest MVP unless a concrete requirement appears. Use fixtures and immutable data snapshots first.

A database may later store:
- saved user build profiles;
- analysis history;
- user preferences;
- cached normalized market data;
- data-version metadata;
- OAuth session/token metadata where appropriate.

Any database decision requires a documented architecture decision before implementation.

## Module boundaries

```text
Web UI
  |
  v
Application / Analysis Service
  |-------------------------|
  v                         v
Passive Optimizer         Gear/Craft Services
  |                         |
  v                         v
Domain + Scoring Engine + Normalized Models
  ^                         ^
  |-------------------------|
              |
        Data Adapters
   |       |       |       |
  GGG    Tree    RePoE   poe.ninja
```

### `domain`
Owns normalized internal types. Must not depend on HTTP libraries or React.

Core objects:

```ts
interface GameDataVersion {
  source: string;
  version?: string;
  commit?: string;
  fetchedAt: string;
  checksum?: string;
}

interface PassiveNode {
  id: number;
  name: string;
  rawStats: string[];
  neighbors: number[];
  kind: 'small' | 'notable' | 'keystone' | 'ascendancy' | 'unknown';
  ascendancy?: string;
  position?: { x: number; y: number };
}

interface CharacterBuildSnapshot {
  level: number;
  className: string;
  ascendancy?: string;
  allocatedPassiveIds: number[];
  specialisations?: Record<string, number[]>;
  questStats?: string[];
  skills?: NormalizedSkill[];
  equipment?: NormalizedItem[];
  sourceVersion: GameDataVersion;
}
```

Types above are illustrative; Cursor should refine them from real source schemas rather than forcing the source data to fit an incorrect early assumption.

### `data-sources`
Each provider must implement an explicit adapter.

Examples:

```ts
interface PassiveTreeProvider {
  getSnapshot(): Promise<PassiveTreeSnapshot>;
}

interface CharacterProvider {
  listCharacters(): Promise<CharacterSummary[]>;
  getCharacter(name: string): Promise<CharacterBuildSnapshot>;
}

interface EconomyProvider {
  getLeagueEconomy(league: string): Promise<EconomySnapshot>;
}
```

Implementations can include:
- `LocalPassiveTreeSnapshotProvider`
- `GggPassiveTreeExportProvider`
- `FixtureCharacterProvider`
- `GggCharacterProvider` (disabled until credentials exist)
- `PoeNinjaEconomyProvider`

### `passive-engine`
Responsibilities:
- build graph;
- resolve adjacency;
- determine allocation frontier;
- calculate shortest/legal routes;
- enumerate candidate paths under point budget;
- deduplicate paths;
- handle ascendancy/weapon-set restrictions explicitly;
- never decide build desirability itself.

Potential algorithms:
- BFS for shortest unweighted path queries;
- Dijkstra/A* only if costs become non-uniform;
- bounded DFS/beam search for candidate multi-node allocation sequences;
- beam search/top-K pruning to control combinatorial explosion.

Do not exhaustively enumerate the entire tree for large N without complexity limits.

### `scoring-engine`
Responsibilities:
- convert normalized stat contributions into an objective score;
- keep weights configurable;
- produce a score breakdown;
- distinguish raw total score and score-per-point;
- attach uncertainty/unsupported-stat warnings.

Early scoring is intentionally heuristic.

Example:

```text
Path total =
  projectileDamageContribution * projectileWeight
+ critChanceContribution        * critChanceWeight
+ critMultiContribution         * critMultiWeight
+ evasionContribution           * evasionWeight
+ deflectionContribution        * deflectionWeight
- unsupportedMechanicPenalty
```

This is **not** the same as multiplicative in-game DPS. Exact combat calculation should be a later dedicated engine or validated integration/reference-derived implementation.

### `gear-engine`
Early responsibilities:
- normalize equipped items;
- compare each slot against a target-stat profile;
- identify obvious constraint failures (resistance/attributes/etc. only when modeled);
- identify low-value slots relative to the build profile;
- produce upgrade target stats.

Avoid pretending generic item-score = true market value or true DPS.

### `crafting-engine`
Must operate mechanic-by-mechanic.

Responsibilities later:
- determine valid modifier pool;
- account for item base, item level, tags, prefix/suffix constraints, and spawn weights;
- simulate implemented crafting action;
- calculate or estimate hit probability;
- estimate expected resource usage where price data exists.

Every crafting action needs explicit tests against known examples.

### `ai-explainer` — optional
Input should be structured deterministic output such as:

```json
{
  "recommendedPath": [101, 102, 205],
  "pointCost": 3,
  "score": 14.8,
  "scoreBreakdown": {
    "criticalStrike": 5.2,
    "projectile": 6.1,
    "evasion": 3.5
  },
  "warnings": ["Twister projectile-speed scaling is not yet modeled exactly"]
}
```

The LLM may explain this object. It may not replace `14.8` with an invented DPS number or invent a node not returned by the optimizer.

## Data pipeline

### Static/versioned game data

```text
External source
   -> fetch script
   -> raw snapshot
   -> runtime schema validation
   -> normalization
   -> normalized snapshot
   -> tests/integrity checks
   -> approved current version
```

Keep raw and normalized snapshots distinguishable.

### Character data

```text
Fixture OR approved GGG OAuth API
   -> source schema validation
   -> normalization
   -> CharacterBuildSnapshot
   -> optimizer
```

### Economy data

```text
poe.ninja supported economy endpoint
   -> backend request
   -> cache
   -> schema validation
   -> normalize
   -> EconomySnapshot
```

## Reproducibility

Every analysis result should eventually include:
- passive-tree data version/commit;
- structured game-data version/commit;
- economy snapshot timestamp if used;
- optimizer/scoring version;
- user-selected objective/weights;
- unsupported-mechanics warnings.

This allows a result to be explained after the game receives a patch.

## Performance concerns

Passive candidate generation can become combinatorial. Add hard controls:
- maximum point depth;
- maximum candidates per frontier expansion;
- beam width;
- maximum analysis duration;
- cached shortest-path calculations;
- pruning of dominated paths;
- memoized path-state scores where valid.

Do not optimize prematurely, but add instrumentation early so candidate counts are visible.

## Security boundaries

- OAuth client secret is server-side only.
- End-user tokens are never exposed in client-side JavaScript.
- `.env` is ignored by Git.
- `.env.example` contains names only.
- Validate and sanitize imported build files/JSON.
- Set maximum upload/input sizes.
- Do not let the AI layer receive access tokens or secrets.
- External responses are untrusted input and require validation.

## Deployment assumption for MVP

A typical server-capable Next.js deployment is preferred because OAuth/client credentials and cached provider calls need a trusted server environment.

Avoid a purely static frontend architecture if it would force third-party secrets or unrestricted API traffic into the browser.
