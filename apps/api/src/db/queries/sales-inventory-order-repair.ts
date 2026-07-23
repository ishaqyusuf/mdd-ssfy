import type { Db, Prisma, TransactionClient } from "@gnd/db";
import { recomputeLineItemComponentDemandState } from "@gnd/sales/sales-inventory-mark-as-preflight";
import {
	canAutoCancelInboundDemand,
	canAutoReleaseStockAllocation,
} from "@gnd/sales/sales-inventory-repair-policy";

type RepairDb = Db | TransactionClient;

type RepairComponent = {
	componentId: number;
	lineItemId: number;
	lineItemDeleted: boolean;
	lineItemTitle: string | null;
	componentName: string;
	categoryName: string | null;
	variantName: string;
};

export type SalesInventoryOrderRepairDemandBaseline = {
	id: number;
	lineItemComponentId: number;
	status: string;
	qty: number;
	qtyReceived: number;
	inboundShipmentItemId: number | null;
};

export type SalesInventoryOrderRepairAllocationBaseline = {
	id: number;
	lineItemComponentId: number;
	status: string;
	qty: number;
};

export type SalesInventoryOrderRepairPreview = {
	salesOrderId: number;
	orderId: string;
	componentCount: number;
	actionableDemand: Array<
		SalesInventoryOrderRepairDemandBaseline &
			RepairComponent & {
				inboundId: number | null;
			}
	>;
	reviewDemand: Array<
		SalesInventoryOrderRepairDemandBaseline &
			RepairComponent & {
				inboundId: number | null;
				reason: "linked_inbound" | "received" | "non_mutable";
			}
	>;
	actionableAllocations: Array<
		SalesInventoryOrderRepairAllocationBaseline & RepairComponent
	>;
	reviewAllocations: Array<
		SalesInventoryOrderRepairAllocationBaseline &
			RepairComponent & {
				reason: "picked_or_consumed" | "non_mutable";
			}
	>;
};

const repairComponentSelect = {
	id: true,
	qty: true,
	parent: {
		select: {
			id: true,
			title: true,
			deletedAt: true,
		},
	},
	inventoryCategory: {
		select: {
			title: true,
		},
	},
	inventory: {
		select: {
			name: true,
		},
	},
	inventoryVariant: {
		select: {
			uid: true,
			sku: true,
			description: true,
		},
	},
	inboundDemands: {
		where: {
			deletedAt: null,
		},
		select: {
			id: true,
			qty: true,
			qtyReceived: true,
			status: true,
			inboundShipmentItemId: true,
			inboundShipmentItem: {
				select: {
					inboundId: true,
				},
			},
		},
	},
	stockAllocations: {
		where: {
			deletedAt: null,
			status: {
				notIn: ["released", "cancelled"],
			},
		},
		select: {
			id: true,
			qty: true,
			status: true,
		},
	},
} satisfies Prisma.LineItemComponentsSelect;

function componentLabel(component: {
	inventory?: { name: string | null } | null;
	inventoryCategory?: { title: string | null } | null;
	inventoryVariant?: {
		uid: string | null;
		sku: string | null;
		description: string | null;
	} | null;
	parent: { id: number; title: string | null; deletedAt: Date | null };
	id: number;
}): RepairComponent {
	return {
		componentId: component.id,
		lineItemId: component.parent.id,
		lineItemDeleted: component.parent.deletedAt != null,
		lineItemTitle: component.parent.title,
		componentName: component.inventory?.name || `Component #${component.id}`,
		categoryName: component.inventoryCategory?.title ?? null,
		variantName:
			component.inventoryVariant?.description ||
			component.inventoryVariant?.sku ||
			component.inventoryVariant?.uid ||
			"Unknown variant",
	};
}

async function findRepairComponents(db: RepairDb, salesOrderId: number) {
	return db.lineItemComponents.findMany({
		where: {
			parent: {
				saleId: salesOrderId,
			},
			OR: [
				{ inboundDemands: { some: { deletedAt: null } } },
				{
					stockAllocations: {
						some: {
							deletedAt: null,
							status: { notIn: ["released", "cancelled"] },
						},
					},
				},
			],
		},
		select: repairComponentSelect,
	});
}

export async function getSalesInventoryOrderRepairPreview(
	db: RepairDb,
	input: { salesOrderId: number },
): Promise<SalesInventoryOrderRepairPreview> {
	const sale = await db.salesOrders.findFirstOrThrow({
		where: {
			id: input.salesOrderId,
			type: "order",
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
		},
	});
	const components = await findRepairComponents(db, sale.id);
	const actionableDemand: SalesInventoryOrderRepairPreview["actionableDemand"] =
		[];
	const reviewDemand: SalesInventoryOrderRepairPreview["reviewDemand"] = [];
	const actionableAllocations: SalesInventoryOrderRepairPreview["actionableAllocations"] =
		[];
	const reviewAllocations: SalesInventoryOrderRepairPreview["reviewAllocations"] =
		[];

	for (const component of components) {
		const labels = componentLabel(component);
		for (const demand of component.inboundDemands) {
			const row = {
				id: demand.id,
				lineItemComponentId: component.id,
				status: demand.status,
				qty: Number(demand.qty || 0),
				qtyReceived: Number(demand.qtyReceived || 0),
				inboundShipmentItemId: demand.inboundShipmentItemId,
				inboundId: demand.inboundShipmentItem?.inboundId ?? null,
				...labels,
			};
			if (canAutoCancelInboundDemand(row)) {
				actionableDemand.push(row);
			} else {
				reviewDemand.push({
					...row,
					reason:
						row.inboundShipmentItemId != null
							? "linked_inbound"
							: row.qtyReceived > 0
								? "received"
								: "non_mutable",
				});
			}
		}
		for (const allocation of component.stockAllocations) {
			const row = {
				id: allocation.id,
				lineItemComponentId: component.id,
				status: allocation.status,
				qty: Number(allocation.qty || 0),
				...labels,
			};
			if (canAutoReleaseStockAllocation(row.status)) {
				actionableAllocations.push(row);
			} else {
				reviewAllocations.push({
					...row,
					reason:
						row.status === "picked" || row.status === "consumed"
							? "picked_or_consumed"
							: "non_mutable",
				});
			}
		}
	}

	return {
		salesOrderId: sale.id,
		orderId: sale.orderId,
		componentCount: components.length,
		actionableDemand,
		reviewDemand,
		actionableAllocations,
		reviewAllocations,
	};
}

function sameNumber(left: number | null | undefined, right: number) {
	return Number(left || 0) === Number(right || 0);
}

export async function resolveSalesInventoryOrderRepair(
	db: Db,
	input: {
		salesOrderId: number;
		demandBaselines: SalesInventoryOrderRepairDemandBaseline[];
		allocationBaselines: SalesInventoryOrderRepairAllocationBaseline[];
		reviewDemandBaselines?: SalesInventoryOrderRepairDemandBaseline[];
		reviewAllocationBaselines?: SalesInventoryOrderRepairAllocationBaseline[];
		authorName?: string | null;
		triggeredByUserId?: number | null;
	},
) {
	return db.$transaction(async (tx) => {
		const sale = await tx.salesOrders.findFirstOrThrow({
			where: {
				id: input.salesOrderId,
				type: "order",
				deletedAt: null,
			},
			select: { id: true, orderId: true },
		});
		const demandBaselines = [
			...input.demandBaselines,
			...(input.reviewDemandBaselines ?? []),
		];
		const allocationBaselines = [
			...input.allocationBaselines,
			...(input.reviewAllocationBaselines ?? []),
		];
		const demandIds = demandBaselines.map((row) => row.id);
		const allocationIds = allocationBaselines.map((row) => row.id);
		const [demands, allocations] = await Promise.all([
			demandIds.length
				? tx.inboundDemand.findMany({
						where: {
							id: { in: demandIds },
							deletedAt: null,
							lineItemComponent: { parent: { saleId: sale.id } },
						},
						select: {
							id: true,
							lineItemComponentId: true,
							status: true,
							qty: true,
							qtyReceived: true,
							inboundShipmentItemId: true,
						},
					})
				: [],
			allocationIds.length
				? tx.stockAllocation.findMany({
						where: {
							id: { in: allocationIds },
							deletedAt: null,
							lineItemComponent: { parent: { saleId: sale.id } },
						},
						select: {
							id: true,
							lineItemComponentId: true,
							status: true,
							qty: true,
						},
					})
				: [],
		]);
		const baselineDemand = new Map(demandBaselines.map((row) => [row.id, row]));
		const baselineAllocation = new Map(
			allocationBaselines.map((row) => [row.id, row]),
		);
		const cancelledDemandIds: number[] = [];
		const releasedAllocationIds: number[] = [];
		const skippedDemandIds: number[] = [];
		const skippedAllocationIds: number[] = [];
		const componentIds = new Set<number>();
		const operationId = `order-repair-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}`;

		for (const demand of demands) {
			const baseline = baselineDemand.get(demand.id);
			const matches =
				baseline &&
				baseline.lineItemComponentId === demand.lineItemComponentId &&
				baseline.status === demand.status &&
				sameNumber(baseline.qty, Number(demand.qty)) &&
				sameNumber(baseline.qtyReceived, Number(demand.qtyReceived)) &&
				baseline.inboundShipmentItemId === demand.inboundShipmentItemId;
			if (!matches || !canAutoCancelInboundDemand(demand)) {
				skippedDemandIds.push(demand.id);
				continue;
			}
			const updated = await tx.inboundDemand.updateMany({
				where: {
					id: demand.id,
					lineItemComponentId: demand.lineItemComponentId,
					deletedAt: null,
					status: demand.status,
					qty: demand.qty,
					qtyReceived: demand.qtyReceived,
					inboundShipmentItemId: null,
				},
				data: {
					status: "cancelled",
					deletedAt: new Date(),
					notes: `Order update inventory repair ${operationId}`,
				},
			});
			if (updated.count > 0) {
				cancelledDemandIds.push(demand.id);
				componentIds.add(demand.lineItemComponentId);
			} else {
				skippedDemandIds.push(demand.id);
			}
		}

		for (const allocation of allocations) {
			const baseline = baselineAllocation.get(allocation.id);
			const matches =
				baseline &&
				baseline.lineItemComponentId === allocation.lineItemComponentId &&
				baseline.status === allocation.status &&
				sameNumber(baseline.qty, Number(allocation.qty));
			if (!matches || !canAutoReleaseStockAllocation(allocation.status)) {
				skippedAllocationIds.push(allocation.id);
				continue;
			}
			const updated = await tx.stockAllocation.updateMany({
				where: {
					id: allocation.id,
					lineItemComponentId: allocation.lineItemComponentId,
					deletedAt: null,
					status: allocation.status,
					qty: allocation.qty,
				},
				data: {
					status: "released",
					deletedAt: new Date(),
					notes: `Order update inventory repair ${operationId}`,
				},
			});
			if (updated.count > 0) {
				releasedAllocationIds.push(allocation.id);
				componentIds.add(allocation.lineItemComponentId);
			} else {
				skippedAllocationIds.push(allocation.id);
			}
		}

		let recomputedComponentCount = 0;
		for (const componentId of componentIds) {
			if (await recomputeLineItemComponentDemandState(tx, componentId)) {
				recomputedComponentCount += 1;
			}
		}

		const auditHistoryCount =
			cancelledDemandIds.length ||
			releasedAllocationIds.length ||
			skippedDemandIds.length ||
			skippedAllocationIds.length
				? (
						await tx.salesHistory.create({
							data: {
								salesId: sale.id,
								name: "Order update inventory repair",
								authorName: input.authorName || "System",
								data: {
									type: "sales_inventory_order_update_repair",
									orderId: sale.orderId,
									operationId,
									cancelledDemandIds,
									releasedAllocationIds,
									skippedDemandIds,
									skippedAllocationIds,
									recomputedComponentIds: Array.from(componentIds),
									recomputedComponentCount,
									triggeredByUserId: input.triggeredByUserId ?? null,
								},
							},
						})
					).id
				: 0;

		return {
			salesOrderId: sale.id,
			operationId,
			cancelledDemandIds,
			releasedAllocationIds,
			skippedDemandIds,
			skippedAllocationIds,
			recomputedComponentCount,
			auditHistoryCount,
		};
	});
}
