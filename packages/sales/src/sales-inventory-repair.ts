import type { Db, TransactionClient } from "@gnd/db";

import {
	AUTO_RELEASABLE_STOCK_ALLOCATION_STATUSES,
	MUTABLE_INBOUND_DEMAND_STATUSES,
} from "./sales-inventory-repair-policy";

type RepairDb = Db | TransactionClient;

function repairResidueComponentWhere(salesOrderId: number) {
	return {
		OR: [
			{
				parent: {
					is: {
						saleId: salesOrderId,
						deletedAt: { not: null },
					},
				},
			},
			{
				status: "cancelled" as const,
				parent: {
					is: {
						saleId: salesOrderId,
					},
				},
			},
		],
	};
}

export async function cleanupSalesInventoryRepairResidue(
	db: RepairDb,
	input: { salesOrderId: number },
) {
	const now = new Date();
	const lineItemComponent = {
		is: repairResidueComponentWhere(input.salesOrderId),
	};
	const [releasedAllocations, cancelledDemand] = await Promise.all([
		db.stockAllocation.updateMany({
			where: {
				deletedAt: null,
				status: {
					in: [...AUTO_RELEASABLE_STOCK_ALLOCATION_STATUSES],
				},
				lineItemComponent,
			},
			data: {
				status: "released",
				deletedAt: now,
			},
		}),
		db.inboundDemand.updateMany({
			where: {
				deletedAt: null,
				status: {
					in: [...MUTABLE_INBOUND_DEMAND_STATUSES],
				},
				qtyReceived: { lte: 0 },
				inboundShipmentItemId: null,
				lineItemComponent,
			},
			data: {
				status: "cancelled",
				deletedAt: now,
			},
		}),
	]);

	return {
		releasedAllocationCount: releasedAllocations.count,
		cancelledDemandCount: cancelledDemand.count,
	};
}
