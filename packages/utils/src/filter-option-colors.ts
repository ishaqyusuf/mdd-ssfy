export const FILTER_OPTION_COLORS = {
	slate: "#64748b",
	amber: "#d97706",
	blue: "#2563eb",
	cyan: "#0891b2",
	teal: "#0d9488",
	emerald: "#059669",
	orange: "#ea580c",
	rose: "#e11d48",
	violet: "#7c3aed",
} as const;

type FilterOptionColor =
	(typeof FILTER_OPTION_COLORS)[keyof typeof FILTER_OPTION_COLORS];

const STATUS_COLOR_BY_VALUE = new Map<string, FilterOptionColor>([
	["unknown", FILTER_OPTION_COLORS.slate],
	["draft", FILTER_OPTION_COLORS.slate],
	["open", FILTER_OPTION_COLORS.slate],
	["blank", FILTER_OPTION_COLORS.slate],
	["none", FILTER_OPTION_COLORS.slate],
	["not signed", FILTER_OPTION_COLORS.slate],
	["not assigned", FILTER_OPTION_COLORS.slate],
	["not configured", FILTER_OPTION_COLORS.slate],
	["idle", FILTER_OPTION_COLORS.slate],
	["no installation", FILTER_OPTION_COLORS.slate],
	["no submission", FILTER_OPTION_COLORS.slate],
	["unassigned", FILTER_OPTION_COLORS.slate],
	["pending", FILTER_OPTION_COLORS.amber],
	["queue", FILTER_OPTION_COLORS.amber],
	["queued", FILTER_OPTION_COLORS.amber],
	["packing queue", FILTER_OPTION_COLORS.amber],
	["awaiting", FILTER_OPTION_COLORS.amber],
	["awaiting production", FILTER_OPTION_COLORS.amber],
	["signature pending", FILTER_OPTION_COLORS.amber],
	["awaiting inbound", FILTER_OPTION_COLORS.amber],
	["unapplied", FILTER_OPTION_COLORS.amber],
	["today", FILTER_OPTION_COLORS.amber],
	["pending order", FILTER_OPTION_COLORS.amber],
	["pending delivery", FILTER_OPTION_COLORS.amber],
	["no payment", FILTER_OPTION_COLORS.amber],
	["no install cost", FILTER_OPTION_COLORS.amber],
	["production queued", FILTER_OPTION_COLORS.amber],
	["fulfillment queued", FILTER_OPTION_COLORS.amber],
	["processing", FILTER_OPTION_COLORS.amber],
	["scheduled", FILTER_OPTION_COLORS.blue],
	["assigned", FILTER_OPTION_COLORS.blue],
	["started", FILTER_OPTION_COLORS.blue],
	["in progress", FILTER_OPTION_COLORS.blue],
	["in production", FILTER_OPTION_COLORS.blue],
	["ordered", FILTER_OPTION_COLORS.blue],
	["part assigned", FILTER_OPTION_COLORS.blue],
	["packing", FILTER_OPTION_COLORS.blue],
	["tomorrow", FILTER_OPTION_COLORS.blue],
	["upcoming", FILTER_OPTION_COLORS.blue],
	["partial shipment allowed", FILTER_OPTION_COLORS.blue],
	["in transit", FILTER_OPTION_COLORS.cyan],
	["in-transit", FILTER_OPTION_COLORS.blue],
	["ready", FILTER_OPTION_COLORS.teal],
	["ready to fulfill", FILTER_OPTION_COLORS.teal],
	["ready to assign", FILTER_OPTION_COLORS.teal],
	["ready to load", FILTER_OPTION_COLORS.teal],
	["ready remaining", FILTER_OPTION_COLORS.teal],
	["ready to ship remaining", FILTER_OPTION_COLORS.teal],
	["packed", FILTER_OPTION_COLORS.teal],
	["received", FILTER_OPTION_COLORS.teal],
	["completed", FILTER_OPTION_COLORS.emerald],
	["complete", FILTER_OPTION_COLORS.emerald],
	["fulfilled", FILTER_OPTION_COLORS.emerald],
	["delivered", FILTER_OPTION_COLORS.emerald],
	["paid", FILTER_OPTION_COLORS.emerald],
	["published", FILTER_OPTION_COLORS.emerald],
	["approved", FILTER_OPTION_COLORS.emerald],
	["resolved", FILTER_OPTION_COLORS.emerald],
	["resolved today", FILTER_OPTION_COLORS.emerald],
	["available", FILTER_OPTION_COLORS.emerald],
	["signed", FILTER_OPTION_COLORS.emerald],
	["active", FILTER_OPTION_COLORS.emerald],
	["success", FILTER_OPTION_COLORS.emerald],
	["successful", FILTER_OPTION_COLORS.emerald],
	["applied", FILTER_OPTION_COLORS.emerald],
	["available now", FILTER_OPTION_COLORS.emerald],
	["closed", FILTER_OPTION_COLORS.emerald],
	["all assigned", FILTER_OPTION_COLORS.emerald],
	["configured", FILTER_OPTION_COLORS.emerald],
	["has installation", FILTER_OPTION_COLORS.emerald],
	["has payment", FILTER_OPTION_COLORS.emerald],
	["submitted", FILTER_OPTION_COLORS.emerald],
	["has install cost", FILTER_OPTION_COLORS.emerald],
	["attention", FILTER_OPTION_COLORS.orange],
	["missing items", FILTER_OPTION_COLORS.orange],
	["backorder", FILTER_OPTION_COLORS.orange],
	["back order", FILTER_OPTION_COLORS.orange],
	["issue open", FILTER_OPTION_COLORS.orange],
	["incomplete", FILTER_OPTION_COLORS.orange],
	["reapproval required", FILTER_OPTION_COLORS.orange],
	["part paid", FILTER_OPTION_COLORS.orange],
	["part configured", FILTER_OPTION_COLORS.orange],
	["needs review", FILTER_OPTION_COLORS.orange],
	["review", FILTER_OPTION_COLORS.orange],
	["partial", FILTER_OPTION_COLORS.orange],
	["partially applied", FILTER_OPTION_COLORS.orange],
	["packing blocked", FILTER_OPTION_COLORS.orange],
	["unscheduled", FILTER_OPTION_COLORS.orange],
	["open exception", FILTER_OPTION_COLORS.orange],
	["backordered", FILTER_OPTION_COLORS.orange],
	["missing customer", FILTER_OPTION_COLORS.orange],
	["unclassified method", FILTER_OPTION_COLORS.orange],
	["missing reference", FILTER_OPTION_COLORS.orange],
	["application mismatch", FILTER_OPTION_COLORS.orange],
	["late", FILTER_OPTION_COLORS.rose],
	["overdue", FILTER_OPTION_COLORS.rose],
	["past due", FILTER_OPTION_COLORS.rose],
	["expired", FILTER_OPTION_COLORS.rose],
	["declined", FILTER_OPTION_COLORS.rose],
	["cancelled", FILTER_OPTION_COLORS.rose],
	["canceled", FILTER_OPTION_COLORS.rose],
	["failed", FILTER_OPTION_COLORS.rose],
	["overdraft", FILTER_OPTION_COLORS.rose],
	["unresolved", FILTER_OPTION_COLORS.rose],
	["not completed", FILTER_OPTION_COLORS.rose],
	["blocked", FILTER_OPTION_COLORS.rose],
	["unavailable", FILTER_OPTION_COLORS.rose],
	["overapplied", FILTER_OPTION_COLORS.rose],
	["failed payment", FILTER_OPTION_COLORS.rose],
	["archived", FILTER_OPTION_COLORS.violet],
	["held", FILTER_OPTION_COLORS.violet],
	["held until complete", FILTER_OPTION_COLORS.violet],
]);

export function getStatusFilterOptionColor(value: unknown) {
	return (
		STATUS_COLOR_BY_VALUE.get(normalizeFilterOptionValue(value)) ??
		FILTER_OPTION_COLORS.slate
	);
}

export function getPaymentFilterOptionColor(value: unknown) {
	switch (normalizeFilterOptionValue(value)) {
		case "paid":
			return FILTER_OPTION_COLORS.emerald;
		case "due":
		case "balance due":
			return FILTER_OPTION_COLORS.amber;
		case "credit":
			return FILTER_OPTION_COLORS.violet;
		default:
			return getStatusFilterOptionColor(value);
	}
}

export function getDeliveryFilterOptionColor(value: unknown) {
	switch (normalizeFilterOptionValue(value)) {
		case "pickup":
			return FILTER_OPTION_COLORS.violet;
		case "delivery":
			return FILTER_OPTION_COLORS.blue;
		case "ship":
			return FILTER_OPTION_COLORS.cyan;
		default:
			return getStatusFilterOptionColor(value);
	}
}

function normalizeFilterOptionValue(value: unknown) {
	return String(value ?? "")
		.trim()
		.toLowerCase()
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ");
}
