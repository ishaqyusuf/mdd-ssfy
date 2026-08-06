import type { TRPCContext } from "@api/trpc/init";
import {
	assignInventoryDispatchAllocations,
	packInventoryDispatchAllocations,
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
	const blockingComponents: Array<{ componentId: number; missingQty: number }> = [];

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

export async function prepareAndPickDispatchInventory(
	db: TRPCContext["db"],
	input: { salesOrderId: number; orderDeliveryId: number },
) {
	const before = await getDispatchInventoryManifest(db, input);
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

	const assignment = plan.selections.length
		? await assignInventoryDispatchAllocations(db, {
				salesOrderId: input.salesOrderId,
				orderDeliveryId: input.orderDeliveryId,
				allocationSelections: plan.selections,
				note: "Reserved for warehouse dispatch packing.",
			})
		: null;
	const picking = await packInventoryDispatchAllocations(db, {
		salesOrderId: input.salesOrderId,
		orderDeliveryId: input.orderDeliveryId,
		note: "Picked during warehouse dispatch packing.",
	});
	const after = await getDispatchInventoryManifest(db, input);
	if (after.lines.some((line) => line.readiness !== "ready_to_load")) {
		throw new Error("INVENTORY_DISPATCH_NOT_READY_AFTER_PICK");
	}

	return {
		executionMode: "inventory" as const,
		manifestRevision: after.revision,
		assignedCount: assignment?.transitionedCount || 0,
		pickedCount: picking.transitionedCount,
	};
}
