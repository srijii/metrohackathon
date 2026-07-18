# API

Base URL:

```text
http://localhost:3000
```

## Health

```http
GET /health
```

## Context

```http
GET /context?cwd=frontend
```

Returns OS, platform, current working directory, safe root, allowed commands, and the files/folders in that directory.

Response shape:

```json
{
  "data": {
    "context": {
      "cwd": "frontend",
      "cwdName": "frontend",
      "absoluteCwd": "/path/to/project/frontend",
      "entries": [
        {
          "name": "package.json",
          "path": "frontend/package.json",
          "type": "file",
          "extension": ".json",
          "size": 1200,
          "updatedAt": "2026-07-19T10:00:00.000Z"
        }
      ]
    }
  }
}
```

## Plan

```http
POST /plan
```

Body:

```json
{
  "command": "Create a Python virtual environment and install requirements.",
  "cwd": "backend"
}
```

Returns:

```json
{
  "data": {
    "plan": {
      "summary": "Create an isolated Python environment and install dependencies.",
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
          "explanation": "Creates an isolated environment to prevent dependency conflicts.",
          "risk": "low",
          "longRunning": false,
          "interactive": false
        }
      ]
    }
  }
}
```

## Execute

```http
POST /execute
```

Body:

```json
{
  "plan": {
    "summary": "Check repository status.",
    "requiresApproval": true,
    "riskLevel": "low",
    "warnings": [],
    "commands": [
      {
        "id": "cmd_1",
        "title": "Show Git status",
        "command": "git",
        "args": ["status", "--short"],
        "cwd": ".",
        "explanation": "Shows changed files without modifying anything.",
        "risk": "low",
        "longRunning": false,
        "interactive": false
      }
    ]
  }
}
```

Returns terminal logs and the final working directory.

## Explain

```http
POST /explain
```

Body:

```json
{
  "command": "python",
  "args": ["-m", "venv", ".venv"]
}
```
