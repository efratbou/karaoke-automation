# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

TypeScript backend that automates karaoke reservations. It accepts a phone call audio file, sends it to the Gemini API (AI Studio) to extract reservation details in Hebrew, and appends the result as a new row to a Google Spreadsheet.

## Commands

```bash
# Run CLI (development)
npx ts-node src/index.ts <path-to-audio-file>

# Run web server (development)
npm run server

# Build to dist/
npm run build

# Run compiled CLI
npm start <path-to-audio-file>

# Run compiled web server
npm run start:server

# Type-check only
npx tsc --noEmit
```

## Architecture

```
src/
  index.ts            — CLI entry point; loads .env, runs the pipeline
  server.ts           — Express server; POST /upload (multipart field "audio") runs the same pipeline
  types.ts            — ReservationData interface (Hebrew keys) + RESERVATION_KEY_ORDER
  services/
    gemini.ts         — Reads audio as base64, sends to Gemini API (AI Studio) as inlineData, parses JSON response
    sheets.ts         — Authenticates with credentials.json (or GOOGLE_CREDENTIALS_JSON), appends a row to the spreadsheet
```

**Pipeline:** `index.ts` or `server.ts` → `gemini.ts` (base64 + Gemini API extract) → `sheets.ts` (append row)

`server.ts` is the deployable entry point (used on Render). It listens on `process.env.PORT` (falls back to `3000` locally) and uses Multer to save uploaded audio to the OS temp directory before handing the file path to the same `extractReservationFromAudio` / `appendReservationRow` functions the CLI uses.

The column order in the spreadsheet is driven by `RESERVATION_KEY_ORDER` in `types.ts`. To add/remove/reorder columns, update that array — `sheets.ts` reads from it.

Gemini is accessed via the AI Studio API using the `@google/genai` SDK, model `gemini-2.5-flash`. These constants are at the top of `src/services/gemini.ts`.

## Environment

`.env` (never commit):
- `GEMINI_API_KEY` — Gemini API key (AI Studio)
- `SPREADSHEET_ID` — Target Google Spreadsheet ID
- `PORT` — only used by `server.ts`; Render sets this automatically, defaults to `3000` locally

`credentials.json` (never commit) — Google service account key file, must be in the project root. Used by the Sheets API for local development. The spreadsheet must be shared with the service account email.

In deployed environments (e.g. Render) where a local file isn't available, `sheets.ts` instead reads the full service account JSON from the `GOOGLE_CREDENTIALS_JSON` environment variable if it's set, taking priority over `credentials.json`.

## node_modules

`node_modules` is symlinked to `/home/efrat/.node_modules/karaoke-automation` (Linux filesystem) to avoid WSL2 + Windows filesystem compatibility issues with large package trees.

## Git

After every significant change or completed task — new feature, bug fix, config change, or any meaningful unit of work — automatically stage the relevant files, commit with a clean descriptive message, and push to `origin/master`. This is a standing instruction; never wait to be asked. The goal is that the GitHub remote always reflects the latest working state so no progress is ever lost.
