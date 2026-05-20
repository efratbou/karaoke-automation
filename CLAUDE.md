# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Karaoke automation project using the Google Gemini API. The project is in early development — this file should be updated as architecture and tooling are established.

## Environment

Copy `.env` locally (never commit it). Required variables:
- `GEMINI_API_KEY` — Google Gemini API key

## Git

After every significant change or completed task — new feature, bug fix, config change, or any meaningful unit of work — automatically stage the relevant files, commit with a clean descriptive message, and push to `origin/master`. This is a standing instruction; never wait to be asked. The goal is that the GitHub remote always reflects the latest working state so no progress is ever lost.
