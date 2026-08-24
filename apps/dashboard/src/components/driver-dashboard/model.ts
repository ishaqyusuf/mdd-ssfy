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
	if (stop.status === "packed") return "Start trip";
	if (stop.status === "completed") return "View proof";
	return "Review stop";
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
