#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function usage() {
  console.log(
    [
      "Usage:",
      "  node scripts/sales-control-parity-report.mjs --file <logfile> [--file <logfile2>] [--json] [--since YYYY-MM-DD]",
      "",
      "Examples:",
      "  node scripts/sales-control-parity-report.mjs --file ./api.log",
      "  node scripts/sales-control-parity-report.mjs --file ./api.log --since 2026-03-10",
      "  node scripts/sales-control-parity-report.mjs --file ./api.log --json",
    ].join("\n"),
  );
}

function parseArgs(argv) {
  const files = [];
  let asJson = false;
  let since = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--file") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --file");
      }
      files.push(value);
      i += 1;
      continue;
    }
    if (arg === "--json") {
      asJson = true;
      continue;
    }
    if (arg === "--since") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("Missing value for --since");
      }
      since = new Date(value);
      if (Number.isNaN(since.getTime())) {
        throw new Error(`Invalid date for --since: ${value}`);
      }
      i += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!files.length) {
    throw new Error("At least one --file is required");
  }

  return { files, asJson, since };
}

function parseTimestamp(line) {
  const match = line.match(
    /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\b/,
  );
  if (!match) return null;
  const d = new Date(match[1]);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIdsFromLine(line, kind) {
  const labelsByKind = {
    sales: ["salesIds"],
    dispatch: ["dispatchIds"],
    "dispatch-overview": ["dispatchIds"],
  };
  const labels = labelsByKind[kind] || [];
  const ids = [];
  for (const label of labels) {
    const listMatch = line.match(new RegExp(`${label}\\s*:\\s*\\[([^\\]]*)\\]`));
    if (!listMatch) continue;
    ids.push(
      ...listMatch[1]
        .split(",")
        .map((s) => Number(String(s).trim()))
        .filter((n) => Number.isFinite(n)),
    );
  }
  return [...new Set(ids)];
}

function parseMismatchCount(line) {
  const m = line.match(/mismatchCount\s*:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function summarizeLines(lines, kind, since) {
  const marker = `[control-read-parity][${kind}] mismatches`;
  const matched = [];
  const idCounts = new Map();
  let totalMismatchCount = 0;

  for (const rawLine of lines) {
    if (!rawLine.includes(marker)) continue;
    const timestamp = parseTimestamp(rawLine);
    if (since && timestamp && timestamp < since) continue;

    const mismatchCount = parseMismatchCount(rawLine);
    totalMismatchCount += mismatchCount ?? 0;

    const ids = parseIdsFromLine(rawLine, kind);
    for (const id of ids) {
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }

    matched.push({
      timestamp: timestamp ? timestamp.toISOString() : null,
      mismatchCount,
      ids,
      line: rawLine,
    });
  }

  const topIds = [...idCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, count]) => ({ id, count }));

  return {
    type: kind,
    eventCount: matched.length,
    totalMismatchCount,
    uniqueIds: idCounts.size,
    topIds,
    events: matched,
  };
}

function readLines(files) {
  const lines = [];
  for (const f of files) {
    const resolved = path.resolve(f);
    const content = fs.readFileSync(resolved, "utf8");
    for (const line of content.split(/\r?\n/)) {
      if (line.trim()) lines.push(line);
    }
  }
  return lines;
}

function printTextReport(report) {
  const printSection = (section) => {
    console.log(`\n${section.type.toUpperCase()} PARITY`);
    console.log(`events: ${section.eventCount}`);
    console.log(`totalMismatchCount: ${section.totalMismatchCount}`);
    console.log(`uniqueIds: ${section.uniqueIds}`);
    if (section.topIds.length) {
      console.log("topIds:");
      for (const item of section.topIds) {
        console.log(`  - ${item.id}: ${item.count}`);
      }
    } else {
      console.log("topIds: none");
    }
  };

  console.log("Sales Control Read Parity Report");
  console.log(`generatedAt: ${new Date().toISOString()}`);
  if (report.since) console.log(`since: ${report.since}`);
  console.log(`files: ${report.files.join(", ")}`);
  printSection(report.sales);
  printSection(report.dispatch);
  printSection(report.dispatchOverview);
}

function main() {
  try {
    const { files, asJson, since } = parseArgs(process.argv.slice(2));
    const lines = readLines(files);
    const report = {
      generatedAt: new Date().toISOString(),
      since: since ? since.toISOString() : null,
      files: files.map((f) => path.resolve(f)),
      sales: summarizeLines(lines, "sales", since),
      dispatch: summarizeLines(lines, "dispatch", since),
      dispatchOverview: summarizeLines(lines, "dispatch-overview", since),
    };

    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printTextReport(report);
  } catch (error) {
    console.error(
      `[sales-control-parity-report] ${error instanceof Error ? error.message : String(error)}`,
    );
    usage();
    process.exit(1);
  }
}

main();
