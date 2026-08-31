export const driverRouteBlockerCodes = [
	"NOT_ASSIGNED",
	"TRIP_NOT_READY",
	"MANIFEST_REVIEW_REQUIRED",
	"PACKING_REVIEW_PENDING",
	"INVENTORY_REVIEW_REQUIRED",
	"DESTINATION_REQUIRED",
] as const;

export type DriverRouteBlockerCode = (typeof driverRouteBlockerCodes)[number];

export type DriverRouteCapability = {
	packingComplete: boolean;
	canStartTrip: boolean;
	nextAction: "review" | "start_trip" | "complete_proof" | "completed";
	blockers: DriverRouteBlockerCode[];
	blockerLabel: string | null;
	actionRevision: string;
	needsAttention: boolean;
};

export function isDriverRouteStartCandidate(
	capability: DriverRouteCapability | null | undefined,
) {
	return Boolean(
		capability?.canStartTrip ||
			(capability?.packingComplete &&
				capability.blockers.length > 0 &&
				capability.blockers.every(
					(blocker) => blocker === "DESTINATION_REQUIRED",
				)),
	);
}

const blockerLabels: Record<DriverRouteBlockerCode, string> = {
	NOT_ASSIGNED: "Driver assignment required",
	TRIP_NOT_READY: "Packing must be completed",
	MANIFEST_REVIEW_REQUIRED: "Manifest review required",
	PACKING_REVIEW_PENDING: "Packing review pending",
	INVENTORY_REVIEW_REQUIRED: "Inventory review required",
	DESTINATION_REQUIRED: "Destination review required",
};

export function projectDriverRouteCapability(input: {
	dispatchId: number;
	status?: string | null;
	assigned: boolean;
	manifestItemCount: number;
	hasBlockingPackingReport: boolean;
	inventoryReady: boolean;
	hasDestination: boolean;
	dueBucket?: string | null;
	hasOpenException?: boolean;
}): DriverRouteCapability {
	const status = String(input.status || "queue").toLowerCase();
	const packingComplete = status === "packed" && input.manifestItemCount > 0;
	const terminal = ["completed", "delivered", "cancelled"].includes(status);
	const inProgress = status === "in progress";
	const blockers: DriverRouteBlockerCode[] = [];

	if (!terminal && !inProgress) {
		if (!input.assigned) blockers.push("NOT_ASSIGNED");
		if (status !== "packed") blockers.push("TRIP_NOT_READY");
		if (input.manifestItemCount <= 0) {
			blockers.push("MANIFEST_REVIEW_REQUIRED");
		}
		if (input.hasBlockingPackingReport) {
			blockers.push("PACKING_REVIEW_PENDING");
		}
		if (!input.inventoryReady) {
			blockers.push("INVENTORY_REVIEW_REQUIRED");
		}
		if (!input.hasDestination) blockers.push("DESTINATION_REQUIRED");
	}

	const canStartTrip = packingComplete && blockers.length === 0;
	const nextAction = terminal
		? "completed"
		: inProgress
			? "complete_proof"
			: canStartTrip
				? "start_trip"
				: "review";
	const needsAttention =
		Boolean(input.hasOpenException) ||
		input.dueBucket === "overdue" ||
		status === "missing items" ||
		(status === "packed" && blockers.length > 0);

	return {
		packingComplete,
		canStartTrip,
		nextAction,
		blockers,
		blockerLabel: blockers[0] ? blockerLabels[blockers[0]] : null,
		actionRevision: [
			input.dispatchId,
			status,
			input.manifestItemCount,
			input.hasBlockingPackingReport ? 1 : 0,
			input.inventoryReady ? 1 : 0,
			input.hasDestination ? 1 : 0,
		].join(":"),
		needsAttention,
	};
}
