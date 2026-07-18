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
Progress log + explanations + updated file list + undo log
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
backend/
├── server.js
├── planner.js
├── executor.js
├── demo/
└── undo.json
```

## Demo Folder

```text
backend/demo/
├── IMG_2948.jpg
├── WhatsApp Image 2026-07-19 at 10.22.13.png
├── Final_Final_Resume.pdf
├── download (3).pdf
├── Bank.pdf
├── Screenshot 2026-07-19.png
├── logo.png
├── movie.mp4
├── Presentation.pptx
└── notes.txt
```

## Plan Shape

```json
{
  "actions": [
    {
      "action": "rename_pdfs",
      "folder": "demo",
      "exclude": [],
      "reason": "PDF names are messy and can be inferred from contents."
    }
  ],
  "requiresApproval": true,
  "riskLevel": "low",
  "warnings": [],
  "summary": "Rename PDFs using demo-safe rules."
}
```

## Safety

- Only the backend executor touches files.
- Only `backend/demo/` is writable through this app.
- Only known actions are executed.
- LLM output is schema validated before execution.
- No shell commands are generated from user text.
- Undo records every rename, move, and created file.
