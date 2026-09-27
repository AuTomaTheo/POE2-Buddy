# Web app

Next.js application for PoE2 Helper. This package is the analysis screen. It displays the scoring-engine recommendation and does not rank paths itself.

`GET /api/economy` is a server proxy for supported poe.ninja PoE2 economy data. The analysis screen does not call it. Set `POE2_NINJA_CONTACT` before that route contacts poe.ninja. A provider failure stays on that route.

`GET /api/auth/ggg/start`, `GET /api/auth/ggg/callback`, `GET /api/auth/ggg/characters`, `GET /api/auth/ggg/characters/import`, and `POST /api/auth/ggg/disconnect` are the GGG character-import path. Live authorization stays off unless `GGG_CLIENT_ID`, `GGG_CLIENT_SECRET`, `GGG_REDIRECT_URI`, `GGG_CONTACT`, and `GGG_LIVE_IMPORT=enabled` are all set. The analysis screen does not show a connect link while that path is off. Fixture analysis does not call it. A live import is character data, not a character-aware score.

Run it from the repository root:

```bash
npm run dev
```
