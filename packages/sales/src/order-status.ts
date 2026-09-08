import {
	SALES_PIPELINE_HEADLINE_CODES,
	SALES_PIPELINE_HEADLINE_META,
	type SalesPipelineHeadlineCode,
	type SalesPipelineSnapshot,
} from "./sales-pipeline";

/** Display copy uses the same lifecycle metadata as the standard status badges. */
export function getSalesOrderStatusPresentation(
	snapshot: SalesPipelineSnapshot | null | undefined,
) {
	const present = (status: SalesOrderLifecycleStatus, label: string) => ({
		label,
		tone: getSalesOrderLifecycleStatusTone(status),
	});
	if (!snapshot) return present("unknown", "Updating…");
	const { headline, production } = snapshot;
	if (headline.code === "conflict") return present("conflict", "Needs Review");
	if (
		production.applicability === "required" &&
		production.state === "not_assigned" &&
		["unknown", "awaiting_production"].includes(headline.code)
	) {
		return present("awaiting_production", "Not Assigned");
	}
	if (headline.code === "unknown") {
		const requirementsPending =
			snapshot.evidence.production.configuredRequirement === null &&
			snapshot.evidence.fulfillment.configuredRequirement === null;
		return present(
			"unknown",
			requirementsPending ? "Updating…" : "Needs Review",
		);
	}
	if (
		headline.code === "ready_to_fulfill" ||
		(headline.code === "fulfillment_queued" &&
			production.applicability === "not_required" &&
			snapshot.dispatch.state === "none")
	) {
		return present("ready_to_fulfill", "Ready");
	}
	return present(
		headline.code,
		getSalesOrderLifecycleStatusLabel(headline.code),
	);
}

export const SALES_ORDER_LIFECYCLE_STATUSES = SALES_PIPELINE_HEADLINE_CODES;

export type SalesOrderLifecycleStatus = SalesPipelineHeadlineCode;

export type SalesOrderLifecycleStatusTone =
	| "slate"
	| "amber"
	| "blue"
	| "violet"
	| "indigo"
	| "cyan"
	| "teal"
	| "sky"
	| "emerald"
	| "rose"
	| "stone";

export type SalesOrderLifecycleStatusMeta = {
	label: string;
	tone: SalesOrderLifecycleStatusTone;
	badgeClassName: string;
};

const STATUS_BADGE_CLASS_NAMES: Record<SalesOrderLifecycleStatus, string> = {
	awaiting_production: "bg-slate-100 text-slate-700",
	production_queued: "bg-amber-100 text-amber-700",
	in_production: "bg-blue-100 text-blue-700",
	awaiting_production_review: "bg-amber-100 text-amber-700",
	ready_to_fulfill: "bg-violet-100 text-violet-700",
	fulfillment_queued: "bg-indigo-100 text-indigo-700",
	packing: "bg-cyan-100 text-cyan-700",
	packed: "bg-teal-100 text-teal-700",
	in_transit: "bg-sky-100 text-sky-700",
	partially_fulfilled: "bg-cyan-100 text-cyan-700",
	administratively_completed: "bg-stone-100 text-stone-700",
	fulfilled: "bg-emerald-100 text-emerald-700",
	cancelled: "bg-rose-100 text-rose-700",
	conflict: "bg-rose-100 text-rose-700",
	unknown: "bg-stone-100 text-stone-700",
};

export const SALES_ORDER_LIFECYCLE_STATUS_META = Object.fromEntries(
	SALES_PIPELINE_HEADLINE_CODES.map((status) => [
		status,
		{
			...SALES_PIPELINE_HEADLINE_META[status],
			badgeClassName: STATUS_BADGE_CLASS_NAMES[status],
		},
	]),
) as Record<SalesOrderLifecycleStatus, SalesOrderLifecycleStatusMeta>;

export function getSalesOrderLifecycleStatusLabel(
	status: SalesOrderLifecycleStatus,
) {
	return SALES_PIPELINE_HEADLINE_META[status].label;
}

export function getSalesOrderLifecycleStatusTone(
	status: SalesOrderLifecycleStatus,
) {
	return SALES_PIPELINE_HEADLINE_META[status].tone;
}

export function getSalesOrderLifecycleStatusBadgeClassName(
	status: SalesOrderLifecycleStatus | string,
) {
	return (
		SALES_ORDER_LIFECYCLE_STATUS_META[status as SalesOrderLifecycleStatus]
			?.badgeClassName ??
		"border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
	);
}

/** Short labels retain their normal lifecycle badge colors on every list surface. */
export function getSalesOrderStatusBadgeClassName(
	status: SalesOrderLifecycleStatus | string,
	label: string,
) {
	const displayStatus =
		label === "Ready"
			? "ready_to_fulfill"
			: label === "Not Assigned"
				? "awaiting_production"
				: label === "Updating…"
					? "unknown"
					: status === "administratively_completed"
						? "fulfilled"
						: status;
	return getSalesOrderLifecycleStatusBadgeClassName(displayStatus);
}
