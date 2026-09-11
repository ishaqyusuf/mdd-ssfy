import { createHash } from "node:crypto";
import { z } from "zod";
import { fulfillmentAssignmentScopeSchema } from "./fulfillment-assignment-scope";
import type { projectFulfillmentQuantities } from "./fulfillment-quantities";

const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		const date = new Date(`${value}T00:00:00.000Z`);
		return (
			!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
		);
	}, "Expected a valid fulfillment date");

export const createFulfillmentAssignmentSchema = z
	.object({
		requestId: z.string().uuid(),
		salesId: z.number().int().positive(),
		expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
		driverId: z.number().int().positive().nullable(),
		dueDate: dateSchema.nullable(),
		deliveryMode: z.enum(["delivery", "pickup"]),
		selectionMode: z.enum(["all_remaining", "selected"]),
		lines: fulfillmentAssignmentScopeSchema.shape.lines.default([]),
	})
	.strict()
	.superRefine((input, ctx) => {
		if (input.deliveryMode === "pickup" && input.driverId !== null)
			ctx.addIssue({
				code: "custom",
				path: ["driverId"],
				message: "Pickup cannot be assigned to a delivery driver.",
			});
		if (input.selectionMode === "selected" && !input.lines.length)
			ctx.addIssue({
				code: "custom",
				path: ["lines"],
				message: "Select at least one item.",
			});
	});
export type CreateFulfillmentAssignmentInput = z.infer<
	typeof createFulfillmentAssignmentSchema
>;

// Preserve creation refinements when adding the paired fulfillment identity.
export const updateFulfillmentAssignmentSchema =
	createFulfillmentAssignmentSchema.safeExtend({
		fulfillmentId: z.number().int().positive(),
	});
export type UpdateFulfillmentAssignmentInput = z.infer<
	typeof updateFulfillmentAssignmentSchema
>;

/** The same evidence revision is returned by form loading and checked inside the order lock. */
export function fulfillmentAssignmentRevision(input: {
	salesId: number;
	projection: ReturnType<typeof projectFulfillmentQuantities>;
	/** Include persisted revision-bearing headers to detect edits even when aggregate quantities match. */
	fulfillments: Array<{ id: number; status: string | null; meta: unknown }>;
}) {
	const lines = input.projection.lines
		.map((line) => ({
			uid: line.uid,
			ordered: line.ordered,
			packed: line.packed,
			delivered: line.delivered,
			assigned: line.assigned,
			available: line.availableToAssign,
		}))
		.sort((a, b) => a.uid.localeCompare(b.uid));
	const fulfillments = [...input.fulfillments].sort((a, b) => a.id - b.id);
	return createHash("sha256")
		.update(
			stableJson({
				salesId: input.salesId,
				resolved: input.projection.resolved,
				lines,
				fulfillments,
			}),
		)
		.digest("hex");
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object")
		return JSON.stringify(value) ?? "null";
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
		.join(",")}}`;
}

/** A reused request must represent the same command; line ordering is not meaningful. */
export function fulfillmentAssignmentFingerprint(
	input: CreateFulfillmentAssignmentInput,
) {
	const { requestId: _requestId, ...command } = input;
	return createHash("sha256")
		.update(
			stableJson({
				...command,
				lines:
					input.selectionMode === "all_remaining"
						? []
						: [...input.lines].sort((a, b) => a.uid.localeCompare(b.uid)),
			}),
		)
		.digest("hex");
}
