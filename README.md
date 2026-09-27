# PoE2 Helper

Web application that will help Path of Exile 2 players improve a character using current game data and deterministic optimization.

This repository is at [github.com/AuTomaTheo/POE2-Buddy](https://github.com/AuTomaTheo/POE2-Buddy).

The passive-tree optimizer can enumerate main-tree paths and assign a heuristic score. The local web app analyzes a fixture with that score. The score is not DPS or EHP. `packages/domain` holds the internal types and sample fixtures.

## Requirements

- Node.js 20 or newer
- npm

## Run the app

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Layout

- `apps/web` — Next.js application. UI only.
- `packages/domain` — normalized types and Zod schemas.
- `packages/data-sources` — reads the pinned passive-tree snapshot and build fixtures, can request supported poe.ninja PoE2 economy data through a cached server client, holds the GGG character provider, and imports a pasted Path of Building 2 export. Live GGG authorization stays off unless `GGG_LIVE_IMPORT=enabled` and the client values are set. PoB2 import does not fetch share links.
- `packages/passive-engine` — adjacency graph, main-tree path search, passive stat grammar, and semantic stat normalization.
- `packages/scoring-engine` — configurable heuristic scores and Top-K recommendations. Unknown stats stay visible and are not treated as zero.
- `packages/gear-engine` — classifies equipped-item modifier text when the passive semantic map already names it, and keeps raw text plus unknown lines. It does not score gear.
- `docs/data-snapshots/passive-tree` — development pin of the official tree export. Set `POE2_PASSIVE_TREE_SNAPSHOT_DIR` when that folder is not the runtime copy. `npm run refresh:passive-tree` updates a directory only after schema validation and optimizer compatibility checks, and keeps the previous pin for rollback.
- `packages/crafting-engine` — still reserved. No crafting rules yet.
- `docs/planning` — product and architecture source of truth.
- `docs/progress` — one file per completed implementation step.
- `.env.example` — variable names only. No real secrets.

Next.js reads environment files from `apps/web`. When a real value exists later, copy `.env.example` to `apps/web/.env.local` and fill it in there. Do not commit that file.
