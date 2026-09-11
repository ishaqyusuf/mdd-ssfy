type FulfillmentNoticeChannel =
	| "sales_dispatch_assigned"
	| "sales_dispatch_unassigned"
	| "sales_dispatch_updated"
	| "sales_dispatch_completed";

/** Immutable notices stored with the command audit; delivery state belongs to the consumer. */
export function buildFulfillmentNotificationIntents(input: {
	requestId: string;
	salesId: number;
	fulfillmentId: number;
	actorId: number;
	driverId: number | null;
	previousDriverId?: number | null;
	changed: boolean;
	kind: "created" | "updated" | "completed";
	completedByAdmin?: boolean;
	dueDate: string | null;
	deliveryMode: "delivery" | "pickup";
}) {
	const recipients: Array<{
		recipientId: number;
		channel: FulfillmentNoticeChannel;
	}> = [];
	if (input.changed) {
		if (
			input.kind === "updated" &&
			input.previousDriverId &&
			input.previousDriverId !== input.driverId
		) {
			recipients.push({
				recipientId: input.previousDriverId,
				channel: "sales_dispatch_unassigned",
			});
		}
		if (input.driverId) {
			recipients.push({
				recipientId: input.driverId,
				channel:
					input.kind === "completed"
						? "sales_dispatch_completed"
						: input.kind === "created" || input.previousDriverId !== input.driverId
						? "sales_dispatch_assigned"
						: "sales_dispatch_updated",
			});
		}
	}
	return recipients.map(({ recipientId, channel }) => ({
		version: 1,
		eventKey: `${input.requestId}:${channel}:${recipientId}`,
		channel,
		recipientId,
		actorId: input.actorId,
		salesId: input.salesId,
		fulfillmentId: input.fulfillmentId,
		dueDate: input.dueDate,
		deliveryMode: input.deliveryMode,
		...(input.kind === "completed" ? { completedByAdmin: input.completedByAdmin ?? false } : {}),
	}));
}
