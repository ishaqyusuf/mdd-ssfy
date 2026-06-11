#!/usr/bin/env node

import { spawn } from "node:child_process";

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

const child = spawn(finalCommand[0], finalCommand.slice(1), {
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
