import type { TRPCContext } from "@api/trpc/init";
import type { TransactionClient } from "@gnd/db";
import {
	approveBulkStockAllocation,
	approveStockAllocation,
	rejectStockAllocation,
} from "@gnd/inventory";
import type {
	ApproveStockAllocation,
	BulkApproveStockAllocation,
	RejectStockAllocation,
} from "@gnd/inventory/schema";
import { getSalesOrderLifecycleStatusInfo } from "@gnd/sales/order-status";
import {
	resolveSalesInventoryFulfillmentStatus,
	resolveSalesInventoryOperationPolicy,
	resolveSalesInventoryOverviewSetupMode,
} from "@gnd/sales/sales-inventory-policy";

type AllocationGuardDb = TRPCContext["db"] | TransactionClient;

type AllocationGuardSale = {
	id: number;
	orderId: string;
	status: string | null;
	prodStatus: string | null;
	deliveries: Array<{
		status: string | null;
		_count: {
			items: number;
		};
	}>;
	stat: Array<{
		type: string;
		status: string | null;
		percentage: number | null;
	}>;
};

const allocationGuardSaleSelect = {
	id: true,
	orderId: true,
	status: true,
	prodStatus: true,
	deliveries: {
		where: {
			deletedAt: null,
		},
		select: {
			status: true,
			_count: {
				select: {
					items: true,
				},
			},
		},
	},
	stat: {
		where: {
			deletedAt: null,
			type: {
				in: ["dispatchCompleted", "dispatchInProgress", "dispatchAssigned"],
			},
		},
		select: {
			type: true,
			status: true,
			percentage: true,
		},
	},
} as const;

function assertSaleCanAllocateStock(sale: AllocationGuardSale) {
	const fulfillmentStatus = resolveSalesInventoryFulfillmentStatus({
		deliveries: sale.deliveries,
		stats: sale.stat,
	});
	const lifecycle = getSalesOrderLifecycleStatusInfo({
		orderStatus: sale.status,
		legacyProductionStatus: sale.prodStatus,
		fulfillmentStatus,
	});
	const setupMode = resolveSalesInventoryOverviewSetupMode({
		lifecycleStatus: lifecycle.status,
		inventoryRowCount: 1,
	});
	const policy = resolveSalesInventoryOperationPolicy({
		lifecycleStatus: lifecycle.status,
		setupMode,
	});

	if (!policy.capabilities.canAllocateStock) {
		throw new Error(
			policy.reason ||
				`Order ${sale.orderId} cannot mutate inventory stock allocations.`,
		);
	}
}

export async function assertStockAllocationRequestCanAllocate(
	db: AllocationGuardDb,
	allocationIds: number[],
) {
	const ids = Array.from(
		new Set(allocationIds.filter((id) => Number.isFinite(id))),
	);
	if (!ids.length) return;

	const allocations = await db.stockAllocation.findMany({
		where: {
			id: {
				in: ids,
			},
			deletedAt: null,
			status: "pending_review",
		},
		select: {
			lineItemComponent: {
				select: {
					parent: {
						select: {
							sale: {
								select: allocationGuardSaleSelect,
							},
						},
					},
				},
			},
		},
	});
	const salesById = new Map<number, AllocationGuardSale>();

	for (const allocation of allocations) {
		const sale = allocation.lineItemComponent.parent.sale;
		if (sale) salesById.set(sale.id, sale);
	}

	for (const sale of salesById.values()) {
		assertSaleCanAllocateStock(sale);
	}
}

export async function approveStockAllocationQuery(
	ctx: Pick<TRPCContext, "db">,
	input: ApproveStockAllocation,
) {
	return ctx.db.$transaction(async (tx) => {
		await assertStockAllocationRequestCanAllocate(tx, [input.allocationId]);
		return approveStockAllocation(tx, input);
	});
}

export async function rejectStockAllocationQuery(
	ctx: Pick<TRPCContext, "db">,
	input: RejectStockAllocation,
) {
	return ctx.db.$transaction(async (tx) => {
		await assertStockAllocationRequestCanAllocate(tx, [input.allocationId]);
		return rejectStockAllocation(tx, input);
	});
}

export async function approveBulkStockAllocationQuery(
	ctx: Pick<TRPCContext, "db">,
	input: BulkApproveStockAllocation,
) {
	return ctx.db.$transaction(async (tx) => {
		await assertStockAllocationRequestCanAllocate(tx, input.allocationIds);
		return approveBulkStockAllocation(tx, input);
	});
}
