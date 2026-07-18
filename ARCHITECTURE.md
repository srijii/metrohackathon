# Architecture

## Runtime Flow

```text
Ink UI
  ↓
Project Analyzer
  ↓
Planner
  ↓
Review Dialog
  ↓
Executor
  ↓
Logs + File Manager Refresh
```

## Folder Structure

```text
metrocli/
├── src/
│   ├── index.tsx
│   ├── screens/
│   │   ├── Home.tsx
│   │   ├── Chat.tsx
│   │   ├── Plan.tsx
│   │   ├── Execute.tsx
│   │   └── Settings.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── CommandInput.tsx
│   │   ├── LogView.tsx
│   │   ├── Progress.tsx
│   │   ├── ApprovalDialog.tsx
│   │   └── FileTree.tsx
│   ├── services/
│   │   ├── ai.ts
│   │   ├── planner.ts
│   │   ├── executor.ts
│   │   ├── git.ts
│   │   └── project.ts
│   ├── hooks/
│   │   ├── useKeyboard.ts
│   │   └── useCommands.ts
│   ├── utils/
│   │   ├── colors.ts
│   │   ├── logger.ts
│   │   └── icons.ts
│   └── state/
│       └── app.ts
├── package.json
└── tsconfig.json
```

## Modules

- `Home.tsx`: main TUI controller.
- `project.ts`: reads current directory, file list, package manager, and Git context.
- `planner.ts`: local plans plus AI fallback.
- `ai.ts`: OpenAI SDK client configured for NVIDIA.
- `executor.ts`: validates and runs approved commands with `execa`.
- `ApprovalDialog.tsx`: explicit review before execution.

## Safety Boundary

- The planner returns JSON only.
- Zod validates all plans.
- The executor only accepts allowlisted executables.
- High-risk plans cannot execute.
- Navigation is constrained inside the launched project root.
