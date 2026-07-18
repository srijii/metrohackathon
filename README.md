# PlanShell AI

Natural language terminal built with Node.js, TypeScript, React, and Ink.

## Run

```bash
cd planshell
pnpm install
pnpm run dev
```

## AI Setup

Create `planshell/.env`:

```text
NVIDIA_API_KEY=your_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=z-ai/glm-5.2
```

## Demo Prompts

```text
show git status
cd src
/help
/context
/history
create a python virtual environment and install requirements
run postgres in docker on port 5432
find every pdf modified this week
```
