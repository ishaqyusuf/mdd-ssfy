import type { Db, TransactionClient } from "@gnd/db";

export async function ensureSelectedInboundDemandsForStockComponents(
	ctx: { db: Db | TransactionClient },
	selections: Array<{
		lineItemComponentIds: number[];
		qty: number;
	}>,
) {
	const normalizedSelections = selections
		.map((selection) => ({
			lineItemComponentIds: Array.from(
				new Set(
					(selection.lineItemComponentIds || []).filter((id) =>
						Number.isFinite(id),
					),
				),
			),
			qty: Math.max(0, Number(selection.qty || 0)),
		}))
		.filter((selection) => selection.lineItemComponentIds.length);
	const componentIds = Array.from(
		new Set(
			normalizedSelections.flatMap(
				(selection) => selection.lineItemComponentIds,
			),
		),
	);
	if (!componentIds.length) return [];

	const components = await ctx.db.lineItemComponents.findMany({
		where: {
			id: {
				in: componentIds,
			},
			inventoryId: {
				not: null,
			},
			inventoryVariantId: {
				not: null,
			},
			parent: {
				deletedAt: null,
			},
		},
		select: {
			id: true,
			qty: true,
			qtyAllocated: true,
			qtyReceived: true,
			status: true,
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
			inboundDemands: {
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
				},
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					status: true,
					inboundShipmentItemId: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
		},
	});
	const componentsById = new Map(
		components.map((component) => [component.id, component]),
	);

	const demandIds: number[] = [];

	for (const selection of normalizedSelections) {
		let remainingSelectionQty = selection.qty;
		if (remainingSelectionQty <= 0) continue;

		for (const componentId of selection.lineItemComponentIds) {
			if (remainingSelectionQty <= 0) break;
			const component = componentsById.get(componentId);
			if (!component) continue;

			const productKind =
				component.inventoryCategory?.productKind ||
				component.inventory?.productKind ||
				null;
			const stockMode =
				component.inventoryCategory?.stockMode ||
				component.inventory?.stockMode ||
				null;
			const inventoryVariantId = component.inventoryVariantId;

			if (!inventoryVariantId) continue;
			if (productKind === "component") continue;
			if (stockMode !== "monitored") continue;

			const reservedDemandQty = component.inboundDemands.reduce(
				(total, demand) => {
					const outstanding = Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					);
					const isReusablePendingDemand =
						["pending", "ordered"].includes(demand.status) &&
						!demand.inboundShipmentItemId;
					return isReusablePendingDemand ? total : total + outstanding;
				},
				0,
			);
			const requiredQty = Math.max(0, Number(component.qty || 0));
			const requestableQty = Math.max(
				0,
				requiredQty -
					Math.max(
						0,
						Number(component.qtyAllocated || 0),
						Number(component.qtyReceived || 0),
					) -
					reservedDemandQty,
			);
			let remainingComponentQty = Math.min(
				remainingSelectionQty,
				requestableQty,
			);
			let activeDemandQty = component.inboundDemands.reduce(
				(total, demand) =>
					total +
					Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					),
				0,
			);

			if (remainingComponentQty <= 0) continue;

			for (const demand of component.inboundDemands) {
				if (remainingComponentQty <= 0) break;
				const outstanding = Math.max(
					0,
					Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
				);
				if (
					outstanding > 0 &&
					["pending", "ordered"].includes(demand.status) &&
					!demand.inboundShipmentItemId
				) {
					const takeQty = Math.min(remainingComponentQty, outstanding);
					if (takeQty >= outstanding || Number(demand.qtyReceived || 0) > 0) {
						demandIds.push(demand.id);
					} else {
						const splitDemand = await ctx.db.inboundDemand.create({
							data: {
								lineItemComponentId: component.id,
								inventoryVariantId,
								qty: takeQty,
								status: "pending",
							},
							select: {
								id: true,
							},
						});
						await ctx.db.inboundDemand.update({
							where: {
								id: demand.id,
							},
							data: {
								qty: outstanding - takeQty,
							},
						});
						demandIds.push(splitDemand.id);
					}
					remainingComponentQty -= takeQty;
					remainingSelectionQty -= takeQty;
				}
			}

			if (remainingComponentQty > 0) {
				const demand = await ctx.db.inboundDemand.create({
					data: {
						lineItemComponentId: component.id,
						inventoryVariantId,
						qty: remainingComponentQty,
						status: "pending",
					},
					select: {
						id: true,
					},
				});
				demandIds.push(demand.id);
				activeDemandQty += remainingComponentQty;
				remainingSelectionQty -= remainingComponentQty;
			}

			if (activeDemandQty > 0) {
				await ctx.db.lineItemComponents.update({
					where: {
						id: component.id,
					},
					data: {
						qtyInbound: activeDemandQty,
						status:
							component.status === "allocated"
								? "allocated"
								: "inbound_required",
					},
				});
			}
		}
	}

	return demandIds;
}
