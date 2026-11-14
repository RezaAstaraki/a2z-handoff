# a2z-handoff

**Use your web AI as a Supervisor or Coder, with project memory you control.**

`a2z-handoff` is an npm CLI for working between a web AI chat, your terminal, and an optional coding harness. It prepares project context and instructions that you paste into your chosen web AI, such as ChatGPT or DeepSeek. You discuss the work with that AI until you agree on a task.

You choose how the web AI helps:

- **Supervisor:** the AI discusses the task with you, gathers the relevant code, and produces a complete prompt. You paste it into DSH, an IDE agent, or another harness. The worker edits the project and reports back. You return that report to the Supervisor for review.
- **Coder:** the AI discusses the task with you, then gives you one terminal command at a time. You run each command and paste its output back. Commands can inspect code, apply agreed edits, and check the result.

In both modes, you run terminal commands, supply missing context, test the result, and handle Git. The CLI has no built-in AI connection: the conversation and task agreement happen in your chosen web app.

**One command at a time, in both roles:** the Supervisor and web Coder send at most one runnable terminal command block per response, then wait for your output. A short script can perform one coherent operation plus output capture/copying; it should not hide a batch of unrelated tasks. The AI should not give a second command under another heading or queue commands for later.

When the web AI asks you to return a non-interactive terminal result, its command should display the result and copy it to your clipboard. On PowerShell, this uses `Out-String` and `Set-Clipboard`. Verification output should also include the actual command exit code. Interactive menus and confirmation commands stay attached to the terminal.

## Quick start

Requires Node.js 20 or newer. Open a terminal **in the project you want to work on**, then run:

```bash
npx a2z-handoff init
```

1. Answer the project name, stack, and default verification questions. These describe the environment; you agree on the actual task later in the web chat.
2. Setup creates project memory, saves a startup snapshot, and attempts to copy it to your clipboard.
3. Open a new chat in your chosen web AI and paste the snapshot. If clipboard access is unavailable, copy the contents of `memory/main/SESSION.md` manually.
4. The AI asks you to choose **Supervisor** or **Coder**. Make that choice in the chat.
5. Discuss your goal. Let the AI ask questions and request the code it needs. Agree on the task, scope, target files, autonomy level, and verification before implementation.
6. Follow the selected workflow below.

Running `npx a2z-handoff` opens a small startup menu. Its main action starts or resumes the web AI conversation. The menu does not ask you to design a task or create a finished harness prompt.

## Supervisor workflow

1. Paste the startup snapshot into the web AI and choose Supervisor.
2. Tell it which harness and model you will use and which project folder it will work in. File access is assumed for a local coding harness; clarify access only for remote, restricted, or web-only workers.
3. Discuss the task until you agree on its scope and acceptance criteria. When the AI needs local code, run its requested read command and paste the result back.
4. The Supervisor verifies the current paths, source anchors, dependencies, allowed edits, and acceptance criteria, then produces a **complete, ready-to-paste worker prompt in one copyable text code block**. It should choose one concrete design and fill in its instructions rather than leave you a template or incompatible alternatives to resolve.
5. Paste that prompt into your harness with the correct project selected. A local worker reads `AGENTS.md` and `memory/worker/BOOT.md`. If it needs a separate context snapshot, run `npx a2z-handoff chat --worker`.
6. The harness returns its final report in **one fenced `text` code block**, including partial or blocked results. Use the block's Copy button to send the whole report back to the Supervisor. Every Supervisor prompt must explicitly require this format. Review the result together and perform the agreed manual checks.
7. Accept the work, save the updated memory, and commit when you are ready.

## Coder workflow

1. Paste the startup snapshot into the web AI and choose Coder.
2. Discuss the task, provide the requested code, and agree on the edits and checks.
3. The AI gives you **one executable terminal command**. Run it and paste the output back before receiving the next command.
4. Continue through inspection, targeted changes, and verification. The web AI cannot directly read or change files on your computer; you execute its commands.
5. After reviewing the result, accept it and save a memory checkpoint for the next conversation.

## Handoff and report rules

Keep each task focused on one observable outcome. Before handoff, verify the actual filenames, current code, dependencies, writable files, and expected behavior. Include the worker handoff in the writable list when a checkpoint update is expected. If the required outcome cannot fit the scope, agree on a revised task before implementation. Assigning a lower autonomy level does not make an architectural rewrite a small mechanical change.

The harness's copyable report includes its assigned level, original task, result, actual changed files, source states, every check attempt, tested behavior, authorized memory updates, deviations/blockers, next step, and pending human acceptance. It should remain concise and contain no prose outside its single code block.

Checks use explicit statuses:

- **PASS:** the complete named check exited with a verified code of 0.
- **FAIL:** the check ran and failed.
- **BLOCKED:** a restriction prevented completion; retain its actual nonzero or unknown exit code.
- **NOT RUN:** the check was not attempted.

A successful compilation phase does not pass an incomplete build. Passing a type check does not establish browser behavior. Label untested behavior **UNVERIFIED**. Distinguish observed evidence from worker-reported claims, and compare baseline, intermediate, and final source before judging a diagnostic or report. A real intermediate error can disappear in a later successful check.

Workers give a brief approach summary of at most five lines, then take the next scoped action or return a blocker. After an interrupted or planning-only run, checkpoint actual progress and re-scope unresolved conflicts. These are model instructions; they do not enforce a harness token budget or operating-system permissions.

## Project memory

The CLI creates a `memory/` directory **inside your project**, with shared context and separate memory for the main web AI and worker:

```text
your-project/
├── AGENTS.md                 Pointer for a local coding worker
└── memory/
    ├── PROJECT.md            Project facts, verification, and roadmap
    ├── main/
    │   ├── BOOT.md           Supervisor/Coder routing and conversation rules
    │   ├── NOTES.md          Decisions, agreements, resume notes, accepted work
    │   └── SESSION.md        Generated snapshot to paste into the main web AI
    └── worker/
        ├── BOOT.md           Worker scope and reporting rules
        ├── HANDOFF.md        Current execution task, progress, checks, blockers
        └── SESSION.md        Generated only when requesting worker context
```

**Memory is transferred by you.** A web chat does not automatically see these local files. Ask the main AI to prepare a concise memory update as text or a terminal command, apply it, then generate a fresh snapshot when resuming:

```bash
npx a2z-handoff chat
```

This refreshes `memory/main/SESSION.md` with the main and worker boot instructions, shared project context, main notes, worker handoff, and any root `AGENTS.md`. Paste it into the new chat. Relevant source code is gathered separately when the AI requests it. A file omitted from a snapshot needs checking; its omission does not establish that it is missing from disk.

Keep `PROJECT.md`, main decisions, and worker execution notes current. Re-running setup preserves existing memory files. Only generated session snapshots are refreshed by the chat command. You choose which memory files to keep under version control.

Memory has separate owners:

- **Project defaults:** `memory/PROJECT.md` is the source of truth for verification and configuration. A task may explicitly override its check; changing the default is an agreed configuration change.
- **Boot instructions:** `BOOT.md` files contain stable protocol rules. Routine workers must not append task outcomes, diagnostic histories, or success lessons to them. Regenerate instructions with `init --refresh-boot` when needed.
- **Main notes:** `memory/main/NOTES.md` holds human-reviewed decisions and checkpoints, updated through commands you approve and run. Keep unverified claims labelled.
- **Worker handoff:** the worker records execution facts and check attempts in its authorized `HANDOFF.md`. It creates no extra approach/report documents unless explicitly agreed. A handoff is evidence to review, not automatic acceptance; snapshots label it accordingly.

Existing `.leader` setups remain supported by chat, prompt, accept, and log. Running `init` creates the new layout, importing existing project context, notes, handoff, and optional saved task where new files are absent. The legacy directory is preserved. Existing boot files in the new layout are preserved too.

## Commands

### `init`

```bash
npx a2z-handoff init
npx a2z-handoff init --dry-run
npx a2z-handoff init --refresh-boot
```

Initialize project memory and prepare the main web AI snapshot. Existing custom project rules are preserved; setup creates or appends an A2Z pointer in `AGENTS.md`, or updates the known legacy pointer. It does not edit application code or `.gitignore`.

`--dry-run` prepares a boot-prompt preview without writing files. Add `--print` to print instead of copying to the clipboard.

After updating the package, `--refresh-boot` opts into regenerating the main and worker `BOOT.md` instructions. Changed boot files receive timestamped backups first; project context, notes, and worker handoff are preserved. Setup then saves/copies a fresh main snapshot. Paste that into a new chat, or explicitly supply the updated instructions to your existing chat. A running web conversation does not receive package changes automatically.

### `chat`

```bash
npx a2z-handoff chat
npx a2z-handoff chat --worker
npx a2z-handoff chat --print
```

Save and copy a current startup snapshot for the main web AI, or worker context with `--worker`. Each snapshot has a visible file path. `--print` writes its content to the terminal instead of using the clipboard. The main chat chooses the role and discusses the task with you.

### `prompt`

```bash
npx a2z-handoff prompt
```

Without options, this is an alias for preparing the main web AI conversation with `chat`.

For existing workflows, an optional formatting helper remains available **after you have agreed on a task**:

```bash
npx a2z-handoff prompt --task "Update page metadata" --level 2 --files "src/app/layout.tsx"
```

This saves a **skeleton**, not a completed AI-authored task, to `memory/worker/PROMPT.md` and records its task details in `memory/worker/.last-task.json`. It explicitly includes the worker handoff in the writable list and uses the same fenced-report contract as the boot instructions. Have the Supervisor complete its edit instructions before using it. `--chat` includes worker context and the selected file contents. This helper is optional; both primary workflows work without it.

### `accept`

Use this **after the agreed work is complete**. A task agreed in the web chat can be supplied directly; it does not need to have been generated by the CLI:

```bash
npx a2z-handoff accept --task "Update page metadata" --level 2 --verify "npm run lint -- src/app/layout.tsx"
```

By default, this runs the agreed command and asks for human confirmation. `--auto` runs only the automated check; `--human` runs no automated command and asks for human confirmation. Missing task details are requested interactively, or read from the optional saved task. The verification default comes from project memory.

Acceptance appends an evidence record to the main notes and clears a matching saved task only after successful logging. Failed checks or declined confirmation preserve pending state. Acceptance does not assess autonomy-level fit or commit files.

### `log`

```bash
npx a2z-handoff log --change "Update page metadata" --level 2 --hit yes --notes "Stayed within the two agreed replacements"
```

Record your assessment of the worker's scope in `memory/main/NOTES.md`. `--hit` accepts `yes`, `overshoot`, or `undershoot`. This is separate from whether automated or manual checks passed.

## Autonomy levels

Choose a level with the web AI after discussing the task:

- **0–2:** mechanical work with exact edits.
- **3–5:** implementation within a defined scope.
- **6–8:** propose an approach and implement within agreed bounds.
- **9–10:** open design and implementation.

## Local development

If `npm link` points `a2z-handoff` at this checkout, running `a2z-handoff` from a test project uses your local changes. A plain `npx a2z-handoff` may resolve the published package instead. Human testing should cover both AI roles, memory checkpoints, resuming a fresh chat, and worker-report review.

## License

MIT
