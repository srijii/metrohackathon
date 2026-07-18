# Product

PromptShell

## Pitch

PromptShell is a natural language terminal. Instead of memorizing commands for `git`, `docker`, `npm`, or `python`, users describe what they want in English and PromptShell safely translates that into executable terminal commands.

## Problem

Developers, students, data scientists, and Linux users constantly know the outcome they want but forget the exact terminal syntax. They search for commands like creating Python virtual environments, running Docker services, cloning projects, or undoing Git commits.

## Solution

Convert plain-English terminal requests into an explainable command plan. The user reviews each command, sees why it will run, approves it, and then watches the execution log.

The UI also acts like a lightweight file manager: it shows the current working directory, lists the files and folders in that directory, and updates the view when the user navigates or executes a safe `cd` command.

## MVP Workflows

- Git status and basic Git recovery.
- Clone a Git repository.
- Create a Python virtual environment.
- Install Python dependencies from `requirements.txt`.
- Run a Python app.
- Create a React/Vite app.
- Run basic npm commands.
- Run PostgreSQL in Docker.
- Find files with safe `find` commands.
- Navigate directories with `cd`.
- Browse the current workspace in the file manager.

## Core Flow

```text
User describes task
  ↓
Planner creates command plan
  ↓
Validator blocks unsafe commands
  ↓
User reviews the approval prompt
  ↓
Executor runs commands sequentially
  ↓
Terminal log and working directory update
```

## Safety

- Never execute raw LLM text.
- Validate every command.
- Use an allowlist of executables.
- Block destructive commands such as `rm`, `sudo`, `mkfs`, `dd`, `chmod -R`, and broad delete requests.
- Require approval before execution.
- Show a review prompt before any plan executes.
- Show risk level and warnings.
- Prefer local rule-based planning for common workflows.
- Use NVIDIA LLM planning only as a fallback for less obvious requests.

## Non-Goals

- Not a full shell replacement.
- Not an autonomous desktop operator.
- Not cross-platform perfection in the MVP.
- Not a workflow builder.
- Not a way to bypass terminal safety.

## Demo

Prompt:

```text
Create a Python virtual environment and install requirements.
```

Plan:

```text
1. python -m venv .venv
2. .venv/bin/python -m pip install -r requirements.txt
```

Each command includes a reason and waits for explicit approval.

## Differentiation

PromptShell does not replace Bash. It replaces remembering syntax. It teaches by showing the command and the reason before it runs.
