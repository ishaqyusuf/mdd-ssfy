import type { TRPCContext } from "@api/trpc/init";
import { assignInventoryDispatchAllocations } from "@gnd/sales/sales-fulfillment-plan";

import { getDispatchInventoryManifest } from "./dispatch-inventory";
import { buildDispatchInventoryAllocationSelections } from "./dispatch-inventory-actions";

type AllocationIssueInput = {
	allocationStatus: string;
	allocationSaleId: number | null;
	dispatchSaleId: number | null;
	dispatchStatus: string | null;
	dispatchDeleted: boolean;
};

export function classifyDispatchAllocationIssue(input: AllocationIssueInput) {
	if (input.allocationSaleId !== input.dispatchSaleId)
		return "cross_sale_binding";
	if (input.dispatchDeleted) return "deleted_dispatch_holds_stock";
	if (
		input.dispatchStatus === "cancelled" &&
		["approved", "reserved", "picked"].includes(input.allocationStatus)
	) {
		return "cancelled_dispatch_holds_stock";
	}
	if (
		["completed", "delivered"].includes(input.dispatchStatus || "") &&
		input.allocationStatus !== "consumed"
	) {
		return "completed_dispatch_not_consumed";
	}
	if (
		!["completed", "delivered"].includes(input.dispatchStatus || "") &&
		input.allocationStatus === "consumed"
	) {
		return "inventory_consumed_before_completion";
	}
	return null;
}

export function shouldApplyDispatchInventoryBackfillCandidate(input: {
	allocationSelections: unknown[];
	blockingComponents: unknown[];
}) {
	return (
		input.blockingComponents.length === 0 &&
		input.allocationSelections.length > 0
	);
}

export async function getDispatchInventoryReconciliation(
	db: TRPCContext["db"],
	input: { orderDeliveryId?: number; salesOrderId?: number; limit: number },
) {
	const allocations = await db.stockAllocation.findMany({
		where: {
			orderDeliveryId: input.orderDeliveryId || { not: null },
			deletedAt: null,
			lineItemComponent: {
				parent: { saleId: input.salesOrderId || undefined },
			},
		},
		orderBy: { id: "asc" },
		take: input.limit,
		select: {
			id: true,
			qty: true,
			status: true,
			orderDeliveryId: true,
			lineItemComponent: { select: { parent: { select: { saleId: true } } } },
			orderDelivery: {
				select: { salesOrderId: true, status: true, deletedAt: true },
			},
		},
	});
	const issues = allocations.flatMap((allocation) => {
		const issue = classifyDispatchAllocationIssue({
			allocationStatus: allocation.status,
			allocationSaleId: allocation.lineItemComponent.parent.saleId,
			dispatchSaleId: allocation.orderDelivery?.salesOrderId || null,
			dispatchStatus: allocation.orderDelivery?.status || null,
			dispatchDeleted: Boolean(allocation.orderDelivery?.deletedAt),
		});
		return issue
			? [
					{
						issue,
						allocationId: allocation.id,
						orderDeliveryId: allocation.orderDeliveryId,
						qty: Number(allocation.qty || 0),
					},
				]
			: [];
	});
	return {
		scannedCount: allocations.length,
		issueCount: issues.length,
		issues,
	};
}

export async function backfillDispatchInventoryBindings(
	db: TRPCContext["db"],
	input: { dryRun: boolean; limit: number },
) {
	const allocations = await db.stockAllocation.findMany({
		where: {
			deletedAt: null,
			orderDeliveryId: null,
			status: { in: ["approved", "reserved"] },
			lineItemComponent: {
				parent: {
					deletedAt: null,
					lineItemType: "SALE",
					saleId: { not: null },
				},
			},
		},
		orderBy: { id: "asc" },
		take: input.limit,
		select: {
			id: true,
			lineItemComponent: { select: { parent: { select: { saleId: true } } } },
		},
	});
	const saleIds = [
		...new Set(
			allocations
				.map((allocation) => allocation.lineItemComponent.parent.saleId)
				.filter((id): id is number => Boolean(id)),
		),
	];
	const dispatches = await db.orderDelivery.findMany({
		where: {
			salesOrderId: { in: saleIds },
			deletedAt: null,
			status: { in: ["queue", "packed", "in progress"] },
		},
		orderBy: { id: "asc" },
		select: { id: true, salesOrderId: true },
	});
	const dispatchesBySale = new Map<number, number[]>();
	for (const dispatch of dispatches) {
		dispatchesBySale.set(dispatch.salesOrderId, [
			...(dispatchesBySale.get(dispatch.salesOrderId) || []),
			dispatch.id,
		]);
	}
	const candidateDispatches = saleIds.flatMap((salesOrderId) => {
		const dispatchIds = dispatchesBySale.get(salesOrderId) || [];
		const orderDeliveryId = dispatchIds[0];
		if (dispatchIds.length !== 1 || !orderDeliveryId) return [];
		return [
			{
				salesOrderId,
				orderDeliveryId,
			},
		];
	});
	const candidates = [] as Array<{
		salesOrderId: number;
		orderDeliveryId: number;
		allocationSelections: Array<{ allocationId: number; qty: number }>;
		blockingComponents: Array<{ componentId: number; missingQty: number }>;
	}>;
	for (const candidate of candidateDispatches) {
		const manifest = await getDispatchInventoryManifest(db, candidate);
		const eligibleAllocationIds = new Set(
			allocations
				.filter(
					(allocation) =>
						allocation.lineItemComponent.parent.saleId ===
						candidate.salesOrderId,
				)
				.map((allocation) => allocation.id),
		);
		const plan = buildDispatchInventoryAllocationSelections(
			manifest.lines.map((line) => ({
				...line,
				components: line.components.map((component) => ({
					...component,
					availableAllocations: component.availableAllocations.filter(
						(allocation) => eligibleAllocationIds.has(allocation.id),
					),
				})),
			})),
		);
		candidates.push({
			...candidate,
			allocationSelections: plan.selections,
			blockingComponents: plan.blockingComponents,
		});
	}
	const ambiguousSalesOrderIds = saleIds.filter(
		(salesOrderId) => (dispatchesBySale.get(salesOrderId) || []).length !== 1,
	);

	if (!input.dryRun) {
		for (const candidate of candidates) {
			if (!shouldApplyDispatchInventoryBackfillCandidate(candidate)) continue;
			await assignInventoryDispatchAllocations(db, {
				salesOrderId: candidate.salesOrderId,
				orderDeliveryId: candidate.orderDeliveryId,
				allocationSelections: candidate.allocationSelections,
				note: "Bound by dispatch inventory migration backfill.",
			});
		}
	}
	return {
		dryRun: input.dryRun,
		candidateCount: candidates.length,
		allocationCount: candidates.reduce(
			(total, candidate) => total + candidate.allocationSelections.length,
			0,
		),
		ambiguousSalesOrderIds,
		candidates,
	};
}
