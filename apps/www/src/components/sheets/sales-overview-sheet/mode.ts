import type { LegacySalesOverviewMode } from "./types";

export function resolveLegacySalesOverviewMode({
	assignedTo,
	requestedMode,
	viewMode,
}: {
	assignedTo?: string | number | null;
	requestedMode?: string | null;
	viewMode?: string | null;
}): LegacySalesOverviewMode {
	if (assignedTo) return "assigned-production";
	if (requestedMode === "dispatch-modal" || viewMode === "dispatch-modal") {
		return "dispatch-modal";
	}
	return "default";
}
