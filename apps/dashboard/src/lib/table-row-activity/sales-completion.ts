import type { RowActivityDescriptor } from "./mutation";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

export function salesCompletionActivity(
	ownerId: string,
	milestone: "PRODUCTION_COMPLETED" | "FULFILLMENT_COMPLETED",
	options: { batch?: boolean; cancel?: boolean } = {},
): RowActivityDescriptor {
	const subject =
		milestone === "PRODUCTION_COMPLETED" ? "Production" : "Fulfillment";
	return {
		ownerId,
		tableId: "sales-orders",
		describe(variables) {
			const input = asRecord(variables);
			const ids =
				options.batch && Array.isArray(input.salesOrderIds)
					? input.salesOrderIds
					: [input.salesOrderId];
			const entityIds = [
				...new Set(
					ids.filter(
						(id): id is number =>
							typeof id === "number" && Number.isSafeInteger(id),
					),
				),
			];
			return {
				entityIds,
				label: options.cancel
					? `Cancelling ${subject.toLowerCase()} status`
					: `Updating ${subject.toLowerCase()} status`,
				resolve(data) {
					const result = asRecord(data);
					const record = asRecord(result.record);
					const items = Array.isArray(result.items) ? result.items : [];
					return entityIds.map((entityId) => {
						const matches = items.filter(
							(item) => asRecord(item).salesOrderId === entityId,
						);
						const status =
							matches.length === 1 ? asRecord(matches[0]).status : undefined;
						const committed = options.batch
							? status === "completed"
							: result.idempotentReplay === false &&
								record.salesOrderId === entityId &&
								record.milestone === milestone &&
								record.completionMethod === "STATUS_ONLY" &&
								record.state === (options.cancel ? "CANCELLED" : "ACTIVE");
						const failed = options.batch && status === "failed";
						return {
							entityId,
							phase: committed ? "success" : failed ? "error" : "unknown",
							label: committed
								? `${subject} status ${options.cancel ? "cancelled" : "updated"}`
								: failed
									? "Status update failed"
									: "Check status result",
						};
					});
				},
			};
		},
	};
}
