import type { RowActivityOutcome } from "@/store/table-row-activity";

type SalesRowOutcome = RowActivityOutcome & { entityId: number };

/** Task transport completion alone is never evidence of a sale's success. */
export function resolveSalesTaskRowOutcomes(
	salesIds: readonly number[],
	output: unknown,
): SalesRowOutcome[] {
	const outcomes =
		output &&
		typeof output === "object" &&
		"outcomes" in output &&
		Array.isArray(output.outcomes)
			? output.outcomes
			: [];
	return [...new Set(salesIds)].map((entityId) => {
		const matches = outcomes.filter(
			(item) => item && typeof item === "object" && item.salesId === entityId,
		);
		const status = matches.length === 1 ? matches[0].status : undefined;
		switch (status) {
			case "succeeded":
				return { entityId, phase: "success", label: "Completed" };
			case "review_required":
			case "awaiting_review":
				return { entityId, phase: "review-required", label: "Review required" };
			case "failed":
				return { entityId, phase: "error", label: "Action failed" };
			case "already_fulfilled":
			case "already_completed":
				return { entityId, phase: "unknown", label: "Already completed" };
			default:
				return { entityId, phase: "unknown", label: "Check task result" };
		}
	});
}

export function resolvePaymentReviewRowOutcomes(
	salesIds: readonly number[],
	output: unknown,
): SalesRowOutcome[] {
	const data =
		output && typeof output === "object"
			? (output as { reviewed?: unknown; skipped?: unknown })
			: {};
	const reviewed = Array.isArray(data.reviewed) ? data.reviewed : [];
	const skipped = Array.isArray(data.skipped) ? data.skipped : [];
	return [...new Set(salesIds)].map((entityId) => {
		if (reviewed.some((item) => item?.salesId === entityId))
			return { entityId, phase: "success", label: "Payment reviewed" };
		if (skipped.some((item) => item?.salesId === entityId))
			return { entityId, phase: "unknown", label: "No payment needs review" };
		return { entityId, phase: "unknown", label: "Check review result" };
	});
}

export function salesPaymentReviewActivity(
	ownerId: string,
	batch = false,
): import("./mutation").RowActivityDescriptor {
	return {
		ownerId,
		tableId: "sales-orders",
		describe(variables) {
			const input =
				variables && typeof variables === "object"
					? (variables as { salesId?: unknown; salesIds?: unknown })
					: {};
			const ids =
				batch && Array.isArray(input.salesIds)
					? input.salesIds
					: [input.salesId];
			const entityIds = ids.filter(
				(id): id is number =>
					typeof id === "number" && Number.isSafeInteger(id),
			);
			return {
				entityIds,
				label: "Reviewing payment",
				resolve: (data) =>
					batch
						? resolvePaymentReviewRowOutcomes(entityIds, data)
						: entityIds.map((entityId) => ({
								entityId,
								phase: "success",
								label: "Payment reviewed",
							})),
			};
		},
	};
}
