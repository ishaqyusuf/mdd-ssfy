import { createHash } from "node:crypto";
import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import {
	StockAdjustmentError,
	readCategoryStockSettings,
} from "@gnd/inventory";
import { z } from "zod";
import { planSharedStockNeeds } from "./sales-form-stock-preview";
import {
	getAvailableStockRows,
	recomputeLineItemComponentFulfillment,
	reserveAvailableStockForComponent,
} from "./sales-fulfillment-plan";
import { getSalesInventoryOverview } from "./sales-inventory-overview";
import { resolveSalesInventoryTrackingPolicy } from "./sales-inventory-tracking-policy";
import { assertSpecialOrderOperationAllowed } from "./special-order/enforcement";

export const salesStockComponentIdsSchema = z
	.array(z.number().int().positive())
	.min(1)
	.max(2000)
	.transform((ids) => [...new Set(ids)].sort((a, b) => a - b));
export const salesFormStockPlanSchema = z.object({
	salesOrderId: z.number().int().positive(),
	componentIds: salesStockComponentIdsSchema.optional(),
});
export const applySalesFormStockSchema = salesFormStockPlanSchema.extend({
	expectedRevision: z.string().length(64),
});
export async function getSalesFormStockPlan(
	db: Db | TransactionClient,
	salesOrderId: number,
	componentIds?: number[],
) {
	const sale = await db.salesOrders.findFirst({
		where: {
			id: salesOrderId,
			deletedAt: null,
			archivedAt: null,
			type: "order",
		},
		select: { id: true, updatedAt: true },
	});
	if (!sale)
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			"An active sales order is required to apply stock.",
		);
	const overview = await getSalesInventoryOverview(db, { salesOrderId });
	if (!overview)
		throw new StockAdjustmentError("BAD_REQUEST", "Sales order not found.");
	const components = await db.lineItemComponents.findMany({
		where: {
			status: { not: "cancelled" },
			parent: { saleId: salesOrderId, deletedAt: null, lineItemType: "SALE" },
		},
		take: 2001,
		orderBy: { id: "asc" },
		select: {
			id: true,
			qty: true,
			required: true,
			inventoryId: true,
			inventoryVariantId: true,
			inventory: {
				select: {
					id: true,
					name: true,
					productKind: true,
					stockMode: true,
					deletedAt: true,
				},
			},
			inventoryCategory: {
				select: {
					id: true,
					title: true,
					productKind: true,
					stockMode: true,
					meta: true,
					deletedAt: true,
				},
			},
			inventoryVariant: { select: { id: true, deletedAt: true } },
			stockAllocations: {
				where: {
					deletedAt: null,
					status: {
						in: [
							"pending_review",
							"approved",
							"reserved",
							"picked",
							"consumed",
						],
					},
				},
				select: {
					id: true,
					qty: true,
					status: true,
					inventoryStockId: true,
					inboundDemandId: true,
				},
			},
			inboundDemands: {
				where: { deletedAt: null, status: { not: "cancelled" } },
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					inboundShipmentItemId: true,
					status: true,
				},
			},
		},
	});
	if (components.length > 2000)
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			"Too many inventory needs to apply in one operation.",
		);
	const allTracked = components.filter(
		(row) =>
			row.required && resolveSalesInventoryTrackingPolicy(row) === "tracked",
	);
	const selection = componentIds
		? salesStockComponentIdsSchema.parse(componentIds)
		: undefined;
	if (selection?.some((id) => !allTracked.some((row) => row.id === id)))
		throw new StockAdjustmentError(
			"BAD_REQUEST",
			"Selected needs must belong to this order and be tracked.",
		);
	const tracked = selection
		? allTracked.filter((row) => selection.includes(row.id))
		: allTracked;
	const ids = [
		...new Set(
			tracked
				.map((row) => row.inventoryVariantId)
				.filter((id): id is number => id != null),
		),
	].sort((a, b) => a - b);
	const balances = await Promise.all(
		ids.map(async (id) => ({
			id,
			stocks: await getAvailableStockRows(db, id),
		})),
	);
	const budgets = new Map(
		balances.map((row) => [
			row.id,
			row.stocks.reduce((qty, stock) => qty + stock.availableQty, 0),
		]),
	);
	const rows = planSharedStockNeeds(
		tracked.map((row) => ({
			key: String(row.id),
			componentId: row.id,
			title:
				row.inventory?.name || row.inventoryCategory?.title || "Inventory need",
			categoryId: row.inventoryCategory?.id || null,
			piecesPerUnit: readCategoryStockSettings(row.inventoryCategory?.meta)
				.piecesPerUnit,
			inventoryVariantId: row.inventoryVariantId,
			required: row.qty ?? 0,
			applied: row.stockAllocations
				.filter((allocation) => allocation.status !== "pending_review")
				.reduce((qty, allocation) => qty + allocation.qty, 0),
			pendingReview: row.stockAllocations
				.filter((allocation) => allocation.status === "pending_review")
				.reduce((qty, allocation) => qty + allocation.qty, 0),
			protectedInbound: row.inboundDemands
				.filter(
					(demand) =>
						demand.inboundShipmentItemId != null || demand.qtyReceived > 0,
				)
				.reduce((qty, demand) => {
					const receiptReservations = row.stockAllocations
						.filter(
							(allocation) =>
								allocation.status !== "pending_review" &&
								allocation.inboundDemandId === demand.id,
						)
						.reduce((total, allocation) => total + allocation.qty, 0);
					return qty + Math.max(0, demand.qty - receiptReservations);
				}, 0),
			mappingIssue:
				row.inventory?.deletedAt ||
				row.inventoryCategory?.deletedAt ||
				row.inventoryVariant?.deletedAt
					? "Archived inventory identity"
					: null,
			promptAvailableStock: readCategoryStockSettings(
				row.inventoryCategory?.meta,
			).promptAvailableStock,
		})),
		budgets,
	).map((row) => (row.mappingIssue ? { ...row, applyQty: 0 } : row));
	const revision = createHash("sha256")
		.update(
			JSON.stringify({
				saleUpdatedAt: sale.updatedAt,
				components,
				balances,
				rows,
				mode: overview.operationMode,
				...(selection ? { componentIds: selection } : {}),
			}),
		)
		.digest("hex");
	return {
		rows,
		revision,
		salesOrderId,
		canApply: overview.capabilities.canAllocateStock,
		blockReason: overview.inventoryActionBlockReason,
		unsaved: false,
	};
}
export async function applySalesFormStock(
	db: Db,
	command: z.infer<typeof applySalesFormStockSchema>,
	actor: { id: number; name: string },
) {
	const input = applySalesFormStockSchema.parse(command);
	return db.$transaction(
		async (tx) => {
			await tx.$queryRaw`SELECT id FROM SalesOrders WHERE id=${input.salesOrderId} FOR UPDATE`;
			await tx.$queryRaw`SELECT c.id FROM LineItemComponents c JOIN LineItem l ON l.id=c.lineItemId WHERE l.saleId=${input.salesOrderId} ORDER BY c.id FOR UPDATE`;
			const variants = await tx.lineItemComponents.findMany({
				where: {
					parent: { saleId: input.salesOrderId },
					status: { not: "cancelled" },
				},
				select: { inventoryVariantId: true },
			});
			const ids = [
				...new Set(
					variants
						.map((row) => row.inventoryVariantId)
						.filter((id): id is number => id != null),
				),
			].sort((a, b) => a - b);
			for (const id of ids) {
				await tx.$queryRaw`SELECT id FROM InventoryVariant WHERE id=${id} FOR UPDATE`;
				await tx.$queryRaw`SELECT id FROM InventoryStock WHERE inventoryVariantId=${id} AND deletedAt IS NULL ORDER BY id FOR UPDATE`;
			}
			const prior = await tx.event.findFirst({
				where: {
					type: "sales_form_stock_applied",
					userId: actor.id,
					deletedAt: null,
					AND: [
						{ data: { path: "$.salesOrderId", equals: input.salesOrderId } },
						{
							data: {
								path: "$.expectedRevision",
								equals: input.expectedRevision,
							},
						},
					],
				},
				select: { data: true },
			});
			if (prior) {
				const data = prior.data as {
					appliedQty: number;
					componentIds?: number[];
				};
				if (
					JSON.stringify(data.componentIds ?? null) !==
					JSON.stringify(input.componentIds ?? null)
				)
					throw new StockAdjustmentError(
						"CONFLICT",
						"The confirmed stock application belongs to different needs.",
					);
				return {
					salesOrderId: input.salesOrderId,
					appliedQty: data.appliedQty,
					replayed: true,
				};
			}
			const plan = await getSalesFormStockPlan(
				tx,
				input.salesOrderId,
				input.componentIds,
			);
			if (!plan.canApply)
				throw new StockAdjustmentError(
					"BAD_REQUEST",
					plan.blockReason || "Stock cannot be applied to this order.",
				);
			if (plan.revision !== input.expectedRevision)
				throw new StockAdjustmentError(
					"CONFLICT",
					"Stock or order needs changed. Refresh the inventory preview and confirm again.",
				);
			await assertSpecialOrderOperationAllowed(tx, {
				salesOrderId: input.salesOrderId,
				operation: "PURCHASING",
				actorUserId: actor.id,
				authorName: actor.name,
				source: "sales-form.apply-stock",
			});
			let appliedQty = 0;
			for (const row of plan.rows) {
				if (!row.inventoryVariantId || row.applyQty <= 0) continue;
				// Replace this need's uncommitted suggestions only after explicit confirmation.
				await tx.stockAllocation.updateMany({
					where: {
						lineItemComponentId: row.componentId,
						status: "pending_review",
						deletedAt: null,
					},
					data: {
						status: "released",
						deletedAt: new Date(),
						notes: "Replaced by confirmed sales-form stock application.",
					},
				});
				const result = await reserveAvailableStockForComponent(tx, {
					lineItemComponentId: row.componentId,
					inventoryVariantId: row.inventoryVariantId,
					qty: row.applyQty,
					note: `Applied from sales form by ${actor.name}.`,
				});
				if (result.reservedQty !== row.applyQty)
					throw new StockAdjustmentError(
						"CONFLICT",
						"Available stock changed. Refresh and try again.",
					);
				appliedQty += result.reservedQty;
				// Only resize unlinked, unreceived drafts; supplier-owned inbound remains intact.
				await tx.inboundDemand.updateMany({
					where: {
						lineItemComponentId: row.componentId,
						inboundShipmentItemId: null,
						qtyReceived: 0,
						deletedAt: null,
						status: { in: ["pending"] },
					},
					data: { status: "cancelled", deletedAt: new Date() },
				});
				const shortage = Math.max(
					0,
					row.required -
						row.applied -
						result.reservedQty -
						row.protectedInbound,
				);
				if (shortage > 0)
					await tx.inboundDemand.create({
						data: {
							lineItemComponentId: row.componentId,
							inventoryVariantId: row.inventoryVariantId,
							qty: shortage,
							status: "pending",
							notes: "Remaining need after confirmed stock application.",
						},
					});
				await recomputeLineItemComponentFulfillment(tx, row.componentId);
			}
			await tx.event.create({
				data: {
					type: "sales_form_stock_applied",
					userId: actor.id,
					data: {
						salesOrderId: input.salesOrderId,
						expectedRevision: input.expectedRevision,
						appliedQty,
						...(input.componentIds ? { componentIds: input.componentIds } : {}),
					},
				},
			});
			return { salesOrderId: input.salesOrderId, appliedQty };
		},
		{
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			timeout: 30_000,
		},
	);
}
