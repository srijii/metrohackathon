# Product

Natural Language File Automation

## Problem

People often have messy folders full of PDFs, images, videos, and random downloads. They know what they want in plain English, but doing it manually is slow and repetitive.

## Solution

Build a small demo app that turns a natural-language command into a safe structured plan, then executes one of four fixed file automation actions inside a demo folder.

## Core Principle

The AI never directly touches the filesystem.

```text
User command
  ↓
LLM converts command to JSON
  ↓
Backend validates JSON
  ↓
Executor runs one allowed action
  ↓
UI shows progress and changed files
```

## MVP

- Simple command UI.
- Suggested demo commands.
- Convert user text into structured JSON.
- Show the plan before execution.
- Execute only approved actions.
- Show progress log and file changes.
- Use a local `backend/demo/` folder for fast stage demos.

## Supported Actions

- `rename_pdfs`
- `organize_downloads`
- `compress_videos`
- `png_to_webp`

## Non-Goals

- No autonomous desktop agent.
- No background monitoring.
- No habit learning.
- No workflow builder.
- No arbitrary filesystem access.
- No support for every file type.
- No real 2 GB video compression during demo.

## Demo Script

1. Open the app.
2. Type: "My Downloads folder is a disaster."
3. App creates a plan:
   - rename PDFs
   - convert PNGs to WebP except logos
   - compress videos
   - organize files
4. Click execute.
5. Progress log shows each step.
6. File list visibly changes.

## Success Criteria

- A judge understands the app in 10 seconds.
- The command produces structured JSON.
- The executor only runs fixed safe actions.
- The demo completes in 10-20 seconds.
- File changes are visible immediately.
