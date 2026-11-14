import { spawnSync } from "node:child_process";

export function copyToClipboard(content) {
  const commands = process.platform === "win32"
    ? [["powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
      "[Console]::InputEncoding = New-Object System.Text.UTF8Encoding; Set-Clipboard -Value ([Console]::In.ReadToEnd())"]]]
    : process.platform === "darwin"
      ? [["pbcopy", []]]
      : [["wl-copy", []], ["xclip", ["-selection", "clipboard"]], ["termux-clipboard-set", []]];
  for (const [command, args] of commands) {
    const result = spawnSync(command, args, {
      input: content, encoding: "utf8", windowsHide: true, timeout: 5000,
      stdio: ["pipe", "ignore", "ignore"]
    });
    if (!result.error && result.status === 0) return true;
  }
  return false;
}
