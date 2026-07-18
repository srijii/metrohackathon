# Todo

Complete one unchecked task at a time.

## Setup

- [ ] Replace Vite starter UI with AI Urban Assistant layout.
- [ ] Add backend `dev` script.
- [ ] Create Express backend entrypoint.
- [ ] Add `.env.example` files if environment variables are needed.

## Mock Data

- [ ] Create mocked city data for accessibility zones.
- [ ] Create mocked city data for bus stops or metro stops.
- [ ] Create mocked city data for civic issues such as potholes and broken lights.
- [ ] Add helper to find mock data near clicked coordinates.

## Map

- [ ] Add Leaflet/OpenStreetMap map.
- [ ] Let user click anywhere on the map.
- [ ] Store selected latitude and longitude.
- [ ] Show selected location marker.
- [ ] Show mock data markers.
- [ ] Show simple popups for nearby stops and issues.

## AI Chat

- [ ] Add assistant panel with message history.
- [ ] Add prompt chips:
  - "Is this area wheelchair friendly?"
  - "Report a pothole here."
  - "Suggest the best bus route."
- [ ] Add chat input and submit button.
- [ ] Call backend `POST /api/chat`.
- [ ] Show loading and error states.
- [ ] Render markdown-like assistant answers.

## Backend

- [ ] Add Express app with JSON middleware and CORS.
- [ ] Add `GET /api/health`.
- [ ] Add `GET /api/city-data`.
- [ ] Add `POST /api/chat`.
- [ ] Add `POST /api/reports`.
- [ ] Validate request bodies with Zod.
- [ ] Add prompt service that reads root `PROMPTS.md`.
- [ ] Add AI service with mock fallback when `OPENAI_API_KEY` is missing.

## Civic Reports

- [ ] Support report intent through chat.
- [ ] Add simple issue report form if time allows.
- [ ] Store submitted reports in memory for the demo.
- [ ] Show submitted reports as markers on the map.

## Polish

- [ ] Make layout responsive.
- [ ] Add concise empty states.
- [ ] Add clear unknown-data responses.
- [ ] Run frontend build or lint.
- [ ] Run backend smoke test.
- [ ] Update README with final commands.
