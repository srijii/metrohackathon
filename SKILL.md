# Coding Rules

Use this file as project-specific instructions for Codex.

## Build For

AI Urban Assistant hackathon MVP:

- Leaflet/OpenStreetMap map.
- Click-to-select location.
- AI chat over mocked city data.
- Civic issue reporting through chat or a small form.
- Simple mocked bus/accessibility suggestions.

## Use

- React functional components.
- React hooks only.
- JavaScript with ES Modules.
- Vite for frontend.
- Express for backend.
- Zod for backend validation.
- Axios for frontend API calls.
- React Leaflet and Leaflet for maps.
- lucide-react for icons.
- Mock data files before any real API.

## Do Not Use

- Class components.
- TypeScript.
- Redux.
- A routing engine.
- Real traffic APIs.
- Computer vision.
- Live government/civic APIs.
- OpenAI calls from frontend code.
- Large abstractions before the MVP works.

## Always

- Keep files readable and ideally under 300 lines.
- Split UI into small components.
- Put API calls in `frontend/src/services/api.js`.
- Put mock city data in `frontend/src/data/` or `backend/src/data/`.
- Validate backend request bodies with Zod.
- Return predictable JSON:
  - Success: `{ "data": ... }`
  - Error: `{ "error": { "message": "...", "code": "..." } }`
- Handle loading, empty, and error states.
- Keep the demo path working after every change.

## Frontend Structure

Prefer:

```text
frontend/src/
├── App.jsx
├── components/
│   ├── MapView.jsx
│   ├── AssistantPanel.jsx
│   ├── LocationPanel.jsx
│   └── IssueReportForm.jsx
├── data/
│   └── mockCityData.js
├── services/
│   └── api.js
└── utils/
    └── distance.js
```

## Backend Structure

Prefer:

```text
backend/src/
├── server.js
├── app.js
├── routes/
│   ├── chat.js
│   ├── reports.js
│   └── cityData.js
├── schemas/
│   ├── chatSchema.js
│   └── reportSchema.js
├── services/
│   ├── aiService.js
│   ├── cityDataService.js
│   └── promptService.js
└── data/
    └── mockCityData.js
```

## AI Behavior

- Read the system prompt from root `PROMPTS.md`.
- Use only supplied mock city data.
- If nearby data is missing, say unknown.
- Keep answers brief and demo-friendly.
- Do not claim live accuracy.

## Task Workflow

- Read `TASKS.md`.
- Complete one unchecked task at a time.
- Update `TASKS.md` when a task is done.
- Update `API.md` when backend routes change.
- Update `ARCHITECTURE.md` when structure changes.
