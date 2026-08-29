import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";

export type DriverManifest = RouterOutputs["dispatch"]["driverManifest"];
export type DriverStop = DriverManifest["queue"]["data"][number];
export type DriverManifestInput = Exclude<
	RouterInputs["dispatch"]["driverManifest"],
	void
>;
export type DriverView = "today" | "all" | "exceptions" | "completed";
export type DriverDueBucket =
	| "overdue"
	| "today"
	| "tomorrow"
	| "upcoming"
	| "unscheduled";

export type DriverPrimaryAction =
	| { kind: "pack"; label: "Pack items" }
	| { kind: "blocked"; label: string }
	| { kind: "start"; label: "Start trip" }
	| { kind: "proof"; label: "Complete with proof" }
	| { kind: "completed"; label: "Delivery completed" }
	| { kind: "cancelled"; label: "Stop cancelled" };

export function getDriverPrimaryAction(input: {
	stage?: string | null;
	packed: number;
	total: number;
	canEditPacking: boolean;
	canStartTrip: boolean;
	canComplete: boolean;
	startTripBlockers?: readonly string[];
	packingBlockers?: readonly string[];
	readinessState?: string | null;
}): DriverPrimaryAction {
	const stage = String(input.stage || "queue").toLowerCase();
	if (["cancelled", "canceled"].includes(stage)) {
		return { kind: "cancelled", label: "Stop cancelled" };
	}
	if (["completed", "delivered"].includes(stage)) {
		return { kind: "completed", label: "Delivery completed" };
	}
	if (input.canComplete) {
		return { kind: "proof", label: "Complete with proof" };
	}
	if (input.canStartTrip) {
		return { kind: "start", label: "Start trip" };
	}

	const total = Math.max(0, Number(input.total || 0));
	const packed = Math.max(0, Number(input.packed || 0));
	const packingComplete = total > 0 && packed >= total;
	if (!packingComplete && total > 0 && input.canEditPacking) {
		return { kind: "pack", label: "Pack items" };
	}

	const readinessState = String(input.readinessState || "").toLowerCase();
	const blockers = new Set([
		...(input.startTripBlockers || []),
		...(input.packingBlockers || []),
	]);
	if (blockers.has("PACKING_REVIEW_PENDING")) {
		return { kind: "blocked", label: "Packing review pending" };
	}
	if (readinessState.includes("inventory")) {
		return { kind: "blocked", label: "Inventory review required" };
	}
	if (total === 0 || readinessState.includes("missing")) {
		return { kind: "blocked", label: "Manifest review required" };
	}
	if (blockers.has("NOT_ASSIGNED")) {
		return { kind: "blocked", label: "Driver assignment required" };
	}
	if (blockers.has("PACKING_PERMISSION_REQUIRED")) {
		return { kind: "blocked", label: "Packing access required" };
	}
	return { kind: "blocked", label: "Departure review required" };
}

export function getDriverNextCursor(page: DriverManifest) {
	const cursor = (page.queue.meta as { cursor?: unknown } | null)?.cursor;
	return typeof cursor === "string" && cursor ? cursor : undefined;
}

export function getDriverManifestInput(input: {
	view: DriverView;
	search?: string | null;
}): DriverManifestInput {
	const common = {
		q: input.search?.trim() || undefined,
		size: 50,
	};

	if (input.view === "today") {
		return { ...common, dueBuckets: ["overdue", "today"] };
	}
	if (input.view === "exceptions") {
		return { ...common, risks: ["open_exception"] };
	}
	if (input.view === "completed") {
		return { ...common, statuses: ["completed"] };
	}

	return { ...common, tab: "all" };
}

export function getDriverStopCustomer(stop: DriverStop) {
	return (
		stop.order?.shippingAddress?.name ||
		stop.order?.customer?.businessName ||
		stop.order?.customer?.name ||
		"Unknown customer"
	);
}

export function getDriverStopAddress(stop: DriverStop) {
	const address = stop.order?.shippingAddress as Record<string, unknown> | null;
	return [
		address?.address1,
		address?.address2,
		address?.city,
		address?.state,
		address?.country,
	]
		.map((value) => String(value || "").trim())
		.filter(Boolean)
		.join(", ");
}

export function getDriverStopPhone(stop: DriverStop) {
	const address = stop.order?.shippingAddress as Record<string, unknown> | null;
	return String(address?.phoneNo || stop.order?.customer?.phoneNo || "").trim();
}

export function getDriverStopAction(stop: DriverStop) {
	if (stop.status === "in progress") return "Complete delivery";
	if (stop.status === "completed") return "View proof";
	return "Review stop";
}

export function getDriverStopLabel(stop: DriverStop) {
	if (stop.status === "packed" || stop.workspace?.stage === "ready_to_load") {
		return "Packed";
	}
	return stop.workspace?.label || stop.status;
}

export function isDriverStopBlocked(stop: DriverStop) {
	return Boolean(
		stop.workspace?.risks?.some((risk) =>
			["missing_items", "open_exception"].includes(risk),
		),
	);
}

export function buildDriverStopSections<
	T extends { dueBucket?: DriverDueBucket | null },
>(stops: readonly T[]) {
	const definitions = [
		{ title: "Overdue", buckets: ["overdue"] },
		{ title: "Due today", buckets: ["today"] },
		{ title: "Upcoming", buckets: ["tomorrow", "upcoming"] },
		{ title: "Needs scheduling", buckets: ["unscheduled"] },
	] as const;

	return definitions
		.map((definition) => ({
			title: definition.title,
			stops: stops.filter((stop) =>
				definition.buckets.some((bucket) => bucket === stop.dueBucket),
			),
		}))
		.filter((section) => section.stops.length > 0);
}

export function getStopReadiness(stop: DriverStop) {
	const control = stop.statistic as
		| {
				packed?: { total?: number };
				pendingPacking?: { total?: number };
		  }
		| null
		| undefined;
	const packed = Number(control?.packed?.total || 0);
	const pending = Number(control?.pendingPacking?.total || 0);
	const total = Math.max(packed + pending, packed);

	return {
		packed,
		total,
		percent: total > 0 ? Math.round((packed / total) * 100) : 0,
	};
}
