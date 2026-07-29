import type { Db } from "@gnd/db";
import {
	type NewInboundShipmentStatus,
	createInboundShipmentFromDemands,
} from "@gnd/inventory";

import {
	type FulfillSalesInventoryNeedsManuallyInput,
	fulfillSalesInventoryNeedsManuallyInTransaction,
} from "./manual-fulfill-sales-inventory-needs";
import {
	type SalesInventoryInboundAutomationDemand,
	planSalesInventoryInboundAutomation,
} from "./sales-inventory-inbound-automation";
import { getSalesInventoryOverview } from "./sales-inventory-overview";
import {
	type SyncSalesInventoryLineItemsResult,
	syncSalesInventoryLineItems,
} from "./sync-sales-inventory-line-items";

export type SalesInventoryLegacyStatus =
	| "AVAILABLE"
	| "ORDERED"
	| "PENDING ORDER";
export type SalesInventoryLegacyStatusSetupAction =
	| "continue"
	| "clear"
	| "reset"
	| "override";
export type CanonicalSalesInventoryLegacyStatusAction = "continue" | "clear";

export type ResolveSalesInventoryLegacyStatusSetupInput = {
	salesOrderId: number;
	action: SalesInventoryLegacyStatusSetupAction;
	legacyStatus?: string | null;
	authorName?: string | null;
	triggeredByUserId?: number | null;
};

type FulfillmentResult = Awaited<
	ReturnType<typeof fulfillSalesInventoryNeedsManuallyInTransaction>
>;

type ResolveSalesInventoryLegacyStatusSetupDeps = {
	getOverview?: typeof getSalesInventoryOverview;
	syncLineItems?: typeof syncSalesInventoryLineItems;
	createInboundFromDemands?: typeof createInboundShipmentFromDemands;
	fulfillNeedsInTransaction?: (
		tx: Db,
		input: FulfillSalesInventoryNeedsManuallyInput,
		options: { writeHistory: boolean },
	) => Promise<FulfillmentResult>;
};

function normalizeLegacyStatus(
	status?: string | null,
): SalesInventoryLegacyStatus | null {
	const normalized = String(status || "")
		.trim()
		.toUpperCase();

	return normalized === "AVAILABLE" ||
		normalized === "ORDERED" ||
		normalized === "PENDING ORDER"
		? normalized
		: null;
}

function normalizeLegacyAction(
	action: SalesInventoryLegacyStatusSetupAction,
): CanonicalSalesInventoryLegacyStatusAction {
	return action === "reset" || action === "clear" ? "clear" : "continue";
}

function targetShipmentStatus(
	status: SalesInventoryLegacyStatus,
): NewInboundShipmentStatus | null {
	if (status === "ORDERED") return "in_progress";
	if (status === "PENDING ORDER") return "pending";
	return null;
}

function emptyMigrationResult(input: {
	action: CanonicalSalesInventoryLegacyStatusAction;
	requestedAction: SalesInventoryLegacyStatusSetupAction;
	legacyStatus: SalesInventoryLegacyStatus;
	result: "already_migrated" | "blocked";
	nextSegment: "stock" | "inbounds";
}) {
	return {
		salesOrderId: null,
		action: input.action,
		requestedAction: input.requestedAction,
		result: input.result,
		legacyStatus: input.legacyStatus,
		previousInventoryStatus: input.legacyStatus,
		createdCount: 0,
		updatedCount: 0,
		deletedCount: 0,
		skippedCount: 0,
		warnings: [] as string[],
		demandStatusCounts: {} as Record<string, number>,
		createdInbounds: [] as Array<{
			id: number;
			supplierId: number | null;
			status: NewInboundShipmentStatus;
		}>,
		advancedInboundIds: [] as number[],
		fulfilledComponentCount: 0,
		protectedComponentIds: [] as number[],
		unresolvedSupplierDemandIds: [] as number[],
		linkedInboundIds: [] as number[],
		nextSegment: input.nextSegment,
		noPhysicalStockChange: input.legacyStatus === "AVAILABLE",
		messages: [] as string[],
	};
}

function migrationReference(
	status: SalesInventoryLegacyStatus,
	orderId: string,
) {
	return `Legacy ${status} adaptation for ${orderId}`;
}

export async function resolveSalesInventoryLegacyStatusMigration(
	db: Db,
	input: ResolveSalesInventoryLegacyStatusSetupInput,
	deps: ResolveSalesInventoryLegacyStatusSetupDeps = {},
) {
	const getOverview = deps.getOverview ?? getSalesInventoryOverview;
	const syncLineItems = deps.syncLineItems ?? syncSalesInventoryLineItems;
	const createInboundFromDemands =
		deps.createInboundFromDemands ?? createInboundShipmentFromDemands;
	const fulfillNeedsInTransaction =
		deps.fulfillNeedsInTransaction ??
		fulfillSalesInventoryNeedsManuallyInTransaction;
	const requestedAction = input.action;
	const action = normalizeLegacyAction(requestedAction);
	const overview = await getOverview(db, {
		salesOrderId: input.salesOrderId,
	});

	if (!overview) {
		throw new Error("Inventory status is not available for this order.");
	}

	const previousInventoryStatus = overview.inventoryStatus ?? null;
	const legacyStatus = normalizeLegacyStatus(previousInventoryStatus);
	if (!legacyStatus) {
		throw new Error(
			previousInventoryStatus
				? `Legacy inbound status "${previousInventoryStatus}" needs manual review before inventory can be configured.`
				: "Inventory inbound status changed before setup could run.",
		);
	}

	const expectedLegacyStatus = normalizeLegacyStatus(input.legacyStatus);
	if (input.legacyStatus && expectedLegacyStatus !== legacyStatus) {
		throw new Error("Inventory inbound status changed before setup could run.");
	}

	const needsMigration =
		overview.setupMode === "legacy_status_locked" ||
		overview.inventoryLegacyCompatibility?.state === "legacy_locked";
	if (!needsMigration) {
		if (action === "continue" && overview.hasInventoryIntegration) {
			return {
				...emptyMigrationResult({
					action,
					requestedAction,
					legacyStatus,
					result: "already_migrated",
					nextSegment: legacyStatus === "AVAILABLE" ? "stock" : "inbounds",
				}),
				salesOrderId: input.salesOrderId,
			};
		}

		throw new Error(
			"This order is not waiting on a manual inbound status review.",
		);
	}

	return db.$transaction(async (tx) => {
		const statusGuard = {
			id: input.salesOrderId,
			deletedAt: null,
			type: "order" as const,
			inventoryStatus: previousInventoryStatus,
		};

		if (action === "clear") {
			const updated = await tx.salesOrders.updateMany({
				where: statusGuard,
				data: {
					inventoryStatus: null,
				},
			});

			if (updated.count !== 1) {
				throw new Error(
					"Inventory inbound status changed before setup could run.",
				);
			}

			const syncResult = await syncLineItems(tx, {
				salesOrderId: input.salesOrderId,
				source: "manual",
				triggeredByUserId: input.triggeredByUserId ?? null,
			});
			await tx.salesHistory.create({
				data: {
					salesId: input.salesOrderId,
					name: "Legacy inventory status cleared",
					authorName: input.authorName ?? "System",
					data: {
						type: "sales_inventory_legacy_status_migration",
						action,
						requestedAction,
						previousInventoryStatus,
						nextInventoryStatus: null,
						syncResult,
						triggeredByUserId: input.triggeredByUserId ?? null,
					},
				},
			});

			return {
				...syncResult,
				action,
				requestedAction,
				result: "migrated" as const,
				legacyStatus,
				previousInventoryStatus,
				demandStatusCounts: {} as Record<string, number>,
				createdInbounds: [],
				advancedInboundIds: [],
				fulfilledComponentCount: 0,
				protectedComponentIds: [],
				unresolvedSupplierDemandIds: [],
				linkedInboundIds: [],
				nextSegment: "stock" as const,
				noPhysicalStockChange: false,
				messages: [
					"Legacy status cleared; inventory requirements synchronized.",
				],
			};
		}

		const currentOrder = await tx.salesOrders.findFirst({
			where: statusGuard,
			select: {
				id: true,
				orderId: true,
			},
		});
		if (!currentOrder) {
			throw new Error(
				"Inventory inbound status changed before setup could run.",
			);
		}

		const syncResult = (await syncLineItems(tx, {
			salesOrderId: input.salesOrderId,
			source: "manual",
			triggeredByUserId: input.triggeredByUserId ?? null,
		})) as SyncSalesInventoryLineItemsResult;
		const createdInbounds: Array<{
			id: number;
			supplierId: number | null;
			status: NewInboundShipmentStatus;
		}> = [];
		const advancedInboundIds: number[] = [];
		const linkedInboundIds = new Set<number>();
		let unresolvedSupplierDemandIds: number[] = [];
		let fulfilledComponentCount = 0;
		let protectedComponentIds: number[] = [];
		let cancelledDemandCount = 0;

		if (legacyStatus === "AVAILABLE") {
			const fulfillment = await fulfillNeedsInTransaction(
				tx as Db,
				{
					salesOrderId: input.salesOrderId,
					authorName: input.authorName,
					triggeredByUserId: input.triggeredByUserId ?? null,
				},
				{
					writeHistory: false,
				},
			);
			fulfilledComponentCount = fulfillment.fulfilledComponentCount;
			protectedComponentIds = fulfillment.protectedComponentIds;
			cancelledDemandCount = fulfillment.cancelledDemandCount;
		} else {
			const demands = (await tx.inboundDemand.findMany({
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
					lineItemComponent: {
						parent: {
							saleId: input.salesOrderId,
							deletedAt: null,
						},
					},
				},
				select: {
					id: true,
					inboundShipmentItem: {
						select: {
							inboundId: true,
							inbound: {
								select: {
									status: true,
								},
							},
						},
					},
					inventoryVariant: {
						select: {
							inventory: {
								select: {
									defaultSupplierId: true,
								},
							},
							supplierVariants: {
								where: {
									deletedAt: null,
									active: true,
								},
								select: {
									supplierId: true,
									preferred: true,
									active: true,
								},
							},
						},
					},
				},
			})) as SalesInventoryInboundAutomationDemand[];
			for (const demand of demands) {
				if (demand.inboundShipmentItem) {
					linkedInboundIds.add(demand.inboundShipmentItem.inboundId);
				}
			}

			const shipmentStatus = targetShipmentStatus(legacyStatus);
			if (!shipmentStatus) {
				throw new Error(`Unsupported legacy inbound status: ${legacyStatus}`);
			}
			const plan = planSalesInventoryInboundAutomation({
				demands,
				targetShipmentStatus: shipmentStatus,
			});
			unresolvedSupplierDemandIds = plan.unresolvedDemandIds;

			for (const inboundId of plan.inboundIdsToStart) {
				const advanced = await tx.inboundShipment.updateMany({
					where: {
						id: inboundId,
						deletedAt: null,
						status: "pending",
					},
					data: {
						status: "in_progress",
					},
				});
				if (advanced.count === 1) {
					advancedInboundIds.push(inboundId);
					linkedInboundIds.add(inboundId);
				}
			}

			for (const group of plan.createGroups) {
				const created = await createInboundFromDemands(tx, {
					supplierId: group.supplierId,
					demandIds: group.demandIds,
					status: shipmentStatus,
					reference: migrationReference(legacyStatus, currentOrder.orderId),
				});
				createdInbounds.push({
					id: created.inboundId,
					supplierId: group.supplierId,
					status: shipmentStatus,
				});
				linkedInboundIds.add(created.inboundId);
			}
		}

		const result = protectedComponentIds.length
			? ("migrated_with_review" as const)
			: ("migrated" as const);
		const operationId = `legacy-inventory-${input.salesOrderId}-${legacyStatus
			.toLowerCase()
			.replaceAll(" ", "-")}`;
		const nextSegment =
			legacyStatus === "AVAILABLE" ? ("stock" as const) : ("inbounds" as const);
		const messages =
			legacyStatus === "AVAILABLE"
				? [
						`${fulfilledComponentCount} need${
							fulfilledComponentCount === 1 ? "" : "s"
						} marked fulfilled with no physical stock movement.`,
					]
				: [
						`${createdInbounds.length} inbound shipment${
							createdInbounds.length === 1 ? "" : "s"
						} created.`,
					];

		await tx.salesHistory.create({
			data: {
				salesId: input.salesOrderId,
				name: "Legacy inventory status adapted",
				authorName: input.authorName ?? "System",
				data: {
					type: "sales_inventory_legacy_status_migration",
					operationId,
					action,
					requestedAction,
					previousInventoryStatus,
					nextInventoryStatus: previousInventoryStatus,
					syncResult,
					createdInbounds,
					advancedInboundIds,
					fulfilledComponentCount,
					protectedComponentIds,
					cancelledDemandCount,
					unresolvedSupplierDemandIds,
					linkedInboundIds: Array.from(linkedInboundIds),
					noPhysicalStockChange: legacyStatus === "AVAILABLE",
					result,
					triggeredByUserId: input.triggeredByUserId ?? null,
				},
			},
		});

		return {
			...syncResult,
			action,
			requestedAction,
			result,
			legacyStatus,
			previousInventoryStatus,
			demandStatusCounts: {} as Record<string, number>,
			createdInbounds,
			advancedInboundIds,
			fulfilledComponentCount,
			protectedComponentIds,
			unresolvedSupplierDemandIds,
			linkedInboundIds: Array.from(linkedInboundIds),
			nextSegment,
			noPhysicalStockChange: legacyStatus === "AVAILABLE",
			messages,
		};
	});
}

/** @deprecated Use resolveSalesInventoryLegacyStatusMigration. */
export const resolveSalesInventoryLegacyStatusSetup =
	resolveSalesInventoryLegacyStatusMigration;
