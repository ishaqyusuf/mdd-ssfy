import { z } from "zod";

const statusCopy = {
	pending: "Pending",
	awaiting_production: "Waiting for production",
	production_queued: "Waiting for production",
	in_production: "In production",
	awaiting_production_review: "Production needs review",
	ready_to_fulfill: "Ready for pickup or delivery",
	fulfillment_queued: "Waiting for pickup or delivery",
	packing: "Being packed",
	packed: "Packed",
	in_transit: "On the way",
	partially_fulfilled: "Partly delivered",
	administratively_completed: "Marked complete by your team",
	fulfilled: "Fulfilled",
	cancelled: "Cancelled",
	conflict: "Needs review",
} as const;

export const assistantOrderFindingSchema = z.object({
	kind: z.literal("order-status"),
	orderNo: z.string().trim().min(1).max(64),
	salesType: z.enum(["order", "quote"]),
	status: z.enum(Object.keys(statusCopy) as [keyof typeof statusCopy, ...(keyof typeof statusCopy)[]]),
	observedAt: z.string().datetime({ offset: true }),
}).strict();
export type AssistantOrderFinding = z.infer<typeof assistantOrderFindingSchema>;

export const assistantFindingPartSchema = z.object({
	type: z.literal("data-assistant-finding"),
	id: z.string().min(1).max(240),
	data: assistantOrderFindingSchema,
}).strict();

export function assistantFindingText(finding: AssistantOrderFinding) {
	return `${finding.salesType === "quote" ? "Quote" : "Order"} ${finding.orderNo}: ${statusCopy[finding.status]}.`;
}

/** Only successful, already-authorized native order results may create findings. */
export function assistantOrderFinding(tool: string, envelope: Record<string, unknown> | null): AssistantOrderFinding | null {
	if (!["sales_get_order_status", "sales_explain_blockers", "fulfillment_check_status"].includes(tool) || envelope?.status !== "success") return null;
	const data = envelope.data as { order?: { orderNo?: unknown; type?: unknown; status?: unknown; pipeline?: { headline?: { code?: unknown } } } } | undefined;
	const order = data?.order;
	if (!order || typeof order !== "object") return null;
	const headline = order.pipeline?.headline?.code;
	// Unknown canonical state must not become a claimed lifecycle result.
	const status = typeof headline === "string" && Object.hasOwn(statusCopy, headline)
		? headline : order.status === "pending" ? "pending" : undefined;
	const parsed = assistantOrderFindingSchema.safeParse({ kind: "order-status", orderNo: order.orderNo, salesType: order.type, status, observedAt: envelope.observedAt });
	return parsed.success ? parsed.data : null;
}
