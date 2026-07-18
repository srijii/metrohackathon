# Architecture

## App

AI Urban Assistant is a small map-first application.

```text
User clicks map
  ↓
Frontend stores selected location
  ↓
User asks question
  ↓
Frontend POSTs question + location
  ↓
Backend finds nearby mock city data
  ↓
Backend sends prompt + data to LLM
  ↓
Frontend displays answer
```

## Root Files

```text
PRD.md          Product requirements
SKILL.md        Coding rules for Codex
ARCHITECTURE.md System structure
TASKS.md        Hackathon task board
API.md          Backend API contracts
PROMPTS.md      AI assistant prompt
README.md       Run instructions
```

## Frontend

Lives in `frontend/`.

Recommended structure:

```text
frontend/src/
├── App.jsx
├── main.jsx
├── index.css
├── components/
│   ├── AssistantPanel.jsx
│   ├── IssueReportForm.jsx
│   ├── LocationPanel.jsx
│   ├── MapView.jsx
│   └── PromptChips.jsx
├── data/
│   └── mockCityData.js
├── services/
│   └── api.js
└── utils/
    └── geo.js
```

### Frontend Responsibilities

- Render Leaflet/OpenStreetMap.
- Let user click anywhere to select a location.
- Display selected latitude and longitude.
- Show nearby mocked places/issues if available.
- Send chat questions to backend.
- Render assistant answer, loading state, and error state.
- Optionally submit civic issue reports.

## Backend

Lives in `backend/`.

Recommended structure:

```text
backend/src/
├── server.js
├── app.js
├── routes/
│   ├── chat.js
│   ├── cityData.js
│   └── reports.js
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

### Backend Responsibilities

- Validate request bodies.
- Load `PROMPTS.md`.
- Select nearby mocked city data for the clicked location.
- Call OpenAI when `OPENAI_API_KEY` exists.
- Return a deterministic fallback answer when no API key exists.
- Accept simple civic reports.

## Mock City Data

Use mock data only for the hackathon MVP.

```js
{
  accessibilityZones: [
    {
      id: "zone_accessible_1",
      name: "Central Market Entrance",
      lat: 12.9716,
      lng: 77.5946,
      radiusMeters: 350,
      wheelchairFriendly: true,
      notes: "Ramp access and wide pavement in demo data."
    }
  ],
  transitStops: [
    {
      id: "bus_stop_1",
      name: "Museum Road Bus Stop",
      type: "bus",
      lat: 12.9721,
      lng: 77.5951,
      routes: ["12A", "K3"],
      notes: "Frequent buses in mock data."
    }
  ],
  civicIssues: [
    {
      id: "issue_1",
      type: "pothole",
      lat: 12.9709,
      lng: 77.5942,
      status: "open",
      notes: "Reported pothole near crossing in demo data."
    }
  ]
}
```

## AI Context

Backend should send this shape to the LLM:

```js
{
  question,
  selectedLocation: { lat, lng },
  nearbyData: {
    accessibilityZones,
    transitStops,
    civicIssues
  }
}
```

## Important Constraints

- No routing engine.
- No real traffic.
- No computer vision.
- No live official claims.
- Route suggestions are plain-language recommendations from mock data.

## Environment

Frontend:

```text
VITE_API_BASE_URL=http://localhost:3000
```

Backend:

```text
PORT=3000
OPENAI_API_KEY=
```
