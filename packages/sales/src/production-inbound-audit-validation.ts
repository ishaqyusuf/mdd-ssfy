import { z } from "zod";
import { AppError } from "@gnd/errors";
import {
	receiptEvidenceFingerprint,
	type ProductionReceiptAuditScope,
	type ProductionReceiptState,
} from "./production-inbound-audit";

const row = z
	.object({ id: z.union([z.number().int().positive(), z.string().min(1)]) })
	.passthrough();
const rows = z.array(row).max(500);
const state = z
	.object({
		order: row,
		shipment: row,
		items: rows,
		components: rows,
		demands: rows,
		allocations: rows,
		stocks: rows,
		movements: rows,
		reviews: rows,
		assignments: rows,
		submissions: rows,
		payroll: rows,
		payments: rows,
		completions: rows,
		stockCommitments: rows,
		dispatches: rows,
		packingReports: rows,
	})
	.strict();
const mutable: Record<string, string[]> = {
	order: ["inventoryStatus", "updatedAt"],
	shipment: ["status", "receivedAt", "progress", "updatedAt"],
	items: ["qtyGood", "qtyIssue", "unitPrice", "updatedAt"],
	components: ["qtyAllocated", "qtyInbound", "qtyReceived", "status"],
	demands: ["qtyReceived", "status", "notes", "updatedAt"],
	allocations: ["qty", "status", "notes", "updatedAt", "deletedAt"],
	stocks: ["qty", "price", "updatedAt", "deletedAt"],
	reviews: [
		"status",
		"reviewedById",
		"reviewedAt",
		"decisionNote",
		"materialRevision",
		"resolution",
		"assignmentScope",
		"updatedAt",
	],
	payroll: ["amount", "deletedAt", "updatedAt"],
	payments: [
		"reviewStatus",
		"reviewedAt",
		"reviewedById",
		"reviewMethod",
		"reviewedByAction",
		"reviewNote",
		"updatedAt",
	],
};
const mayCreate = new Set([
	"allocations",
	"stocks",
	"movements",
	"payroll",
	"completions",
]);
const quantities = new Set([
	"qty",
	"qtyGood",
	"qtyIssue",
	"qtyReceived",
	"qtyAllocated",
	"qtyInbound",
	"amount",
	"price",
	"unitPrice",
	"progress",
]);
function refuse(): never {
	throw new AppError({
		code: "CONFLICT",
		publicMessage:
			"This receipt has incomplete or inconsistent reversal evidence. Open Inventory for review.",
	});
}

/** Validate both the versioned structure and immutable ownership before any write. */
export function validateProductionReceiptBefore(
	input: unknown,
	current: ProductionReceiptState,
	scope: ProductionReceiptAuditScope,
) {
	const parsed = state.safeParse(input);
	if (!parsed.success) refuse();
	const before = parsed.data;
	if (
		before.order.id !== scope.salesOrderId ||
		before.shipment.id !== scope.inboundId
	)
		refuse();
	const after = JSON.parse(JSON.stringify(current)) as z.infer<typeof state>;
	for (const group of Object.keys(before) as Array<keyof typeof before>) {
		const previous = Array.isArray(before[group])
			? before[group]
			: [before[group]];
		const next = Array.isArray(after[group]) ? after[group] : [after[group]];
		const previousIds = new Set(previous.map((record) => record.id));
		if (previousIds.size !== previous.length) refuse();
		if (!mayCreate.has(group) && previous.length !== next.length) refuse();
		for (const record of previous) {
			const committed = next.find((candidate) => candidate.id === record.id);
			if (
				!committed ||
				receiptEvidenceFingerprint(Object.keys(record).sort()) !==
					receiptEvidenceFingerprint(Object.keys(committed).sort())
			)
				refuse();
			if (group === "items") {
				const total =
					Number(record.qtyGood ?? 0) + Number(record.qtyIssue ?? 0);
				if (
					total > Number(record.qty) ||
					Number(record.qtyGood ?? 0) > Number(committed.qtyGood ?? 0) ||
					Number(record.qtyIssue ?? 0) > Number(committed.qtyIssue ?? 0)
				)
					refuse();
			}
			if (
				group === "demands" &&
				(Number(record.qtyReceived ?? 0) > Number(record.qty) ||
					Number(record.qtyReceived ?? 0) > Number(committed.qtyReceived ?? 0))
			)
				refuse();
			if (group === "stocks" && Number(record.qty) > Number(committed.qty))
				refuse();
			for (const [key, value] of Object.entries(record)) {
				if (
					key === "qty" &&
					["stocks", "items", "allocations", "demands"].includes(group) &&
					typeof value !== "number"
				)
					refuse();
				if (
					quantities.has(key) &&
					value !== null &&
					(typeof value !== "number" || !Number.isFinite(value) || value < 0)
				)
					refuse();
				if (
					value === null &&
					["amount", "qtyAllocated", "qtyInbound", "qtyReceived"].includes(
						key,
					) &&
					committed[key] !== null &&
					group !== "demands"
				)
					refuse();
				if (
					key.endsWith("At") &&
					value !== null &&
					(typeof value !== "string" ||
						!z.string().datetime().safeParse(value).success)
				)
					refuse();
				if (
					!(mutable[group] ?? []).includes(key) &&
					receiptEvidenceFingerprint(value) !==
						receiptEvidenceFingerprint(committed[key])
				)
					refuse();
			}
		}
	}
	return before;
}
