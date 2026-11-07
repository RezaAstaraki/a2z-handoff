import process from "node:process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export async function runPrompt(args) {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`
Usage: a2z-handoff prompt [options]

Generate a strict, level-based prompt skeleton for a Worker.

Options:
  -t, --task <text>     The task description (Required)
  -l, --level <number>  The autonomy level (0-10) (Default: 3)
  -f, --files <list>    Comma-separated list of files to edit
  -v, --verify <cmd>    The terminal verification command (Default: npm test)
  --chat                Include file contents for Web Chat Workers

Example:
  a2z-handoff prompt --task "Add login" --files "src/auth.js" --level 4
    `);
    process.exit(0);
  }

  let level = "3";
  let task = "";
  let files = [];
  let verifyCmd = "npm test";
  let isChat = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--level" || args[i] === "-l") level = args[++i];
    else if (args[i] === "--task" || args[i] === "-t") task = args[++i];
    else if (args[i] === "--files" || args[i] === "-f") files = args[++i].split(",").map(f => f.trim());
    else if (args[i] === "--verify" || args[i] === "-v") verifyCmd = args[++i];
    else if (args[i] === "--chat") isChat = true;
  }

  if (!task) {
    console.error("Error: --task is required. Run 'a2z-handoff prompt --help' for usage.");
    process.exit(1);
  }

  // Save state for the 'accept' command
  const leaderDir = path.join(process.cwd(), ".leader");
  await mkdir(leaderDir, { recursive: true });
  await writeFile(
    path.join(leaderDir, ".last-task.json"),
    JSON.stringify({ task, level, verifyCmd }, null, 2),
    "utf8"
  );

  let contextBlock = "";
  let readFirstBlock = "AGENTS.md, HANDOFF.md, then the target file(s).";

  if (isChat) {
    try {
      const chatContext = await readFile(path.join(process.cwd(), "CHAT_CONTEXT.md"), "utf8");
      contextBlock += `\n=== START CONTEXT (CHAT_CONTEXT.md) ===\n${chatContext}\n=== END CONTEXT ===\n`;
      for (const file of files) {
        if (!file) continue;
        const content = await readFile(path.join(process.cwd(), file), "utf8");
        contextBlock += `\n=== START FILE: ${file} ===\n${content}\n=== END FILE: ${file} ===\n`;
      }
      readFirstBlock = "The context and files are provided below. Read them carefully.";
    } catch (err) {
      console.error(`Error reading chat context or files: ${err.message}`);
      process.exit(1);
    }
  } else {
    if (files.length > 0) {
      contextBlock = `\nFILE(S):\n${files.map(f => `- ${f}`).join("\n")}\n`;
    }
  }

  const promptText = `\`\`\`text
CHANGE: ${task}
LEVEL: ${level}
REASONING BUDGET: at most ${level <= 2 ? 3 : level <= 5 ? 8 : 12} reasoning lines total, then tool calls.
${contextBlock}
READ FIRST: ${readFirstBlock}

EXACT EDITS:
(Leader: Fill in the exact diff or anchor instructions here)

PRESERVE:
(List byte-identical elements)

DO NOT:
- Do not run npm run dev/build/start, or git commands.

CHECK:
1. Run \`${verifyCmd}; Write-Output "EXIT=$LASTEXITCODE"\` and report the exit code.
2. Read back and quote the modified regions.
3. Grep for new identifiers.

REPORT (wrap entire report in a single fenced block):
- LEVEL: ${level} | LEVEL HIT: <yes|overshoot|undershoot> | REASON: <one line>
- Files changed.
- Exit code.
- Quoted regions.
\`\`\``;

  console.log("\n=======================================================");
  console.log(" COPY THIS PROMPT TO YOUR WORKER (DSH / ChatGPT / etc.)");
  console.log("=======================================================\n");
  console.log(promptText);
  console.log("\n=======================================================");
}
