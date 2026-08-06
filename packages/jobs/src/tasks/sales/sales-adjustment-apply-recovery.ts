export const SALES_ADJUSTMENT_APPLY_LEASE_MS = 3 * 60 * 1000;

type ApplyClaimStore = {
	updateMany(input: {
		where: { id: string; status: "APPLYING"; updatedAt: Date };
		data: {
			status: "APPLYING";
			failureCode: string;
			failureMessage: null;
			failedAt: null;
		};
	}): Promise<{ count: number }>;
};

export async function claimExpiredSalesAdjustmentApply(
	store: ApplyClaimStore,
	input: { adjustmentId: string; observedUpdatedAt: Date },
) {
	return store.updateMany({
		where: {
			id: input.adjustmentId,
			status: "APPLYING",
			updatedAt: input.observedUpdatedAt,
		},
		data: {
			status: "APPLYING",
			failureCode: "STALE_APPLY_LEASE_RECOVERED",
			failureMessage: null,
			failedAt: null,
		},
	});
}

export function getCommittedSalesAdjustmentCheckpoint(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) return null;
	const checkpoint = (value as Record<string, unknown>).applyCheckpoint;
	if (
		!checkpoint ||
		typeof checkpoint !== "object" ||
		Array.isArray(checkpoint)
	)
		return null;
	const record = checkpoint as Record<string, unknown>;
	return record.stage === "COMMERCIAL_COMMITTED" ? record : null;
}

export function resolveSalesAdjustmentApplyRecovery(input: {
	status?: string | null;
	updatedAt?: Date | null;
	now?: Date;
}) {
	if (input.status !== "APPLYING" || !input.updatedAt) {
		return { action: "none" as const, recoverAt: null };
	}
	const recoverAt = new Date(
		input.updatedAt.getTime() + SALES_ADJUSTMENT_APPLY_LEASE_MS,
	);
	return {
		action:
			recoverAt.getTime() <= (input.now ?? new Date()).getTime()
				? ("takeover" as const)
				: ("schedule" as const),
		recoverAt,
	};
}
