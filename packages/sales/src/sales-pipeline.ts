import { createHash } from "node:crypto";

export const SALES_PIPELINE_CONTRACT_VERSION = "sales-pipeline/v2" as const;

export type StageApplicability =
	| "required"
	| "not_required"
	| "unknown"
	| "conflict";

export type SalesPipelineHeadlineCode =
	| "cancelled"
	| "conflict"
	| "awaiting_production"
	| "production_queued"
	| "in_production"
	| "awaiting_production_review"
	| "ready_to_fulfill"
	| "fulfillment_queued"
	| "packing"
	| "packed"
	| "in_transit"
	| "partially_fulfilled"
	| "administratively_completed"
	| "fulfilled"
	| "unknown";

export type SalesPipelineEvidenceDate = Date | string | null;

export type SalesPipelineAdministrativeCompletion = {
	method: "STATUS_ONLY" | "FULL_WORKFLOW";
	recordedAt: SalesPipelineEvidenceDate;
	effectiveAt?: SalesPipelineEvidenceDate;
	recordedById?: number | null;
	recordId?: string | null;
};

export type SalesPipelineAssignmentEvidence = {
	id: number;
	active: boolean;
	assignedQty: number;
	completedQty: number;
	dueDate?: SalesPipelineEvidenceDate;
	assignedToId?: number | null;
	startedAt?: SalesPipelineEvidenceDate;
	completedAt?: SalesPipelineEvidenceDate;
};

export type SalesPipelineSubmissionEvidence = {
	id: number;
	assignmentId?: number | null;
	active: boolean;
	quantity: number;
	reviewStatus?: string | null;
	createdAt?: SalesPipelineEvidenceDate;
};

export type SalesPipelineDispatchEvidence = {
	id: number;
	active: boolean;
	itemCount: number;
	requiredQty?: number | null;
	packedQty?: number | null;
	deliveredQty: number;
	status?: string | null;
	dueDate?: SalesPipelineEvidenceDate;
	driverId?: number | null;
	proofCompleted: boolean;
	inventoryCommitted: boolean;
};

export type SalesPipelineEvidence = {
	salesOrderId: number;
	orderNo: string;
	commercial: {
		status?: string | null;
		deletedAt?: SalesPipelineEvidenceDate;
		archivedAt?: SalesPipelineEvidenceDate;
	};
	payment: {
		total: number;
		amountDue: number;
		reviewStatus?: string | null;
	};
	material: {
		applicability: Exclude<StageApplicability, "conflict">;
		requiredQty: number;
		readyQty: number;
		state?: string | null;
	};
	production: {
		configuredRequirement: boolean | null;
		requiredQty: number;
		assignments: SalesPipelineAssignmentEvidence[];
		submissions: SalesPipelineSubmissionEvidence[];
		aggregate: {
			total: number;
			score: number;
			percentage: number;
			updatedAt?: SalesPipelineEvidenceDate;
		} | null;
		administrativeCompletion: SalesPipelineAdministrativeCompletion | null;
	};
	fulfillment: {
		configuredRequirement: boolean | null;
		requiredQty: number;
		packedQty: number;
		dispatches: SalesPipelineDispatchEvidence[];
		administrativeCompletion: SalesPipelineAdministrativeCompletion | null;
	};
	legacy?: {
		orderStatus?: string | null;
		productionStatus?: string | null;
		fulfillmentStatus?: string | null;
	};
	evidenceUpdatedAt?: SalesPipelineEvidenceDate;
};

export type SalesPipelineConflictCode =
	| "PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE"
	| "FULFILLMENT_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE"
	| "PRODUCTION_COMPLETION_AGGREGATE_DRIFT"
	| "FULFILLMENT_PROOF_INCOMPLETE";

export type SalesPipelineReasonCode =
	| "INCLUDED"
	| "SOFT_DELETED"
	| "ARCHIVED"
	| "COMMERCIAL_CANCELLED"
	| "STAGE_NOT_REQUIRED"
	| "STAGE_APPLICABILITY_UNKNOWN"
	| "STAGE_CONFLICT"
	| "NO_ACTIVE_WORK"
	| "OUTSIDE_DATE_SCOPE"
	| "WORK_COMPLETED"
	| "WORK_NOT_COMPLETED";

type PipelineCapability = {
	allowed: boolean;
	reasons: string[];
};

type PipelineProvenance = {
	dimension:
		| "commercial"
		| "payment"
		| "material"
		| "production"
		| "fulfillment"
		| "packing"
		| "dispatch";
	source:
		| "operational_record"
		| "production_assignment"
		| "production_submission"
		| "administrative_completion"
		| "derived_aggregate"
		| "legacy_status";
	precedence: 1 | 2 | 3 | 4;
	identifiers: Array<string | number>;
};

export type SalesPipelineSnapshot = {
	version: typeof SALES_PIPELINE_CONTRACT_VERSION;
	revision: string;
	freshness: {
		state: "current" | "unknown";
		evidenceUpdatedAt: string | null;
	};
	headline: {
		code: SalesPipelineHeadlineCode;
		label: string;
		tone: string;
	};
	commercial: { state: "open" | "cancelled" | "unknown" };
	payment: {
		state: "paid" | "partially_paid" | "unpaid" | "unknown";
		total: number;
		amountDue: number;
		reviewStatus: string | null;
	};
	material: {
		applicability: SalesPipelineEvidence["material"]["applicability"];
		state: string;
		requiredQty: number;
		readyQty: number;
	};
	production: {
		applicability: StageApplicability;
		state:
			| "not_required"
			| "unknown"
			| "conflict"
			| "not_assigned"
			| "partially_assigned"
			| "assigned"
			| "in_production"
			| "awaiting_review"
			| "administratively_completed"
			| "completed";
		requiredQty: number;
		assignedQty: number;
		completedQty: number;
		assignmentIds: number[];
	};
	fulfillment: {
		applicability: StageApplicability;
		state:
			| "not_required"
			| "unknown"
			| "conflict"
			| "backlog"
			| "packing"
			| "packed"
			| "in_transit"
			| "partially_fulfilled"
			| "administratively_completed"
			| "fulfilled";
		requiredQty: number;
		packedQty: number;
		deliveredQty: number;
		operationallyComplete: boolean;
		dispatchIds: number[];
	};
	packing: { state: "pending" | "partial" | "packed" | "not_required" };
	dispatch: {
		state: "none" | "queued" | "in_transit" | "partial" | "completed";
		activeDispatchIds: number[];
	};
	blockers: Array<{ code: string; dimension: string; message: string }>;
	conflicts: Array<{
		code: SalesPipelineConflictCode;
		dimensions: string[];
		severity: "warning" | "blocking";
		message: string;
	}>;
	provenance: PipelineProvenance[];
	capabilities: {
		markProductionCompleted: PipelineCapability;
		markFulfilled: PipelineCapability;
		cancelProduction: PipelineCapability;
		cancelFulfillment: PipelineCapability;
	};
	evidence: SalesPipelineEvidence;
};

export type CanonicalWorkspaceMembershipScope =
	| "queue"
	| "calendar"
	| "due_today"
	| "past_due"
	| "future"
	| "unscheduled"
	| "backlog"
	| "active"
	| "completed";

export type CanonicalWorkspaceMembership = {
	included: boolean;
	reasons: SalesPipelineReasonCode[];
	orderId: number;
	evidenceIds: number[];
	dateKeys: string[];
};

export type CanonicalSalesPipelineFilter = {
	headlines?: SalesPipelineHeadlineCode[] | null;
	production?: "pending" | "in progress" | "completed" | null;
	productionStatus?:
		| "not assigned"
		| "part assigned"
		| "all assigned"
		| "due today"
		| "due tomorrow"
		| "past due"
		| "future"
		| "unscheduled"
		| "completed"
		| "not completed"
		| null;
	productionAssignment?:
		| "not assigned"
		| "part assigned"
		| "all assigned"
		| null;
	dispatchStatus?: "pending" | "completed" | "late" | "backorder" | null;
	productionCompletion?: "pending" | "completed" | null;
	fulfillmentCompletion?: "pending" | "completed" | null;
};

export type SalesPipelineShadowComparison = {
	mode: "shadow";
	changedVisibleState: false;
	canonicalRevision: string;
	differences: Array<{
		code:
			| "HEADLINE_MISMATCH"
			| "PRODUCTION_MEMBERSHIP_MISMATCH"
			| "FULFILLMENT_MEMBERSHIP_MISMATCH";
		legacy: string | boolean;
		canonical: string | boolean;
	}>;
};

const HEADLINE_META: Record<
	SalesPipelineHeadlineCode,
	{ label: string; tone: string }
> = {
	cancelled: { label: "Cancelled", tone: "rose" },
	conflict: { label: "Lifecycle conflict", tone: "rose" },
	awaiting_production: { label: "Awaiting production", tone: "slate" },
	production_queued: { label: "Production queued", tone: "amber" },
	in_production: { label: "In production", tone: "blue" },
	awaiting_production_review: {
		label: "Awaiting production review",
		tone: "amber",
	},
	ready_to_fulfill: { label: "Ready to fulfill", tone: "violet" },
	fulfillment_queued: { label: "Fulfillment queued", tone: "indigo" },
	packing: { label: "Packing", tone: "cyan" },
	packed: { label: "Packed", tone: "teal" },
	in_transit: { label: "In transit", tone: "sky" },
	partially_fulfilled: { label: "Partially fulfilled", tone: "sky" },
	administratively_completed: {
		label: "Administratively completed",
		tone: "stone",
	},
	fulfilled: { label: "Fulfilled", tone: "emerald" },
	unknown: { label: "Status unavailable", tone: "stone" },
};

function quantity(value: number | null | undefined) {
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalized(value: string | null | undefined) {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

function dateKey(value: SalesPipelineEvidenceDate | undefined) {
	if (!value) return null;
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return value;
	}
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

export function isProductionScheduleAssignmentOpen(input: {
	assignedQty: number;
	completedQty?: number | null;
	completedAt?: SalesPipelineEvidenceDate;
	submissions?: Array<{
		quantity: number;
		active: boolean;
		reviewStatus?: string | null;
	}>;
}) {
	if (input.completedAt) return false;
	const assignedQty = quantity(input.assignedQty);
	if (assignedQty <= 0) return false;
	const submittedQty = (input.submissions ?? []).reduce(
		(total, submission) =>
			total +
			(submission.active &&
			!["pending", "pending_review", "rejected", "cancelled"].includes(
				normalized(submission.reviewStatus),
			)
				? quantity(submission.quantity)
				: 0),
		0,
	);
	return Math.max(quantity(input.completedQty), submittedQty) < assignedQty;
}

function revisionOf(evidence: SalesPipelineEvidence) {
	const canonicalEvidence: SalesPipelineEvidence = {
		...evidence,
		production: {
			...evidence.production,
			assignments: [...evidence.production.assignments].sort(
				(left, right) => left.id - right.id,
			),
			submissions: [...evidence.production.submissions].sort(
				(left, right) => left.id - right.id,
			),
		},
		fulfillment: {
			...evidence.fulfillment,
			dispatches: [...evidence.fulfillment.dispatches].sort(
				(left, right) => left.id - right.id,
			),
		},
	};
	return createHash("sha256")
		.update(
			JSON.stringify(canonicalEvidence, (_key, value) =>
				value instanceof Date ? value.toISOString() : value,
			),
		)
		.digest("hex");
}

function productionProjection(
	evidence: SalesPipelineEvidence,
	conflicts: SalesPipelineSnapshot["conflicts"],
	provenance: PipelineProvenance[],
): SalesPipelineSnapshot["production"] {
	const assignments = evidence.production.assignments.filter(
		(assignment) => assignment.active,
	);
	const submissions = evidence.production.submissions.filter(
		(submission) => submission.active,
	);
	const hasOperationalEvidence =
		assignments.length > 0 || submissions.length > 0;
	let applicability: StageApplicability;
	if (evidence.production.configuredRequirement === false) {
		applicability = hasOperationalEvidence ? "conflict" : "not_required";
	} else if (
		evidence.production.configuredRequirement === true ||
		hasOperationalEvidence
	) {
		applicability = "required";
	} else {
		applicability = "unknown";
	}

	if (applicability === "conflict") {
		conflicts.push({
			code: "PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
			dimensions: ["production"],
			severity: "blocking",
			message:
				"Production is configured as not required but active Production evidence exists.",
		});
	}
	const requiredQty = quantity(evidence.production.requiredQty);
	const assignedQty = assignments.reduce(
		(total, assignment) => total + quantity(assignment.assignedQty),
		0,
	);
	const assignmentCompletedQty = assignments.reduce(
		(total, assignment) =>
			total +
			Math.min(
				quantity(assignment.completedQty),
				quantity(assignment.assignedQty),
			),
		0,
	);
	const submittedQty = submissions.reduce(
		(total, submission) =>
			total +
			(["pending", "pending_review", "rejected", "cancelled"].includes(
				normalized(submission.reviewStatus),
			)
				? 0
				: quantity(submission.quantity)),
		0,
	);
	const completedQty = Math.min(
		requiredQty || Number.POSITIVE_INFINITY,
		Math.max(assignmentCompletedQty, submittedQty),
	);
	const hasPendingReview = submissions.some((submission) =>
		["pending", "pending_review"].includes(normalized(submission.reviewStatus)),
	);
	const hasOpenAssignments = assignments.some((assignment) =>
		isProductionScheduleAssignmentOpen({
			assignedQty: assignment.assignedQty,
			completedQty: assignment.completedQty,
			completedAt: assignment.completedAt,
			submissions: submissions.filter(
				(submission) =>
					submission.assignmentId == null ||
					submission.assignmentId === assignment.id,
			),
		}),
	);
	const operationallyComplete =
		applicability === "required" &&
		requiredQty > 0 &&
		completedQty >= requiredQty &&
		!hasOpenAssignments;

	for (const assignment of assignments) {
		provenance.push({
			dimension: "production",
			source: "production_assignment",
			precedence: 1,
			identifiers: [assignment.id],
		});
	}
	for (const submission of submissions) {
		provenance.push({
			dimension: "production",
			source: "production_submission",
			precedence: 1,
			identifiers: [submission.id],
		});
	}
	if (evidence.production.administrativeCompletion) {
		provenance.push({
			dimension: "production",
			source: "administrative_completion",
			precedence: 2,
			identifiers: evidence.production.administrativeCompletion.recordId
				? [evidence.production.administrativeCompletion.recordId]
				: [],
		});
	}
	if (evidence.production.aggregate) {
		provenance.push({
			dimension: "production",
			source: "derived_aggregate",
			precedence: 3,
			identifiers: [],
		});
		const aggregateClaimsComplete =
			quantity(evidence.production.aggregate.total) > 0 &&
			quantity(evidence.production.aggregate.percentage) >= 100;
		if (aggregateClaimsComplete && !operationallyComplete) {
			conflicts.push({
				code: "PRODUCTION_COMPLETION_AGGREGATE_DRIFT",
				dimensions: ["production"],
				severity: "warning",
				message:
					"The Production aggregate reports completion without matching operational evidence.",
			});
		}
	}

	let state: SalesPipelineSnapshot["production"]["state"];
	if (operationallyComplete) state = "completed";
	else if (evidence.production.administrativeCompletion) {
		state = "administratively_completed";
	} else if (applicability === "not_required") state = "not_required";
	else if (applicability === "conflict") state = "conflict";
	else if (applicability === "unknown") state = "unknown";
	else if (hasPendingReview) state = "awaiting_review";
	else if (completedQty > 0 || assignments.some((item) => item.startedAt)) {
		state = "in_production";
	} else if (assignedQty >= requiredQty && requiredQty > 0) state = "assigned";
	else if (assignedQty > 0) state = "partially_assigned";
	else state = "not_assigned";

	return {
		applicability,
		state,
		requiredQty,
		assignedQty,
		completedQty: Number.isFinite(completedQty) ? completedQty : 0,
		assignmentIds: assignments.map((assignment) => assignment.id),
	};
}

function fulfillmentProjection(
	evidence: SalesPipelineEvidence,
	conflicts: SalesPipelineSnapshot["conflicts"],
	provenance: PipelineProvenance[],
): Pick<SalesPipelineSnapshot, "fulfillment" | "packing" | "dispatch"> {
	const dispatches = evidence.fulfillment.dispatches.filter(
		(dispatch) => dispatch.active,
	);
	const itemBearing = dispatches.filter((dispatch) => dispatch.itemCount > 0);
	const hasOperationalEvidence = dispatches.length > 0;
	let applicability: StageApplicability;
	if (evidence.fulfillment.configuredRequirement === false) {
		applicability = hasOperationalEvidence ? "conflict" : "not_required";
	} else if (
		evidence.fulfillment.configuredRequirement === true ||
		hasOperationalEvidence
	) {
		applicability = "required";
	} else applicability = "unknown";

	if (applicability === "conflict") {
		conflicts.push({
			code: "FULFILLMENT_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
			dimensions: ["fulfillment", "dispatch"],
			severity: "blocking",
			message:
				"Fulfillment is configured as not required but active Dispatch evidence exists.",
		});
	}
	if (
		itemBearing.some(
			(dispatch) =>
				normalized(dispatch.status) === "completed" &&
				(!dispatch.proofCompleted || !dispatch.inventoryCommitted),
		)
	) {
		conflicts.push({
			code: "FULFILLMENT_PROOF_INCOMPLETE",
			dimensions: ["fulfillment", "dispatch"],
			severity: "blocking",
			message:
				"A completed Dispatch is missing delivery proof or committed inventory evidence.",
		});
	}

	for (const dispatch of dispatches) {
		provenance.push({
			dimension: "dispatch",
			source: "operational_record",
			precedence: 1,
			identifiers: [dispatch.id],
		});
	}
	if (evidence.fulfillment.administrativeCompletion) {
		provenance.push({
			dimension: "fulfillment",
			source: "administrative_completion",
			precedence: 2,
			identifiers: evidence.fulfillment.administrativeCompletion.recordId
				? [evidence.fulfillment.administrativeCompletion.recordId]
				: [],
		});
	}

	const requiredQty = quantity(evidence.fulfillment.requiredQty);
	const packedQty = Math.min(
		requiredQty,
		quantity(evidence.fulfillment.packedQty),
	);
	const deliveredQty = Math.min(
		requiredQty,
		itemBearing.reduce(
			(total, dispatch) => total + quantity(dispatch.deliveredQty),
			0,
		),
	);
	const everyProofComplete =
		itemBearing.length > 0 &&
		itemBearing.every(
			(dispatch) =>
				normalized(dispatch.status) === "completed" &&
				dispatch.proofCompleted &&
				dispatch.inventoryCommitted,
		);
	const operationallyComplete =
		applicability === "required" &&
		requiredQty > 0 &&
		deliveredQty >= requiredQty &&
		everyProofComplete;
	const anyInTransit = itemBearing.some((dispatch) =>
		["in progress", "in-progress", "in transit", "dispatched"].includes(
			normalized(dispatch.status),
		),
	);

	let state: SalesPipelineSnapshot["fulfillment"]["state"];
	if (operationallyComplete) state = "fulfilled";
	else if (evidence.fulfillment.administrativeCompletion) {
		state = "administratively_completed";
	} else if (applicability === "not_required") state = "not_required";
	else if (applicability === "conflict") state = "conflict";
	else if (applicability === "unknown") {
		state = "unknown";
	} else if (deliveredQty > 0) state = "partially_fulfilled";
	else if (anyInTransit) state = "in_transit";
	else if (packedQty >= requiredQty && requiredQty > 0) state = "packed";
	else if (packedQty > 0 || dispatches.length > 0) state = "packing";
	else state = "backlog";

	const packing: SalesPipelineSnapshot["packing"] = {
		state:
			applicability === "not_required"
				? "not_required"
				: packedQty <= 0
					? "pending"
					: packedQty < requiredQty
						? "partial"
						: "packed",
	};
	const completedDispatchIds = itemBearing
		.filter(
			(dispatch) =>
				normalized(dispatch.status) === "completed" &&
				dispatch.proofCompleted &&
				dispatch.inventoryCommitted,
		)
		.map((dispatch) => dispatch.id);
	const dispatch: SalesPipelineSnapshot["dispatch"] = {
		state:
			dispatches.length === 0
				? "none"
				: operationallyComplete
					? "completed"
					: deliveredQty > 0
						? "partial"
						: anyInTransit
							? "in_transit"
							: "queued",
		activeDispatchIds: dispatches
			.filter((item) => !completedDispatchIds.includes(item.id))
			.map((item) => item.id),
	};

	return {
		fulfillment: {
			applicability,
			state,
			requiredQty,
			packedQty,
			deliveredQty,
			operationallyComplete,
			dispatchIds: dispatches.map((dispatch) => dispatch.id),
		},
		packing,
		dispatch,
	};
}

function headlineCode(
	evidence: SalesPipelineEvidence,
	production: SalesPipelineSnapshot["production"],
	fulfillment: SalesPipelineSnapshot["fulfillment"],
	conflicts: SalesPipelineSnapshot["conflicts"],
): SalesPipelineHeadlineCode {
	const commercial = normalized(evidence.commercial.status);
	if (["cancelled", "canceled"].includes(commercial)) return "cancelled";
	if (fulfillment.state === "fulfilled") return "fulfilled";
	if (
		fulfillment.state === "administratively_completed" ||
		production.state === "administratively_completed"
	) {
		return "administratively_completed";
	}
	if (conflicts.some((conflict) => conflict.severity === "blocking")) {
		return "conflict";
	}
	if (fulfillment.state === "partially_fulfilled") return "partially_fulfilled";
	if (fulfillment.state === "in_transit") return "in_transit";
	if (fulfillment.state === "packed") return "packed";
	if (fulfillment.state === "packing") return "packing";
	if (production.state === "completed" || production.state === "not_required") {
		return fulfillment.state === "backlog"
			? "ready_to_fulfill"
			: "fulfillment_queued";
	}
	if (production.state === "awaiting_review") {
		return "awaiting_production_review";
	}
	if (production.state === "in_production") return "in_production";
	if (
		production.state === "assigned" ||
		production.state === "partially_assigned"
	) {
		return "production_queued";
	}
	if (production.state === "unknown") return "unknown";
	return "awaiting_production";
}

export function resolveSalesPipelineSnapshot(
	evidence: SalesPipelineEvidence,
): SalesPipelineSnapshot {
	const conflicts: SalesPipelineSnapshot["conflicts"] = [];
	const provenance: PipelineProvenance[] = [
		{
			dimension: "commercial",
			source: "operational_record",
			precedence: 1,
			identifiers: [evidence.salesOrderId],
		},
	];
	const production = productionProjection(evidence, conflicts, provenance);
	const fulfillmentParts = fulfillmentProjection(
		evidence,
		conflicts,
		provenance,
	);
	const commercialStatus = normalized(evidence.commercial.status);
	const commercial = {
		state: ["cancelled", "canceled"].includes(commercialStatus)
			? ("cancelled" as const)
			: commercialStatus
				? ("open" as const)
				: ("unknown" as const),
	};
	const total = quantity(evidence.payment.total);
	const amountDue = quantity(evidence.payment.amountDue);
	const payment = {
		state:
			total <= 0
				? ("unknown" as const)
				: amountDue <= 0
					? ("paid" as const)
					: amountDue < total
						? ("partially_paid" as const)
						: ("unpaid" as const),
		total,
		amountDue,
		reviewStatus: evidence.payment.reviewStatus ?? null,
	};
	const material = {
		applicability: evidence.material.applicability,
		state:
			evidence.material.state ??
			(evidence.material.applicability === "not_required"
				? "not_required"
				: evidence.material.readyQty >= evidence.material.requiredQty
					? "ready"
					: "blocked"),
		requiredQty: quantity(evidence.material.requiredQty),
		readyQty: quantity(evidence.material.readyQty),
	};
	const headline = headlineCode(
		evidence,
		production,
		fulfillmentParts.fulfillment,
		conflicts,
	);
	const productionBlocked = ["unknown", "conflict"].includes(
		production.applicability,
	);
	const fulfillmentBlocked = ["unknown", "conflict"].includes(
		fulfillmentParts.fulfillment.applicability,
	);
	const cancelled = commercial.state === "cancelled";
	const blockers: SalesPipelineSnapshot["blockers"] = [];
	if (productionBlocked) {
		blockers.push({
			code: "PRODUCTION_APPLICABILITY_REVIEW_REQUIRED",
			dimension: "production",
			message:
				"Resolve Production applicability before changing Production state.",
		});
	}
	if (fulfillmentBlocked) {
		blockers.push({
			code: "FULFILLMENT_APPLICABILITY_REVIEW_REQUIRED",
			dimension: "fulfillment",
			message:
				"Resolve Fulfillment applicability before changing Fulfillment state.",
		});
	}

	return {
		version: SALES_PIPELINE_CONTRACT_VERSION,
		revision: revisionOf(evidence),
		freshness: {
			state: evidence.evidenceUpdatedAt ? "current" : "unknown",
			evidenceUpdatedAt: dateKey(evidence.evidenceUpdatedAt),
		},
		headline: { code: headline, ...HEADLINE_META[headline] },
		commercial,
		payment,
		material,
		production,
		fulfillment: fulfillmentParts.fulfillment,
		packing: fulfillmentParts.packing,
		dispatch: fulfillmentParts.dispatch,
		blockers,
		conflicts,
		provenance,
		capabilities: {
			markProductionCompleted: {
				allowed:
					!cancelled &&
					!productionBlocked &&
					production.applicability === "required" &&
					production.state !== "completed",
				reasons: productionBlocked
					? ["PRODUCTION_APPLICABILITY_REVIEW_REQUIRED"]
					: [],
			},
			markFulfilled: {
				allowed:
					!cancelled &&
					!fulfillmentBlocked &&
					fulfillmentParts.fulfillment.applicability === "required" &&
					fulfillmentParts.fulfillment.state !== "fulfilled",
				reasons: fulfillmentBlocked
					? ["FULFILLMENT_APPLICABILITY_REVIEW_REQUIRED"]
					: [],
			},
			cancelProduction: {
				allowed:
					!cancelled &&
					production.applicability === "required" &&
					production.assignmentIds.length > 0,
				reasons: [],
			},
			cancelFulfillment: {
				allowed:
					!cancelled &&
					fulfillmentParts.fulfillment.dispatchIds.length > 0 &&
					!fulfillmentParts.fulfillment.operationallyComplete,
				reasons: [],
			},
		},
		evidence,
	};
}

function excludedVisibilityReasons(snapshot: SalesPipelineSnapshot) {
	const reasons: SalesPipelineReasonCode[] = [];
	if (snapshot.evidence.commercial.deletedAt) reasons.push("SOFT_DELETED");
	if (snapshot.evidence.commercial.archivedAt) reasons.push("ARCHIVED");
	if (snapshot.commercial.state === "cancelled") {
		reasons.push("COMMERCIAL_CANCELLED");
	}
	return reasons;
}

export function resolveCanonicalWorkspaceMembership(
	snapshot: SalesPipelineSnapshot,
	input: {
		workspace: "production" | "fulfillment";
		scope: CanonicalWorkspaceMembershipScope;
		operationalDate: string;
		from?: string | null;
		to?: string | null;
		includeArchived?: boolean;
	},
): CanonicalWorkspaceMembership {
	const reasons = excludedVisibilityReasons(snapshot).filter(
		(reason) => input.includeArchived || reason !== "ARCHIVED",
	);
	if (input.includeArchived) {
		const archivedIndex = reasons.indexOf("ARCHIVED");
		if (archivedIndex >= 0) reasons.splice(archivedIndex, 1);
	}
	const stage =
		input.workspace === "production"
			? snapshot.production
			: snapshot.fulfillment;
	if (stage.applicability === "not_required")
		reasons.push("STAGE_NOT_REQUIRED");
	if (stage.applicability === "unknown") {
		reasons.push("STAGE_APPLICABILITY_UNKNOWN");
	}
	if (stage.applicability === "conflict") reasons.push("STAGE_CONFLICT");

	let evidenceIds: number[] = [];
	let dateKeys: string[] = [];
	let scopeIncluded = false;
	if (input.workspace === "production") {
		const assignments = snapshot.evidence.production.assignments.filter(
			(assignment) => assignment.active,
		);
		const openAssignments = assignments.filter((assignment) => {
			const submissions = snapshot.evidence.production.submissions.filter(
				(submission) =>
					submission.active &&
					(submission.assignmentId == null ||
						submission.assignmentId === assignment.id),
			);
			return isProductionScheduleAssignmentOpen({
				assignedQty: assignment.assignedQty,
				completedQty: assignment.completedQty,
				completedAt: assignment.completedAt,
				submissions,
			});
		});
		const candidateAssignments =
			input.scope === "completed"
				? assignments.filter(
						(assignment) =>
							Boolean(assignment.completedAt) ||
							quantity(assignment.completedQty) >=
								quantity(assignment.assignedQty),
					)
				: openAssignments;
		const withDates = candidateAssignments
			.map((assignment) => ({ assignment, key: dateKey(assignment.dueDate) }))
			.filter(
				(
					item,
				): item is {
					assignment: SalesPipelineAssignmentEvidence;
					key: string;
				} => Boolean(item.key),
			);
		let matched = candidateAssignments;
		if (input.scope === "due_today") {
			matched = withDates
				.filter((item) => item.key === input.operationalDate)
				.map((item) => item.assignment);
		} else if (input.scope === "past_due") {
			matched = withDates
				.filter((item) => item.key < input.operationalDate)
				.map((item) => item.assignment);
		} else if (input.scope === "future") {
			matched = withDates
				.filter((item) => item.key > input.operationalDate)
				.map((item) => item.assignment);
		} else if (input.scope === "unscheduled") {
			matched = candidateAssignments.filter(
				(assignment) => !dateKey(assignment.dueDate),
			);
		} else if (input.scope === "calendar") {
			matched = withDates
				.filter(
					(item) =>
						(!input.from || item.key >= input.from) &&
						(!input.to || item.key <= input.to),
				)
				.map((item) => item.assignment);
		} else if (input.scope === "completed") {
			matched = candidateAssignments;
		}
		evidenceIds = matched.map((assignment) => assignment.id);
		dateKeys = Array.from(
			new Set(
				matched
					.map((assignment) => dateKey(assignment.dueDate))
					.filter((key): key is string => Boolean(key)),
			),
		);
		scopeIncluded = matched.length > 0;
	} else {
		const dispatches = snapshot.evidence.fulfillment.dispatches.filter(
			(dispatch) => dispatch.active && dispatch.itemCount > 0,
		);
		const open = dispatches.filter(
			(dispatch) =>
				!(
					normalized(dispatch.status) === "completed" &&
					dispatch.proofCompleted &&
					dispatch.inventoryCommitted
				),
		);
		const completed = dispatches.filter((dispatch) => !open.includes(dispatch));
		let matched = input.scope === "completed" ? completed : open;
		if (input.scope === "backlog") {
			scopeIncluded =
				snapshot.fulfillment.applicability === "required" &&
				snapshot.fulfillment.state === "backlog";
			matched = [];
		} else if (input.scope === "completed") {
			scopeIncluded = snapshot.fulfillment.state === "fulfilled";
		} else if (input.scope === "due_today" || input.scope === "past_due") {
			matched = open.filter((dispatch) => {
				const key = dateKey(dispatch.dueDate);
				return input.scope === "due_today"
					? key === input.operationalDate
					: Boolean(key && key < input.operationalDate);
			});
			scopeIncluded = matched.length > 0;
		} else {
			scopeIncluded = matched.length > 0;
		}
		evidenceIds = matched.map((dispatch) => dispatch.id);
		dateKeys = Array.from(
			new Set(
				matched
					.map((dispatch) => dateKey(dispatch.dueDate))
					.filter((key): key is string => Boolean(key)),
			),
		);
	}

	if (!scopeIncluded) {
		reasons.push(
			input.scope === "completed" ? "WORK_NOT_COMPLETED" : "NO_ACTIVE_WORK",
		);
	}
	if (scopeIncluded && input.scope !== "completed") {
		const stageState = stage.state;
		if (stageState === "completed" || stageState === "fulfilled") {
			reasons.push("WORK_COMPLETED");
		}
	}
	const blockingReasons = reasons.filter((reason) => reason !== "ARCHIVED");
	const included = scopeIncluded && blockingReasons.length === 0;
	if (included) reasons.push("INCLUDED");

	return {
		included,
		reasons: Array.from(new Set(reasons)),
		orderId: snapshot.evidence.salesOrderId,
		evidenceIds,
		dateKeys,
	};
}

function nextOperationalDate(value: string) {
	const date = new Date(`${value}T00:00:00.000Z`);
	date.setUTCDate(date.getUTCDate() + 1);
	return date.toISOString().slice(0, 10);
}

/**
 * Exact lifecycle-filter predicate shared by list, count, summary, saved-tab,
 * and export adapters. Candidate SQL may return a superset, but this function
 * is the final authority for lifecycle membership.
 */
export function matchesCanonicalSalesPipelineFilter(
	snapshot: SalesPipelineSnapshot,
	filter: CanonicalSalesPipelineFilter,
	operationalDate: string,
) {
	if (
		filter.headlines?.length &&
		!filter.headlines.includes(snapshot.headline.code)
	) {
		return false;
	}
	const productionTerminal = [
		"completed",
		"administratively_completed",
	].includes(snapshot.production.state);
	const fulfillmentTerminal = [
		"fulfilled",
		"administratively_completed",
	].includes(snapshot.fulfillment.state);
	const productionRequired = snapshot.production.applicability === "required";
	const fulfillmentRequired = snapshot.fulfillment.applicability === "required";
	const openAssignments = snapshot.evidence.production.assignments.filter(
		(assignment) =>
			assignment.active &&
			isProductionScheduleAssignmentOpen({
				assignedQty: assignment.assignedQty,
				completedQty: assignment.completedQty,
				completedAt: assignment.completedAt,
				submissions: snapshot.evidence.production.submissions.filter(
					(submission) =>
						submission.active &&
						(submission.assignmentId == null ||
							submission.assignmentId === assignment.id),
				),
			}),
	);
	const openAssignmentDates = openAssignments.map((assignment) =>
		dateKey(assignment.dueDate),
	);
	const tomorrow = nextOperationalDate(operationalDate);

	if (filter.production) {
		if (!productionRequired) return false;
		if (filter.production === "completed" && !productionTerminal) return false;
		if (
			filter.production === "in progress" &&
			!["in_production", "awaiting_review"].includes(snapshot.production.state)
		) {
			return false;
		}
		if (
			filter.production === "pending" &&
			(productionTerminal ||
				["in_production", "awaiting_review"].includes(
					snapshot.production.state,
				))
		) {
			return false;
		}
	}

	const productionStatus = filter.productionStatus;
	if (productionStatus) {
		if (!productionRequired) return false;
		if (
			productionStatus === "not assigned" &&
			snapshot.production.assignedQty > 0
		) {
			return false;
		}
		if (
			productionStatus === "part assigned" &&
			!(
				snapshot.production.assignedQty > 0 &&
				snapshot.production.assignedQty < snapshot.production.requiredQty
			)
		) {
			return false;
		}
		if (
			productionStatus === "all assigned" &&
			!(
				snapshot.production.requiredQty > 0 &&
				snapshot.production.assignedQty >= snapshot.production.requiredQty
			)
		) {
			return false;
		}
		if (
			productionStatus === "due today" &&
			!openAssignmentDates.includes(operationalDate)
		) {
			return false;
		}
		if (
			productionStatus === "due tomorrow" &&
			!openAssignmentDates.includes(tomorrow)
		) {
			return false;
		}
		if (
			productionStatus === "past due" &&
			!openAssignmentDates.some((key) => Boolean(key && key < operationalDate))
		) {
			return false;
		}
		if (
			productionStatus === "future" &&
			!openAssignmentDates.some((key) => Boolean(key && key >= tomorrow))
		) {
			return false;
		}
		if (
			productionStatus === "unscheduled" &&
			!openAssignmentDates.includes(null)
		) {
			return false;
		}
		if (productionStatus === "completed" && !productionTerminal) return false;
		if (productionStatus === "not completed" && productionTerminal)
			return false;
	}

	if (filter.productionAssignment) {
		const assigned = snapshot.production.assignedQty;
		const required = snapshot.production.requiredQty;
		if (filter.productionAssignment === "not assigned" && assigned > 0) {
			return false;
		}
		if (
			filter.productionAssignment === "part assigned" &&
			!(assigned > 0 && (required <= 0 || assigned < required))
		) {
			return false;
		}
		if (
			filter.productionAssignment === "all assigned" &&
			!(required > 0 && assigned >= required)
		) {
			return false;
		}
	}

	if (filter.dispatchStatus) {
		if (!fulfillmentRequired) return false;
		if (filter.dispatchStatus === "completed" && !fulfillmentTerminal) {
			return false;
		}
		if (filter.dispatchStatus === "pending" && fulfillmentTerminal)
			return false;
		if (
			filter.dispatchStatus === "backorder" &&
			!(
				snapshot.fulfillment.state === "partially_fulfilled" ||
				snapshot.dispatch.state === "partial"
			)
		) {
			return false;
		}
		if (
			filter.dispatchStatus === "late" &&
			!resolveCanonicalWorkspaceMembership(snapshot, {
				workspace: "fulfillment",
				scope: "past_due",
				operationalDate,
			}).included
		) {
			return false;
		}
	}

	if (
		filter.productionCompletion &&
		(filter.productionCompletion === "completed") !== productionTerminal
	) {
		return false;
	}
	if (
		filter.fulfillmentCompletion &&
		(filter.fulfillmentCompletion === "completed") !== fulfillmentTerminal
	) {
		return false;
	}

	return true;
}

export function projectSalesPipelineForAudience(
	snapshot: SalesPipelineSnapshot,
	audience: "internal" | "worker" | "driver" | "dealer" | "customer",
) {
	const customerStatus = projectSalesPipelineHeadlineForCustomer(
		snapshot.headline.code,
	);
	const base = {
		version: snapshot.version,
		revision: snapshot.revision,
		status: snapshot.headline,
		payment: snapshot.payment,
		production: {
			applicability: snapshot.production.applicability,
			state: snapshot.production.state,
			completedQty: snapshot.production.completedQty,
			requiredQty: snapshot.production.requiredQty,
		},
		fulfillment: {
			applicability: snapshot.fulfillment.applicability,
			state: snapshot.fulfillment.state,
			deliveredQty: snapshot.fulfillment.deliveredQty,
			requiredQty: snapshot.fulfillment.requiredQty,
		},
	};
	if (audience === "customer" || audience === "dealer") {
		return { ...base, status: customerStatus };
	}
	return {
		...base,
		blockers: snapshot.blockers,
		conflicts: snapshot.conflicts,
		capabilities: snapshot.capabilities,
	};
}

export function projectSalesPipelineHeadlineForCustomer(
	headline: SalesPipelineHeadlineCode | string | null | undefined,
) {
	return headline === "cancelled"
		? { code: "cancelled" as const, label: "Cancelled", tone: "red" }
		: headline === "fulfilled"
			? { code: "delivered" as const, label: "Delivered", tone: "emerald" }
			: headline === "in_transit"
				? { code: "in-transit" as const, label: "In transit", tone: "blue" }
				: { code: "processing" as const, label: "Processing", tone: "amber" };
}

export function compareSalesPipelineShadow(
	snapshot: SalesPipelineSnapshot,
	legacy: {
		legacyHeadline?: string | null;
		legacyProductionIncluded?: boolean | null;
		legacyFulfillmentIncluded?: boolean | null;
	},
): SalesPipelineShadowComparison {
	const differences: SalesPipelineShadowComparison["differences"] = [];
	if (
		legacy.legacyHeadline != null &&
		normalized(legacy.legacyHeadline).replaceAll(" ", "_") !==
			snapshot.headline.code
	) {
		differences.push({
			code: "HEADLINE_MISMATCH",
			legacy: legacy.legacyHeadline,
			canonical: snapshot.headline.code,
		});
	}
	const productionIncluded =
		snapshot.production.applicability === "required" &&
		!["completed", "administratively_completed"].includes(
			snapshot.production.state,
		);
	if (
		legacy.legacyProductionIncluded != null &&
		legacy.legacyProductionIncluded !== productionIncluded
	) {
		differences.push({
			code: "PRODUCTION_MEMBERSHIP_MISMATCH",
			legacy: legacy.legacyProductionIncluded,
			canonical: productionIncluded,
		});
	}
	const fulfillmentIncluded =
		snapshot.fulfillment.applicability === "required" &&
		!["fulfilled", "administratively_completed"].includes(
			snapshot.fulfillment.state,
		);
	if (
		legacy.legacyFulfillmentIncluded != null &&
		legacy.legacyFulfillmentIncluded !== fulfillmentIncluded
	) {
		differences.push({
			code: "FULFILLMENT_MEMBERSHIP_MISMATCH",
			legacy: legacy.legacyFulfillmentIncluded,
			canonical: fulfillmentIncluded,
		});
	}
	return {
		mode: "shadow",
		changedVisibleState: false,
		canonicalRevision: snapshot.revision,
		differences,
	};
}

export function resolveCanonicalDispatchWorkspaceMembership(input: {
	section: string;
	stage: string;
	driverId?: number | null;
	deliveryMode?: string | null;
	dueBucket?: string | null;
}) {
	if (input.section === "completed") return input.stage === "fulfilled";
	if (
		input.section !== "active" &&
		input.section !== "due-today" &&
		input.section !== "past-due"
	) {
		return true;
	}
	if (input.stage === "fulfilled" || input.stage === "cancelled") return false;
	const isActive = input.deliveryMode === "pickup" || Boolean(input.driverId);
	if (!isActive) return false;
	if (input.section === "due-today") return input.dueBucket === "today";
	if (input.section === "past-due") return input.dueBucket === "overdue";
	return true;
}
