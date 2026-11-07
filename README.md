# a2z-handoff

**End-to-end Leader/Worker handoff protocol for AI coding agents.**

`a2z-handoff` is a model-agnostic CLI that standardizes communication between AI coding sessions using your local file system. It enforces a strict "Leader-Worker" methodology that prevents hallucinations, stops AI models from getting stuck in reasoning loops, and keeps the human in complete control.

## The Problem

When using AI to write code (like ChatGPT, Claude, or local models like DSH/Cursor), developers face three issues:

1. **Context Loss:** The AI forgets project rules or previous work.
2. **Hallucination:** The AI rewrites whole files instead of making targeted edits.
3. **Poor Scope Management:** The AI gets confused by large tasks.

## The Solution

`a2z-handoff` divides the workflow into three roles:

- **The Human Lead:** The bridge. Runs the CLI, pastes prompts, tests code, and handles Git.
- **The Leader AI:** The Architect (e.g., ChatGPT). Writes strict blueprints (prompts) without touching files.
- **The Worker AI:** The Typist (e.g., DSH, Cursor, local 9B models). Edits the files and reports back.

It uses **Autonomy Levels (0-10)** to dictate how much freedom the AI has, ensuring exact diffs for complex tasks and open exploration for greenfield work.

## Quick Start

Run this in your project folder:

```bash
npx a2z-handoff init
```
