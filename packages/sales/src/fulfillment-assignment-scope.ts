import { z } from "zod";
import {
	projectFulfillmentQuantities,
	type FulfillmentQuantity,
	type FulfillmentQuantityDelivery,
	type FulfillmentQuantityLine,
} from "./fulfillment-quantities";

const quantitySchema = z.object({
	qty: z.number().int().nonnegative().safe(),
	lh: z.number().int().nonnegative().safe(),
	rh: z.number().int().nonnegative().safe(),
}).strict().refine((q) => q.qty === 0 || q.lh + q.rh === 0, "Scalar and handed quantities cannot overlap");

/** Stored in OrderDelivery.meta; never materialized as physical packing rows. */
export const fulfillmentAssignmentScopeSchema = z.object({
	version: z.literal(1),
	revision: z.number().int().positive().safe(),
	selectionMode: z.enum(["all_remaining", "selected"]),
	lines: z.array(z.object({ uid: z.string().min(1), quantity: quantitySchema }).strict()),
}).strict().superRefine((scope, ctx) => {
	const seen = new Set<string>();
	for (const [index, line] of scope.lines.entries()) {
		if (seen.has(line.uid)) ctx.addIssue({ code: "custom", path: ["lines", index, "uid"], message: "Duplicate sales control UID" });
		seen.add(line.uid);
	}
});
export type FulfillmentAssignmentScope = z.infer<typeof fulfillmentAssignmentScopeSchema>;
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function readFulfillmentAssignmentScope(meta: unknown) {
	const value = record(meta).fulfillmentAssignment;
	if (value === undefined || value === null) return { state: "legacy" as const, scope: null };
	const parsed = fulfillmentAssignmentScopeSchema.safeParse(value);
	return parsed.success ? { state: "resolved" as const, scope: parsed.data } : { state: "invalid" as const, scope: null };
}

export type PersistedFulfillmentQuantityDelivery = {
	id: number;
	status: string | null;
	meta: unknown;
	deletedAt?: Date | null;
	/** Physical rows must already have unambiguous line identity and inventory-unit conversion. */
	packed: Array<{ uid: string; quantity: FulfillmentQuantity }>;
	proofCompleted: boolean;
	inventoryCommitted: boolean;
};

export function projectPersistedFulfillmentQuantities(input: {
	lines: FulfillmentQuantityLine[];
	deliveries: PersistedFulfillmentQuantityDelivery[];
	excludeDeliveryId?: number;
}) {
	const sourceConflicts: Array<{ code: string; deliveryId: number }> = [];
	const deliveries: FulfillmentQuantityDelivery[] = input.deliveries.filter((row) => !row.deletedAt).map((row) => {
		const status = row.status?.trim().toLowerCase();
		const cancelled = status === "cancelled" || status === "canceled";
		const terminal = status === "completed" || status === "delivered";
		const scope = readFulfillmentAssignmentScope(row.meta);
		if (!cancelled && scope.state === "invalid") sourceConflicts.push({ code: "INVALID_ASSIGNMENT_SCOPE", deliveryId: row.id });
		const proven = terminal && row.proofCompleted && row.inventoryCommitted;
		if (!cancelled && terminal && !proven) sourceConflicts.push({ code: "COMPLETION_EVIDENCE_INCOMPLETE", deliveryId: row.id });
		return {
			id: row.id,
			state: cancelled ? "cancelled" : proven ? "completed" : "active",
			planned: scope.scope?.lines ?? null,
			packed: row.packed,
			delivered: proven ? row.packed : [],
		};
	});
	return projectFulfillmentQuantities({ ...input, deliveries, sourceConflicts });
}
