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
