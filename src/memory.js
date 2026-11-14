import { readFile, access } from "node:fs/promises";
import path from "node:path";

export async function readOptional(file) {
  try { return await readFile(file, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export async function exists(file) {
  try { await access(file); return true; }
  catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

export function memoryPaths(cwd = process.cwd(), legacy = false) {
  const root = path.join(cwd, legacy ? ".leader" : "memory");
  const main = legacy ? root : path.join(root, "main");
  const worker = legacy ? root : path.join(root, "worker");
  return {
    cwd, root, main, worker, legacy,
    project: path.join(root, "PROJECT.md"),
    mainBoot: path.join(main, legacy ? "LEADER.md" : "BOOT.md"),
    notes: path.join(main, "NOTES.md"),
    workerBoot: path.join(worker, legacy ? "WORKER.md" : "BOOT.md"),
    handoff: path.join(worker, "HANDOFF.md"),
    task: path.join(worker, ".last-task.json"),
    prompt: path.join(worker, "PROMPT.md"),
    mainSession: path.join(main, legacy ? "MAIN_SESSION.md" : "SESSION.md"),
    workerSession: path.join(worker, legacy ? "WORKER_SESSION.md" : "SESSION.md")
  };
}

export async function resolveMemory(cwd = process.cwd()) {
  const current = memoryPaths(cwd);
  if (await exists(current.project)) return current;
  const legacy = memoryPaths(cwd, true);
  return await exists(legacy.project) ? legacy : current;
}

export function projectValue(content, section) {
  return content?.match(new RegExp(`^## ${section}[^\\S\\r\\n]*\\r?\\n- ([^\\r\\n]+)`, "m"))?.[1].trim();
}

export function displayPath(file, cwd = process.cwd()) {
  return path.relative(cwd, file).split(path.sep).join("/");
}
