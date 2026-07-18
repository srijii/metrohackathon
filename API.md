# API

Base URL:

```text
http://localhost:3000
```

Frontend env:

```text
VITE_API_BASE_URL=http://localhost:3000
```

## Health

```http
GET /api/health
```

Returns:

```json
{
  "data": {
    "ok": true,
    "service": "ai-urban-assistant"
  }
}
```

## City Data

Returns mocked city data for map markers.

```http
GET /api/city-data
```

Returns:

```json
{
  "data": {
    "accessibilityZones": [
      {
        "id": "zone_accessible_1",
        "name": "Central Market Entrance",
        "lat": 12.9716,
        "lng": 77.5946,
        "radiusMeters": 350,
        "wheelchairFriendly": true,
        "notes": "Ramp access and wide pavement in demo data."
      }
    ],
    "transitStops": [
      {
        "id": "bus_stop_1",
        "name": "Museum Road Bus Stop",
        "type": "bus",
        "lat": 12.9721,
        "lng": 77.5951,
        "routes": ["12A", "K3"],
        "notes": "Frequent buses in mock data."
      }
    ],
    "civicIssues": [
      {
        "id": "issue_1",
        "type": "pothole",
        "lat": 12.9709,
        "lng": 77.5942,
        "status": "open",
        "notes": "Reported pothole near crossing in demo data."
      }
    ]
  }
}
```

## Chat

Answers a question about the clicked map location using mocked city data.

```http
POST /api/chat
```

Body:

```json
{
  "question": "Is this area wheelchair friendly?",
  "location": {
    "lat": 12.9716,
    "lng": 77.5946
  }
}
```

Returns:

```json
{
  "data": {
    "answer": "This looks wheelchair friendly in the demo data.\n\n- Nearby accessibility zone: Central Market Entrance\n- Notes: Ramp access and wide pavement\n- Unknown: live obstruction status",
    "nearbyData": {
      "accessibilityZones": ["zone_accessible_1"],
      "transitStops": ["bus_stop_1"],
      "civicIssues": []
    }
  }
}
```

## Reports

Stores a simple civic issue report for the demo.

```http
POST /api/reports
```

Body:

```json
{
  "location": {
    "lat": 12.9709,
    "lng": 77.5942
  },
  "type": "pothole",
  "description": "Large pothole near the crossing."
}
```

Returns:

```json
{
  "data": {
    "report": {
      "id": "report_123",
      "type": "pothole",
      "description": "Large pothole near the crossing.",
      "lat": 12.9709,
      "lng": 77.5942,
      "status": "submitted",
      "createdAt": "2026-07-18T10:00:00.000Z"
    }
  }
}
```

## Error Shape

```json
{
  "error": {
    "message": "Location is required.",
    "code": "VALIDATION_ERROR"
  }
}
```

## Notes

- Route suggestions are plain AI answers from mock transit data.
- This API does not use a routing engine.
- This API does not use real traffic data.
- This API does not process images or video.
