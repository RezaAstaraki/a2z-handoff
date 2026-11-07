import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export async function runAccept(args) {
  let mode = "both";
  if (args.includes("--human")) mode = "human";
  else if (args.includes("--auto")) mode = "auto";

  const cwd = process.cwd();
  const taskFile = path.join(cwd, ".leader", ".last-task.json");
  let taskData;

  try {
    taskData = JSON.parse(await readFile(taskFile, "utf8"));
  } catch {
    // Fallback: The CLI didn't generate the prompt, so we ask the user manually.
    console.log("\n[!] No pending task found in .leader/.last-task.json.");
    console.log("This usually happens if you generated the prompt using a Web Chat instead of 'a2z-handoff prompt'.\n");
    
    const rl = createInterface({ input, output });
    const task = await rl.question("What is the task name? (e.g., 'Gate Add Button'): ");
    const verifyCmd = await rl.question("What is the verification command? [npx tsc --noEmit]: ");
    rl.close();
    
    taskData = {
      task: task || "Unknown Task",
      level: "2", // Default fallback
      verifyCmd: verifyCmd || "npx tsc --noEmit"
    };
  }

  try {
    console.log(`\nAccepting Task: "${taskData.task}" (Level ${taskData.level})`);
    
    // 1. Automated Verification
    if (mode === "auto" || mode === "both") {
      console.log(`\nRunning automated verification: ${taskData.verifyCmd}...`);
      try {
        execSync(taskData.verifyCmd, { stdio: "inherit", cwd });
        console.log("✅ Automated verification passed!");
      } catch (e) {
        console.error("❌ Automated verification failed. Fix the code before accepting.");
        process.exit(1);
      }
    }

    // 2. Human Verification
    if (mode === "human" || mode === "both") {
      const rl = createInterface({ input, output });
      const answer = await rl.question("\nDid you manually verify this task? (y/N): ");
      rl.close();
      if (answer.toLowerCase() !== "y") {
        console.error("❌ Task rejected by human.");
        process.exit(1);
      }
      console.log("✅ Human verification confirmed!");
    }

    // 3. Log to NOTES.md
    const notesPath = path.join(cwd, ".leader", "NOTES.md");
    const content = await readFile(notesPath, "utf8");
    const lines = content.split("\n");
    let lastTableIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("|")) lastTableIndex = i;
    }
    
    if (lastTableIndex !== -1) {
      const verificationType = mode === "both" ? "Auto + Human" : mode === "auto" ? "Auto" : "Human";
      const row = `| ${taskData.task} | ${taskData.level} | yes | Accepted (${verificationType}) |`;
      lines.splice(lastTableIndex + 1, 0, row);
      await writeFile(notesPath, lines.join("\n"), "utf8");
      console.log(`\nLogged to .leader/NOTES.md:\n${row}\n`);
    }
    
    // Cleanup the task file if it existed
    try { await writeFile(taskFile, "", "utf8"); } catch {}
    
  } catch (err) {
    console.error("Error logging task:", err.message);
  }
}
