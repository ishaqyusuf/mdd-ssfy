import type { Db } from "@gnd/db";
import {
	type DriverRouteCapability,
	projectDriverRouteCapability,
} from "@gnd/sales/dispatch-manifest/driver-route-readiness";
import {
	dispatchItemQuantity,
	scaleDispatchComponentQuantity,
} from "@gnd/sales/dispatch-manifest/inventory-quantities";
import {
	getGuardedPackingSettings,
	guardedPackingReviewBlocksDelivery,
} from "@gnd/settings";

export type DriverRouteReadinessRow = {
	id: number;
	salesOrderId: number;
	status?: string | null;
	driverId?: number | null;
	deliveryMode?: string | null;
	dueBucket?: string | null;
	hasDestination: boolean;
	hasOpenException?: boolean;
};

function roundQuantity(value: number) {
	return Math.round(value * 1000) / 1000;
}

export async function getDriverRouteCapabilities(
	db: Db,
	userId: number,
	rows: readonly DriverRouteReadinessRow[],
): Promise<Map<number, DriverRouteCapability>> {
	if (!rows.length) return new Map();
	const dispatchIds = [...new Set(rows.map((row) => row.id))];
	const salesOrderIds = [...new Set(rows.map((row) => row.salesOrderId))];
	const [policy, pendingReports, deliveryItems, inventoryLines] =
		await Promise.all([
			getGuardedPackingSettings(db),
			db.salesPackingReport.findMany({
				where: {
					orderDeliveryId: { in: dispatchIds },
					status: "PENDING",
				},
				select: { orderDeliveryId: true, evidenceSnapshot: true },
			}),
			db.orderItemDelivery.findMany({
				where: {
					orderDeliveryId: { in: dispatchIds },
					orderId: { in: salesOrderIds },
					deletedAt: null,
					packingStatus: { not: "unpacked" },
				},
				select: {
					orderDeliveryId: true,
					orderId: true,
					orderItemId: true,
					qty: true,
					lhQty: true,
					rhQty: true,
				},
			}),
			db.lineItem.findMany({
				where: {
					saleId: { in: salesOrderIds },
					deletedAt: null,
					lineItemType: "SALE",
					components: {
						some: { required: true, status: { not: "cancelled" } },
					},
				},
				select: { saleId: true },
			}),
		]);

	const dispatchQuantities = new Map<number, Map<number, number>>();
	const manifestItemCount = new Map<number, number>();
	for (const item of deliveryItems) {
		if (!item.orderDeliveryId || !item.orderItemId) continue;
		manifestItemCount.set(
			item.orderDeliveryId,
			(manifestItemCount.get(item.orderDeliveryId) || 0) + 1,
		);
		const byItem = dispatchQuantities.get(item.orderDeliveryId) || new Map();
		byItem.set(
			item.orderItemId,
			(byItem.get(item.orderItemId) || 0) + dispatchItemQuantity(item),
		);
		dispatchQuantities.set(item.orderDeliveryId, byItem);
	}
	const salesItemIds = [
		...new Set(
			deliveryItems
				.map((item) => item.orderItemId)
				.filter((itemId): itemId is number => typeof itemId === "number"),
		),
	];
	const components = salesItemIds.length
		? await db.lineItemComponents.findMany({
				where: {
					required: true,
					status: { not: "cancelled" },
					parent: {
						saleId: { in: salesOrderIds },
						deletedAt: null,
						lineItemType: "SALE",
						salesItemId: { in: salesItemIds },
					},
				},
				orderBy: { id: "asc" },
				select: {
					id: true,
					qty: true,
					parent: {
						select: { qty: true, saleId: true, salesItemId: true },
					},
					stockAllocations: {
						where: {
							orderDeliveryId: { in: dispatchIds },
							deletedAt: null,
						},
						select: { orderDeliveryId: true, qty: true, status: true },
					},
				},
			})
		: [];
	const inventorySales = new Set(inventoryLines.map((line) => line.saleId));
	const blockingReports = new Set(
		pendingReports
			.filter((report) =>
				guardedPackingReviewBlocksDelivery(report.evidenceSnapshot, policy),
			)
			.map((report) => report.orderDeliveryId),
	);
	const nonBlockingReportDispatches = new Set(
		pendingReports
			.filter(
				(report) =>
					!guardedPackingReviewBlocksDelivery(report.evidenceSnapshot, policy),
			)
			.map((report) => report.orderDeliveryId),
	);

	const result = new Map<number, DriverRouteCapability>();
	for (const row of rows) {
		const quantities = dispatchQuantities.get(row.id) || new Map();
		const matchingComponents = components.filter(
			(component) =>
				component.parent.saleId === row.salesOrderId &&
				Boolean(
					component.parent.salesItemId &&
						quantities.has(component.parent.salesItemId),
				),
		);
		const inventoryReady = matchingComponents.length
			? matchingComponents.every((component) => {
					const salesItemId = component.parent.salesItemId;
					const dispatchItemQty = salesItemId
						? quantities.get(salesItemId) || 0
						: 0;
					const requiredQty = scaleDispatchComponentQuantity({
						componentQty: component.qty,
						orderedItemQty: component.parent.qty,
						dispatchItemQty,
					});
					const pickedQty = roundQuantity(
						component.stockAllocations
							.filter(
								(allocation) =>
									allocation.orderDeliveryId === row.id &&
									allocation.status === "picked",
							)
							.reduce(
								(total, allocation) =>
									total + Math.max(0, Number(allocation.qty || 0)),
								0,
							),
					);
					return pickedQty >= requiredQty;
				})
			: !inventorySales.has(row.salesOrderId);

		result.set(
			row.id,
			projectDriverRouteCapability({
				dispatchId: row.id,
				status: row.status,
				assigned: row.driverId === userId,
				manifestItemCount: manifestItemCount.get(row.id) || 0,
				hasBlockingPackingReport: blockingReports.has(row.id),
				inventoryReady:
					inventoryReady ||
					(String(row.status || "").toLowerCase() === "packed" &&
						nonBlockingReportDispatches.has(row.id)),
				hasDestination: row.deliveryMode === "pickup" || row.hasDestination,
				dueBucket: row.dueBucket,
				hasOpenException: row.hasOpenException,
			}),
		);
	}

	return result;
}
