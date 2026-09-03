import type { SalesPipelineSnapshot } from "./sales-pipeline";

export type SalesPipelineCommand =
	| "production.assign"
	| "production.unassign"
	| "production.submit"
	| "production.submission.update"
	| "production.submission.delete"
	| "production.review.resolve"
	| "production.reschedule"
	| "production.complete"
	| "production.administrative_complete"
	| "production.cancel"
	| "production.administrative_cancel"
	| "fulfillment.pack"
	| "fulfillment.unpack"
	| "fulfillment.start_dispatch"
	| "fulfillment.complete_dispatch"
	| "fulfillment.sign_packing_slip"
	| "fulfillment.reschedule"
	| "fulfillment.complete"
	| "fulfillment.administrative_complete"
	| "fulfillment.cancel"
	| "fulfillment.administrative_cancel";

export type SalesPipelineCommandDecision = {
	action: SalesPipelineCommand;
	status: "ready" | "replay" | "review_required" | "rejected";
	revision: string;
	reasons: string[];
	affectedScopes: string[];
};

const affectedScopes: Record<SalesPipelineCommand, string[]> = {
	"production.assign": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.unassign": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.submit": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.submission.update": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.submission.delete": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.review.resolve": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
		"fulfillment.backlog",
	],
	"production.reschedule": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
		"production.worker",
	],
	"production.complete": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
		"fulfillment.backlog",
	],
	"production.administrative_complete": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
		"fulfillment.backlog",
	],
	"production.cancel": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"production.administrative_cancel": [
		"sales.orders",
		"sales.overview",
		"production.queue",
		"production.calendar",
		"production.summary",
	],
	"fulfillment.pack": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.unpack": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.start_dispatch": [
		"sales.orders",
		"sales.overview",
		"fulfillment.active",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.complete_dispatch": [
		"sales.orders",
		"sales.overview",
		"fulfillment.active",
		"fulfillment.completed",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.sign_packing_slip": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.completed",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.reschedule": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.summary",
		"fulfillment.calendar",
		"driver.queue",
	],
	"fulfillment.complete": [
		"sales.orders",
		"sales.overview",
		"fulfillment.active",
		"fulfillment.completed",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.administrative_complete": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.completed",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.cancel": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.summary",
		"driver.queue",
	],
	"fulfillment.administrative_cancel": [
		"sales.orders",
		"sales.overview",
		"fulfillment.backlog",
		"fulfillment.active",
		"fulfillment.completed",
		"fulfillment.summary",
		"driver.queue",
	],
};

export function getSalesPipelineAffectedScopes(action: SalesPipelineCommand) {
	return [...affectedScopes[action]];
}

export function evaluateSalesPipelineCommand(
	snapshot: SalesPipelineSnapshot,
	input: {
		action: SalesPipelineCommand;
		authorized: boolean;
		expectedRevision?: string | null;
		administrativeOverride?: boolean;
		administrativeOverrideReason?: string | null;
	},
): SalesPipelineCommandDecision {
	const base = {
		action: input.action,
		revision: snapshot.revision,
		affectedScopes: getSalesPipelineAffectedScopes(input.action),
	};
	if (!input.authorized) {
		return { ...base, status: "rejected", reasons: ["PERMISSION_DENIED"] };
	}
	if (input.expectedRevision && input.expectedRevision !== snapshot.revision) {
		return { ...base, status: "rejected", reasons: ["STALE_REVISION"] };
	}
	if (snapshot.commercial.state === "cancelled") {
		return {
			...base,
			status: "rejected",
			reasons: ["COMMERCIAL_ORDER_CANCELLED"],
		};
	}
	const administrativeCompletion = input.action.endsWith(
		"administrative_complete",
	);
	const production = input.action.startsWith("production.");
	const exceptionalHeadline =
		snapshot.headline.code === "unknown" ||
		snapshot.headline.code === "conflict";
	const administrativeStage = production
		? snapshot.production
		: snapshot.fulfillment;
	const administrativeConflictDimensions = production
		? new Set(["production"])
		: new Set(["fulfillment", "dispatch"]);
	const supportedAdministrativeConflictCodes = production
		? new Set(["PRODUCTION_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE"])
		: new Set([
				"FULFILLMENT_NOT_REQUIRED_WITH_OPERATIONAL_EVIDENCE",
				"FULFILLMENT_PROOF_INCOMPLETE",
			]);
	const administrativeStageConflicts = snapshot.conflicts.filter(
		(conflict) =>
			conflict.severity === "blocking" &&
			conflict.dimensions.some((dimension) =>
				administrativeConflictDimensions.has(dimension),
			),
	);
	const administrativeBlockingConflicts = snapshot.conflicts.filter(
		(conflict) => conflict.severity === "blocking",
	);
	const administrativeStageUnavailable =
		administrativeStage.applicability === "unknown" ||
		administrativeStage.state === "unknown";
	const administrativeStageExceptional =
		administrativeStageUnavailable ||
		administrativeStage.applicability === "conflict" ||
		administrativeStage.state === "conflict" ||
		administrativeStageConflicts.length > 0;
	if (administrativeCompletion && input.administrativeOverride) {
		const unsupportedConflicts = administrativeBlockingConflicts.filter(
			(conflict) =>
				!administrativeStageConflicts.includes(conflict) ||
				!supportedAdministrativeConflictCodes.has(conflict.code),
		);
		if (unsupportedConflicts.length > 0) {
			return {
				...base,
				status: "rejected",
				reasons: [
					"ADMINISTRATIVE_OVERRIDE_EXCEPTION_NOT_SUPPORTED",
					...unsupportedConflicts.map((conflict) => conflict.code),
				],
			};
		}
		if (administrativeStage.applicability === "not_required") {
			return {
				...base,
				status: "rejected",
				reasons: ["STAGE_NOT_REQUIRED"],
			};
		}
		if (!exceptionalHeadline || !administrativeStageExceptional) {
			return {
				...base,
				status: "rejected",
				reasons: ["ADMINISTRATIVE_OVERRIDE_STAGE_NOT_EXCEPTIONAL"],
			};
		}
		if (!input.administrativeOverrideReason?.trim()) {
			return {
				...base,
				status: "rejected",
				reasons: ["ADMINISTRATIVE_OVERRIDE_REASON_REQUIRED"],
			};
		}
		return {
			...base,
			status: "ready",
			reasons: [
				"ADMINISTRATIVE_OVERRIDE",
				...(administrativeStageUnavailable
					? ["STATUS_UNAVAILABLE"]
					: administrativeStageConflicts.map((conflict) => conflict.code)),
			],
		};
	}
	if (administrativeCompletion && exceptionalHeadline) {
		return {
			...base,
			status: "review_required",
			reasons: ["ADMINISTRATIVE_OVERRIDE_REQUIRED"],
		};
	}
	// Review resolution is the audited path for converging review-owned
	// conflicts. It must remain available when the conflict itself is what the
	// operator is resolving.
	if (input.action === "production.review.resolve") {
		return snapshot.evidence.production.submissions.some(
			(submission) =>
				submission.active && submission.reviewStatus === "PENDING",
		)
			? { ...base, status: "ready", reasons: [] }
			: {
					...base,
					status: "replay",
					reasons: ["NO_PENDING_PRODUCTION_REVIEW"],
				};
	}
	const hasBlockingConflict = snapshot.conflicts.some(
		(conflict) => conflict.severity === "blocking",
	);
	if (hasBlockingConflict) {
		return {
			...base,
			status: "review_required",
			reasons: snapshot.conflicts.map((conflict) => conflict.code),
		};
	}

	const cancelling = input.action.endsWith("cancel");
	const productionMutation = [
		"production.assign",
		"production.unassign",
		"production.submit",
		"production.submission.update",
		"production.submission.delete",
		"production.review.resolve",
		"production.reschedule",
	].includes(input.action);
	const fulfillmentMutation = [
		"fulfillment.pack",
		"fulfillment.unpack",
		"fulfillment.start_dispatch",
		"fulfillment.complete_dispatch",
		"fulfillment.sign_packing_slip",
		"fulfillment.reschedule",
	].includes(input.action);
	const administrativeCancellation = input.action.endsWith(
		"administrative_cancel",
	);
	if (
		production &&
		!cancelling &&
		["completed", "administratively_completed"].includes(
			snapshot.production.state,
		)
	) {
		return { ...base, status: "replay", reasons: ["ALREADY_COMPLETED"] };
	}
	if (
		!production &&
		!cancelling &&
		["fulfilled", "administratively_completed"].includes(
			snapshot.fulfillment.state,
		)
	) {
		return { ...base, status: "replay", reasons: ["ALREADY_FULFILLED"] };
	}
	if (administrativeCancellation) {
		const state = production
			? snapshot.production.state
			: snapshot.fulfillment.state;
		return state === "administratively_completed"
			? { ...base, status: "ready", reasons: [] }
			: {
					...base,
					status: "rejected",
					reasons: ["NO_ACTIVE_ADMINISTRATIVE_COMPLETION"],
				};
	}
	if (administrativeCompletion) {
		const applicability = production
			? snapshot.production.applicability
			: snapshot.fulfillment.applicability;
		if (applicability === "conflict") {
			return {
				...base,
				status: "review_required",
				reasons: ["STAGE_APPLICABILITY_CONFLICT"],
			};
		}
		if (applicability === "not_required") {
			return {
				...base,
				status: "rejected",
				reasons: ["STAGE_NOT_REQUIRED"],
			};
		}
		return { ...base, status: "ready", reasons: [] };
	}
	if (input.action === "production.unassign") {
		return snapshot.production.assignmentIds.length
			? { ...base, status: "ready", reasons: [] }
			: { ...base, status: "replay", reasons: ["NO_ACTIVE_ASSIGNMENTS"] };
	}
	if (input.action === "production.submit") {
		return snapshot.production.assignmentIds.length
			? { ...base, status: "ready", reasons: [] }
			: {
					...base,
					status: "rejected",
					reasons: ["PRODUCTION_ASSIGNMENT_REQUIRED"],
				};
	}
	if (
		input.action === "production.submission.update" ||
		input.action === "production.submission.delete"
	) {
		return snapshot.evidence.production.submissions.some(
			(submission) => submission.active,
		)
			? { ...base, status: "ready", reasons: [] }
			: { ...base, status: "replay", reasons: ["NO_ACTIVE_SUBMISSIONS"] };
	}
	if (input.action === "fulfillment.pack") {
		return snapshot.fulfillment.requiredQty > snapshot.fulfillment.packedQty
			? { ...base, status: "ready", reasons: [] }
			: { ...base, status: "replay", reasons: ["ALREADY_PACKED"] };
	}
	if (input.action === "fulfillment.unpack") {
		return snapshot.fulfillment.packedQty > 0
			? { ...base, status: "ready", reasons: [] }
			: { ...base, status: "replay", reasons: ["NOTHING_PACKED"] };
	}
	if (input.action === "fulfillment.start_dispatch") {
		if (!snapshot.fulfillment.dispatchIds.length) {
			return {
				...base,
				status: "rejected",
				reasons: ["DISPATCH_REQUIRED"],
			};
		}
		if (snapshot.packing.state !== "packed") {
			return {
				...base,
				status: "rejected",
				reasons: ["PACKING_INCOMPLETE"],
			};
		}
		return { ...base, status: "ready", reasons: [] };
	}
	if (input.action === "fulfillment.complete_dispatch") {
		return snapshot.dispatch.activeDispatchIds.length > 0 &&
			["in_transit", "partial"].includes(snapshot.dispatch.state)
			? { ...base, status: "ready", reasons: [] }
			: {
					...base,
					status: "rejected",
					reasons: ["DISPATCH_NOT_IN_PROGRESS"],
				};
	}
	if (input.action === "fulfillment.sign_packing_slip") {
		return snapshot.fulfillment.dispatchIds.length > 0
			? { ...base, status: "ready", reasons: [] }
			: {
					...base,
					status: "rejected",
					reasons: ["DISPATCH_REQUIRED"],
				};
	}
	if (productionMutation || fulfillmentMutation) {
		const applicability = production
			? snapshot.production.applicability
			: snapshot.fulfillment.applicability;
		if (applicability === "not_required") {
			return {
				...base,
				status: "rejected",
				reasons: ["STAGE_NOT_REQUIRED"],
			};
		}
		return { ...base, status: "ready", reasons: [] };
	}
	const capability = production
		? cancelling
			? snapshot.capabilities.cancelProduction
			: snapshot.capabilities.markProductionCompleted
		: cancelling
			? snapshot.capabilities.cancelFulfillment
			: snapshot.capabilities.markFulfilled;
	if (!capability.allowed) {
		return {
			...base,
			status: "rejected",
			reasons: capability.reasons.length
				? capability.reasons
				: ["ACTION_NOT_ALLOWED"],
		};
	}
	return { ...base, status: "ready", reasons: [] };
}
