import { runInit } from "./init.js";
import { runChat } from "./chat.js";
import { runAccept } from "./accept.js";
import { resolveMemory, exists, displayPath } from "./memory.js";
import { withTerminal } from "./terminal.js";

export async function runInteractive() {
  return withTerminal(async (session) => {
    while (true) {
      const paths = await resolveMemory();
      const ready = await exists(paths.project) && await exists(paths.mainBoot);
      console.log(`\na2z-handoff\nProject: ${paths.cwd}`);
      console.log(`Memory: ${ready ? displayPath(paths.root) : "Not set up yet"}`);
      console.log("Your web AI discusses the task with you as Supervisor or Coder.");
      console.log("Type /cancel or press Ctrl+C to exit.");
      const action = await session.choose("What would you like to do?", [
        "Start or resume my main web AI chat",
        "Prepare worker context for an agreed task",
        "Set up project memory",
        "Verify work that has already been completed",
        "Exit"
      ], "1");
      if (action === 5) return;
      try {
        if (action === 1) {
          if (ready) await runChat();
          else await runInit([], session);
          return;
        }
        if (action === 3) {
          await runInit([], session);
          return;
        }
        if (!ready) {
          console.log("Start your main chat or set up project memory first.");
          continue;
        }
        if (action === 2) {
          await runChat(["--worker"]);
          return;
        }
        console.log("Use this only after the coder or harness has finished the agreed work.");
        if (!await session.confirm("Is the work ready for verification?")) continue;
        const mode = await session.choose("How should the completed work be checked?", [
          "Automated command and human confirmation", "Automated command only", "Human confirmation only"
        ], "1");
        await runAccept(mode === 1 ? [] : [mode === 2 ? "--auto" : "--human"], session);
      } catch (error) {
        if (error.code === "CANCELLED") throw error;
        console.error(`[a2z-handoff] ${error.message}`);
      }
    }
  });
}
