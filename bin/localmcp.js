#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distEntry = resolve(packageRoot, "dist/cli.js");

const run = (command, args, cwd = process.cwd()) => {
  const child = spawn(command, args, {
    cwd,
    stdio: "inherit",
    env: process.env,
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
  run("npx", ["tsx", "src/cli.ts", ...process.argv.slice(2)], packageRoot);
}
