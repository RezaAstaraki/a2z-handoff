import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { constants } from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";
import { LEADER_TEMPLATE, WORKER_TEMPLATE, AGENTS_POINTER, PROJECT_TEMPLATE, NOTES_TEMPLATE, HANDOFF_TEMPLATE } from "./templates.js";
import { memoryPaths, readOptional, projectValue, displayPath, exists } from "./memory.js";
import { withTerminal } from "./terminal.js";
import { copyToClipboard } from "./clipboard.js";
import { runChat } from "./chat.js";

async function createIfMissing(file, content) {
  try {
    await writeFile(file, content, { encoding: "utf8", flag: "wx" });
    console.log(`  Created ${displayPath(file)}`);
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    console.log(`  Preserved ${displayPath(file)}`);
  }
}

async function saveBoot(file, content, refresh) {
  const previous = await readOptional(file);
  if (!refresh || previous === null) return createIfMissing(file, content);
  if (previous === content) {
    console.log(`  Already current: ${displayPath(file)}`);
    return;
  }
  const backup = `${file}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  await copyFile(file, backup, constants.COPYFILE_EXCL);
  await writeFile(file, content, "utf8");
  console.log(`  Refreshed ${displayPath(file)}; backup: ${displayPath(backup)}`);
}

export async function runInit(args = [], session) {
  const { values } = parseArgs({ args, options: {
    "dry-run": { type: "boolean", short: "d" },
    "refresh-boot": { type: "boolean" },
    print: { type: "boolean" }, help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log(`Usage: a2z-handoff init [--dry-run | --refresh-boot] [--print]

Create memory/PROJECT.md, memory/main/, memory/worker/, and an AGENTS.md pointer.
Preserve existing memory. Import legacy project notes without removing .leader/.
Then save and copy the main web AI startup context.
--dry-run  Preview/copy a main AI boot prompt without creating files.
--refresh-boot  Back up and regenerate only BOOT.md instructions using current templates.
                Existing project context, notes, and worker handoff stay intact.
--print    Print the context instead of copying it to the clipboard.`);
    return;
  }
  if (values["dry-run"] && values["refresh-boot"]) {
    throw new Error("Choose --dry-run or --refresh-boot, not both.");
  }
  const paths = memoryPaths();
  const legacy = memoryPaths(paths.cwd, true);
  const packageText = await readOptional(path.join(paths.cwd, "package.json"));
  const pkg = packageText === null ? {} : JSON.parse(packageText);
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  let stack = dependencies.next ? "Next.js" : dependencies.react ? "React" : dependencies.typescript ? "TypeScript" : dependencies.express ? "Express" : "Node.js / JavaScript";
  let verify = dependencies.typescript ? "npx tsc --noEmit" : pkg.scripts?.lint ? "npm run lint" : "npm test";
  if (packageText === null && (await exists(path.join(paths.cwd, "pyvenv.cfg")) || await exists(path.join(paths.cwd, "pyproject.toml")))) {
    stack = "Python";
    verify = "python -m compileall .";
  }
  const existingProject = await readOptional(paths.project);
  const legacyProject = await readOptional(legacy.project);
  const savedProject = existingProject ?? legacyProject;
  const shell = process.platform === "win32" ? "PowerShell" : "bash";
  let projectName = projectValue(savedProject, "Project") || pkg.name || path.basename(paths.cwd);
  stack = projectValue(savedProject, "Stack") || stack;
  verify = projectValue(savedProject, "Verification") || verify;
  const fill = (template) => {
    const fields = {
      PROJECT_NAME: projectName, PROJECT_PATH: paths.cwd, STACK: stack,
      OS_NAME: process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "macOS" : process.platform,
      SHELL_TYPE: projectValue(savedProject, "Shell") || shell, VERIFY_COMMAND: verify
    };
    return template.replace(/{{([A-Z_]+)}}/g, (match, key) => fields[key] ?? match);
  };
  if (values["dry-run"]) {
    const boot = fill(LEADER_TEMPLATE)
      + "\n=== Project context preview ===\n" + (savedProject ?? fill(PROJECT_TEMPLATE))
      + "\nPreview only: local memory may not exist yet. Ask the human for missing context.\n";
    if (values.print || !copyToClipboard(boot)) console.log(boot);
    else console.log("Main AI boot prompt copied. Paste it into your web chat and choose Supervisor or Coder. No files created.");
    return;
  }

  const initialize = async (terminal) => {
    if (savedProject === null) {
      console.log("\nSet up project memory. Discuss the actual task later in your web AI chat.");
      projectName = await terminal.text("Project name", { defaultValue: projectName, required: true });
      stack = await terminal.text("Stack", { defaultValue: stack, required: true });
      verify = await terminal.text("Default verification command", { defaultValue: verify, required: true });
    } else {
      console.log("\nPreserving existing project context and memory.");
    }
    await mkdir(paths.main, { recursive: true });
    await mkdir(paths.worker, { recursive: true });
    await createIfMissing(paths.project, savedProject ?? fill(PROJECT_TEMPLATE));
    await saveBoot(paths.mainBoot, fill(LEADER_TEMPLATE), values["refresh-boot"]);
    await saveBoot(paths.workerBoot, fill(WORKER_TEMPLATE), values["refresh-boot"]);
    await createIfMissing(paths.notes, await readOptional(legacy.notes) ?? NOTES_TEMPLATE);
    await createIfMissing(paths.handoff, await readOptional(legacy.handoff) ?? HANDOFF_TEMPLATE);
    const legacyTask = await readOptional(legacy.task);
    // Import pending state once; rerunning init must not revive accepted work.
    if (existingProject === null && legacyTask?.trim()) await createIfMissing(paths.task, legacyTask);

    const agentsPath = path.join(paths.cwd, "AGENTS.md");
    const agents = await readOptional(agentsPath);
    const oldRule = 'If your prompt starts with "CHANGE: ", you MUST read and follow the rules in `.leader/WORKER.md` before acting.';
    if (agents === null) await createIfMissing(agentsPath, AGENTS_POINTER);
    else if (agents.includes(oldRule)) {
      await writeFile(agentsPath, agents.replace(oldRule,
        'For a task starting with "CHANGE:", read memory/worker/BOOT.md and follow the agreed scope.'), "utf8");
      console.log("  Updated the legacy A2Z pointer in AGENTS.md");
    } else if (!agents.includes("A2Z Handoff Protocol")) {
      await writeFile(agentsPath, `\n${AGENTS_POINTER}`, { flag: "a", encoding: "utf8" });
      console.log("  Appended the A2Z pointer to AGENTS.md");
    }
    console.log("\nProject memory is ready.");
    await runChat(values.print ? ["--print"] : []);
  };
  if (savedProject !== null) await initialize(session);
  else await withTerminal(initialize, session);
}
