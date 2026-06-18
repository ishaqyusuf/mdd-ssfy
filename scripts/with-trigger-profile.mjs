#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const command = args[0] === "--" ? args.slice(1) : args;
const profile = process.env.TRIGGER_PROFILE?.trim();

if (command.length === 0) {
  console.error("Usage: with-trigger-profile.mjs -- <command> [args...]");
  process.exit(1);
}

const hasProfileFlag = command.some(
  (arg) => arg === "--profile" || arg.startsWith("--profile="),
);
const finalCommand =
  profile && !hasProfileFlag ? [...command, "--profile", profile] : command;
const commandBin =
  finalCommand[0] === "trigger"
    ? join(process.cwd(), "node_modules", ".bin", "trigger")
    : finalCommand[0];
const executable = existsSync(commandBin) ? commandBin : finalCommand[0];

const child = spawn(executable, finalCommand.slice(1), {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
