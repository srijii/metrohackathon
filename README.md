# Natural Language File Automation

Hackathon demo: type a plain-English command, convert it into a safe JSON plan, then execute one of four fixed file automation actions inside `backend/demo/`.

## Supported Actions

- Rename PDFs
- Organize downloads
- Compress videos
- Convert PNG to WebP

## Run

Backend:

```sh
cd backend
pnpm install
pnpm dev
```

Frontend:

```sh
cd frontend
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173
```

## Environment

Backend:

```text
PORT=3000
CLIENT_ORIGIN=http://localhost:5173
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

If `OPENAI_API_KEY` is missing, the app uses a deterministic fallback planner.

## Safety

- The LLM only produces JSON.
- The executor only supports four actions.
- File changes are limited to `backend/demo/`.
- No arbitrary shell commands are generated or executed.
