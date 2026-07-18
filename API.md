# API

Base URL:

```text
http://localhost:3000
```

## Health

```http
GET /health
```

Returns:

```json
{
  "data": {
    "ok": true,
    "service": "file-automation"
  }
}
```

## Files

```http
GET /files
```

Returns the current contents of `backend/demo/`.

## Plan

```http
POST /plan
```

Body:

```json
{
  "command": "My Downloads folder is a disaster."
}
```

Returns:

```json
{
  "data": {
    "plan": {
      "summary": "Clean up the demo folder.",
      "requiresApproval": true,
      "actions": [
        {
          "action": "rename_pdfs",
          "folder": "demo",
          "exclude": []
        }
      ]
    }
  }
}
```

## Execute

```http
POST /execute
```

Body:

```json
{
  "plan": {
    "summary": "Clean up the demo folder.",
    "requiresApproval": true,
    "actions": [
      {
        "action": "rename_pdfs",
        "folder": "demo",
        "exclude": []
      }
    ]
  }
}
```

Returns:

```json
{
  "data": {
    "logs": ["Reading PDFs...", "Renamed invoice.pdf -> Amazon Invoice.pdf"],
    "files": []
  }
}
```

## Supported Actions

- `rename_pdfs`
- `organize_downloads`
- `compress_videos`
- `png_to_webp`
