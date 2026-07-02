import type { Db } from "@gnd/db";
import { getSalesInventoryOverview } from "./sales-inventory-overview";
import { syncSalesInventoryLineItems } from "./sync-sales-inventory-line-items";

export type SalesInventoryLegacyStatusSetupAction = "reset" | "override";

export type ResolveSalesInventoryLegacyStatusSetupInput = {
	salesOrderId: number;
	action: SalesInventoryLegacyStatusSetupAction;
	authorName?: string | null;
	triggeredByUserId?: number | null;
};

type ResolveSalesInventoryLegacyStatusSetupDeps = {
	getOverview?: typeof getSalesInventoryOverview;
	syncLineItems?: typeof syncSalesInventoryLineItems;
};

export async function resolveSalesInventoryLegacyStatusSetup(
	db: Db,
	input: ResolveSalesInventoryLegacyStatusSetupInput,
	deps: ResolveSalesInventoryLegacyStatusSetupDeps = {},
) {
	const getOverview = deps.getOverview ?? getSalesInventoryOverview;
	const syncLineItems = deps.syncLineItems ?? syncSalesInventoryLineItems;
	const overview = await getOverview(db, {
		salesOrderId: input.salesOrderId,
	});

	if (!overview) {
		throw new Error("Inventory status is not available for this order.");
	}

	if (overview.setupMode !== "legacy_status_locked") {
		throw new Error(
			"This order is not waiting on a manual inbound status review.",
		);
	}

	const previousInventoryStatus = overview.inventoryStatus ?? null;
	if (!previousInventoryStatus) {
		throw new Error("Inventory inbound status changed before setup could run.");
	}

	const result = await db.$transaction(async (tx) => {
		const statusGuard = {
			id: input.salesOrderId,
			inventoryStatus: previousInventoryStatus,
		};

		if (input.action === "reset") {
			const updated = await tx.salesOrders.updateMany({
				where: statusGuard,
				data: {
					inventoryStatus: null,
				},
			});

			if (updated.count !== 1) {
				throw new Error("Inventory inbound status changed before setup could run.");
			}
		} else {
			const currentOrder = await tx.salesOrders.findFirst({
				where: statusGuard,
				select: {
					id: true,
				},
			});

			if (!currentOrder) {
				throw new Error("Inventory inbound status changed before setup could run.");
			}
		}

		await tx.salesHistory.create({
			data: {
				salesId: input.salesOrderId,
				name:
					input.action === "reset"
						? "Inventory inbound status reset"
						: "Inventory inbound status override",
				authorName: input.authorName ?? "System",
				data: {
					type: "sales_inventory_legacy_status_setup",
					action: input.action,
					previousInventoryStatus,
					nextInventoryStatus:
						input.action === "reset" ? null : previousInventoryStatus,
					triggeredByUserId: input.triggeredByUserId ?? null,
				},
			},
		});

		return syncLineItems(tx, {
			salesOrderId: input.salesOrderId,
			source: "manual",
			triggeredByUserId: input.triggeredByUserId ?? null,
		});
	});

	return {
		...result,
		action: input.action,
		previousInventoryStatus,
	};
}
