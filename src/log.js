import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function runLog(args) {
  let change = "";
  let level = "3";
  let hit = "yes";
  let notes = "";

  if (args.includes("-h") || args.includes("--help")) {
    console.log(`
Usage: a2z-handoff log [options]

Log a Worker run to your .leader/NOTES.md calibration table.

Options:
  -c, --change <text>   The name of the task (Required)
  -l, --level <number>  The autonomy level (0-10) (Default: 3)
  --hit <status>        yes, overshoot, or undershoot (Default: yes)
  -n, --notes <text>    Any extra context or errors (Optional)

Example:
  a2z-handoff log --change "Add login UI" --level 4 --hit yes --notes "Clean pass"
    `);
    process.exit(0);
  }

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--change" || args[i] === "-c") change = args[++i];
    else if (args[i] === "--level" || args[i] === "-l") level = args[++i];
    else if (args[i] === "--hit") hit = args[++i];
    else if (args[i] === "--notes" || args[i] === "-n") notes = args[++i];
  }

  if (!change) {
    console.error("Error: --change is required. Run 'a2z-handoff log --help' for usage.");
    process.exit(1);
  }

  const cwd = process.cwd();
  const notesPath = path.join(cwd, ".leader", "NOTES.md");

  try {
    const content = await readFile(notesPath, "utf8");
    const lines = content.split("\n");
    
    let lastTableIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith("|")) {
        lastTableIndex = i;
      }
    }

    if (lastTableIndex !== -1) {
      const row = `| ${change} | ${level} | ${hit} | ${notes} |`;
      lines.splice(lastTableIndex + 1, 0, row);
      await writeFile(notesPath, lines.join("\n"), "utf8");
      console.log(`\nSuccess! Logged to .leader/NOTES.md:\n${row}\n`);
    } else {
      console.error("Error: Could not find a markdown table in .leader/NOTES.md");
    }
  } catch (err) {
    console.error("Error: Could not read .leader/NOTES.md. Did you run 'a2z-handoff init' first?");
  }
}
