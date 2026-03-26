import type { Db } from "@gnd/db";

import type { ProductionV2ListQuery } from "../contracts";
import { getSalesProductions } from "../../sales-production";

export async function getProductionListV2(
	db: Db,
	query: ProductionV2ListQuery,
) {
	const { scope, workerId, ...filters } = query;
	const resolvedWorkerId = scope === "worker" ? workerId : null;

	return getSalesProductions(db, {
		...filters,
		workerId: resolvedWorkerId,
		production: filters.production || "pending",
		size: filters.size || 50,
	});
}
