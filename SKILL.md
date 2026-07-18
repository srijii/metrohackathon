# Coding Rules

This project is a 2-hour hackathon prototype for natural language file automation.

## Architecture Rule

The LLM only plans. The executor performs file operations.

Never let model output become a shell command or unchecked path.

## Use

- React functional components.
- Express with ES Modules.
- OpenAI SDK for planning when an API key is available.
- Zod for validating request bodies and generated plans.
- Axios for frontend API calls.
- Node filesystem APIs for demo-safe execution.

## Avoid

- No agent framework.
- No autonomous desktop control.
- No arbitrary folder access.
- No shell execution from user text.
- No broad file type support.
- No complex UI.

## Executor Constraints

- Operate only inside `backend/demo/`.
- Support only:
  - `rename_pdfs`
  - `organize_downloads`
  - `compress_videos`
  - `png_to_webp`
- Validate every plan with Zod.
- Return progress logs for every changed file.
- Keep operations deterministic for the demo.

## Frontend

- Keep the first screen usable.
- Show command input, suggested commands, plan preview, execute button, progress log, and current demo files.
- Prioritize clarity over visual decoration.

## Backend

- Keep controllers thin.
- Put planning in `services/plannerService.js`.
- Put file execution in `services/executorService.js`.
- Put demo file utilities in `services/demoFileService.js`.
- Put schemas in `schemas/`.
