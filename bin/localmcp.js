#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = resolve(packageRoot, "dist/cli.js");

const run = (command, args, cwd = process.cwd(), useShell = false) => {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: useShell,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

if (existsSync(distEntry)) {
  run(process.execPath, [distEntry, ...process.argv.slice(2)]);
} else {
  // npx is a .cmd shim on Windows; Node throws EINVAL unless it goes through a shell.
  run("npx", ["tsx", "src/cli.ts", ...process.argv.slice(2)], packageRoot, process.platform === "win32");
}
