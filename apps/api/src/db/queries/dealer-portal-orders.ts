import type { Database } from "@gnd/db";
import {
	type DealerPortalSalesListInput,
	getDealerPortalSalesDocument,
	getDealerPortalSalesList,
} from "@gnd/db/queries";
import {
	buildCustomerSalesPipelineProjectionFilter,
	getSalesPipelineSnapshots,
	isCustomerSalesPipelineStatus,
	projectSalesPipelineForAudience,
	projectUnavailableSalesPipelineForAudience,
} from "@gnd/sales";

export function projectDealerFulfillmentStatus(input: {
	orderStatus: "preparing" | "ready" | "completed" | "exception";
	statusCode: string;
	fulfillmentState: string;
}) {
	if (input.orderStatus === "exception") return "exception" as const;
	if (
		input.statusCode === "delivered" ||
		["fulfilled", "administratively_completed"].includes(input.fulfillmentState)
	) {
		return "completed" as const;
	}
	if (input.fulfillmentState === "partially_fulfilled")
		return "partial" as const;
	if (
		input.statusCode === "in-transit" ||
		input.fulfillmentState === "in_transit"
	) {
		return "in_transit" as const;
	}
	return input.orderStatus;
}

function withCanonicalDealerPipeline<
	T extends {
		id: number;
		fulfillmentStatus: "preparing" | "ready" | "completed" | "exception";
	},
>(order: T, snapshot?: Parameters<typeof projectSalesPipelineForAudience>[0]) {
	const pipeline = snapshot
		? projectSalesPipelineForAudience(snapshot, "dealer")
		: projectUnavailableSalesPipelineForAudience();
	return {
		...order,
		pipeline,
		status: pipeline.status.code,
		statusLabel: pipeline.status.label,
		fulfillmentStatus: projectDealerFulfillmentStatus({
			orderStatus: order.fulfillmentStatus,
			statusCode: pipeline.status.code,
			fulfillmentState: pipeline.fulfillment.state,
		}),
	};
}

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
		data: result.data.map((order) =>
			withCanonicalDealerPipeline(order, snapshots.get(order.id)),
		),
	};
}

export async function getCanonicalDealerPortalOrder(
	db: Database,
	dealerId: number,
	id: number,
) {
	const order = await getDealerPortalSalesDocument(db, dealerId, id);
	if (order.type === "quote") return order;
	const snapshots = await getSalesPipelineSnapshots(db, [order.id]);
	return withCanonicalDealerPipeline(order, snapshots.get(order.id));
}
