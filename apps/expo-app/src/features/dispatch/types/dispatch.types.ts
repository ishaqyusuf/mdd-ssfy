import type { RouterOutputs } from "@api/trpc/routers/_app";

export type DispatchStatus =
	| "queue"
	| "packed"
	| "in progress"
	| "completed"
	| "cancelled";

export type DispatchListResponse =
	RouterOutputs["dispatch"]["assignedDispatch"];
export type DispatchListItem = DispatchListResponse["data"][number];

export type PackingListTab = "current" | "completed" | "cancelled";
export type PackingListItem = RouterOutputs["dispatch"]["packingList"][number];

export type DispatchOverview = RouterOutputs["dispatch"]["dispatchOverviewV2"];
export type DispatchOverviewItem = DispatchOverview["dispatchItems"][number];
export type DispatchPackingHistoryItem =
	DispatchOverviewItem["packingHistory"][number];

export type QtyMatrix = {
	qty?: number | null;
	lh?: number | null;
	rh?: number | null;
};

export type DispatchDeliverable = {
	submissionId: number;
	qty: QtyMatrix;
};
