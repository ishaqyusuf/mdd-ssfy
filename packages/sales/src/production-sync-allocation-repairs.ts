import type { Db, TransactionClient } from "@gnd/db";
import { AppError } from "@gnd/errors";
import { validateProductionAllocationCoverage } from "./production-inbound-allocation";
import { recomputeLineItemComponentFulfillment } from "./sales-fulfillment-plan";

type Component = Parameters<typeof validateProductionAllocationCoverage>[0][number];
type ReceivedNeed = { componentId: number; inventoryVariantId: number; qty: number };

/** Pending suggestions are replaceable; committed allocations are never moved. */
export function planProductionAllocationRepairs(
	components: Component[],
	blockedComponentIds: number[],
	receivedNeeds: ReceivedNeed[],
) {
	return components.flatMap((component) => {
		if (!blockedComponentIds.includes(component.id)) return [];
		const pending = component.stockAllocations.filter((row) => row.status === "pending_review");
		const committed = component.stockAllocations.filter((row) => row.status !== "pending_review");
		if (!pending.length || !component.inventoryVariantId || !Number.isFinite(component.qty) || Number(component.qty) <= 0) return [];
		if (component.stockAllocations.some((row) => !Number.isFinite(row.qty) || row.qty < 0 || row.inventoryVariantId !== component.inventoryVariantId)) return [];
		const committedQty = committed.reduce((sum, row) => sum + row.qty, 0);
		if (committedQty > Number(component.qty) + 0.000001) return [];
		const remainingQty = Math.max(0, Number(component.qty) - committedQty);
		const received = receivedNeeds.find((need) => need.componentId === component.id && need.inventoryVariantId === component.inventoryVariantId);
		// Require evidence for the entire gap before discarding any proposal.
		if (remainingQty > (received?.qty ?? 0) + 0.000001) return [];
		return [{
			componentId: component.id,
			inventoryVariantId: component.inventoryVariantId,
			qty: remainingQty,
			allocationIds: pending.map((row) => row.id),
		}];
	});
}

export async function applyProductionAllocationRepairs(
	tx: Db | TransactionClient,
	repairs: ReturnType<typeof planProductionAllocationRepairs>,
) {
	for (const repair of repairs) {
		const result = await tx.stockAllocation.updateMany({
			where: { id: { in: repair.allocationIds }, lineItemComponentId: repair.componentId, status: "pending_review", deletedAt: null },
			data: { status: "cancelled" },
		});
		if (result.count !== repair.allocationIds.length) throw new AppError({ code: "CONFLICT", publicMessage: "Material suggestions changed. Refresh and try again." });
		await recomputeLineItemComponentFulfillment(tx, repair.componentId);
	}
}

export async function verifyProductionAllocationRepairs(tx: Db | TransactionClient, repairs: ReturnType<typeof planProductionAllocationRepairs>) {
	for (const repair of repairs) {
		const component = await tx.lineItemComponents.findUniqueOrThrow({ where: { id: repair.componentId }, select: { qty: true, stockAllocations: { where: { deletedAt: null, status: { in: ["approved", "reserved", "picked", "consumed"] } }, select: { qty: true } } } });
		const allocated = component.stockAllocations.reduce((sum, row) => sum + row.qty, 0);
		if (Math.abs(allocated - Number(component.qty)) > 0.000001) throw new AppError({ code: "CONFLICT", publicMessage: "Received material could not replace the stale suggestions. Nothing was applied." });
	}
}
