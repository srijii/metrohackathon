# Product

MetroCLI AI

## Pitch

MetroCLI is a natural language terminal. Users describe what they want in English, review the generated command plan, then approve execution inside a terminal UI.

## Problem

Developers and students know outcomes like "create a Python environment" or "check repo status" but forget exact CLI syntax. Existing terminals are powerful but unforgiving, especially for setup, Git, Docker, and package-manager workflows.

## Solution

Build a Node.js + Ink command-line app that feels like a compact AI coding terminal:

- Shows current project, Git branch, and working directory.
- Shows a project summary panel with detected stack, file count, and recent files.
- Accepts plain-English prompts.
- Generates an explainable command plan.
- Renders the plan inline in the conversation.
- Uses Enter to approve and Esc to cancel.
- Shows a simulation of files created, modified, deleted, network use, time, rollback, and confidence.
- Shows diff preview for planned project changes.
- Blocks dangerous plans.
- Executes safe commands and shows logs.

## MVP Workflows

- Show Git status.
- Clone a repository.
- Create a Python virtual environment.
- Install Python requirements.
- Create a React/Vite app.
- Install Node dependencies.
- Run PostgreSQL in Docker.
- Find recent PDFs.
- Navigate folders with `cd`.

## User Flow

```text
metro
  ↓
Project context loads
  ↓
User types a request
  ↓
MetroCLI streams planning status
  ↓
Inline plan appears in chat
  ↓
User approves with Enter
  ↓
Executor runs safe commands
  ↓
Logs and current directory update
```

## Safety

- Never execute raw AI text.
- Commands must pass a strict allowlist.
- Destructive patterns are blocked.
- High-risk plans are preview-only.
- Every plan requires approval.
- Execution runs through `execa`, not a raw shell string.
- Slash commands provide help, history, model, context, files, reset, clear, and approve.
- Rejected requests explain why they were blocked and suggest safer alternatives.

## Non-Goals

- Not a full shell replacement.
- Not an autonomous desktop operator.
- Not broad OS automation.
- Not a production-grade remote agent.
- Not a workflow marketplace.

## Tech Stack

- Node.js
- TypeScript
- React
- Ink
- OpenAI SDK with NVIDIA-compatible base URL
- Zod
- Execa

## Timeline

- 20 min: project scaffold.
- 35 min: planner and safety model.
- 35 min: Ink UI.
- 20 min: executor and project summary.
- 10 min: polish and demo script.
