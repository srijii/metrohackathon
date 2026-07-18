# Coding Rules

This project is PromptShell: a natural language terminal for common developer workflows.

## Principles

- The LLM plans; the executor validates and runs.
- Never execute raw model output.
- Every command needs an explanation.
- Every execution needs user approval.
- Dangerous commands are blocked even if the LLM suggests them.

## Use

- React functional components.
- Express with ES Modules.
- OpenAI SDK pointed at NVIDIA's OpenAI-compatible endpoint.
- Zod for plan validation.
- Node `child_process.spawn` with `shell: false`.
- Allowlisted executables only.

## Backend Shape

Keep the backend simple:

```text
backend/
├── server.js
├── planner.js
├── executor.js
└── .env.example
```

## Supported MVP Commands

- `git status`
- `git clone <url>`
- `git reset --soft HEAD~1`
- `python -m venv .venv`
- `python -m pip install -r requirements.txt`
- `python app.py`
- `npm create vite@latest`
- `npm install`
- `npm run dev`
- `docker run ... postgres`
- `find ...`

## Block

- `rm`
- `sudo`
- `su`
- `dd`
- `mkfs`
- `chmod -R`
- `chown -R`
- shell control operators from model output
- arbitrary scripts from user text

## Frontend

- Show the user request.
- Show the plan.
- Show each command.
- Show why each command was chosen.
- Show risk and warnings.
- Ask for approval before execution.
- Show terminal output.
