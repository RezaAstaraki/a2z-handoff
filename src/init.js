import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output, platform } from "node:process";
import { mkdir, writeFile, access, readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import {
  LEADER_TEMPLATE,
  WORKER_TEMPLATE,
  AGENTS_POINTER,
  PROJECT_TEMPLATE,
  NOTES_TEMPLATE,
  HANDOFF_TEMPLATE,
  CHAT_CONTEXT_TEMPLATE
} from "./templates.js";

export async function runInit(args = []) {
  const cwd = process.cwd();
  const isDryRun = args.includes("--dry-run") || args.includes("-d");

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
  } catch {
    try {
      await access(path.join(cwd, "pyvenv.cfg"));
      defaultStack = "Python";
      defaultVerify = "python -m compileall .";
    } catch {}
  }

  let osName = "Windows PowerShell";
  let shellType = "powershell";
  let clipCmd = "| Set-Clipboard";
  let contextCmd = "Get-Content .leader/PROJECT.md, .leader/NOTES.md | clip";

  if (platform === "darwin") {
    osName = "macOS"; shellType = "bash"; clipCmd = "| pbcopy"; contextCmd = "cat .leader/PROJECT.md .leader/NOTES.md | pbcopy";
  } else if (platform === "linux") {
    osName = "Linux / Termux"; shellType = "bash"; clipCmd = "| termux-clipboard-set"; contextCmd = "cat .leader/PROJECT.md .leader/NOTES.md | termux-clipboard-set";
  }

  const fill = (tpl) => tpl
    .replaceAll("{{PROJECT_NAME}}", defaultName)
    .replaceAll("{{STACK}}", defaultStack)
    .replaceAll("{{VERIFY_COMMAND}}", defaultVerify)
    .replaceAll("{{PROJECT_PATH}}", cwd)
    .replaceAll("{{OS_NAME}}", osName)
    .replaceAll("{{SHELL_TYPE}}", shellType)
    .replaceAll("{{CLIP_CMD}}", clipCmd)
    .replaceAll("{{CONTEXT_CMD}}", contextCmd);

  if (isDryRun) {
    const leaderContent = fill(LEADER_TEMPLATE);
    try {
      if (platform === "win32") execSync("clip", { input: leaderContent });
      else if (platform === "darwin") execSync("pbcopy", { input: leaderContent });
      else if (platform === "linux") {
        try { execSync("termux-clipboard-set", { input: leaderContent }); }
        catch { execSync("xclip -selection clipboard", { input: leaderContent }); }
      }
      console.log("Dry run: Copied LEADER.md to clipboard. No files were written.");
    } catch (e) {
      console.error("Dry run: Could not copy to clipboard.", e.message);
    }
    return;
  }

  const rl = createInterface({ input, output });

  try {
    console.log("Initializing a2z-handoff for this project...\n");
    
    const nameInput = await rl.question(`Project name [${defaultName}]: `);
    const projectName = nameInput.trim() || defaultName;

    const stackInput = await rl.question(`Stack [${defaultStack}]: `);
    const stack = stackInput.trim() || defaultStack;

    const verifyInput = await rl.question(`Verification command [${defaultVerify}]: `);
    const verifyCommand = verifyInput.trim() || defaultVerify;

    const leaderDir = path.join(cwd, ".leader");
    await mkdir(leaderDir, { recursive: true });

    const fillQuestions = (tpl) => tpl
      .replaceAll("{{PROJECT_NAME}}", projectName)
      .replaceAll("{{STACK}}", stack)
      .replaceAll("{{VERIFY_COMMAND}}", verifyCommand)
      .replaceAll("{{PROJECT_PATH}}", cwd)
      .replaceAll("{{OS_NAME}}", osName)
      .replaceAll("{{SHELL_TYPE}}", shellType)
      .replaceAll("{{CLIP_CMD}}", clipCmd)
      .replaceAll("{{CONTEXT_CMD}}", contextCmd);

    // 1. Create .leader files
    const leaderContent = fillQuestions(LEADER_TEMPLATE);
    await writeFile(path.join(leaderDir, "LEADER.md"), leaderContent, "utf8");
    await writeFile(path.join(leaderDir, "WORKER.md"), fillQuestions(WORKER_TEMPLATE), "utf8");
    await writeFile(path.join(leaderDir, "PROJECT.md"), fillQuestions(PROJECT_TEMPLATE), "utf8");
    await writeFile(path.join(leaderDir, "CHAT_CONTEXT.md"), fillQuestions(CHAT_CONTEXT_TEMPLATE), "utf8");
    
    const notesPath = path.join(leaderDir, "NOTES.md");
    try { await access(notesPath); } catch { await writeFile(notesPath, fillQuestions(NOTES_TEMPLATE), "utf8"); }
    
    const handoffPath = path.join(leaderDir, "HANDOFF.md");
    try { await access(handoffPath); } catch { await writeFile(handoffPath, fillQuestions(HANDOFF_TEMPLATE), "utf8"); }

    // 2. Auto-copy LEADER.md to clipboard
    try {
      if (platform === "win32") execSync("clip", { input: leaderContent });
      else if (platform === "darwin") execSync("pbcopy", { input: leaderContent });
      else if (platform === "linux") {
        try { execSync("termux-clipboard-set", { input: leaderContent }); }
        catch { execSync("xclip -selection clipboard", { input: leaderContent }); }
      }
      console.log("  - Copied .leader/LEADER.md to clipboard!");
    } catch (e) {
      console.log("  - Could not auto-copy LEADER.md to clipboard.");
    }

    // 3. Safe Append to AGENTS.md
    const agentsPath = path.join(cwd, "AGENTS.md");
    try {
      await access(agentsPath);
      const content = await readFile(agentsPath, "utf8");
      if (!content.includes("A2Z Handoff Protocol")) {
        await writeFile(agentsPath, "\n\n" + AGENTS_POINTER, { flag: "a" });
        console.log("  - Appended A2Z pointer to AGENTS.md");
      }
    } catch {
      await writeFile(agentsPath, AGENTS_POINTER, "utf8");
      console.log("  - Created AGENTS.md");
    }

    // 4. Safe .gitignore
    const gitignorePath = path.join(cwd, ".gitignore");
    let gitContent = "";
    try { gitContent = await readFile(gitignorePath, "utf8"); } catch {}
    if (!gitContent.includes(".leader/LEADER.md")) {
      await writeFile(gitignorePath, gitContent + "\n# A2Z Handoff\n.leader/LEADER.md\n", "utf8");
      console.log("  - Added .leader/LEADER.md to .gitignore");
    }

    console.log("\nSuccess! Initialized a2z-handoff.");
  } finally {
    rl.close();
  }
}

