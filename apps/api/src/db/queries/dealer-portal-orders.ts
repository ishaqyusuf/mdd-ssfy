import type { Database } from "@gnd/db";
import {
	type DealerPortalSalesListInput,
	getDealerPortalSalesList,
} from "@gnd/db/queries";
import {
	buildCustomerSalesPipelineProjectionFilter,
	getSalesPipelineSnapshots,
	isCustomerSalesPipelineStatus,
	projectSalesPipelineForAudience,
	projectUnavailableSalesPipelineForAudience,
} from "@gnd/sales";

/**
 * Dealer order lifecycle adapter. Keeping membership and presentation together
 * prevents the route from becoming another Sales Pipeline authority.
 */
export async function getCanonicalDealerPortalOrders(
	db: Database,
	dealerId: number,
	input: DealerPortalSalesListInput,
) {
	const canonicalStatus = isCustomerSalesPipelineStatus(input.status)
		? input.status
		: null;
	const pipelineFilter = canonicalStatus
		? buildCustomerSalesPipelineProjectionFilter(canonicalStatus)
		: undefined;
	const result = await getDealerPortalSalesList(
		db,
		dealerId,
		"order",
		canonicalStatus ? { ...input, status: null } : input,
		pipelineFilter,
	);
	const snapshots = await getSalesPipelineSnapshots(
		db,
		result.data.map((order) => order.id),
	);
	return {
		...result,
		data: result.data.map((order) => {
			const snapshot = snapshots.get(order.id);
			const pipeline = snapshot
				? projectSalesPipelineForAudience(snapshot, "dealer")
				: projectUnavailableSalesPipelineForAudience();
			return {
				...order,
				pipeline,
				status: pipeline.status.code,
				statusLabel: pipeline.status.label,
				fulfillmentStatus:
					pipeline.status.code === "delivered"
						? "completed"
						: pipeline.status.code === "in-transit"
							? "ready"
							: "preparing",
			};
		}),
	};
}
