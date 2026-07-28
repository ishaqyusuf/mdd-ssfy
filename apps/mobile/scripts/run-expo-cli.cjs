#!/usr/bin/env node

const cliPath = require.resolve("expo/bin/cli");

process.argv = [process.execPath, cliPath, ...process.argv.slice(2)];
require(cliPath);
