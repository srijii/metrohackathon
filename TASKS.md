# Todo

## Pivot

- [x] Rebrand project as PromptShell.
- [x] Replace previous project docs with PromptShell docs.
- [x] Replace file executor with command executor.
- [x] Remove file management demo actions.

## Planner

- [x] Add local planner for common developer workflows.
- [x] Add NVIDIA planner fallback.
- [x] Validate command plans with Zod.
- [x] Include command explanations.
- [x] Include risk levels and warnings.

## Executor

- [x] Use `spawn` with `shell: false`.
- [x] Add executable allowlist.
- [x] Block destructive commands.
- [x] Return terminal-style logs.
- [x] Keep execution inside the project safe root.
- [x] Return updated working directory after navigation.

## UI

- [x] Command prompt input.
- [x] Suggested developer workflows.
- [x] Plan preview.
- [x] Approval before execution.
- [x] Review prompt before execution.
- [x] Terminal output log.
- [x] File manager with current directory.
- [x] Folder navigation updates prompt context.

## Later

- [ ] True streaming output over SSE or WebSocket.
- [ ] PTY support for interactive commands.
- [ ] Per-command approval.
- [ ] Windows command variants.
