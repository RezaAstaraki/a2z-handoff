import { unlink } from "node:fs/promises";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";
import { resolveMemory, readOptional, projectValue, displayPath } from "./memory.js";
import { withTerminal } from "./terminal.js";
import { appendLog } from "./log.js";

export async function runAccept(args = [], session) {
  const { values } = parseArgs({ args, options: {
    auto: { type: "boolean" }, human: { type: "boolean" },
    task: { type: "string" }, level: { type: "string" }, verify: { type: "string" },
    help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log(`Usage: a2z-handoff accept [--auto | --human] [--task text] [--level 0-10] [--verify command]

Use after the web AI's commands or harness task have been completed.
Default: run the verification command, then ask for human confirmation.
--auto   Run the agreed automated check only.
--human  Ask for human confirmation only; run no verification command.
Provide the task agreed in your chat, or answer the questions interactively.
An optional recorded task from 'prompt --task' is also supported.
Acceptance records a result and does not commit any files.`);
    return;
  }
  if (values.auto && values.human) throw new Error("Choose --auto or --human, or omit both for both checks.");
  if (values.level !== undefined && !/^(?:[0-9]|10)$/.test(values.level)) throw new Error("--level must be a whole number from 0 to 10.");
  if (values.task !== undefined && !values.task.trim()) throw new Error("--task must not be empty.");
  const paths = await resolveMemory();
  const project = await readOptional(paths.project);
  if (project === null) throw new Error("Run 'a2z-handoff init' first.");
  const savedText = await readOptional(paths.task);
  let saved = null;
  if (savedText?.trim()) {
    try {
      saved = JSON.parse(savedText);
      if (!saved || typeof saved.task !== "string" || !saved.task.trim()
        || !/^(?:[0-9]|10)$/.test(String(saved.level))
        || typeof saved.verifyCmd !== "string" || !saved.verifyCmd.trim()) throw new Error("Invalid fields");
    } catch {
      throw new Error(`Invalid saved task in ${displayPath(paths.task)}. Repair or remove it before acceptance.`);
    }
  }
  const task = values.task?.trim() || saved?.task;
  const matchingSaved = saved && saved.task === task ? saved : null;
  const level = values.level ?? (matchingSaved ? String(matchingSaved.level) : undefined);
  const verify = values.verify?.trim() || matchingSaved?.verifyCmd || projectValue(project, "Verification");

  const accept = async (terminal) => {
    const taskName = task || await terminal.text("Task agreed with your web AI", { required: true });
    const taskLevel = level || await terminal.text("Agreed autonomy level", {
      defaultValue: "3", validate: (value) => /^(?:[0-9]|10)$/.test(value) ? "" : "Enter a whole number from 0 to 10."
    });
    const command = values.human ? "" : verify || await terminal.text("Agreed verification command", { required: true });
    console.log(`\nChecking completed task: ${taskName} (Level ${taskLevel})`);
    if (!values.human) {
      console.log(`Running: ${command}`);
      const run = () => execSync(command, { cwd: paths.cwd, stdio: "inherit" });
      try {
        if (terminal) terminal.withTerminalReleased(run);
        else run();
      } catch {
        throw new Error("Verification failed. Work was not accepted; saved task and notes were preserved.");
      }
    }
    if (!values.auto && !await terminal.confirm("Have you reviewed the result and completed the agreed manual checks?")) {
      throw new Error("Work was not accepted. Saved task and notes were preserved.");
    }
    const checks = values.auto ? "Automated check" : values.human ? "Human confirmation" : "Automated check and human confirmation";
    await appendLog(paths, { change: taskName, level: taskLevel, hit: "unreviewed", notes: `Accepted: ${checks}. Scope assessment is recorded separately with log.` });
    if (saved?.task === taskName) {
      try { await unlink(paths.task); }
      catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    console.log("Accepted. Return the verification result to your main web AI and save its memory checkpoint.");
  };
  const needsQuestions = !task || !level || (!values.human && !verify) || !values.auto;
  if (needsQuestions || session) await withTerminal(accept, session);
  else await accept(null);
}
