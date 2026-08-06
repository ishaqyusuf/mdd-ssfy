import type { TRPCContext } from "@api/trpc/init";
import { getDispatchInventoryReadiness } from "@gnd/sales/dispatch-manifest/inventory-readiness";
import { buildDispatchManifestRevision } from "@gnd/sales/dispatch-manifest/revision";

export async function getDispatchInventoryManifest(
	db: TRPCContext["db"],
	input: { salesOrderId: number; orderDeliveryId?: number | null },
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

	const manifestLines = lines.map((line) => {
		const components = line.components.map((component) => {
			const boundAllocations = component.stockAllocations.filter(
				(allocation) =>
					allocation.orderDeliveryId === input.orderDeliveryId,
			);
			const inboundQty = component.inboundDemands.reduce(
				(total, demand) =>
					total +
					Math.max(0, Number(demand.qty || 0) - Number(demand.qtyReceived || 0)),
				0,
			);
			return {
				id: component.id,
				required: component.required,
				requiredQty: Number(component.qty || 0),
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
							allocation.status === "approved",
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
			salesItemId: line.salesItemId,
			inventoryId: line.inventoryId,
			inventoryVariantId: line.inventoryVariantId,
			sku: line.variant.sku,
			inventoryTitle: line.inventory.name,
			variantDescription: line.variant.description,
			readiness: getDispatchInventoryReadiness(components),
			components,
		};
	});
	const revision = buildDispatchManifestRevision({
		orderDeliveryId: input.orderDeliveryId || null,
		lines: lines.map((line) => ({
			id: line.id,
			qty: line.qty,
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
	return { revision, lines: manifestLines };
}
