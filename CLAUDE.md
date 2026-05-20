# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TypeScript backend that automates karaoke reservations. It accepts a phone call audio file, sends it to Vertex AI (Gemini) to extract reservation details in Hebrew, and appends the result as a new row to a Google Spreadsheet.

## Commands

```bash
# Run (development)
npx ts-node src/index.ts <path-to-audio-file>

# Build to dist/
npm run build

# Run compiled output
npm start <path-to-audio-file>

# Type-check only
npx tsc --noEmit
```

## Architecture

```
src/
  index.ts            — CLI entry point; loads .env, runs the pipeline
  types.ts            — ReservationData interface (Hebrew keys) + RESERVATION_KEY_ORDER
  services/
    gemini.ts         — Reads audio as base64, sends to Vertex AI as inlineData, parses JSON response
    sheets.ts         — Authenticates with credentials.json, appends a row to the spreadsheet
```

**Pipeline:** `index.ts` → `gemini.ts` (base64 + Vertex AI extract) → `sheets.ts` (append row)

The column order in the spreadsheet is driven by `RESERVATION_KEY_ORDER` in `types.ts`. To add/remove/reorder columns, update that array — `sheets.ts` reads from it.

Vertex AI is configured with project `karaoke-app-496909`, location `us-central1`, model `gemini-1.5-flash-002`. These constants are at the top of `src/services/gemini.ts`.

## Environment

`.env` (never commit):
- `SPREADSHEET_ID` — Target Google Spreadsheet ID

`credentials.json` (never commit) — Google service account key file, must be in the project root. Used by both Vertex AI and the Sheets API. The spreadsheet must be shared with the service account email.

## node_modules

`node_modules` is symlinked to `/home/efrat/.node_modules/karaoke-automation` (Linux filesystem) to avoid WSL2 + Windows filesystem compatibility issues with large package trees.

## Git

After every significant change or completed task — new feature, bug fix, config change, or any meaningful unit of work — automatically stage the relevant files, commit with a clean descriptive message, and push to `origin/master`. This is a standing instruction; never wait to be asked. The goal is that the GitHub remote always reflects the latest working state so no progress is ever lost.
