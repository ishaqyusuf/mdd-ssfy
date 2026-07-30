import type { Db } from "@gnd/db";

import { getSalesOrderLifecycleStatusInfo } from "./order-status";
import {
	resolveSalesInventoryFulfillmentStatus,
	resolveSalesInventoryOperationPolicy,
	resolveSalesInventoryOverviewSetupMode,
} from "./sales-inventory-policy";
import { resolveSalesInventoryTrackingPolicy } from "./sales-inventory-tracking-policy";

type ManualFulfillmentComponent = {
	id: number;
	qty: number | null;
	qtyAllocated: number;
	qtyInbound: number;
	qtyReceived: number;
	status: string;
	inventoryId: number | null;
	inventoryVariantId: number | null;
	inventory: {
		productKind: string | null;
		stockMode: string | null;
	} | null;
	inventoryCategory: {
		productKind: string | null;
		stockMode: string | null;
	} | null;
	subComponent: {
		defaultInventory: {
			productKind: string | null;
			stockMode: string | null;
		} | null;
		inventoryCategory: {
			productKind: string | null;
			stockMode: string | null;
		} | null;
	} | null;
	inboundDemands: Array<{
		id: number;
		status: string;
		qtyReceived: number;
		inboundShipmentItemId: number | null;
	}>;
};

const manualFulfillmentComponentSelect = {
	id: true,
	qty: true,
	qtyAllocated: true,
	qtyInbound: true,
	qtyReceived: true,
	status: true,
	inventoryId: true,
	inventoryVariantId: true,
	inventory: {
		select: {
			productKind: true,
			stockMode: true,
		},
	},
	inventoryCategory: {
		select: {
			productKind: true,
			stockMode: true,
		},
	},
	subComponent: {
		select: {
			defaultInventory: {
				select: {
					productKind: true,
					stockMode: true,
				},
			},
			inventoryCategory: {
				select: {
					productKind: true,
					stockMode: true,
				},
			},
		},
	},
	inboundDemands: {
		where: {
			deletedAt: null,
			status: {
				not: "cancelled",
			},
		},
		select: {
			id: true,
			status: true,
			qtyReceived: true,
			inboundShipmentItemId: true,
		},
	},
} as const;

function positiveNumber(value?: number | null) {
	return Math.max(0, Number(value || 0));
}

function hasPendingNeed(component: ManualFulfillmentComponent) {
	if (component.status === "fulfilled" || component.status === "cancelled") {
		return false;
	}

	return (
		positiveNumber(component.qty) -
			positiveNumber(component.qtyAllocated) -
			positiveNumber(component.qtyReceived) >
		0
	);
}

function isProtectedDemand(
	demand: ManualFulfillmentComponent["inboundDemands"][number],
) {
	return (
		Boolean(demand.inboundShipmentItemId) ||
		positiveNumber(demand.qtyReceived) > 0 ||
		demand.status === "partially_received" ||
		demand.status === "received"
	);
}

export type FulfillSalesInventoryNeedsManuallyInput = {
	salesOrderId: number;
	lineItemComponentIds?: number[] | null;
	authorName?: string | null;
	triggeredByUserId?: number | string | null;
};

export async function fulfillSalesInventoryNeedsManually(
	db: Db,
	input: FulfillSalesInventoryNeedsManuallyInput,
) {
	return db.$transaction((tx) =>
		fulfillSalesInventoryNeedsManuallyInTransaction(tx as Db, input),
	);
}

export async function fulfillSalesInventoryNeedsManuallyInTransaction(
	tx: Db,
	input: FulfillSalesInventoryNeedsManuallyInput,
	options: {
		writeHistory?: boolean;
	} = {},
) {
	const sale = await tx.salesOrders.findFirst({
		where: {
			id: input.salesOrderId,
			deletedAt: null,
			type: "order",
		},
		select: {
			id: true,
			orderId: true,
			status: true,
			prodStatus: true,
			inventoryStatus: true,
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
		},
	});
	if (!sale) {
		throw new Error("Sales order not found.");
	}

	const components = (await tx.lineItemComponents.findMany({
		where: {
			id: input.lineItemComponentIds?.length
				? {
						in: input.lineItemComponentIds,
					}
				: undefined,
			required: true,
			status: {
				not: "cancelled",
			},
			parent: {
				deletedAt: null,
				lineItemType: "SALE",
				saleId: sale.id,
			},
		},
		select: manualFulfillmentComponentSelect,
	})) as ManualFulfillmentComponent[];
	if (
		input.lineItemComponentIds?.length &&
		new Set(components.map((component) => component.id)).size !==
			new Set(input.lineItemComponentIds).size
	) {
		throw new Error(
			"One or more inventory needs do not belong to this sales order.",
		);
	}

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
		inventoryRowCount: components.length,
		inventoryStatus: sale.inventoryStatus,
	});
	const operationPolicy = resolveSalesInventoryOperationPolicy({
		lifecycleStatus: lifecycle.status,
		setupMode,
	});
	if (!operationPolicy.capabilities.canMarkAvailable) {
		throw new Error(
			operationPolicy.reason ||
				"Inventory needs cannot be manually fulfilled for this order.",
		);
	}

	const eligibleComponents = components.filter(
		(component) =>
			resolveSalesInventoryTrackingPolicy(component) === "tracked" &&
			hasPendingNeed(component),
	);
	const protectedComponents = eligibleComponents.filter((component) =>
		component.inboundDemands.some(isProtectedDemand),
	);
	const protectedComponentIds = new Set(
		protectedComponents.map((component) => component.id),
	);
	const fulfillableComponents = eligibleComponents.filter(
		(component) => !protectedComponentIds.has(component.id),
	);

	if (!eligibleComponents.length) {
		return {
			salesOrderId: sale.id,
			orderId: sale.orderId,
			fulfilledComponentCount: 0,
			protectedComponentCount: 0,
			protectedComponentIds: [] as number[],
			cancelledDemandCount: 0,
			inventoryStatus: sale.inventoryStatus,
		};
	}

	const fulfilledComponentIds: number[] = [];
	const cancelledDemandIds: number[] = [];
	let cancelledDemandCount = 0;
	for (const component of fulfillableComponents) {
		const mutableDemandIds = component.inboundDemands
			.filter(
				(demand) =>
					!isProtectedDemand(demand) &&
					(demand.status === "pending" || demand.status === "ordered"),
			)
			.map((demand) => demand.id);

		if (mutableDemandIds.length) {
			const cancelled = await tx.inboundDemand.updateMany({
				where: {
					id: {
						in: mutableDemandIds,
					},
					deletedAt: null,
					status: {
						in: ["pending", "ordered"],
					},
					inboundShipmentItemId: null,
					qtyReceived: 0,
				},
				data: {
					status: "cancelled",
					deletedAt: new Date(),
					notes: "Inventory need manually fulfilled",
				},
			});
			if (cancelled.count !== mutableDemandIds.length) {
				throw new Error(
					"Inventory needs changed while they were being fulfilled. Please try again.",
				);
			}
			cancelledDemandIds.push(...mutableDemandIds);
			cancelledDemandCount += cancelled.count;
		}

		const fulfilled = await tx.lineItemComponents.updateMany({
			where: {
				id: component.id,
				qty: component.qty,
				qtyAllocated: component.qtyAllocated,
				qtyInbound: component.qtyInbound,
				qtyReceived: component.qtyReceived,
				status: {
					notIn: ["fulfilled", "cancelled"],
				},
				parent: {
					deletedAt: null,
					lineItemType: "SALE",
					saleId: sale.id,
				},
				inboundDemands: {
					none: {
						deletedAt: null,
						status: {
							not: "cancelled",
						},
					},
				},
			},
			data: {
				qtyInbound: 0,
				status: "fulfilled",
			},
		});
		if (fulfilled.count !== 1) {
			throw new Error(
				"Inventory needs changed while they were being fulfilled. Please try again.",
			);
		}
		fulfilledComponentIds.push(component.id);
	}

	const remainingPendingTrackedComponents =
		fulfilledComponentIds.length > 0
			? (
					(await tx.lineItemComponents.findMany({
						where: {
							required: true,
							status: {
								notIn: ["fulfilled", "cancelled"],
							},
							parent: {
								deletedAt: null,
								lineItemType: "SALE",
								saleId: sale.id,
							},
						},
						select: manualFulfillmentComponentSelect,
					})) as ManualFulfillmentComponent[]
				).filter(
					(component) =>
						resolveSalesInventoryTrackingPolicy(component) === "tracked" &&
						hasPendingNeed(component),
				)
			: [null];
	const inventoryStatus =
		protectedComponents.length === 0 &&
		fulfilledComponentIds.length > 0 &&
		remainingPendingTrackedComponents.length === 0
			? "AVAILABLE"
			: sale.inventoryStatus;
	if (inventoryStatus === "AVAILABLE") {
		await tx.salesOrders.updateMany({
			where: {
				id: sale.id,
				deletedAt: null,
				type: "order",
			},
			data: {
				inventoryStatus,
			},
		});
	}

	const operationId = `manual-inventory-fulfillment-${Date.now()}-${Math.random()
		.toString(36)
		.slice(2)}`;
	if (options.writeHistory !== false) {
		await tx.salesHistory.create({
			data: {
				salesId: sale.id,
				name: "Inventory needs manually fulfilled",
				authorName: input.authorName || "System",
				data: {
					type: "sales_inventory_needs_manually_fulfilled",
					orderId: sale.orderId,
					previousInventoryStatus: sale.inventoryStatus,
					nextInventoryStatus: inventoryStatus,
					fulfilledComponentIds,
					fulfilledComponentCount: fulfilledComponentIds.length,
					protectedComponentIds: protectedComponents.map(
						(component) => component.id,
					),
					protectedComponentCount: protectedComponents.length,
					cancelledDemandIds,
					cancelledDemandCount,
					noPhysicalStockChange: true,
					operationId,
					triggeredByUserId: input.triggeredByUserId ?? null,
				},
			},
		});
	}

	return {
		salesOrderId: sale.id,
		orderId: sale.orderId,
		fulfilledComponentCount: fulfilledComponentIds.length,
		protectedComponentCount: protectedComponents.length,
		protectedComponentIds: protectedComponents.map((component) => component.id),
		cancelledDemandCount,
		inventoryStatus,
	};
}
