#!/usr/bin/env node

import process from "node:process";
import { createRequire } from "node:module";
import { runInit } from "../src/init.js";
import { runChat } from "../src/chat.js";
import { runPrompt } from "../src/prompt.js";
import { runLog } from "../src/log.js";
import { runAccept } from "../src/accept.js";
import { runInteractive } from "../src/interactive.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");
const args = process.argv.slice(2);

function printHelp() {
  console.log(`
a2z-handoff — Project memory for a web AI Supervisor or Coder.

Usage:
  a2z-handoff                     Open the guided startup menu
  a2z-handoff <command> [options]

Commands:
  init         Set up memory and prepare your main web AI chat
  chat         Save/copy startup context; choose the AI's role in the web chat
  prompt       Alias for chat; --task creates an optional agreed-task skeleton
  accept       Check work already completed by the coder or harness
  log          Record the human's scope assessment in main AI memory
  interactive  Open the startup menu explicitly

Options:
  -v, --version  Show the package version
  -h, --help     Show help

First run: a2z-handoff init
Resume:    a2z-handoff chat
Paste the prepared context into your web AI, then choose Supervisor or Coder.
Discuss and agree on a task there before generating edits or harness prompts.
Use '<command> --help' for details.
`);
}

async function main() {
  if (args.length === 0) {
    if (process.stdin.isTTY && process.stdout.isTTY) await runInteractive();
    else printHelp();
    return;
  }
  if (["-h", "--help"].includes(args[0])) return printHelp();
  if (["-v", "--version"].includes(args[0])) {
    console.log(pkg.version);
    return;
  }
  const commands = { init: runInit, chat: runChat, prompt: runPrompt, accept: runAccept, log: runLog };
  if (args[0] === "interactive") {
    if (args.length === 2 && ["-h", "--help"].includes(args[1])) return printHelp();
    if (args.length > 1) throw new Error("interactive takes no options. Use 'a2z-handoff --help'.");
    return runInteractive();
  }
  if (!Object.hasOwn(commands, args[0])) throw new Error(`Unknown command "${args[0]}". Run 'a2z-handoff --help'.`);
  await commands[args[0]](args.slice(1));
}

main().catch((error) => {
  if (error.code === "CANCELLED") console.log(`\n${error.message}`);
  else {
    console.error(`[a2z-handoff] ${error.message}`);
    process.exitCode = 1;
  }
});
