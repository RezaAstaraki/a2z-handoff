import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { resolveMemory, displayPath } from "./memory.js";

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\r\n|\r|\n/g, "<br>");
}

export async function appendLog(paths, { change, level, hit, notes = "" }) {
  const content = await readFile(paths.notes, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const header = lines.findIndex((line) => /^\|\s*Run\s*\|\s*Change\s*\|\s*Level\s*\|\s*Level Hit\s*\|\s*Notes\s*\|\s*$/i.test(line));
  if (header === -1 || !lines[header + 1]?.trim().startsWith("|")) {
    throw new Error(`No calibration table found in ${displayPath(paths.notes)}. Preserve your notes and add the documented five-column table.`);
  }
  let end = header + 2;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  const cells = [new Date().toISOString(), change, level, hit, notes].map(escapeCell);
  lines.splice(end, 0, `| ${cells.join(" | ")} |`);
  await writeFile(paths.notes, lines.join(newline), "utf8");
  console.log(`Recorded result in ${displayPath(paths.notes)}.`);
}

export async function runLog(args = []) {
  const { values } = parseArgs({ args, options: {
    change: { type: "string", short: "c" }, level: { type: "string", short: "l", default: "3" },
    hit: { type: "string", default: "yes" }, notes: { type: "string", short: "n", default: "" },
    help: { type: "boolean", short: "h" }
  } });
  if (values.help) {
    console.log(`Usage: a2z-handoff log --change <task> [--level 0-10] [--hit yes|overshoot|undershoot] [--notes text]

Append a human-assessed scope result to memory/main/NOTES.md.
Legacy .leader/NOTES.md is supported. "Level Hit" describes scope, not test success.`);
    return;
  }
  if (!values.change?.trim()) throw new Error("--change is required.");
  if (!/^(?:[0-9]|10)$/.test(values.level)) throw new Error("--level must be a whole number from 0 to 10.");
  if (!["yes", "overshoot", "undershoot"].includes(values.hit)) throw new Error("--hit must be yes, overshoot, or undershoot.");
  await appendLog(await resolveMemory(), {
    change: values.change.trim(), level: values.level, hit: values.hit, notes: values.notes
  });
}
