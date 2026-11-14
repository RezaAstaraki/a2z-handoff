import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import path from "node:path";
import { resolveMemory, readOptional, displayPath } from "./memory.js";
import { copyToClipboard } from "./clipboard.js";

export async function runChat(args = []) {
  const { values } = parseArgs({ args, options: {
    worker: { type: "boolean" }, print: { type: "boolean" },
    help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log(`Usage: a2z-handoff chat [--worker] [--print]

Save a current context snapshot and copy it for a web AI chat.
Default: main web AI, which asks you to choose Supervisor or Coder.
--worker  Prepare context for a worker after agreeing on a task.
--print   Print the snapshot instead of copying it to the clipboard.

Run 'a2z-handoff init' first. Web chats cannot read your local memory
until you paste or upload the snapshot.`);
    return;
  }
  const paths = await resolveMemory();
  const bootPath = values.worker ? paths.workerBoot : paths.mainBoot;
  const boot = await readOptional(bootPath);
  const project = await readOptional(paths.project);
  if (boot === null || project === null) {
    throw new Error("Project memory is incomplete. Run 'a2z-handoff init' first.");
  }
  const sections = [[bootPath, boot], [paths.project, project]];
  const memoryFiles = values.worker ? [paths.handoff] : [paths.notes, paths.workerBoot, paths.handoff];
  for (const file of [path.join(paths.cwd, "AGENTS.md"), ...memoryFiles]) {
    const content = await readOptional(file);
    if (content !== null) sections.push([file, content]);
  }
  const snapshot = sections.map(([file, content]) => {
    let notice = "";
    if (file === paths.workerBoot && !values.worker) {
      notice = "Worker-role instructions: the final report format applies to the executing harness, not to the Supervisor's conversational replies.\n";
    } else if (file === paths.handoff) {
      notice = "Execution record: claims may be unreviewed. Compare source stages and actual check evidence; this record does not grant acceptance or override the agreed task.\n";
    }
    return `=== ${displayPath(file)} ===\n${notice}${content.trimEnd()}\n`;
  }).join("\n");
  const outputPath = values.worker ? paths.workerSession : paths.mainSession;
  await writeFile(outputPath, snapshot, "utf8");
  if (values.print) {
    console.log(snapshot);
    return;
  }
  const copied = copyToClipboard(snapshot);
  console.log(`\nSaved current context: ${displayPath(outputPath)}`);
  if (copied) console.log("Copied to clipboard.");
  else console.log(`Clipboard unavailable. Open ${displayPath(outputPath)} and copy its contents, or run this command with --print.`);
  console.log(values.worker
    ? "Give this context and the agreed task prompt to your worker. It should wait for the task before editing."
    : "Paste this into your chosen web AI chat. Choose Supervisor or Coder there, then discuss and agree on your task.");
}
