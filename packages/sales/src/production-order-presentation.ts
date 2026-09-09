import type { SalesPipelineSnapshot } from "./sales-pipeline";

export type ProductionReviewAttentionReason =
	| "ALLOCATION_REVIEW"
	| "AWAITING_INBOUND"
	| "BLOCKED"
	| "NOT_CONFIGURED"
	| "PROJECTION_UNAVAILABLE";
export type ProductionAttention = { code: string; message: string };
export type ProductionOrderPresentation = {
	primary: {
		code:
			| "unknown"
			| "cancelled"
			| "not_required"
			| "not_assigned"
			| "partially_assigned"
			| "assigned"
			| "in_production"
			| "completed";
		label: string;
		detail: string | null;
		basis:
			| "reported"
			| "finalized"
			| "administrative"
			| "assignment"
			| "canonical";
	};
	attention: ProductionAttention[];
	reportedQty: number;
};
const qty = (value: number) =>
	Number.isFinite(value) ? Math.max(0, value) : 0;
const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? "";

// Read-only presentation: callers retain the canonical snapshot for eligibility,
// filtering, finalized quantities and every production/packing/payroll command.
export function getProductionOrderPresentation(
	snapshot: SalesPipelineSnapshot | null | undefined,
	reviewReasons: readonly ProductionReviewAttentionReason[] = [],
): ProductionOrderPresentation {
	const submissions = (snapshot?.evidence.production.submissions ?? []).filter(
		(s) =>
			s.active &&
			!["rejected", "cancelled"].includes(normalize(s.reviewStatus)),
	);
	const reportedQty = submissions.reduce((sum, s) => sum + qty(s.quantity), 0);
	const pending = submissions.some((s) =>
		["pending", "pending_review"].includes(normalize(s.reviewStatus)),
	);
	const attention: ProductionAttention[] = [];
	const add = (code: string, message: string) => {
		if (!attention.some((a) => a.code === code))
			attention.push({ code, message });
	};
	for (const conflict of [...(snapshot?.conflicts ?? [])]
		.filter((c) => c.severity === "blocking")
		.sort((a, b) => a.code.localeCompare(b.code)))
		add(`conflict:${conflict.code}`, conflict.message);
	const material = snapshot?.material;
	if (
		material?.applicability === "required" &&
		qty(material.readyQty) < qty(material.requiredQty)
	)
		add(
			"materials_missing",
			`${Math.max(0, qty(material.requiredQty) - qty(material.readyQty))} material units still need coverage.`,
		);
	const reasons = new Set(reviewReasons);
	if (reasons.has("ALLOCATION_REVIEW"))
		add("allocation_review", "Material allocation needs approval.");
	if (reasons.has("AWAITING_INBOUND"))
		add("awaiting_inbound", "Inbound materials need to be received.");
	if (reasons.has("NOT_CONFIGURED"))
		add(
			"materials_not_configured",
			"Material requirements need configuration.",
		);
	if (reasons.has("PROJECTION_UNAVAILABLE"))
		add(
			"material_evidence_unavailable",
			"Material evidence needs to be refreshed.",
		);
	if (reasons.has("BLOCKED"))
		add(
			"material_review_blocked",
			"Material review has an unresolved blocker.",
		);
	if (pending && !reviewReasons.length)
		add("review_pending", "Production submission needs review.");
	if (
		!snapshot ||
		snapshot.freshness.state !== "current" ||
		snapshot.production.state === "unknown"
	)
		return {
			primary: {
				code: "unknown",
				label: "Status unavailable",
				detail: null,
				basis: "canonical",
			},
			attention: [
				{
					code: "evidence_unavailable",
					message: "Production evidence needs to be refreshed.",
				},
				...attention,
			],
			reportedQty: 0,
		};
	const production = snapshot.production;
	let primary: ProductionOrderPresentation["primary"];
	if (snapshot.commercial.state === "cancelled")
		primary = {
			code: "cancelled",
			label: "Cancelled",
			detail: null,
			basis: "canonical",
		};
	else if (
		production.state === "completed" ||
		production.state === "administratively_completed"
	)
		primary = {
			code: "completed",
			label: "Production completed",
			detail: null,
			basis:
				production.state === "administratively_completed"
					? "administrative"
					: "finalized",
		};
	else if (production.requiredQty > 0 && reportedQty >= production.requiredQty)
		primary = {
			code: "completed",
			label: "Production completed",
			detail: `${reportedQty} of ${production.requiredQty} submitted`,
			basis: "reported",
		};
	else if (
		reportedQty > 0 ||
		production.completedQty > 0 ||
		production.state === "in_production"
	)
		primary = {
			code: "in_production",
			label: "In production",
			detail:
				reportedQty > 0
					? `${reportedQty} of ${production.requiredQty} submitted`
					: null,
			basis: reportedQty > 0 ? "reported" : "canonical",
		};
	else if (production.applicability === "not_required")
		primary = {
			code: "not_required",
			label: "No production required",
			detail: null,
			basis: "canonical",
		};
	else if (production.assignedQty > 0)
		primary = {
			code:
				production.assignedQty < production.requiredQty
					? "partially_assigned"
					: "assigned",
			label:
				production.assignedQty < production.requiredQty
					? "Partially assigned"
					: "Assigned",
			detail: null,
			basis: "assignment",
		};
	else
		primary = {
			code: "not_assigned",
			label: "Not assigned",
			detail: null,
			basis: "assignment",
		};
	return { primary, attention, reportedQty };
}
