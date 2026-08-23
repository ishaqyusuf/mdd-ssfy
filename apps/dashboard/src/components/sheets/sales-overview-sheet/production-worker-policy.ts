type ProductionReadinessLike = {
	state?: string;
	blockers?: Array<{
		salesItemId?: number | null;
	}>;
} | null;

export function shouldWarnWorkerProductionItemMaterialReview({
	itemId,
	readiness,
	readinessUnavailable,
}: {
	itemId?: number | null;
	readiness?: ProductionReadinessLike;
	readinessUnavailable?: boolean;
}) {
	if (readinessUnavailable) return true;
	if (readiness?.state !== "blocked" && readiness?.state !== "overridden") {
		return false;
	}
	if (!itemId) return true;
	return (
		readiness.blockers?.some(
			(blocker) =>
				blocker.salesItemId == null || blocker.salesItemId === itemId,
		) ?? true
	);
}

export function getWorkerProductionSubmissionProgress(item?: {
	analytics?: {
		reportedSubmitQty?: number | null;
		stats?: {
			prodAssigned?: { qty?: number | null } | null;
			prodCompleted?: { qty?: number | null } | null;
		};
	};
}) {
	const assigned = Number(item?.analytics?.stats?.prodAssigned?.qty || 0);
	const submitted = Number(
		item?.analytics?.reportedSubmitQty ??
			item?.analytics?.stats?.prodCompleted?.qty ??
			0,
	);
	return {
		assigned,
		submitted: Math.min(Math.max(submitted, 0), Math.max(assigned, 0)),
	};
}
