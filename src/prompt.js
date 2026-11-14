import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import path from "node:path";
import { resolveMemory, readOptional, projectValue, displayPath } from "./memory.js";
import { runChat } from "./chat.js";
import { WORKER_REPORT_RULES } from "./templates.js";

export async function runPrompt(args = []) {
  if (args.length === 0) return runChat();
  const { values } = parseArgs({ args, options: {
    task: { type: "string", short: "t" }, level: { type: "string", short: "l", default: "3" },
    files: { type: "string", short: "f" }, verify: { type: "string", short: "v" },
    chat: { type: "boolean" }, help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log(`Usage: a2z-handoff prompt
       a2z-handoff prompt --task <agreed task> [--level 0-10] [--files a,b] [--verify command] [--chat]

Without options: save/copy context for the main web AI conversation.
With --task: save an optional worker-prompt skeleton for an already agreed task.
The Supervisor must complete its edit instructions before the worker uses it.
--chat includes worker rules, project memory, handoff, and selected file contents.
The verification command defaults to the project memory setting.`);
    return;
  }
  if (!values.task?.trim()) throw new Error("Use 'a2z-handoff chat' to agree on a task, or provide --task for a skeleton.");
  if (!/^(?:[0-9]|10)$/.test(values.level)) throw new Error("--level must be a whole number from 0 to 10.");
  const paths = await resolveMemory();
  const project = await readOptional(paths.project);
  if (project === null) throw new Error("Run 'a2z-handoff init' to set up memory first.");
  const verify = values.verify?.trim() || projectValue(project, "Verification") || "npm test";
  const files = (values.files || "").split(",").map((file) => file.trim()).filter(Boolean);
  const writable = [...new Set([...files, displayPath(paths.handoff)])];
  let context = `FILE(S) — writable:\n${files.length ? "" : "- <Supervisor: specify the agreed source targets>\n"}${writable.map((file) => `- ${file}`).join("\n")}\n`;
  if (values.chat) {
    for (const file of [path.join(paths.cwd, "AGENTS.md"), paths.workerBoot, paths.project, paths.handoff,
      ...files.map((file) => path.resolve(paths.cwd, file))]) {
      const content = await readOptional(file);
      if (content === null) throw new Error(`Missing context file: ${file}`);
      context += `\n=== ${displayPath(file)} ===\n${content}\n`;
    }
  }
  const shell = projectValue(project, "Shell") || (process.platform === "win32" ? "PowerShell" : "bash");
  const exitInstruction = /powershell/i.test(shell)
    ? `Run: ${verify}\nThen report: $LASTEXITCODE`
    : `Run: ${verify}\nThen report: $?`;
  const prompt = `CHANGE: ${values.task.trim()}
LEVEL: ${values.level}
${context}
READ FIRST: AGENTS.md, ${displayPath(paths.workerBoot)}, ${displayPath(paths.project)}, ${displayPath(paths.handoff)}, and target files.

PREFLIGHT:
Confirm current paths, anchors, dependencies, and writable scope before editing.
If these instructions conflict or the allowed files cannot satisfy acceptance,
return a BLOCKED report. Keep any approach summary to at most 5 lines.

EXACT EDITS:
<Supervisor: supply the agreed replacements or named anchors.>

PRESERVE:
<Supervisor: specify what must stay unchanged.>

DO NOT:
- Expand the agreed task, stage files, commit, or push.
- Disconnect required functionality to silence a check.
- Add task lessons to BOOT files or rewrite main AI notes.
- Create extra approach/report files outside the agreed writable scope.

CHECK:
${exitInstruction}
Record each attempt against baseline/intermediate/final source. PASS requires the
complete command to exit 0. Record FAIL / BLOCKED / NOT RUN accurately; static
checks do not establish untested runtime behavior. Follow the agreed stop conditions.

Update ${displayPath(paths.handoff)} with the execution result.
${WORKER_REPORT_RULES}
`;
  await writeFile(paths.prompt, prompt, "utf8");
  await writeFile(paths.task, JSON.stringify({ task: values.task.trim(), level: values.level, verifyCmd: verify }, null, 2), "utf8");
  console.log(prompt);
  console.log(`\nSkeleton saved: ${displayPath(paths.prompt)}`);
  console.log("Have the Supervisor fill its edit instructions before handing it to the worker. Prompt generation does not mean the work is complete.");
}
