# Development handoff — a2z-handoff

## Current revision
- Implemented the user's requested workflow hardening after the portfolio/DSH test.
- Both web AI roles must send at most one actionable terminal command block per response, then wait for the human's result. One short script may perform one coherent operation plus capture/copy steps; it must not hide unrelated tasks or queue later commands.
- Every Supervisor handoff must explicitly require the harness's entire final report in one fenced Markdown text block, with no prose outside or nested fences, so the human can copy it back. Partial/blocked tasks use the same format.
- Added one shared WORKER_REPORT_RULES contract in src/templates.js and reused it in main boot, worker boot, and the optional CLI prompt skeleton. The contract labels task/level, source stages, actual changed files, every check attempt and exit code, behavior evidence, memory updates, blockers, next step, and pending human acceptance.
- Added preflight checks for actual paths, current anchors, dependencies, writable scope, preserved behavior, and coherent acceptance criteria. Missing required scope leads to a blocked report rather than disconnected functionality or an unbounded redesign.
- Limited approach summaries to five lines; interrupted/planning-only runs must checkpoint actual progress and re-scope unresolved conflicts.
- Standardized PASS / FAIL / BLOCKED / NOT RUN and OBSERVED / WORKER-REPORTED / UNVERIFIED. Review must distinguish baseline, intermediate edits, and final source rather than treating different revisions as contradictory evidence.
- Project verification defaults now live only in memory/PROJECT.md, not cached copies in generated BOOT files. Dry-run previews include the shared project context so verification remains visible.
- Routine workers only update an explicitly authorized worker handoff. Boot instructions stay stable; main notes hold human-reviewed decisions. Extra report/approach files need explicit scope approval. Workers cannot accept/log their own work.
- Snapshots label worker boot instructions as worker-only and handoff content as execution claims that still need review. Main conversations should not inherit the worker's final-report formatting or treat handoff assertions as acceptance.
- Updated packaged LEADER.md and README to match. No third-party dependencies, version bump, or external-project edits. The human explicitly requested committing this library revision after review.

## Intended product
- The npm CLI prepares context for the human's chosen web AI; the conversation and task agreement happen there.
- Supervisor: discuss a task, create a complete prompt for DSH/an IDE agent/a harness, and review the returned report and evidence.
- Coder: discuss a task, give one human-run terminal command at a time, and wait for its output before continuing.
- The package does not connect to a model or enforce model token budgets/filesystem permissions. These protocols are instructions to the chosen AI.

## Existing implementation
- init creates project-local memory/PROJECT.md, main/BOOT.md and NOTES.md, and worker/BOOT.md and HANDOFF.md, plus an AGENTS.md pointer.
- chat saves and copies main/SESSION.md; chat --worker prepares worker/SESSION.md. Clipboard failures have a saved-file/--print fallback. Main snapshots include both boot files, shared project context, main notes, worker handoff, and any root AGENTS.md.
- Bare CLI opens the web-chat-first startup menu. Bare prompt aliases chat; prompt --task remains an optional skeleton helper after agreement. That helper includes worker HANDOFF.md in its writable list so checkpoint instructions do not conflict with the allowlist.
- Existing .leader layouts remain readable. Init copies legacy project context, notes, handoff, and optional task into missing new files without deleting the legacy directory. Pending state is imported only on initial migration so accepted work is not revived by another init.
- Default init preserves existing memory. init --refresh-boot backs up changed BOOT.md files to timestamped siblings, regenerates instructions, and refreshes/copies main context; project data and notes are preserved. Existing web chats must receive the refreshed context manually.
- accept supports directly supplied --task/--level/--verify or interactive details. Full-check modes and manual confirmation are explicit. Failed verification/declined confirmation preserve state; logging must succeed before a matching pending task is cleared.
- Five-column logging distinguishes acceptance evidence from the human's separate level-fit assessment, escapes Markdown cells, and targets the intended table.
- One readline owner is used throughout interactive runs. Child verification temporarily receives ordinary terminal input. Clipboard payloads are passed through stdin; generated PowerShell read commands display and copy UTF-8 text.

## Verification
- Read the prior handoff, relevant source, documentation, and staged/working-tree state before editing.
- Static inspection confirmed shared report-contract references, main/worker rule scoping, a single shared verification setting, writable handoff inclusion, and snapshot annotations.
- Literal node --check src/*.js and node --check bin/*.js were attempted; PowerShell did not expand the globs and Node returned MODULE_NOT_FOUND.
- PowerShell enumeration with node --check per file passed for all 11 JavaScript files. git diff --check passed.
- Parsed the embedded PowerShell clipboard example with PowerShell's parser without executing it; no syntax errors.
- No CLI runtime/clipboard/app tests were run by the agent. AI adherence and the revised handoff flow need human verification.
- Earlier revisions were already staged by the human. The user-requested commit includes the reviewed current working-tree revision, following another per-file syntax check. Runtime workflow verification remains pending.

## Next human checks
1. In a fresh small project, use the npm-linked CLI and run init. Paste main context into a fresh web AI chat.
2. Test each web role: it should give only one actionable command per response, include result copying where needed, and wait rather than queue commands.
3. Agree on one small observable edit. The Supervisor should verify current paths/anchors and include a consistent writable/checkpoint scope and the exact report contract in one copyable harness prompt.
4. The harness should return one copyable text report block for success, partial work, or blockers. Check the block includes actual check attempts, exit codes, statuses, and untested behavior.
5. Supply an intermediate failed check followed by a successful final check. Review should preserve the timeline, not accuse the earlier error of being fabricated or mark incomplete builds passed.
6. Check memory boundaries: worker only updates authorized handoff, no routine BOOT/main-note edits or extra approach documents. Review claims before checkpointing main notes.
7. Run init --refresh-boot on an existing test setup. Check backups, preserved notes/project/handoff, refreshed instructions, and fresh snapshot annotations. Do not assume an already-running chat has received updates.

## Prior portfolio test findings
- C:/Users/reza/tavana/3d-portfolio is a separate consumer. The user stopped this test. Its DSH changes remain unaccepted; do not resume its repair or perform a reset without a new instruction.
- The first DSH export ended at max-tokens after 16,384 output tokens with read/search activity but no source edits. Startup also had recoverable HTTP 502 retries.
- The newer session.v4 (1).jsonl contains source changes to Hero.tsx, Scene.tsx, and animations/index.ts. The final standalone type-check job recorded exit 0. next build compiled, then failed with spawn EPERM and exit 1; that is not a complete build pass. Browser verification was not run.
- Inspected code had Hero disconnected from 3D rendering, a frame loop that did not update button state, and module-level renderer creation despite SSR-safe comments. DSH wrote unsupported success claims into both BOOT files and inaccurate task/diagnostic histories into memory.
- The Supervisor correctly withheld acceptance but later mislabeled genuine intermediate buttonRefs/sizeAttenuation errors as fabricated. The DSH log proves those errors occurred after its first rewrite (call seq 181/result 184) and before the final successful type-check.
- page.tsx already had a client directive; main NOTES.md was still the initial scaffold. Casting the model-builder's wrapper object to any did not change its runtime shape. These observations motivated version-aware evidence and stronger memory boundaries.
- Earlier, the human confirmed that the shared-readline fix resolved the frozen wizard input. The obsolete task-definition wizard was subsequently removed in favor of the web-chat-first flow.

## Recovery history
- Original test setup was removed at the user's request, preserving 35 application/configuration/asset hashes. Backup: C:/Users/reza/AppData/Local/Temp/a2z-handoff-reset-d7cac96523454865a62e9aa6933c1e74.
- Before the DSH test, a separately authorized minimal modelBuilder.js syntax fix unblocked the human's baseline commit. Node syntax and Prettier validation of the five staged formatter targets passed; runtime correctness was outside that fix. Backup: C:/Users/reza/AppData/Local/Temp/3d-portfolio-modelBuilder-before-fix-3c3ecb958f0448aa9b87200266ccfaf1.js. No commit was run by this agent.
