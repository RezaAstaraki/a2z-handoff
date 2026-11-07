#!/usr/bin/env node

import process from "node:process";
import { runInit } from "../src/init.js";
import { runPrompt } from "../src/prompt.js";
import { runLog } from "../src/log.js";
import { runAccept } from "../src/accept.js";

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
a2z-handoff - A model-agnostic handoff protocol and CLI for AI agents.

Usage:
  a2z-handoff <command> [options]

Commands:
  init      Scaffold context files
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
  console.log("0.1.0");
  process.exit(0);
}

if (args[0] === "init") runInit().catch(console.error);
else if (args[0] === "prompt") runPrompt(args.slice(1));
else if (args[0] === "accept") runAccept(args.slice(1)).catch(console.error);
else if (args[0] === "log") runLog(args.slice(1)).catch(console.error);
else console.log(`[a2z-handoff] Command "${args[0]}" is not implemented yet.`);
