import type { Prisma } from "@gnd/db";
import { salesOrderListProjectionVersion } from "./order-list-read-model";
import { getProductionQueueBoundaries } from "./production-date";
import type { CanonicalSalesPipelineFilter } from "./sales-pipeline";
import { SALES_PIPELINE_CONTRACT_VERSION } from "./sales-pipeline";

const terminalProduction = ["completed", "administratively_completed"];
const terminalFulfillment = ["fulfilled", "administratively_completed"];

const openProductionStates = [
	"not_assigned",
	"partially_assigned",
	"assigned",
	"in_production",
	"awaiting_review",
];
const openFulfillmentStates = [
	"backlog",
	"packing",
	"packed",
	"in_transit",
	"partially_fulfilled",
];

function projectionStateClauses(
	filter: CanonicalSalesPipelineFilter,
): Prisma.SalesOrderListProjectionWhereInput[] {
	const clauses: Prisma.SalesOrderListProjectionWhereInput[] = [];
	if (filter.production === "pending") {
		clauses.push({
			pipelineProductionState: {
				in: ["not_assigned", "partially_assigned", "assigned"],
			},
		});
	} else if (filter.production === "in progress") {
		clauses.push({
			pipelineProductionState: { in: ["in_production", "awaiting_review"] },
		});
	} else if (filter.production === "completed") {
		clauses.push({ pipelineProductionState: { in: terminalProduction } });
	}

	if (filter.productionStatus === "completed") {
		clauses.push({ pipelineProductionState: { in: terminalProduction } });
	} else if (filter.productionStatus === "not completed") {
		clauses.push({ pipelineProductionState: { in: openProductionStates } });
	} else if (
		["due today", "due tomorrow", "past due", "future", "unscheduled"].includes(
			filter.productionStatus || "",
		)
	) {
		clauses.push({ pipelineProductionState: { in: openProductionStates } });
	} else if (filter.productionStatus === "not assigned") {
		clauses.push({ pipelineProductionState: "not_assigned" });
	} else if (filter.productionStatus === "part assigned") {
		clauses.push({ pipelineProductionState: "partially_assigned" });
	} else if (filter.productionStatus === "all assigned") {
		clauses.push({
			pipelineProductionState: {
				in: [
					"assigned",
					"in_production",
					"awaiting_review",
					...terminalProduction,
				],
			},
		});
	}

	if (filter.productionAssignment === "not assigned") {
		clauses.push({ pipelineProductionState: "not_assigned" });
	} else if (filter.productionAssignment === "part assigned") {
		clauses.push({ pipelineProductionState: "partially_assigned" });
	} else if (filter.productionAssignment === "all assigned") {
		clauses.push({
			pipelineProductionState: {
				in: [
					"assigned",
					"in_production",
					"awaiting_review",
					...terminalProduction,
				],
			},
		});
	}

	if (filter.productionCompletion) {
		clauses.push({
			pipelineProductionState: {
				in:
					filter.productionCompletion === "completed"
						? terminalProduction
						: openProductionStates,
			},
		});
	}

	if (filter.dispatchStatus === "completed") {
		clauses.push({ pipelineFulfillmentState: { in: terminalFulfillment } });
	} else if (filter.dispatchStatus === "backorder") {
		clauses.push({ pipelineFulfillmentState: "partially_fulfilled" });
	} else if (
		filter.dispatchStatus === "pending" ||
		filter.dispatchStatus === "late"
	) {
		clauses.push({ pipelineFulfillmentState: { in: openFulfillmentStates } });
	}

	if (filter.fulfillmentCompletion) {
		clauses.push({
			pipelineFulfillmentState: {
				in:
					filter.fulfillmentCompletion === "completed"
						? terminalFulfillment
						: openFulfillmentStates,
			},
		});
	}
	return clauses;
}

function productionScheduleWhere(
	status: CanonicalSalesPipelineFilter["productionStatus"],
): Prisma.SalesOrdersWhereInput | null {
	const boundaries = getProductionQueueBoundaries();
	const dueDate =
		status === "due today"
			? boundaries.today
			: status === "due tomorrow"
				? boundaries.tomorrow
				: status === "past due"
					? boundaries.pastDue
					: status === "future"
						? boundaries.future
						: status === "unscheduled"
							? null
							: undefined;
	if (dueDate === undefined) return null;
	return {
		assignments: {
			some: {
				deletedAt: null,
				completedAt: null,
				dueDate,
			},
		},
	};
}

/**
 * Database predicate for canonical Sales Pipeline filters. The versioned list
 * projection supplies lifecycle state; narrow operational relations supply
 * schedule dates. Callers must not intersect this with legacy lifecycle SQL.
 */
export function buildCanonicalSalesPipelineFilterWhere(
	filter: CanonicalSalesPipelineFilter,
): Prisma.SalesOrdersWhereInput {
	const usesProduction = Boolean(
		filter.production ||
			filter.productionStatus ||
			filter.productionAssignment ||
			filter.productionCompletion,
	);
	const usesFulfillment = Boolean(
		filter.dispatchStatus || filter.fulfillmentCompletion,
	);
	const projection: Prisma.SalesOrderListProjectionWhereInput = {
		state: "ready",
		version: salesOrderListProjectionVersion(),
		pipelineContractVersion: SALES_PIPELINE_CONTRACT_VERSION,
		...(usesProduction ? { pipelineProductionApplicability: "required" } : {}),
		...(usesFulfillment
			? { pipelineFulfillmentApplicability: "required" }
			: {}),
		AND: projectionStateClauses(filter),
	};
	const schedule = productionScheduleWhere(filter.productionStatus);
	return {
		AND: [
			{ listProjection: { is: projection } },
			...(schedule ? [schedule] : []),
		],
	};
}

export type CustomerSalesPipelineStatus =
	| "processing"
	| "in-transit"
	| "delivered"
	| "cancelled";

export function isCustomerSalesPipelineStatus(
	value: string | null | undefined,
): value is CustomerSalesPipelineStatus {
	return ["processing", "in-transit", "delivered", "cancelled"].includes(
		value || "",
	);
}

export function buildCustomerSalesPipelineProjectionFilter(
	status: CustomerSalesPipelineStatus,
) {
	const terminalHeadlines = ["cancelled", "fulfilled", "in_transit"];
	return {
		contractVersion: SALES_PIPELINE_CONTRACT_VERSION,
		projectionVersion: salesOrderListProjectionVersion(),
		...(status === "delivered"
			? { headlineIn: ["fulfilled"] }
			: status === "in-transit"
				? { headlineIn: ["in_transit"] }
				: status === "cancelled"
					? { headlineIn: ["cancelled"] }
					: { headlineNotIn: terminalHeadlines }),
	};
}
