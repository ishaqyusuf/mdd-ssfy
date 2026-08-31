import type { TRPCContext } from "@api/trpc/init";
import {
	resolveDispatchInventoryScope,
	scaleDispatchComponentQuantity,
} from "@gnd/sales/dispatch-manifest/inventory-quantities";
import { getDispatchInventoryReadiness } from "@gnd/sales/dispatch-manifest/inventory-readiness";
import { buildDispatchManifestRevision } from "@gnd/sales/dispatch-manifest/revision";

export function hasOperationalInventoryEvidence(line: {
	components: Array<{
		stockAllocations: Array<{ status?: string | null }>;
		inboundDemands: unknown[];
	}>;
}) {
	return line.components.some(
		(component) =>
			component.stockAllocations.some(
				(allocation) => allocation.status !== "cancelled",
			) || component.inboundDemands.length > 0,
	);
}

export async function getDispatchInventoryManifest(
	db: TRPCContext["db"],
	input: {
		salesOrderId: number;
		orderDeliveryId?: number | null;
		requestedItems?: Array<{
			salesItemId: number;
			qty?: number | null;
			lhQty?: number | null;
			rhQty?: number | null;
		}>;
	},
) {
	const lines = await db.lineItem.findMany({
		where: {
			saleId: input.salesOrderId,
			lineItemType: "SALE",
			deletedAt: null,
		},
		orderBy: [{ sn: "asc" }, { id: "asc" }],
		select: {
			id: true,
			uid: true,
			title: true,
			qty: true,
			updatedAt: true,
			salesItemId: true,
			inventoryId: true,
			inventoryVariantId: true,
			inventory: { select: { name: true } },
			variant: {
				select: { sku: true, description: true },
			},
			components: {
				where: { status: { not: "cancelled" } },
				orderBy: { id: "asc" },
				select: {
					id: true,
					required: true,
					qty: true,
					inventoryId: true,
					inventoryVariantId: true,
					inventory: { select: { name: true } },
					inventoryVariant: {
						select: { sku: true, description: true },
					},
					stockAllocations: {
						where: { deletedAt: null },
						orderBy: { id: "asc" },
						select: {
							id: true,
							qty: true,
							status: true,
							orderDeliveryId: true,
						},
					},
					inboundDemands: {
						where: { deletedAt: null, status: { not: "cancelled" } },
						select: { qty: true, qtyReceived: true, status: true },
					},
				},
			},
		},
	});
	// Existing sales lines predate the inventory-allocation rollout. A product or
	// component link alone does not mean inventory control is active: the line
	// must have allocation or inbound evidence before strict inventory gates own
	// packing. This keeps unmigrated orders on the legacy path during cutover.
	const inventoryControlledLines = lines.filter(
		hasOperationalInventoryEvidence,
	);
	const deliveryItems = input.orderDeliveryId
		? await db.orderItemDelivery.findMany({
				where: {
					orderDeliveryId: input.orderDeliveryId,
					orderId: input.salesOrderId,
					deletedAt: null,
					packingStatus: { not: "unpacked" },
				},
				select: { orderItemId: true, qty: true, lhQty: true, rhQty: true },
			})
		: [];
	const inventorySalesItemIds = new Set(
		inventoryControlledLines.flatMap((line) =>
			line.salesItemId ? [line.salesItemId] : [],
		),
	);
	const hasExplicitInventoryDeliveryItems = deliveryItems.some((item) =>
		inventorySalesItemIds.has(item.orderItemId),
	);
	const activeDispatchIds =
		input.orderDeliveryId &&
		!input.requestedItems &&
		!hasExplicitInventoryDeliveryItems
			? (
					await db.orderDelivery.findMany({
						where: {
							salesOrderId: input.salesOrderId,
							deletedAt: null,
						},
						select: { id: true, status: true },
					})
				)
					.filter(
						(delivery) =>
							!["cancelled", "completed", "delivered"].includes(
								delivery.status || "",
							),
					)
					.map((delivery) => delivery.id)
			: [];
	const scope = resolveDispatchInventoryScope({
		lineSalesItemIds: [...inventorySalesItemIds],
		orderDeliveryId: input.orderDeliveryId,
		requestedItems: input.requestedItems,
		deliveryItems: deliveryItems.map((item) => ({
			salesItemId: item.orderItemId,
			qty: item.qty,
			lhQty: item.lhQty,
			rhQty: item.rhQty,
		})),
		activeDispatchIds,
	});
	const scopedSalesItemIds = new Set(scope.salesItemIds);
	const scopedLines = inventoryControlledLines.filter(
		(line) => line.salesItemId && scopedSalesItemIds.has(line.salesItemId),
	);

	const manifestLines = scopedLines.map((line) => {
		const dispatchItemQty = line.salesItemId
			? scope.quantityBySalesItemId.get(line.salesItemId) ||
				Number(line.qty || 0)
			: Number(line.qty || 0);
		const components = line.components.map((component) => {
			const boundAllocations = component.stockAllocations.filter(
				(allocation) => allocation.orderDeliveryId === input.orderDeliveryId,
			);
			const inboundQty = component.inboundDemands.reduce(
				(total, demand) =>
					total +
					Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					),
				0,
			);
			return {
				id: component.id,
				required: component.required,
				requiredQty: scaleDispatchComponentQuantity({
					componentQty: component.qty,
					orderedItemQty: line.qty,
					dispatchItemQty,
				}),
				inventoryId: component.inventoryId,
				inventoryVariantId: component.inventoryVariantId,
				name:
					component.inventory?.name ||
					component.inventoryVariant?.description ||
					"Inventory component",
				sku: component.inventoryVariant?.sku || null,
				inboundQty,
				allocations: boundAllocations.map((allocation) => ({
					id: allocation.id,
					qty: Number(allocation.qty || 0),
					status: allocation.status,
				})),
				availableAllocations: component.stockAllocations
					.filter(
						(allocation) =>
							allocation.orderDeliveryId === null &&
							["approved", "reserved"].includes(allocation.status),
					)
					.map((allocation) => ({
						id: allocation.id,
						qty: Number(allocation.qty || 0),
					})),
			};
		});
		return {
			executionMode: "inventory" as const,
			lineItemId: line.id,
			lineUid: line.uid,
			lineTitle: line.title,
			salesItemId: line.salesItemId,
			inventoryId: line.inventoryId,
			inventoryVariantId: line.inventoryVariantId,
			dispatchItemQty,
			sku: line.variant.sku,
			inventoryTitle: line.inventory.name,
			variantDescription: line.variant.description,
			readiness: getDispatchInventoryReadiness(components),
			components,
		};
	});
	const revision = buildDispatchManifestRevision({
		orderDeliveryId: input.orderDeliveryId || null,
		lines: scopedLines.map((line) => ({
			id: line.id,
			qty: line.salesItemId
				? scope.quantityBySalesItemId.get(line.salesItemId) || line.qty
				: line.qty,
			updatedAt: line.updatedAt,
			components: line.components.map((component) => ({
				id: component.id,
				qty: component.qty,
				allocations: component.stockAllocations.map((allocation) => ({
					id: allocation.id,
					qty: allocation.qty,
					status: allocation.status,
					orderDeliveryId: allocation.orderDeliveryId,
				})),
			})),
		})),
	});
	return {
		revision,
		scope: {
			source: scope.source,
			resolved: scope.resolved,
			inventoryLineCount: inventoryControlledLines.length,
			scopedLineCount: manifestLines.length,
		},
		lines: manifestLines,
	};
}
