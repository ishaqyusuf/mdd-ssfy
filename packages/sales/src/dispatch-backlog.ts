import type { Prisma } from "@gnd/db";
import { buildOpenDispatchFulfillmentCandidateWhere } from "./sales-pipeline-query";

/** Candidate predicate only. Resolve quantity membership before pagination/counts. */
export function buildSalesDispatchBacklogWhere(
	deliveryModes: readonly string[] = ["delivery", "pickup"],
): Prisma.SalesOrdersWhereInput {
	return {
		AND: [
			buildOpenDispatchFulfillmentCandidateWhere(),
			{ deliveryOption: { in: [...deliveryModes] } },
		],
	};
}

/** First-dispatch picker scope. Existing dispatch work remains in backlog. */
export function buildSalesDispatchCreationWhere(
	deliveryModes: readonly string[] = ["delivery", "pickup"],
): Prisma.SalesOrdersWhereInput {
	return {
		AND: [
			buildSalesDispatchBacklogWhere(deliveryModes),
			{ deliveredAt: null },
			{
				deliveries: {
					none: { deletedAt: null, status: { notIn: ["cancelled"] } },
				},
			},
		],
	};
}
