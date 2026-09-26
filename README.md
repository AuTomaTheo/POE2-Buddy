# PoE2 Helper

Web application that will help Path of Exile 2 players improve a character using current game data and deterministic optimization.

This repository is at [github.com/AuTomaTheo/POE2-Buddy](https://github.com/AuTomaTheo/POE2-Buddy).

The optimizer is not implemented yet. STEP-001 only creates the project scaffold.

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
- `packages/` — reserved module folders. They are empty until later steps.
- `docs/planning` — product and architecture source of truth.
- `docs/progress` — one file per completed implementation step.
- `.env.example` — variable names only. No real secrets.

Next.js reads environment files from `apps/web`. When a real value exists later, copy `.env.example` to `apps/web/.env.local` and fill it in there. Do not commit that file.
