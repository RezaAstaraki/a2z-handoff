import { createInterface } from "node:readline/promises";

function cancelled() {
  const error = new Error("Cancelled.");
  error.code = "CANCELLED";
  return error;
}

export async function withTerminal(callback, session) {
  if (session) return callback(session);
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("This action needs an interactive terminal. Use --help for command options.");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const controller = new AbortController();
  const abort = () => controller.abort();
  rl.on("SIGINT", abort);
  rl.on("close", abort);
  const question = async (query) => {
    if (controller.signal.aborted) throw cancelled();
    try {
      const answer = await rl.question(query, { signal: controller.signal });
      if (answer.trim() === "/cancel") throw cancelled();
      return answer;
    } catch (error) {
      if (controller.signal.aborted) throw cancelled();
      throw error;
    }
  };
  const text = async (label, { defaultValue = "", required = false, validate } = {}) => {
    while (true) {
      const answer = (await question(`${label}${defaultValue ? ` [${defaultValue}]` : ""}: `)).trim() || defaultValue;
      const problem = required && !answer ? "Please enter a value, or type /cancel." : validate?.(answer);
      if (problem) console.log(problem);
      else return answer;
    }
  };
  const choose = async (label, options, defaultValue = "") => {
    console.log(`\n${label}`);
    options.forEach((option, index) => console.log(`  ${index + 1}. ${option}`));
    return Number(await text("Choose a number", {
      defaultValue,
      validate: (value) => /^[1-9]\d*$/.test(value) && Number(value) <= options.length
        ? "" : `Enter a number from 1 to ${options.length}.`
    }));
  };
  const confirm = async (label) => (await text(`${label} (y/N)`, {
    defaultValue: "n",
    validate: (value) => /^(y|yes|n|no)$/i.test(value) ? "" : "Enter yes or no."
  })).toLowerCase().startsWith("y");
  const withTerminalReleased = (callback) => {
    const wasRaw = Boolean(process.stdin.isRaw);
    rl.pause();
    try {
      process.stdin.setRawMode?.(false);
      return callback();
    } finally {
      process.stdin.setRawMode?.(wasRaw);
      if (!rl.closed) rl.resume();
    }
  };
  try {
    return await callback({ question, text, choose, confirm, withTerminalReleased });
  } finally {
    rl.removeListener("SIGINT", abort);
    rl.removeListener("close", abort);
    rl.close();
  }
}
