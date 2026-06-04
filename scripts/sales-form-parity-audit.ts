#!/usr/bin/env bun

import { appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeSalesBookFormExtraCosts } from "../apps/www/src/app-deps/(clean-code)/(sales)/_common/data-access/sales-book-extra-costs";
import { calculateSalesFormSummary } from "../packages/sales/src/sales-form/domain/costing";
import {
	alternateLatestOrderQuote,
	compareTotals,
	groupSalesByMonth,
	manifestRecord,
	roundCurrency,
	toIsoString,
	type SalesAuditRecordBase,
	type SalesAuditStatus,
} from "./sales-form-parity-audit-utils";

const DEFAULT_DATABASE_URL = "mysql://root@localhost/gnd-prisma2";
const DEFAULT_OUT_ROOT = "brain/reports/sales-form-parity";

type CliOptions = {
	year: number;
	month: string | null;
	allMonths: boolean;
	outRoot: string;
	limitPerType: number | null;
};

type DbSalesRecord = SalesAuditRecordBase & {
	taxPercentage: number | null;
	meta: unknown;
	extraCosts: Array<{
		id: number;
		label: string;
		type: string;
		amount: number | null;
		taxxable: boolean | null;
	}>;
	items: Array<{
		id: number;
		qty: number | null;
		rate: number | null;
		total: number | null;
		dykeDescription: string | null;
		description: string | null;
	}>;
};

function usage() {
	console.log(
		[
			"Usage:",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/sales-form-parity-audit.ts --year=2026 --month=2026-05",
			"  DATABASE_URL='mysql://root@localhost/gnd-prisma2' bun scripts/sales-form-parity-audit.ts --year=2026 --all-months",
			"",
			"Options:",
			"  --year=YYYY        Calendar year to inventory. Default: 2026",
			"  --month=YYYY-MM    Month batch to run. Default: 2026-05",
			"  --all-months       Run every grouped month for the year",
			"  --out-root=PATH    Report root. Default: brain/reports/sales-form-parity",
			"  --limit-per-type=N Run the latest N orders and latest N quotes from the selected months",
		].join("\n"),
	);
}

function readArgValue(argv: string[], index: number, name: string) {
	const arg = argv[index];
	if (arg.includes("=")) return arg.split("=").slice(1).join("=");
	const value = argv[index + 1];
	if (!value || value.startsWith("--")) {
		throw new Error(`Missing value for ${name}`);
	}
	return value;
}

function parseArgs(argv: string[]): CliOptions {
	const options: CliOptions = {
		year: 2026,
		month: "2026-05",
		allMonths: false,
		outRoot: DEFAULT_OUT_ROOT,
		limitPerType: null,
	};

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg == "--help" || arg == "-h") {
			usage();
			process.exit(0);
		}
		if (arg == "--all-months") {
			options.allMonths = true;
			options.month = null;
			continue;
		}
		if (arg == "--year" || arg.startsWith("--year=")) {
			const value = Number(readArgValue(argv, i, "--year"));
			if (!Number.isInteger(value) || value < 2000) {
				throw new Error(`Invalid --year value: ${value}`);
			}
			options.year = value;
			if (!options.allMonths && options.month == "2026-05") {
				options.month = `${value}-05`;
			}
			if (!arg.includes("=")) i += 1;
			continue;
		}
		if (arg == "--month" || arg.startsWith("--month=")) {
			const value = readArgValue(argv, i, "--month");
			if (!/^\d{4}-\d{2}$/.test(value)) {
				throw new Error(`Invalid --month value: ${value}`);
			}
			options.month = value;
			options.allMonths = false;
			if (!arg.includes("=")) i += 1;
			continue;
		}
		if (arg == "--out-root" || arg.startsWith("--out-root=")) {
			options.outRoot = readArgValue(argv, i, "--out-root");
			if (!arg.includes("=")) i += 1;
			continue;
		}
		if (arg == "--limit-per-type" || arg.startsWith("--limit-per-type=")) {
			const value = Number(readArgValue(argv, i, "--limit-per-type"));
			if (!Number.isInteger(value) || value < 1) {
				throw new Error(`Invalid --limit-per-type value: ${value}`);
			}
			options.limitPerType = value;
			if (!arg.includes("=")) i += 1;
			continue;
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return options;
}

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value != "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function runId() {
	return new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
}

function yearRange(year: number) {
	return {
		gte: new Date(`${year}-01-01T00:00:00.000Z`),
		lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
	};
}

function redactDatabaseUrl(value: string | undefined) {
	if (!value) return "<unset>";
	try {
		const url = new URL(value);
		url.username = url.username ? "<redacted>" : "";
		url.password = url.password ? "<redacted>" : "";
		return url.toString();
	} catch {
		return "<redacted>";
	}
}

function buildLineItems(order: DbSalesRecord) {
	return order.items.map((item, index) => ({
		uid: `db-${item.id || index}`,
		title:
			item.dykeDescription ||
			item.description ||
			`${order.type} ${order.orderId || order.slug} line ${index + 1}`,
		qty: Number(item.qty || 0),
		unitPrice: Number(item.rate || 0),
		lineTotal: Number(item.total || 0),
	}));
}

function calculateParity(order: DbSalesRecord) {
	const meta = safeRecord(order.meta);
	const extraCosts = normalizeSalesBookFormExtraCosts({
		id: order.id,
		extraCosts: order.extraCosts,
		meta,
	});
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate: Number(order.taxPercentage || 0),
		paymentMethod:
			typeof meta.payment_option == "string" ? meta.payment_option : null,
		cccPercentage: Number(meta.ccc_percentage || 3.5),
		lineItems: buildLineItems(order),
		extraCosts,
	});

	const calculated = {
		subTotal: summary.subTotal,
		tax: summary.taxTotal,
		grandTotal: summary.grandTotal,
	};
	const persisted = {
		subTotal: order.subTotal,
		tax: order.tax,
		grandTotal: order.grandTotal,
	};
	const comparison = compareTotals({ persisted, calculated });

	return {
		status: (comparison.pass ? "pass" : "fail") as SalesAuditStatus,
		persisted: {
			subTotal: roundCurrency(order.subTotal),
			tax: roundCurrency(order.tax),
			grandTotal: roundCurrency(order.grandTotal),
		},
		calculated: {
			subTotal: roundCurrency(calculated.subTotal),
			tax: roundCurrency(calculated.tax),
			grandTotal: roundCurrency(calculated.grandTotal),
		},
		deltas: comparison.deltas,
		extraCostCount: extraCosts.length,
		lineItemCount: order.items.length,
	};
}

function buildManifest(records: DbSalesRecord[], options: CliOptions) {
	const grouped = groupSalesByMonth(records);
	const months = Object.fromEntries(
		Object.entries(grouped).map(([month, group]) => [
			month,
			{
				counts: {
					order: group.order.length,
					quote: group.quote.length,
					total: group.total,
				},
				records: [...group.order, ...group.quote].map(manifestRecord),
			},
		]),
	);

	return {
		generatedAt: new Date().toISOString(),
		year: options.year,
		totalRecords: records.length,
		months,
	};
}

function selectRunRecords(records: DbSalesRecord[], options: CliOptions) {
	const grouped = groupSalesByMonth(records);
	const months = options.allMonths
		? Object.keys(grouped)
		: options.month
			? [options.month]
			: [];
	const selected: DbSalesRecord[] = [];

	if (options.limitPerType) {
		const orders: DbSalesRecord[] = [];
		const quotes: DbSalesRecord[] = [];

		for (const month of months) {
			const group = grouped[month];
			if (!group) continue;
			for (const order of group.order) {
				if (orders.length < options.limitPerType) orders.push(order);
			}
			for (const quote of group.quote) {
				if (quotes.length < options.limitPerType) quotes.push(quote);
			}
			if (
				orders.length >= options.limitPerType &&
				quotes.length >= options.limitPerType
			) {
				break;
			}
		}

		return {
			grouped,
			months,
			selected: alternateLatestOrderQuote({ order: orders, quote: quotes }),
		};
	}

	for (const month of months) {
		const group = grouped[month];
		if (!group) continue;
		selected.push(...alternateLatestOrderQuote(group));
	}

	return { grouped, months, selected };
}

function resultBase(order: DbSalesRecord, index: number, month: string) {
	return {
		index,
		month,
		id: order.id,
		type: order.type,
		orderId: order.orderId,
		slug: order.slug,
		createdAt: toIsoString(order.createdAt),
		updatedAt: toIsoString(order.updatedAt),
	};
}

function markdownSummary(input: {
	options: CliOptions;
	reportDir: string;
	startedAt: string;
	finishedAt: string;
	manifestTotal: number;
	selectedMonths: string[];
	counts: Record<SalesAuditStatus, number>;
	totalRun: number;
	firstFailures: unknown[];
	command: string;
}) {
	return [
		"# Sales Form Parity Audit",
		"",
		`- Started: ${input.startedAt}`,
		`- Finished: ${input.finishedAt}`,
		`- Year inventory: ${input.options.year}`,
		`- Selected months: ${input.selectedMonths.join(", ") || "none"}`,
		`- Limit per type: ${input.options.limitPerType ?? "none"}`,
		`- Manifest records: ${input.manifestTotal}`,
		`- Cases run: ${input.totalRun}`,
		`- Passed: ${input.counts.pass}`,
		`- Failed: ${input.counts.fail}`,
		`- Errors: ${input.counts.error}`,
		`- Report dir: ${input.reportDir}`,
		`- Command: \`${input.command}\``,
		"",
		"## First Failures",
		input.firstFailures.length
			? input.firstFailures
					.map((failure) => `- \`${JSON.stringify(failure)}\``)
					.join("\n")
			: "None",
		"",
	].join("\n");
}

async function fetchYearRecords(db: any, year: number): Promise<DbSalesRecord[]> {
	return db.salesOrders.findMany({
		where: {
			type: {
				in: ["order", "quote"],
			},
			deletedAt: null,
			createdAt: yearRange(year),
		},
		select: {
			id: true,
			type: true,
			orderId: true,
			slug: true,
			createdAt: true,
			updatedAt: true,
			subTotal: true,
			tax: true,
			grandTotal: true,
			taxPercentage: true,
			meta: true,
			extraCosts: {
				select: {
					id: true,
					label: true,
					type: true,
					amount: true,
					taxxable: true,
				},
			},
			items: {
				where: {
					deletedAt: null,
				},
				select: {
					id: true,
					qty: true,
					rate: true,
					total: true,
					dykeDescription: true,
					description: true,
				},
			},
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
	});
}

async function main() {
	const startedAt = new Date().toISOString();
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;

	const { db } = await import("../packages/db/src/index.ts");
	const id = runId();
	const reportDir = path.resolve(options.outRoot, id);
	const resultsPath = path.join(reportDir, "results.jsonl");

	try {
		await mkdir(reportDir, { recursive: true });
		const records = await fetchYearRecords(db, options.year);
		const manifest = buildManifest(records, options);
		await writeFile(
			path.join(reportDir, "manifest.json"),
			`${JSON.stringify(manifest, null, 2)}\n`,
			"utf8",
		);
		await writeFile(resultsPath, "", "utf8");

		const { months, selected } = selectRunRecords(records, options);
		const counts: Record<SalesAuditStatus, number> = {
			pass: 0,
			fail: 0,
			error: 0,
		};
		const firstFailures: unknown[] = [];

		for (const [index, order] of selected.entries()) {
			const month = toIsoString(order.createdAt)?.slice(0, 7) || "unknown";
			try {
				const parity = calculateParity(order);
				counts[parity.status] += 1;
				const result = {
					...resultBase(order, index + 1, month),
					...parity,
				};
				if (parity.status != "pass" && firstFailures.length < 20) {
					firstFailures.push(result);
				}
				await appendFile(resultsPath, `${JSON.stringify(result)}\n`, "utf8");
			} catch (error) {
				counts.error += 1;
				const result = {
					...resultBase(order, index + 1, month),
					status: "error" as const,
					error: error instanceof Error ? error.message : String(error),
				};
				if (firstFailures.length < 20) firstFailures.push(result);
				await appendFile(resultsPath, `${JSON.stringify(result)}\n`, "utf8");
			}
		}

		const finishedAt = new Date().toISOString();
		const summary = markdownSummary({
			options,
			reportDir,
			startedAt,
			finishedAt,
			manifestTotal: records.length,
			selectedMonths: months,
			counts,
			totalRun: selected.length,
			firstFailures,
		command: `DATABASE_URL='${redactDatabaseUrl(process.env.DATABASE_URL)}' bun ${process.argv
			.slice(1)
			.join(" ")}`,
	});
		await writeFile(path.join(reportDir, "summary.md"), summary, "utf8");

		console.log(summary);
		console.log(`manifest: ${path.join(reportDir, "manifest.json")}`);
		console.log(`results: ${resultsPath}`);
		console.log(`summary: ${path.join(reportDir, "summary.md")}`);
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	console.error(
		`[sales-form-parity-audit] ${error instanceof Error ? error.message : String(error)}`,
	);
	usage();
	process.exit(1);
});
