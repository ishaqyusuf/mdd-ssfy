import type { Prisma } from "@gnd/db";
import { buildOpenDispatchFulfillmentCandidateWhere } from "./sales-pipeline-query";

/** Candidate predicate only. Resolve quantity membership before pagination/counts. */
export function buildSalesDispatchBacklogWhere(
 deliveryModes: readonly string[] = ["delivery", "pickup"],
): Prisma.SalesOrdersWhereInput {
 return { AND: [buildOpenDispatchFulfillmentCandidateWhere(), { deliveryOption: { in: [...deliveryModes] } }] };
}
