#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const dealershipUrl = (
	process.env.DEALERSHIP_QA_URL || "http://localhost:3016"
).replace(/\/$/, "");
const customerId = process.env.DEALERSHIP_QA_CUSTOMER_ID || "3148";
const outputDir = resolve(
	process.env.DEALERSHIP_QA_OUTPUT_DIR ||
		"/private/tmp/gnd-dealership-sales-form-qa",
);
const browseBinary =
	process.env.GSTACK_BROWSE_BIN ||
	join(homedir(), ".codex/skills/gstack/browse/dist/browse");

if (!existsSync(browseBinary)) {
	console.error(
		`Browser QA binary not found at ${browseBinary}. Set GSTACK_BROWSE_BIN to the gstack browse executable.`,
	);
	process.exit(1);
}

mkdirSync(outputDir, { recursive: true });

const quoteUrl = `${dealershipUrl}/quotes/new?selectedCustomerId=${encodeURIComponent(customerId)}`;
const screenshot = (name) => join(outputDir, name);
const firstEnabledQuantityInput =
	"table input[aria-label='LH quantity for 18\" x 80\"']:not([disabled])";
const closeInvoiceSummary =
	'document.querySelector(\'button[aria-label="Close invoice summary"]\')?.click(); "closed"';
const phases = [
	{
		label: "open dealer sign-in",
		commands: [
			["goto", `${dealershipUrl}/login`],
			["wait", "text=Dev Quick Login"],
		],
	},
	{
		label: "complete dealer sign-in",
		commands: [
			["click", "text=Dev Quick Login"],
			["wait", "text=Pablo Cruz Doors"],
			["click", "text=Pablo Cruz Doors"],
			["wait", 'button[aria-label="Open account menu"]'],
		],
	},
	{
		label: "open a dealer quote",
		commands: [
			["goto", quoteUrl],
			["wait", "text=Interior pre-hung"],
		],
	},
	{
		label: "configure Door route",
		commands: [
			["click", "text=Interior pre-hung"],
			["wait", "text=PH - Single"],
			["click", "text=PH - Single"],
			["wait", "text=6-8"],
			["click", "text=6-8"],
			["wait", "text=Single Bore"],
			["click", "text=Single Bore"],
		],
	},
	{
		label: "select a priced Door fixture",
		commands: [
			["wait", "text=HC Molded"],
			["click", "text=HC Molded"],
			["wait", "text=H.C 2PNL SQR TOP"],
			["click", "text=H.C 2PNL SQR TOP"],
			["wait", firstEnabledQuantityInput],
		],
	},
	{
		label: "apply a priced Door size",
		commands: [
			["fill", firstEnabledQuantityInput, "1"],
			["screenshot", "--viewport", screenshot("door-size-desktop.png")],
			["click", "text=Apply"],
		],
	},
	{
		label: "open and prove House Package Tool",
		commands: [
			["wait", "text=House Package Tool"],
			["click", "text=House Package Tool"],
			["wait", "text=Estimate"],
			["screenshot", "--viewport", screenshot("hpt-desktop.png")],
		],
	},
	{
		label: "switch House Package Tool to tablet",
		commands: [
			["viewport", "768x1024"],
		],
	},
	{
		label: "close tablet invoice summary",
		commands: [
			["js", closeInvoiceSummary],
		],
	},
	{
		label: "capture tablet House Package Tool evidence",
		commands: [
			["screenshot", "--viewport", screenshot("hpt-tablet.png")],
		],
	},
	{
		label: "capture mobile House Package Tool evidence",
		commands: [
			["viewport", "390x844"],
			["wait", "text=1 SIZE ROW"],
			["screenshot", "--viewport", screenshot("hpt-mobile.png")],
		],
	},
	{
		label: "prove the Moulding catalog fixture",
		commands: [
			["viewport", "1440x900"],
			["goto", quoteUrl],
			["wait", "text=Moulding"],
			["click", "text=Moulding"],
			[
				"wait",
				'button:has-text("FLAT BOARD (5-1/4 X 9/16 X 16) PRIMED FJ S4S 1 X 6")',
			],
			["screenshot", "--viewport", screenshot("moulding-catalog-desktop.png")],
		],
	},
	{
		label: "switch Moulding catalog to mobile",
		commands: [
			["viewport", "390x844"],
		],
	},
	{
		label: "close mobile Moulding invoice summary",
		commands: [
			["js", closeInvoiceSummary],
		],
	},
	{
		label: "capture mobile Moulding catalog evidence",
		commands: [
			["screenshot", "--viewport", screenshot("moulding-catalog-mobile.png")],
		],
	},
];

console.log(`Running dealership sales-form browser QA against ${dealershipUrl}`);
console.log(`Artifacts: ${outputDir}`);

for (const phase of phases) {
	console.log(`\n== ${phase.label} ==`);
	const result = spawnSync(browseBinary, ["chain"], {
		input: JSON.stringify(phase.commands),
		encoding: "utf8",
		timeout: 45_000,
		env: process.env,
	});
	process.stdout.write(result.stdout || "");
	process.stderr.write(result.stderr || "");
	if (result.error) {
		console.error(result.error.message);
		process.exit(1);
	}
	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	if (result.status !== 0 || output.includes("ERROR:")) {
		process.exit(result.status || 1);
	}
}

console.log("Dealership sales-form browser QA passed.");
