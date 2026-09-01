#!/usr/bin/env bun

import { evaluateSalesDocumentReadiness } from "../packages/sales/src/document-readiness/evaluator";

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const DEFAULT_LIMIT = 20;
const DEFAULT_REFERENCE_SALES_ORDER_ID = 23288;

type Options = {
	limit: number;
	referenceSalesOrderId: number | null;
};

function parseArgs(argv: string[]): Options {
	const options: Options = {
		limit: DEFAULT_LIMIT,
		referenceSalesOrderId: DEFAULT_REFERENCE_SALES_ORDER_ID,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index];
		if (argument === "--limit") {
			options.limit = Number(argv[index + 1]);
			index += 1;
		} else if (argument?.startsWith("--limit=")) {
			options.limit = Number(argument.slice("--limit=".length));
		} else if (argument === "--reference-sales-order-id") {
			options.referenceSalesOrderId = Number(argv[index + 1]) || null;
			index += 1;
		} else if (argument?.startsWith("--reference-sales-order-id=")) {
			options.referenceSalesOrderId =
				Number(argument.slice("--reference-sales-order-id=".length)) || null;
		} else if (argument === "--no-reference") {
			options.referenceSalesOrderId = null;
		} else {
			throw new Error(`Unknown argument: ${argument}`);
		}
	}
	if (
		!Number.isInteger(options.limit) ||
		options.limit < 10 ||
		options.limit > 20
	) {
		throw new Error("--limit must be an integer from 10 through 20.");
	}
	return options;
}

const readinessSelect = {
	id: true,
	orderId: true,
	type: true,
	createdAt: true,
	updatedAt: true,
	meta: true,
	subTotal: true,
	tax: true,
	grandTotal: true,
	amountDue: true,
	items: {
		where: { deletedAt: null },
		select: {
			id: true,
			qty: true,
			total: true,
			formSteps: {
				where: { deletedAt: null },
				select: {
					id: true,
					stepId: true,
					componentId: true,
					prodUid: true,
					value: true,
				},
			},
			housePackageTool: {
				where: { deletedAt: null },
				select: {
					id: true,
					totalDoors: true,
					totalPrice: true,
					doors: {
						where: { deletedAt: null },
						orderBy: { id: "asc" as const },
						select: {
							id: true,
							totalQty: true,
							lhQty: true,
							rhQty: true,
							unitPrice: true,
							lineTotal: true,
						},
					},
				},
			},
		},
	},
} as const;

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	const { db } = await import("../packages/db/src/index.ts");
	try {
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);
		const reference = options.referenceSalesOrderId
			? await db.salesOrders.findFirst({
					where: {
						id: options.referenceSalesOrderId,
						deletedAt: null,
					},
					select: readinessSelect,
				})
			: null;
		const remaining = await db.salesOrders.findMany({
			where: {
				deletedAt: null,
				createdAt: { lt: startOfToday },
				...(reference ? { id: { not: reference.id } } : {}),
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: options.limit - (reference ? 1 : 0),
			select: readinessSelect,
		});
		const orders = reference ? [reference, ...remaining] : remaining;
		const results = orders.map((order) => {
			const evaluation = evaluateSalesDocumentReadiness(order);
			return {
				salesOrderId: order.id,
				orderNo: order.orderId,
				createdAt: order.createdAt.toISOString(),
				status: evaluation.status,
				operationCount: evaluation.operations.length,
				findingKinds: evaluation.findings.map((finding) => finding.kind),
				savedSubtotal: evaluation.financial.saved.subTotalCents,
				candidateSubtotal: evaluation.financial.candidate.subTotalCents,
				subtotalDelta: evaluation.financial.subTotalDeltaCents,
			};
		});
		const statusCounts: Record<string, number> = {};
		for (const result of results) {
			statusCounts[result.status] = (statusCounts[result.status] || 0) + 1;
		}
		console.log(
			JSON.stringify(
				{
					generatedAt: new Date().toISOString(),
					readOnly: true,
					requestedCount: options.limit,
					evaluatedCount: results.length,
					referenceSalesOrderId: reference?.id ?? null,
					statusCounts,
					orders: results,
				},
				null,
				2,
			),
		);
	} finally {
		await db.$disconnect();
	}
}

await main();
