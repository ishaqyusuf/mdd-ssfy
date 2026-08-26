#!/usr/bin/env bun

import { resolveSalesTaxReportPeriod } from "../packages/sales/src/sales-tax-report";
import { resolveSalesTaxRecognitionEvidence } from "../packages/sales/src/tax-system/recognition-evidence";

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";

type Options = {
	apply: boolean;
	confirmReview: boolean;
	salesOrderIds: number[] | null;
	afterId: number | null;
	limit: number;
	from: string | null;
	to: string | null;
};

export function parseSalesTaxReconciliationArgs(argv: string[]): Options {
	const options: Options = {
		apply: false,
		confirmReview: false,
		salesOrderIds: null,
		afterId: null,
		limit: 500,
		from: null,
		to: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--apply") options.apply = true;
		else if (arg === "--confirm-review") options.confirmReview = true;
		else if (arg === "--sales-order-ids") {
			options.salesOrderIds = String(argv[index + 1] || "")
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0);
			index += 1;
		} else if (arg.startsWith("--sales-order-ids=")) {
			options.salesOrderIds = arg
				.slice("--sales-order-ids=".length)
				.split(",")
				.map(Number)
				.filter((id) => Number.isInteger(id) && id > 0);
		} else if (arg === "--after-id") {
			options.afterId = Number(argv[index + 1] || 0) || null;
			index += 1;
		} else if (arg.startsWith("--after-id=")) {
			options.afterId = Number(arg.slice("--after-id=".length)) || null;
		} else if (arg === "--limit") {
			options.limit = Math.min(5_000, Math.max(1, Number(argv[index + 1])));
			index += 1;
		} else if (arg.startsWith("--limit=")) {
			options.limit = Math.min(
				5_000,
				Math.max(1, Number(arg.slice("--limit=".length))),
			);
		} else if (arg === "--from") {
			options.from = String(argv[index + 1] || "");
			index += 1;
		} else if (arg.startsWith("--from=")) {
			options.from = arg.slice("--from=".length);
		} else if (arg === "--to") {
			options.to = String(argv[index + 1] || "");
			index += 1;
		} else if (arg.startsWith("--to=")) {
			options.to = arg.slice("--to=".length);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	if (
		options.apply &&
		(!options.confirmReview || !options.salesOrderIds?.length)
	) {
		throw new Error(
			"--apply requires --confirm-review and explicit --sales-order-ids.",
		);
	}
	if (Boolean(options.from) !== Boolean(options.to)) {
		throw new Error("--from and --to must be provided together.");
	}
	return options;
}

async function main() {
	const options = parseSalesTaxReconciliationArgs(process.argv.slice(2));
	const period =
		options.from && options.to
			? resolveSalesTaxReportPeriod({ from: options.from, to: options.to })
			: null;
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	const [{ db }, { recognizeSalesTaxForFulfilledOrder }] = await Promise.all([
		import("../packages/db/src/index.ts"),
		import("../packages/sales/src/tax-system/recognition"),
	]);

	try {
		const orders = await db.salesOrders.findMany({
			where: {
				type: "order",
				deletedAt: null,
				...(options.salesOrderIds?.length
					? { id: { in: options.salesOrderIds } }
					: options.afterId
						? { id: { gt: options.afterId } }
						: {}),
			},
			orderBy: { id: "asc" },
			take: options.salesOrderIds?.length ? undefined : options.limit,
			select: {
				id: true,
				orderId: true,
				status: true,
				deliveredAt: true,
				grandTotal: true,
				tax: true,
				salesTaxLedgerEntries: {
					where: { entryType: "SALE" },
					select: { id: true, recognizedAt: true },
					take: 1,
				},
				stat: {
					where: { type: "dispatchCompleted", deletedAt: null },
					select: { percentage: true },
				},
				pickup: { select: { id: true, pickupAt: true, deletedAt: true } },
				deliveries: {
					where: {
						deletedAt: null,
						status: { in: ["completed", "delivered"] },
						deliveredAt: { not: null },
					},
					select: { id: true, deliveryMode: true, deliveredAt: true },
				},
			},
		});

		const findings = orders.map((order) => {
			if (order.salesTaxLedgerEntries.length) {
				return {
					id: order.id,
					orderNo: order.orderId,
					status: "already_recognized" as const,
				};
			}
			const resolution = resolveSalesTaxRecognitionEvidence({
				orderId: order.id,
				status: order.status,
				dispatchCompletedPercentage: order.stat.reduce(
					(maximum, row) => Math.max(maximum, Number(row.percentage ?? 0)),
					0,
				),
				deliveredAt: order.deliveredAt,
				pickup: order.pickup,
				deliveries: order.deliveries,
			});
			if (
				resolution.status === "eligible" &&
				period &&
				(resolution.evidence.recognizedAt < period.from ||
					resolution.evidence.recognizedAt >= period.toExclusive)
			) {
				return {
					id: order.id,
					orderNo: order.orderId,
					status: "outside_period" as const,
				};
			}
			return resolution.status === "eligible"
				? {
						id: order.id,
						orderNo: order.orderId,
						status: "eligible" as const,
						recognizedAt: resolution.evidence.recognizedAt.toISOString(),
						evidence: resolution.evidence.source,
						total: Number(order.grandTotal ?? 0),
						tax: Number(order.tax ?? 0),
					}
				: {
						id: order.id,
						orderNo: order.orderId,
						status: resolution.reason,
					};
		});

		const eligible = findings.filter(
			(finding) => finding.status === "eligible",
		);
		const summary = findings.reduce<Record<string, number>>(
			(counts, finding) => {
				counts[finding.status] = (counts[finding.status] || 0) + 1;
				return counts;
			},
			{},
		);

		if (!options.apply) {
			console.log(
				JSON.stringify(
					{
						mode: "dry-run",
						period: period
							? { from: period.fromDate, to: period.toDate }
							: null,
						scanned: findings.length,
						summary,
						eligible,
						nextAfterId: orders.at(-1)?.id ?? null,
					},
					null,
					2,
				),
			);
			return;
		}

		const results = [];
		for (const finding of eligible) {
			results.push({
				id: finding.id,
				result: await recognizeSalesTaxForFulfilledOrder(db, {
					salesOrderId: finding.id,
					recognizedAt: new Date(finding.recognizedAt),
					source: "MANUAL_BACKFILL",
					reason: "Reviewed historical fulfillment evidence backfill",
				}),
			});
		}
		console.log(
			JSON.stringify(
				{ mode: "apply", requested: options.salesOrderIds, summary, results },
				null,
				2,
			),
		);
	} finally {
		await db.$disconnect();
	}
}

if (import.meta.main) {
	await main();
}
