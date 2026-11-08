#!/usr/bin/env node

import process from "node:process";
import { createRequire } from "node:module";
import { runInit } from "../src/init.js";
import { runPrompt } from "../src/prompt.js";
import { runLog } from "../src/log.js";
import { runAccept } from "../src/accept.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json");

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
a2z-handoff - A model-agnostic handoff protocol and CLI for AI agents.

Usage:
  a2z-handoff <command> [options]

Commands:
  init      Scaffold context files (use --dry-run to just copy LEADER.md)
  prompt    Generate a strict, level-based prompt
  accept    Verify and log success (--human, --auto, or default both)
  log       Manually append a calibration row

Options:
  -v, --version   Show version number
  -h, --help      Show this help message
  `);
}

if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  printHelp();
  process.exit(0);
}

if (args[0] === "-v" || args[0] === "--version") {
  console.log(pkg.version);
  process.exit(0);
}

if (args[0] === "init") {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`
Usage: a2z-handoff init [options]

Scaffold the .leader/ directory and worker instructions.
Safely appends to existing AGENTS.md and does not overwrite HANDOFF.md.

Options:
  -d, --dry-run   Copy LEADER.md to clipboard without writing any files.
    `);
    process.exit(0);
  }
  runInit(args.slice(1)).catch(console.error);
} else if (args[0] === "prompt") {
  runPrompt(args.slice(1));
} else if (args[0] === "accept") {
  if (args.includes("-h") || args.includes("--help")) {
    console.log(`
Usage: a2z-handoff accept [options]

Runs the verification command, asks for human confirmation, 
and logs the result to .leader/NOTES.md.

Options:
  --auto    Run automated verification only.
  --human   Skip automated verification, ask human only.
    `);
    process.exit(0);
  }
  runAccept(args.slice(1)).catch(console.error);
} else if (args[0] === "log") {
  runLog(args.slice(1)).catch(console.error);
} else {
  console.log(`[a2z-handoff] Command "${args[0]}" is not implemented yet.`);
  console.log(`Run 'a2z-handoff --help' for usage.`);
}
