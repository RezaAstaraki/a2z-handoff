# AGENTS.md — Workspace Instructions

## Project Context
- **Project:** a2z-handoff
- **Stack:** Node.js v20+, ESM, plain JavaScript (no TS)
- **NOT ML:** This is a CLI tool, not a machine learning dataset tool.

## Constraints & Environment
- **Sandbox:** Verify code statically (reading files, `node --check`).
- **Verification:** You must run `node --check src/*.js` and `node --check bin/*.js` after code changes.
- **Human-in-the-Loop:** Runtime testing is done by the human user.

## Rules
- Always read `HANDOFF.md` before starting a new task.
- Always update `HANDOFF.md` when finishing a task.

## Git Rules
- **NO AUTO-COMMITS:** You are strictly forbidden from running `git commit`. Leave all changes in the working directory for the human to review.

## Autonomy Levels
Every prompt declares `LEVEL: N` (0-10). Do not exceed it.
- 0-2: Mechanical. Exact diff specified. If unclear, stop.
- 3-5: Scoped. Local detail only. Design is fixed.
- 6-8: Bounded. Propose approach and assumptions, then implement.
- 9-10: Open. Design and implement.

Reasoning discipline:
- Plan in at most 8 lines, then make a tool call.
- If you exceed 2000 reasoning tokens without a tool call, stop thinking and write the simplest working version.
- Wrap your entire report in a single fenced code block. The LEVEL line is the first line.
