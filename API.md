# Internal Interfaces

PlanShell is a local TUI, so there are no HTTP routes.

## Planner Input

```ts
createPlan(input: string, context: ProjectContext): Promise<CommandPlan>
```

## Command Plan

```json
{
  "summary": "Check repository status",
  "requiresApproval": true,
  "riskLevel": "low",
  "warnings": [],
  "simulation": {
    "filesCreated": [],
    "filesModified": [],
    "filesDeleted": [],
    "networkRequired": false,
    "estimatedSeconds": 3
  },
  "diffPreview": [],
  "confidence": {
    "score": 97,
    "reasons": ["Repository analyzed", "Deterministic workflow matched"]
  },
  "rollback": {
    "available": true,
    "command": "No file rollback needed",
    "explanation": "Read-only command."
  },
  "rejection": null,
  "commands": [
    {
      "id": "cmd_1",
      "title": "Show Git status",
      "command": "git",
      "args": ["status", "--short"],
      "cwd": "/workspace/project",
      "explanation": "Shows changed files without modifying the repository.",
      "risk": "low",
      "longRunning": false,
      "interactive": false
    }
  ]
}
```

## Executor Input

```ts
executePlan(root: string, plan: CommandPlan)
```

## Executor Output

```json
{
  "cwd": "/workspace/project",
  "logs": ["Approval received.", "$ git status --short", "[ok] Done"],
  "results": []
}
```

## AI Environment

```text
NVIDIA_API_KEY=your_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=z-ai/glm-5.2
```
