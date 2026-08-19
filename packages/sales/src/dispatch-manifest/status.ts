export const dispatchWorkspaceStages = [
	"ready_to_assign",
	"assigned",
	"packing",
	"packing_blocked",
	"ready_to_load",
	"in_transit",
	"fulfilled",
	"cancelled",
] as const;

export type DispatchWorkspaceStage = (typeof dispatchWorkspaceStages)[number];

export type DispatchLifecycleInput = {
	status?: string | null;
	driverId?: number | null;
	packedTotal?: number | null;
	pendingPackingTotal?: number | null;
	inventoryConsumed?: boolean;
	proofCompleted?: boolean;
};

export type DispatchLifecycleProjection = {
	stage: DispatchWorkspaceStage;
	label: string;
	isActive: boolean;
	isTerminal: boolean;
	isPackingReady: boolean;
	canAssign: boolean;
	canOpenPacking: boolean;
	canStartTrip: boolean;
	canComplete: boolean;
};

const stageLabels: Record<DispatchWorkspaceStage, string> = {
	ready_to_assign: "Ready to assign",
	assigned: "Assigned",
	packing: "Packing",
	packing_blocked: "Packing blocked",
	ready_to_load: "Ready to load",
	in_transit: "In transit",
	fulfilled: "Fulfilled",
	cancelled: "Cancelled",
};

export function getDispatchWorkspaceStageLabel(stage: DispatchWorkspaceStage) {
	return stageLabels[stage];
}

function normalizeStatus(value: string | null | undefined) {
	return String(value || "queue")
		.trim()
		.toLowerCase();
}

export function projectDispatchLifecycle(
	input: DispatchLifecycleInput,
): DispatchLifecycleProjection {
	const status = normalizeStatus(input.status);
	const packedTotal = Math.max(0, Number(input.packedTotal || 0));
	const pendingPackingTotal = Math.max(
		0,
		Number(input.pendingPackingTotal || 0),
	);
	const packingReady =
		status === "packed" ||
		status === "in progress" ||
		status === "completed" ||
		(packedTotal > 0 && pendingPackingTotal === 0);

	let stage: DispatchWorkspaceStage;
	if (status === "cancelled" || status === "canceled") {
		stage = "cancelled";
	} else if (status === "completed") {
		stage = "fulfilled";
	} else if (status === "in progress") {
		stage = "in_transit";
	} else if (status === "packed" || packingReady) {
		stage = "ready_to_load";
	} else if (status === "missing items") {
		stage = "packing_blocked";
	} else if (status === "packing queue") {
		stage = "packing";
	} else if (input.driverId) {
		stage = "assigned";
	} else {
		stage = "ready_to_assign";
	}

	const isTerminal = stage === "fulfilled" || stage === "cancelled";
	return {
		stage,
		label: getDispatchWorkspaceStageLabel(stage),
		isActive: !isTerminal,
		isTerminal,
		isPackingReady: packingReady,
		canAssign: !isTerminal && stage !== "in_transit",
		canOpenPacking:
			stage === "ready_to_assign" ||
			stage === "assigned" ||
			stage === "packing" ||
			stage === "packing_blocked",
		canStartTrip: stage === "ready_to_load" && Boolean(input.driverId),
		canComplete: stage === "in_transit",
	};
}

export function isDispatchStageMatch(
	stage: DispatchWorkspaceStage,
	filters: readonly DispatchWorkspaceStage[] | null | undefined,
) {
	return !filters?.length || filters.includes(stage);
}
