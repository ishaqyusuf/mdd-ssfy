export function getSalesProductionAssignedToLabel({
	assignedTo,
	totalAssigned,
}: {
	assignedTo?: string | null;
	totalAssigned?: number | null;
}) {
	if (assignedTo?.trim()) return assignedTo;

	return Number(totalAssigned || 0) > 0 ? "Worker not assigned" : "Unassigned";
}
