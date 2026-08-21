import type { TRPCContext } from "@api/trpc/init";
import { requireAnyOperationalPermission } from "./operational-route-access";

export function requireSalesOverviewViewer(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		[
			"viewOrders",
			"editOrders",
			"viewEstimates",
			"editEstimates",
			"viewProduction",
			"editProduction",
			"viewDelivery",
			"editDelivery",
			"viewPickup",
			"editPickup",
			"viewPacking",
		],
		"You do not have permission to view sales order details.",
	);
}
