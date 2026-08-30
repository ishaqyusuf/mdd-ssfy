#!/usr/bin/env bun

import type { SalesHandoffSourceRepairReport } from "../packages/sales/src/sales-handoff/source-repair";

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";

type Options = {
	apply: boolean;
	confirmReview: boolean;
	json: boolean;
	category: "ALL" | "PAYMENT" | "INVENTORY";
	cursor: string | null;
	limit: number;
	salesOrderIds: number[] | null;
	releaseDecision:
		| "ACTIVE_ORDER_APPROVED"
		| "CANONICAL_STATUS_CORRECTED"
		| null;
	releaseSalesOrderIds: number[] | null;
	reason: string | null;
};

function valueAfter(argv: string[], index: number, option: string) {
	const value = argv[index + 1];
	if (!value || value.startsWith("--"))
		throw new Error(`${option} requires a value.`);
	return value;
}

function positiveIds(value: string, option: string) {
	const raw = value.split(",").map((part) => part.trim());
	const ids = raw.map(Number);
	if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
		throw new Error(`${option} requires positive integer order ids.`);
	}
	return [...new Set(ids)];
}

export function parseSalesHandoffSourceRepairArgs(argv: string[]): Options {
	const options: Options = {
		apply: false,
		confirmReview: false,
		json: false,
		category: "ALL",
		cursor: null,
		limit: 50,
		salesOrderIds: null,
		releaseDecision: null,
		releaseSalesOrderIds: null,
		reason: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index] ?? "";
		const inline = arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : null;
		const read = () => inline ?? valueAfter(argv, index++, arg);
		if (arg === "--apply") options.apply = true;
		else if (arg === "--confirm-review") options.confirmReview = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "--markdown") options.json = false;
		else if (arg === "--cursor" || arg.startsWith("--cursor="))
			options.cursor = read();
		else if (arg === "--limit" || arg.startsWith("--limit=")) {
			options.limit = Number(read());
			if (
				!Number.isInteger(options.limit) ||
				options.limit < 1 ||
				options.limit > 200
			) {
				throw new Error("--limit must be an integer from 1 to 200.");
			}
		} else if (arg === "--category" || arg.startsWith("--category=")) {
			const category = read().trim().toUpperCase();
			if (!["ALL", "PAYMENT", "INVENTORY"].includes(category)) {
				throw new Error("--category must be all, payment, or inventory.");
			}
			options.category = category as Options["category"];
		} else if (
			arg === "--sales-order-ids" ||
			arg.startsWith("--sales-order-ids=")
		) {
			options.salesOrderIds = positiveIds(read(), "--sales-order-ids");
		} else if (
			arg === "--release-active-order-ids" ||
			arg.startsWith("--release-active-order-ids=")
		) {
			options.releaseDecision = "ACTIVE_ORDER_APPROVED";
			options.releaseSalesOrderIds = positiveIds(
				read(),
				"--release-active-order-ids",
			);
		} else if (
			arg === "--release-corrected-status-ids" ||
			arg.startsWith("--release-corrected-status-ids=")
		) {
			options.releaseDecision = "CANONICAL_STATUS_CORRECTED";
			options.releaseSalesOrderIds = positiveIds(
				read(),
				"--release-corrected-status-ids",
			);
		} else if (arg === "--reason" || arg.startsWith("--reason="))
			options.reason = read();
		else throw new Error(`Unknown argument: ${arg}`);
	}
	if (options.apply && !options.confirmReview) {
		throw new Error("--apply requires --confirm-review.");
	}
	if (options.releaseDecision && !options.reason?.trim()) {
		throw new Error("Lifecycle review release requires --reason.");
	}
	return options;
}

export function assertLocalSalesHandoffRepairDatabase(databaseUrl: string) {
	const hostname = new URL(databaseUrl).hostname;
	if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
		throw new Error(
			"Sales Handoff source repair is restricted to a local database.",
		);
	}
}

function cell(value: unknown) {
	return String(value ?? "")
		.replaceAll("|", "\\|")
		.replaceAll("\n", " ");
}

export function renderSalesHandoffSourceRepairMarkdown(
	report: SalesHandoffSourceRepairReport,
) {
	return [
		"# Sales Handoff source repair",
		"",
		`- Mode: ${report.mode}`,
		`- Scanned: ${report.scanned}`,
		`- Planned: ${report.planned}`,
		`- Repaired: ${report.repaired}`,
		`- Quarantined: ${report.quarantined}`,
		`- Unresolved: ${report.unresolved}`,
		`- Failed: ${report.failed}`,
		`- Halt reason: ${report.haltReason ?? "none"}`,
		`- Next cursor: ${report.nextCursor ?? "none"}`,
		`- Mapping review: ${report.mappingReview.length}`,
		"",
		"| Order | Category | Status | Lifecycle review | Evidence |",
		"| ---: | --- | --- | --- | --- |",
		...report.results.map(
			(result) =>
				`| ${result.salesOrderId} | ${result.category} | ${result.status} | ${result.lifecycleReviewRequired ? "yes" : "no"} | ${cell(result.reason)} ${cell(JSON.stringify({ before: result.beforeEvidence, after: result.afterEvidence }))} |`,
		),
		...(report.mappingReview.length
			? [
					"",
					"## Deterministic inventory mapping review",
					"",
					...report.mappingReview.map(
						(item) =>
							`- ${item.salesOrderId} (${item.markerId}): ${item.reason}`,
					),
				]
			: []),
	].join("\n");
}

async function main() {
	const options = parseSalesHandoffSourceRepairArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	assertLocalSalesHandoffRepairDatabase(process.env.DATABASE_URL);
	const [{ db }, repair] = await Promise.all([
		import("../packages/db/src/index.ts"),
		import("../packages/sales/src/sales-handoff/source-repair"),
	]);
	try {
		const report = options.releaseDecision
			? await repair.releaseSalesHandoffLifecycleReviews(db, {
					apply: options.apply,
					confirmReview: options.confirmReview,
					actorUserId: 1,
					salesOrderIds: options.releaseSalesOrderIds ?? [],
					decision: options.releaseDecision,
					reason: options.reason ?? "",
				})
			: await repair.runSalesHandoffSourceRepair(db, {
					apply: options.apply,
					confirmReview: options.confirmReview,
					actorUserId: 1,
					category: options.category,
					cursor: options.cursor,
					limit: options.limit,
					salesOrderIds: options.salesOrderIds ?? undefined,
				});
		console.log(
			options.json
				? JSON.stringify(report, null, 2)
				: "repaired" in report
					? renderSalesHandoffSourceRepairMarkdown(report)
					: [
							"# Sales Handoff lifecycle review release",
							"",
							`- Mode: ${report.mode}`,
							`- Scanned: ${report.scanned}`,
							`- Planned: ${report.planned}`,
							`- Released: ${report.released}`,
							`- Failed: ${report.failed}`,
							"",
							...report.results.map(
								(result) =>
									`- ${result.salesOrderId}: ${result.status}${result.reason ? ` — ${result.reason}` : ""}`,
							),
						].join("\n"),
		);
	} finally {
		await db.$disconnect();
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
}
