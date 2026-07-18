# AI Urban Assistant

Hackathon MVP: click anywhere on a Leaflet/OpenStreetMap map and ask an AI assistant about accessibility, civic issues, or nearby bus options using mocked city data.

## Features

- Interactive Leaflet map.
- Click-to-select location.
- AI chat for selected location.
- Mock accessibility, transit, and civic issue data.
- Civic issue report flow.
- No routing engine.
- No real traffic.
- No computer vision.

## Run

Frontend:

```sh
cd frontend
pnpm install
pnpm dev
```

Backend:

```sh
cd backend
pnpm install
pnpm dev
```

## Environment

Frontend:

```text
VITE_API_BASE_URL=http://localhost:3000
```

Backend:

```text
PORT=3000
OPENAI_API_KEY=
```

`OPENAI_API_KEY` is optional for local demo work if the backend provides a mock fallback.

## Codex Workflow

Read these files before coding:

- `PRD.md`: exact product scope.
- `SKILL.md`: coding rules.
- `ARCHITECTURE.md`: app structure.
- `TASKS.md`: task board.
- `API.md`: route contracts.
- `PROMPTS.md`: assistant behavior.

Then complete one unchecked task from `TASKS.md` at a time.
