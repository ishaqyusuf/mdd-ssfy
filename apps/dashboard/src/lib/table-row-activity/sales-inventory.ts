import type { RowActivityDescriptor } from "./mutation";

export function salesInventoryVerificationActivity(
	ownerId: string,
): RowActivityDescriptor {
	return {
		ownerId,
		tableId: "sales-orders",
		describe(variables) {
			const id =
				variables &&
				typeof variables === "object" &&
				"salesOrderId" in variables
					? variables.salesOrderId
					: undefined;
			const entityIds =
				typeof id === "number" && Number.isSafeInteger(id) ? [id] : [];
			return {
				entityIds,
				label: "Verifying inventory",
				resolve(data) {
					const projection =
						data && typeof data === "object" && "projection" in data
							? data.projection
							: undefined;
					const status =
						projection &&
						typeof projection === "object" &&
						"status" in projection
							? projection.status
							: undefined;
					return entityIds.map((entityId) => ({
						entityId,
						phase:
							status === "ready"
								? "success"
								: status === "failed"
									? "review-required"
									: "unknown",
						label:
							status === "ready"
								? "Inventory verified"
								: status === "failed"
									? "Inventory needs review"
									: "Check inventory result",
					}));
				},
			};
		},
	};
}
