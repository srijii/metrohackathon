# Coding Rules

## Use

- Node.js
- TypeScript
- React components
- Ink for terminal UI
- Functional components only
- Hooks for local state
- Zod for validation
- Execa for command execution
- OpenAI SDK configured for NVIDIA API

## Never

- Hardcode API keys.
- Execute raw LLM output.
- Run shell command strings with `shell: true`.
- Add browser frontend code.
- Add Express backend code.
- Build broad autonomous computer control.

## Always

- Keep generated plans structured.
- Require approval before execution.
- Explain every command.
- Keep high-risk actions blocked.
- Keep files small and readable.
- Prefer local deterministic planning for common commands.
- Use AI only as the planner fallback.

## Environment

Use:

```text
NVIDIA_API_KEY
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=z-ai/glm-5.2
```
