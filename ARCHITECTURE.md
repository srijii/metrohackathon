# Architecture

## Flow

```text
Frontend command UI
  ↓ POST /plan
Planner service
  ↓
Validated JSON plan
  ↓ POST /execute
Executor service
  ↓
Safe file operations in backend/demo/
  ↓
Progress log + updated file list
```

## Frontend

```text
frontend/src/
├── App.jsx
├── main.jsx
├── index.css
├── components/
│   ├── CommandBox.jsx
│   ├── FileList.jsx
│   ├── PlanPreview.jsx
│   └── ProgressLog.jsx
└── services/
    └── api.js
```

## Backend

```text
backend/src/
├── app.js
├── server.js
├── controllers/
│   ├── automationController.js
│   └── healthController.js
├── routes/
│   ├── automationRoutes.js
│   └── healthRoutes.js
├── schemas/
│   └── automationSchemas.js
├── services/
│   ├── demoFileService.js
│   ├── executorService.js
│   └── plannerService.js
└── utils/
    ├── env.js
    └── errors.js
```

## Demo Folder

```text
backend/demo/
├── invoice.pdf
├── invoice2.pdf
├── resume.pdf
├── image1.png
├── logo.png
├── video.mp4
└── notes.txt
```

## Plan Shape

```json
{
  "actions": [
    {
      "action": "rename_pdfs",
      "folder": "demo",
      "exclude": []
    }
  ],
  "requiresApproval": true,
  "summary": "Rename PDFs using demo-safe rules."
}
```

## Safety

- Only the backend executor touches files.
- Only `backend/demo/` is writable through this app.
- Only known actions are executed.
- LLM output is schema validated before execution.
- No shell commands are generated from user text.
