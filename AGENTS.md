# Legends of the Glazed Voids

LLM-native social-puzzle adventure. Player (callsign **Cruller**) persuades **Captain Glaze**, a vain anxious doughnut-obsessed AI captain, into saving his doughnut-shaped starship.

## Stack
- React + Vite SPA, Tailwind CSS, Zustand
- Anthropic Claude for Judge + Actor (optional). Falls back to a deterministic heuristic judge + in-character templated actor when no key is present.
- In-memory state only (resets on reload). No backend/db/auth.

## Run
```bash
npm install
npm run dev          # local dev
npm run build        # production build -> dist/
npm start            # serve dist on $PORT (production)
```

## Lint / checks
```bash
npm run lint
```
There is no separate typecheck (plain JS). Run `npm run lint` before finishing.

## Anthropic key (optional)
Copy `.env.example` -> `.env` and set `VITE_ANTHROPIC_API_KEY`. Without it the game uses the heuristic fallback and is fully playable. WARNING: VITE_ vars are embedded in the client bundle and publicly visible.

## Deploy
Build.io (Heroku-compatible) app `legends-of-the-glazed-voids` already exists.
```bash
git remote add bld https://git.build.io/legends-of-the-glazed-voids.git
git push bld main
```
Procfile: `web: npm start`. Buildpack: heroku/nodejs (auto-detected).

## Architecture: Engine Owns Truth
The LLM never writes game state. Turn pipeline: Player text -> Judge (JSON) -> Engine (deterministic willingness + state deltas) -> Actor (Glaze's line) -> render.
