# Architecture

## Runtime Flow

```text
React UI
  ↓ GET /context?cwd=.
File manager + current directory
  ↓ POST /plan
Planner
  ↓
Zod validated command plan
  ↓ POST /execute
Executor
  ↓
spawn(command, args, { shell: false })
  ↓
Terminal log + updated cwd returned to UI
```

## Backend

```text
backend/
├── server.js      Express routes and error handling
├── planner.js     Local planner + NVIDIA fallback + schemas
├── executor.js    Command allowlist, safety checks, execution
└── .env.example
```

## Frontend

```text
frontend/src/
├── App.jsx
├── App.css
├── components/
│   ├── CommandBox.jsx
│   ├── FileList.jsx
│   ├── PlanPreview.jsx
│   ├── ReviewDialog.jsx
│   └── ProgressLog.jsx
└── services/
    └── api.js
```

`FileList` is the file-manager panel. It renders the current working directory, parent navigation, folders, and files returned by `/context`.

## API

- `GET /health`
- `GET /context?cwd=frontend`
- `POST /plan`
- `POST /execute`
- `POST /explain`

## Plan Shape

```json
{
  "summary": "Set up a Python virtual environment.",
  "requiresApproval": true,
  "riskLevel": "medium",
  "warnings": [],
  "commands": [
    {
      "id": "cmd_1",
      "title": "Create virtual environment",
      "command": "python",
      "args": ["-m", "venv", ".venv"],
      "cwd": ".",
      "explanation": "Creates an isolated Python environment.",
      "risk": "low",
      "longRunning": false,
      "interactive": false
    }
  ]
}
```

## Safety Boundary

- Shell is disabled.
- Commands are spawned directly.
- Command executable must be allowlisted.
- Arguments are scanned for destructive patterns.
- The executor resolves all `cwd` values inside the project safe root.
- High-risk plans can be previewed but blocked from execution.
