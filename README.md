# PoE2 Helper

Local web application that analyzes a Path of Exile 2 fixture or a pasted Path of Building 2 export, recommends bounded passive paths with a heuristic score, and explains that result with a local template.

**Status:** MVP complete for that local workflow. Production launch is not ready. Live Grinding Gear Games login, craft simulation, and a remote language model are outside this MVP. See `docs/progress/STEP-022A-mvp-final-integration-exit-validation.md`.

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
- `packages/crafting-planner`, `packages/crafting-data`, and `packages/crafting-mechanics` — craft target planning for supported item classes. Eligible modifiers and community-derived weights are labeled as such. There is no craft simulator and no expected-cost guide.
- `packages/crafting-engine` — still reserved.
- `packages/ai-explainer` — local deterministic explanation. It does not call a model and does not change the recommendation.
- `docs/planning` — product and architecture source of truth.
- `docs/progress` — one file per completed implementation step.
- `.env.example` — variable names only. No real secrets.

Next.js reads environment files from `apps/web`. When a real value exists later, copy `.env.example` to `apps/web/.env.local` and fill it in there. Do not commit that file.
