# PromptShell

Natural language terminal for common developer workflows.

Type what you want in English, review the generated command plan, then approve execution.

## Examples

```text
Create a Python virtual environment and install requirements.
```

```text
Run postgres in Docker on port 5432.
```

```text
Undo my last commit but keep the changes.
```

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

## NVIDIA AI

Use a fresh NVIDIA key in `backend/.env`:

```env
NVIDIA_API_KEY=your_rotated_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=z-ai/glm-5.2
```

If no key is configured, common workflows still work through the local planner.

## Safety

- The model only creates a plan.
- The executor validates every command.
- Shell mode is disabled.
- Dangerous commands are blocked.
- User approval is required before execution.
