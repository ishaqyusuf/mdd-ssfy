#!/usr/bin/env node

import path from "node:path";
import { db, Prisma } from "../packages/db/src/index.ts";
import { buildPaymentReconciliationReport } from "../packages/sales/src/resolution-system/reports/payment-reconciliation-report.ts";

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/payment-system-reconciliation-report.mjs [--limit 200] [--json]",
			"",
			"Examples:",
			"  bun scripts/payment-system-reconciliation-report.mjs",
			"  bun scripts/payment-system-reconciliation-report.mjs --limit 500 --json",
		].join("\n"),
	);
}

function parseArgs(argv) {
	let asJson = false;
	let limit = 200;

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--json") {
			asJson = true;
			continue;
		}
		if (arg === "--limit") {
			const value = Number(argv[i + 1]);
			if (!Number.isFinite(value) || value <= 0) {
				throw new Error("Invalid value for --limit");
			}
			limit = value;
			i += 1;
			continue;
		}
		if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		}
		throw new Error(`Unknown argument: ${arg}`);
	}

	return { asJson, limit };
}

async function canonicalTablesExist() {
	const rows = await db.$queryRaw`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('PaymentProjection')
  `;
	return Array.isArray(rows) && rows.length > 0;
}

async function fetchRows(limit) {
	const orders = await db.salesOrders.findMany({
		where: {
			type: "order",
			deletedAt: null,
			amountDue: {
				gt: 0,
			},
		},
		select: {
			id: true,
			orderId: true,
			grandTotal: true,
			amountDue: true,
			payments: {
				where: {
					deletedAt: null,
					status: "success",
				},
				select: {
					amount: true,
				},
			},
		},
		orderBy: {
			updatedAt: "desc",
		},
		take: limit,
	});

	let projectionMap = new Map();
	if (await canonicalTablesExist()) {
		const ids = orders.map((order) => order.id);
		if (ids.length) {
			const rows = await db.$queryRaw(
				Prisma.sql`
          SELECT salesOrderId, totalAllocated, totalRefunded, totalVoided, amountDue, version
          FROM PaymentProjection
          WHERE salesOrderId IN (${Prisma.join(ids)})
        `,
			);
			projectionMap = new Map(
				(rows || []).map((row) => [row.salesOrderId, row]),
			);
		}
	}

	return orders.map((order) => {
		const legacyPaidAmount = order.payments.reduce(
			(sum, payment) => sum + (payment.amount || 0),
			0,
		);
		const projection = projectionMap.get(order.id);
		return {
			salesId: order.id,
			orderId: order.orderId,
			legacyGrandTotal: order.grandTotal || 0,
			legacyAmountDue: order.amountDue || 0,
			legacyPaidAmount,
			canonicalAmountDue: projection?.amountDue ?? null,
			canonicalAllocated: projection?.totalAllocated ?? null,
			canonicalRefunded: projection?.totalRefunded ?? null,
			canonicalVoided: projection?.totalVoided ?? null,
			canonicalVersion: projection?.version ?? null,
		};
	});
}

function printTextReport(report, limit) {
	console.log("Payment System Reconciliation Report");
	console.log(`generatedAt: ${new Date().toISOString()}`);
	console.log(`cwd: ${path.resolve(".")}`);
	console.log(`sampleLimit: ${limit}`);
	console.log(`totalOrders: ${report.totalOrders}`);
	console.log(`matchedOrders: ${report.matchedOrders}`);
	console.log(`mismatchedOrders: ${report.mismatchedOrders}`);
	console.log(
		`missingCanonicalProjection: ${report.missingCanonicalProjection}`,
	);
	console.log(`amountDueMismatch: ${report.amountDueMismatch}`);
	console.log(`allocationMismatch: ${report.allocationMismatch}`);

	if (!report.findings.length) {
		console.log("findings: none");
		return;
	}

	console.log("findings:");
	for (const finding of report.findings.slice(0, 50)) {
		console.log(
			`  - ${finding.orderId} (${finding.salesId}) ${finding.findingType}: legacyDue=${finding.legacyAmountDue} canonicalDue=${finding.canonicalAmountDue} legacyPaid=${finding.legacyPaidAmount} canonicalAllocated=${finding.canonicalAllocated}`,
		);
	}
}

async function main() {
	try {
		const { asJson, limit } = parseArgs(process.argv.slice(2));
		const rows = await fetchRows(limit);
		const report = buildPaymentReconciliationReport(rows);

		if (asJson) {
			console.log(JSON.stringify(report, null, 2));
			return;
		}

		printTextReport(report, limit);
	} catch (error) {
		console.error(
			`[payment-system-reconciliation-report] ${error instanceof Error ? error.message : String(error)}`,
		);
		usage();
		process.exit(1);
	} finally {
		await db.$disconnect();
	}
}

main();
