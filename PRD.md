# Product

AI Urban Assistant

## Problem

Citizens often do not know whether a place is accessible, where common civic issues exist, or what practical local transport options are nearby. Existing information is scattered across maps, civic portals, transit apps, and local knowledge.

## Solution

Build a simple AI assistant on top of an interactive map. A user clicks anywhere on the map, asks a city question, and receives a concise answer generated from mocked city data.

## Core Idea

```text
Click map location
  ↓
Ask city question
  ↓
Backend combines question + clicked location + mocked city data
  ↓
LLM returns a useful answer
```

## MVP Features

- Leaflet/OpenStreetMap interactive map.
- Click anywhere on the map to select a location.
- Show selected latitude and longitude.
- Chat box for questions about the selected location.
- Example questions:
  - "Is this area wheelchair friendly?"
  - "Report a pothole here."
  - "Suggest the best bus route."
- Mocked city data for:
  - Accessibility.
  - Bus stops.
  - Metro stations.
  - Civic issues.
  - Safety notes.
- Backend route that sends the selected location, user question, and relevant mock data to the LLM.
- Clear fallback response when no nearby mock data exists.

## Nice To Have

- Suggested prompt chips.
- Report issue form that pre-fills from the clicked map location.
- Nearby place summary panel.
- Simple issue heat markers from mock data.
- Voice input only if the MVP is finished.

## Non-Goals

- No routing engine.
- No real traffic data.
- No computer vision.
- No live government data integration.
- No fare calculation.
- No user accounts.
- No admin dashboard.
- No complex map drawing tools.

## Tech Stack

- Frontend: React, Vite, JavaScript, Leaflet, React Leaflet, Axios.
- Backend: Node.js, Express, ES Modules, OpenAI SDK, Zod.
- Data: mocked JSON or JS data files.
- Package manager: pnpm.

## User Flow

1. User opens the app.
2. User sees a Leaflet/OpenStreetMap map.
3. User clicks a location.
4. App stores the clicked latitude and longitude.
5. User asks a question in chat.
6. Backend finds nearby mocked city data.
7. Backend calls the LLM with `PROMPTS.md`, location, question, and mock context.
8. App shows a short, useful answer.

## Demo Script

1. Click an area with mocked accessibility data.
2. Ask: "Is this area wheelchair friendly?"
3. Show the AI answer using nearby accessibility notes.
4. Click an area with a mocked pothole or civic issue.
5. Ask: "Report a pothole here."
6. Show a confirmation-style response.
7. Ask: "Suggest the best bus route."
8. Show a simple mocked route suggestion without claiming live routing.

## Success Criteria

- The map click interaction works reliably.
- The selected location is visible to the user.
- The assistant answers based on mocked data.
- The assistant clearly says when data is unknown.
- The demo is understandable within 60 seconds.
