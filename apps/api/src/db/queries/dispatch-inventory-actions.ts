import type { TRPCContext } from "@api/trpc/init";
import { Prisma, type TransactionClient } from "@gnd/db";
import { dispatchItemQuantity } from "@gnd/sales/dispatch-manifest/inventory-quantities";
import { lockAndAssertNoPendingPackingReports } from "@gnd/sales/packing-report-review";
import {
	assignInventoryDispatchAllocationsInTransaction,
	packInventoryDispatchAllocationsInTransaction,
} from "@gnd/sales/sales-fulfillment-plan";

import { getDispatchInventoryManifest } from "./dispatch-inventory";

type InventoryManifestLine = Awaited<
	ReturnType<typeof getDispatchInventoryManifest>
>["lines"][number];

function quantity(value: unknown) {
	return Math.round((Number(value || 0) + Number.EPSILON) * 1000) / 1000;
}
export function buildDispatchInventoryAllocationSelections(
	lines: Array<Pick<InventoryManifestLine, "salesItemId" | "components">>,
) {
	const selections: Array<{ allocationId: number; qty: number }> = [];
	const blockingComponents: Array<{ componentId: number; missingQty: number }> =
		[];

	for (const line of lines) {
		for (const component of line.components) {
			if (!component.required) continue;
			const committedQty = component.allocations
				.filter((allocation) =>
					["approved", "reserved", "picked", "consumed"].includes(
						allocation.status,
					),
				)
				.reduce((total, allocation) => total + quantity(allocation.qty), 0);
			let missingQty = quantity(component.requiredQty - committedQty);
			for (const allocation of component.availableAllocations) {
				if (missingQty <= 0) break;
				const selectedQty = quantity(
					Math.min(missingQty, quantity(allocation.qty)),
				);
				if (selectedQty <= 0) continue;
				selections.push({ allocationId: allocation.id, qty: selectedQty });
				missingQty = quantity(missingQty - selectedQty);
			}
			if (missingQty > 0) {
				blockingComponents.push({ componentId: component.id, missingQty });
			}
		}
	}

	return { selections, blockingComponents };
}

type PrepareDispatchInventoryInput = {
	salesOrderId: number;
	orderDeliveryId: number;
	items?: Array<{
		salesItemId: number;
		qty?: number | null;
		lhQty?: number | null;
		rhQty?: number | null;
	}>;
};

export async function prepareAndPickDispatchInventoryInTransaction(
	tx: TransactionClient,
	input: PrepareDispatchInventoryInput,
) {
	const requestedItems = input.items?.map((item) => ({
		...item,
		qty: Number(item.qty || 0),
		lhQty: Number(item.lhQty || 0),
		rhQty: Number(item.rhQty || 0),
	}));
	if (
		requestedItems?.some(
			(item) =>
				!Number.isFinite(dispatchItemQuantity(item)) ||
				dispatchItemQuantity(item) <= 0,
		)
	) {
		throw new Error("INVENTORY_DISPATCH_INVALID_ITEM_QUANTITY");
	}

	await lockAndAssertNoPendingPackingReports(tx, {
		dispatchId: input.orderDeliveryId,
		salesOrderId: input.salesOrderId,
	});
	const delivery = await tx.orderDelivery.findFirst({
		where: {
			id: input.orderDeliveryId,
			salesOrderId: input.salesOrderId,
			deletedAt: null,
		},
		select: { id: true, status: true },
	});
	if (!delivery) throw new Error("INVENTORY_DISPATCH_NOT_FOUND");
	if (["completed", "delivered", "cancelled"].includes(delivery.status || "")) {
		throw new Error("INVENTORY_DISPATCH_TERMINAL");
	}

	const before = await getDispatchInventoryManifest(tx as TRPCContext["db"], {
		...input,
		requestedItems,
	});
	if (!before.scope.resolved && before.scope.inventoryLineCount > 0) {
		throw new Error("INVENTORY_DISPATCH_SCOPE_UNRESOLVED");
	}
	if (!before.lines.length) {
		return {
			executionMode: "legacy" as const,
			manifestRevision: before.revision,
			assignedCount: 0,
			pickedCount: 0,
		};
	}
	const plan = buildDispatchInventoryAllocationSelections(before.lines);
	if (plan.blockingComponents.length) {
		throw new Error(
			`INVENTORY_DISPATCH_STOCK_SHORTAGE:${plan.blockingComponents
				.map((component) => `${component.componentId}:${component.missingQty}`)
				.join(",")}`,
		);
	}

	for (const line of before.lines) {
		if (!line.salesItemId) {
			throw new Error("INVENTORY_DISPATCH_SALES_ITEM_REQUIRED");
		}
		const activeItems = await tx.orderItemDelivery.findMany({
			where: {
				orderDeliveryId: input.orderDeliveryId,
				orderId: input.salesOrderId,
				orderItemId: line.salesItemId,
				deletedAt: null,
				packingStatus: { not: "unpacked" },
			},
			select: { qty: true, lhQty: true, rhQty: true },
		});
		const scopedQty = activeItems.reduce(
			(total, item) => total + dispatchItemQuantity(item),
			0,
		);
		const missingQty = quantity(line.dispatchItemQty - scopedQty);
		if (missingQty < 0) {
			throw new Error("INVENTORY_DISPATCH_SCOPE_REDUCTION_REQUIRES_RESET");
		}
		if (missingQty > 0) {
			await tx.orderItemDelivery.create({
				data: {
					orderItemId: line.salesItemId,
					orderId: input.salesOrderId,
					orderDeliveryId: input.orderDeliveryId,
					qty: missingQty,
					status: "completed",
					packingStatus: "packed",
					packedBy: "Warehouse inventory",
					note: "Inventory-backed dispatch scope",
					meta: {
						source: "inventory_dispatch",
						lineItemId: line.lineItemId,
						manifestRevision: before.revision,
					},
				},
			});
		}
	}

	const scoped = await getDispatchInventoryManifest(
		tx as TRPCContext["db"],
		input,
	);
	const scopedPlan = buildDispatchInventoryAllocationSelections(scoped.lines);
	if (scopedPlan.blockingComponents.length) {
		throw new Error("INVENTORY_DISPATCH_SCOPE_CHANGED_DURING_PREPARE");
	}

	const assignment = scopedPlan.selections.length
		? await assignInventoryDispatchAllocationsInTransaction(tx, {
				salesOrderId: input.salesOrderId,
				orderDeliveryId: input.orderDeliveryId,
				allocationSelections: scopedPlan.selections,
				note: "Reserved for warehouse dispatch packing.",
			})
		: null;
	const picking = await packInventoryDispatchAllocationsInTransaction(tx, {
		salesOrderId: input.salesOrderId,
		orderDeliveryId: input.orderDeliveryId,
		note: "Picked during warehouse dispatch packing.",
	});
	const after = await getDispatchInventoryManifest(
		tx as TRPCContext["db"],
		input,
	);
	if (after.lines.some((line) => line.readiness !== "ready_to_load")) {
		throw new Error("INVENTORY_DISPATCH_NOT_READY_AFTER_PICK");
	}
	const updated = await tx.orderDelivery.updateMany({
		where: {
			id: input.orderDeliveryId,
			salesOrderId: input.salesOrderId,
			deletedAt: null,
			status: { in: ["queue", "missing items", "packed"] },
		},
		data: { status: "packed", deliveredAt: null },
	});
	if (updated.count !== 1) {
		throw new Error("INVENTORY_DISPATCH_SCOPE_CHANGED_DURING_PREPARE");
	}

	return {
		executionMode: "inventory" as const,
		manifestRevision: after.revision,
		assignedCount: assignment?.transitionedCount || 0,
		pickedCount: picking.transitionedCount,
	};
}

export async function prepareAndPickDispatchInventory(
	db: TRPCContext["db"],
	input: PrepareDispatchInventoryInput,
) {
	return db.$transaction(
		(tx) => prepareAndPickDispatchInventoryInTransaction(tx, input),
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			maxWait: 5_000,
			timeout: 30_000,
		},
	);
}
