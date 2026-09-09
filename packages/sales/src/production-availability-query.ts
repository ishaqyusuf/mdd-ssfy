import { createHash } from "node:crypto";
import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { scopeFor, type ProductionInboundActor } from "./production-inbound";
import {
	buildSalesOverviewInventoryGroups,
	buildSalesOverviewInventoryMergedRows,
} from "./sales-inventory-overview";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import { getLegacySalesOrderLifecycleStatusInfo } from "./legacy-order-status";
import { summarizeProductionAvailability } from "./production-availability-summary";
import { getScopedReceivedNeedsPlan } from "@gnd/inventory";

export const AVAILABILITY_ALLOCATION_NOTE =
	"Reserved from availability receipt.";

export type ProductionAvailabilityActor = ProductionInboundActor & {
	canMarkAvailable: boolean;
};
const componentSelect = {
	id: true,
	required: true,
	qty: true,
	qtyAllocated: true,
	qtyReceived: true,
	qtyInbound: true,
	status: true,
	inventoryId: true,
	inventoryVariantId: true,
	inventoryCategoryId: true,
	parent: { select: { id: true, salesItemId: true } },
	inventory: {
		select: { id: true, name: true, productKind: true, stockMode: true },
	},
	inventoryCategory: {
		select: { id: true, title: true, productKind: true, stockMode: true },
	},
	inventoryVariant: {
		select: { id: true, uid: true, description: true, sku: true },
	},
	subComponent: {
		select: {
			defaultInventory: {
				select: { id: true, productKind: true, stockMode: true },
			},
			inventoryCategory: {
				select: { id: true, title: true, productKind: true, stockMode: true },
			},
		},
	},
	stockAllocations: {
		where: { deletedAt: null, status: { not: "cancelled" } },
		select: {
			id: true,
			qty: true,
			status: true,
			updatedAt: true,
			inventoryStockId: true,
			notes: true,
			inventoryVariantId: true,
		},
	},
	inboundDemands: {
		where: {
			deletedAt: null,
			status: { not: "cancelled" },
			OR: [
				{ inboundShipmentItemId: null },
				{
					inboundShipmentItem: {
						deletedAt: null,
						inbound: { deletedAt: null, status: { not: "cancelled" } },
					},
				},
			],
		},
		select: {
			id: true,
			qty: true,
			qtyReceived: true,
			status: true,
			updatedAt: true,
			inventoryVariantId: true,
			inboundShipmentItemId: true,
			inboundShipmentItem: {
				select: {
					qty: true,
					qtyGood: true,
					qtyIssue: true,
					inboundId: true,
					inbound: { select: { status: true } },
				},
			},
		},
	},
} satisfies Prisma.LineItemComponentsSelect;

// Minimal material DTO: no prices, contacts, full inventory detail, or supplier catalog.
export async function getProductionAvailability(
	db: Db | TransactionClient,
	salesOrderId: number,
	actor: ProductionAvailabilityActor,
) {
	const scope = await scopeFor(db, salesOrderId, actor);
	const unappliedInboundNeeds = await getScopedReceivedNeedsPlan(db,scope.componentIds);
	const [components, sale, pipelines, availabilityEvents] = await Promise.all([
		db.lineItemComponents.findMany({
			where: {
				id: { in: scope.componentIds },
				parent: { deletedAt: null, lineItemType: "SALE" },
			},
			select: componentSelect,
			orderBy: { id: "asc" },
		}),
		db.salesOrders.findUniqueOrThrow({
			where: { id: salesOrderId },
			select: {
				orderId: true,
				status: true,
				prodStatus: true,
				inventoryProjection: { select: { status: true } },
			},
		}),
		getSalesPipelineSnapshots(db as Db, [salesOrderId]),
		db.event.findMany({
			where: {
				type: { in: ["production_materials_available", "production_covered_materials_applied"] },
				data: { path: "$.salesOrderId", equals: salesOrderId },
			},
			select: { data: true },
		}),
	]);
	const pipeline = pipelines.get(salesOrderId);
	const lifecycle = getLegacySalesOrderLifecycleStatusInfo({
		orderStatus: sale.status,
		productionStatus: sale.prodStatus,
	});
	// Legacy orders can lack commercial pipeline metadata while still having valid
	// live inventory needs. Match Inventory's lifecycle boundary in that case.
	const open =
		!!pipeline &&
		pipeline.commercial.state !== "cancelled" &&
		!["completed", "administratively_completed"].includes(
			pipeline.fulfillment.state,
		) &&
		!["cancelled", "fulfilled"].includes(lifecycle.status);
	const groups = buildSalesOverviewInventoryGroups(
		components.map((component) => ({
			id: component.parent.id,
			salesItemId: component.parent.salesItemId,
			components: [
				{
					...component,
					// Receipt status alone is not proof of material coverage.
					status:
						component.status === "fulfilled"
							? "partially_received"
							: component.status,
					// Received demand and its resulting allocation describe the same material.
					// Readiness requires committed allocations; receipt is not added again.
					qtyAllocated: component.stockAllocations
						.filter((allocation) =>
							["approved", "reserved", "picked", "consumed"].includes(
								allocation.status,
							),
						)
						.reduce((sum, allocation) => sum + allocation.qty, 0),
					qtyReceived: 0,
				},
			],
		})),
	);
	const merged = buildSalesOverviewInventoryMergedRows(groups).filter(
		(row) =>
			row.trackingPolicy === "tracked" &&
			row.qtyRequired > 0 &&
			row.sourceStatus !== "cancelled",
	);

    // Receipt allocation quantities stay attached to their component/stock pair.
    // Partial consumption splits IDs but preserves this pair, so coverage survives.
    const receiptEvidence = new Map<string,number>();
    for (const event of availabilityEvents) {
        const data=event.data as {allocationReceipts?:Array<{qty:number;inventoryStockId?:number;lineItemComponentId?:number}>};
        for (const allocation of data?.allocationReceipts ?? []) {
            if (!allocation.inventoryStockId || !allocation.lineItemComponentId) continue;
            const key=`${allocation.lineItemComponentId}:${allocation.inventoryStockId}`;
            receiptEvidence.set(key,(receiptEvidence.get(key)??0)+allocation.qty);
        }
    }
    const receiptNotes = new Set([AVAILABILITY_ALLOCATION_NOTE,"Reserved from received inbound demand.","Reserved from received inbound stock."]);
    const receivedWithoutAllocation=new Map(components.map(component=>{
        const committed=component.stockAllocations.filter(allocation=>["approved","reserved","picked","consumed"].includes(allocation.status));
        const stockGroups=new Map<string,{total:number;knownByNote:number}>();
        for(const allocation of committed){
            const key=`${component.id}:${allocation.inventoryStockId}`;
            const group=stockGroups.get(key)??{total:0,knownByNote:0};
            group.total+=allocation.qty;
            if(receiptNotes.has(allocation.notes??""))group.knownByNote+=allocation.qty;
            stockGroups.set(key,group);
        }
        const receiptAllocated=[...stockGroups].reduce((sum,[key,group])=>sum+Math.min(group.total,Math.max(group.knownByNote,receiptEvidence.get(key)??0)),0);
        const unappliedQty=unappliedInboundNeeds.rows.filter(row=>row.componentId===component.id).reduce((sum,row)=>sum+row.afterQty-row.beforeQty,0);
        return [component.id,Math.max(0,component.qtyReceived+unappliedQty-receiptAllocated)];
    }));

	const componentCapacity = new Map(
		groups.flatMap((group) =>
			group.rows.map(
				(row) =>
					[
						row.componentId!,
						Math.max(
							0,
							row.qtyPending -
								row.qtyInboundLinkedOpen -
								(receivedWithoutAllocation.get(row.componentId!) ?? 0),
						),
					] as const,
			),
		),
	);
	const needs = merged
		.filter((row) => row.qtyPending > 0.000001)
		.map((row) => {
			const componentQuantities = row.componentIds.map((id) => ({
				id,
				qtyAvailableToMark: componentCapacity.get(id) ?? 0,
			}));
			return {
				id: row.id,
				componentIds: row.componentIds,
				name: row.componentName,
				description: [row.stepName, row.variantName]
					.filter(Boolean)
					.join(" • "),
				qtyPending: row.qtyPending,
				componentQuantities,
				qtyAvailableToMark: componentQuantities.reduce(
					(sum, component) => sum + component.qtyAvailableToMark,
					0,
				),
			};
		});

	const linked = components.flatMap((component) =>
		component.inboundDemands.flatMap((demand) =>
			demand.inboundShipmentItem ? [demand.inboundShipmentItem] : [],
		),
	);
	const inboundCount = new Set(linked.map((item) => item.inboundId)).size;
	const pendingInboundCount = new Set(
		linked
			.filter(
				(item) =>
					!["closed", "completed", "cancelled"].includes(item.inbound.status) &&
					item.qty > Number(item.qtyGood) + Number(item.qtyIssue),
			)
			.map((item) => item.inboundId),
	).size;
	const setupReady =
		sale.inventoryProjection?.status === "ready" ||
		(!sale.inventoryProjection && components.length > 0);
	const canMarkAvailable = actor.canViewAll
		? actor.canMarkAvailable
		: scope.policy.workerCanReceiveInbound;
	const summary = summarizeProductionAvailability({
		needs,
		inboundCount,
		pendingInboundCount,
		open,
		setupReady,
		canMarkAvailable,
		workerMode: !actor.canViewAll,
	});
	const revision = createHash("sha256")
		.update(
			JSON.stringify({
				components,
				availabilityEvents,
				unappliedInboundNeeds,
				assignments: scope.assignments,
				policy: scope.policy,
				open,
				setupReady,
			}),
		)
		.digest("hex");
	return {
		...summary,
		salesOrderId,
		orderNumber: sale.orderId,
		inboundCount,
		pendingInboundCount,
		revision,
		needs,
		unappliedInboundNeeds,
		receivedNeeds: groups.flatMap(group => group.rows.flatMap(row => {
			const component = components.find(component => component.id === row.componentId);
			const qty = Math.min(row.qtyPending, receivedWithoutAllocation.get(row.componentId!) ?? 0);
			return component?.inventoryVariantId && qty > 0 ? [{ componentId: component.id, inventoryVariantId: component.inventoryVariantId, qty }] : [];
		})),
	};
}
