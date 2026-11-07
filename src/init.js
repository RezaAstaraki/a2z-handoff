import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  AGENTS_TEMPLATE,
  HANDOFF_TEMPLATE,
  LEADER_TEMPLATE,
  PROJECT_TEMPLATE,
  NOTES_TEMPLATE,
  CHAT_CONTEXT_TEMPLATE
} from "./templates.js";

export async function runInit() {
  const rl = createInterface({ input, output });
  const cwd = process.cwd();

  let defaultName = "my-project";
  let defaultStack = "Unknown";
  let defaultVerify = "npm test";

  try {
    const pkgContent = await readFile(path.join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(pkgContent);
    if (pkg.name) defaultName = pkg.name;
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) { defaultStack = "Next.js"; defaultVerify = "npx tsc --noEmit"; }
    else if (deps.react) { defaultStack = "React"; defaultVerify = "npx tsc --noEmit"; }
    else if (deps.typescript) { defaultStack = "TypeScript"; defaultVerify = "npx tsc --noEmit"; }
    else if (deps.express) { defaultStack = "Express"; }
  } catch {}

  try {
    console.log("Initializing a2z-handoff for this project...\n");
    
    const nameInput = await rl.question(`Project name [${defaultName}]: `);
    const projectName = nameInput.trim() || defaultName;

    const stackInput = await rl.question(`Stack [${defaultStack}]: `);
    const stack = stackInput.trim() || defaultStack;

    const verifyInput = await rl.question(`Verification command [${defaultVerify}]: `);
    const verifyCommand = verifyInput.trim() || defaultVerify;

    const leaderDir = path.join(cwd, ".leader");

    const fill = (tpl) => tpl
      .replaceAll("{{PROJECT_NAME}}", projectName)
      .replaceAll("{{STACK}}", stack)
      .replaceAll("{{VERIFY_COMMAND}}", verifyCommand)
      .replaceAll("{{PROJECT_PATH}}", cwd);

    await mkdir(leaderDir, { recursive: true });

    // SAFE WRITE for AGENTS.md
    const agentsPath = path.join(cwd, "AGENTS.md");
    try {
      await access(agentsPath);
      // File exists! Append a2z rules.
      await writeFile(agentsPath, "\n\n" + fill(AGENTS_TEMPLATE), { flag: "a" });
      console.log("  - Appended a2z rules to existing AGENTS.md");
    } catch {
      // File doesn't exist. Create new.
      await writeFile(agentsPath, fill(AGENTS_TEMPLATE), "utf8");
      console.log("  - Created new AGENTS.md");
    }

    // SAFE WRITE for HANDOFF.md
    const handoffPath = path.join(cwd, "HANDOFF.md");
    try {
      await access(handoffPath);
      // File exists, skip or leave alone. Let's leave alone to preserve state.
      console.log("  - Existing HANDOFF.md detected (skipped)");
    } catch {
      await writeFile(handoffPath, fill(HANDOFF_TEMPLATE), "utf8");
      console.log("  - Created HANDOFF.md");
    }

    // Always overwrite CHAT_CONTEXT and .leader files (they are generated)
    await writeFile(path.join(cwd, "CHAT_CONTEXT.md"), fill(CHAT_CONTEXT_TEMPLATE), "utf8");
    await writeFile(path.join(leaderDir, "LEADER.md"), fill(LEADER_TEMPLATE), "utf8");
    await writeFile(path.join(leaderDir, "PROJECT.md"), fill(PROJECT_TEMPLATE), "utf8");
    
    // SAFE WRITE for NOTES.md
    const notesPath = path.join(leaderDir, "NOTES.md");
    try {
      await access(notesPath);
      // File exists, skip.
    } catch {
      await writeFile(notesPath, fill(NOTES_TEMPLATE), "utf8");
    }

    let gitignoreContent = "";
    try {
      await access(path.join(cwd, ".gitignore"));
      gitignoreContent = "\n";
    } catch {}
    const gitignoreAdd = ".leader/\n";
    await writeFile(path.join(cwd, ".gitignore"), gitignoreContent + gitignoreAdd, { flag: "a" });

    console.log("\nSuccess! Initialized a2z-handoff.");
  } finally {
    rl.close();
  }
}
