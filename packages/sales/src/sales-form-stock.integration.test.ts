import { expect, test } from "bun:test";
import { db } from "@gnd/db";
import {
	createGeneralInbound,
	getCategoryStockPolicy,
	getWorkflowStock,
	receiveInboundShipment,
	setCategoryStockPolicy,
	setVariantStockThreshold,
} from "@gnd/inventory";
import {
	applySalesFormStock,
	getSalesFormStockPlan,
} from "./sales-form-stock-application";

import { runSalesInventoryProjectionSync } from "./run-sales-inventory-projection-sync";
import { allocateReceivedInboundToBackorders } from "./sales-fulfillment-plan";
import { receiveSalesInboundShipment } from "./sales-inbound-receipt";
import {
	getSalesInventoryOverview,
	getSalesInventoryTrackingChangeRepairPreview,
} from "./sales-inventory-overview";
import { repairSalesStockTracking } from "./sales-stock-tracking-repair";

function required<T>(value: T | undefined): T {
	if (value === undefined) throw new Error("Fixture value is missing.");
	return value;
}
const localTest = process.env.GND_STOCK_INTEGRATION === "1" ? test : test.skip;
localTest(
	"local stock policy, competing sales, idempotent apply and warehouse partial receipts",
	async () => {
		const target = new URL(process.env.DATABASE_URL || "");
		if (
			!["127.0.0.1", "localhost"].includes(target.hostname) ||
			target.pathname !== "/gnd-prisma2"
		)
			throw new Error(
				"Requires primary local database; never run against hosted data.",
			);
		const uid = `stock-revisit-${crypto.randomUUID()}`;
		const actor = await db.users.findFirstOrThrow({
			where: { deletedAt: null },
			select: { id: true, name: true },
		});
		const category = await db.inventoryCategory.create({
			data: {
				uid,
				title: uid,
				productKind: "inventory",
				stockMode: "monitored",
				meta: {
					stockSettings: { lowStockAlert: 3, promptAvailableStock: true },
				},
			},
		});
		const step = await db.dykeSteps.create({ data: { uid, title: uid } });
		const inventory = await db.inventory.create({
			data: {
				uid,
				sourceComponentUid: uid,
				name: uid,
				inventoryCategoryId: category.id,
				productKind: "inventory",
			},
		});
		const variant = await db.inventoryVariant.create({
			data: { uid, inventoryId: inventory.id },
		});
		const stock = await db.inventoryStock.create({
			data: { inventoryVariantId: variant.id, qty: 5 },
		});
		const sub = await db.subComponents.create({
			data: {
				inventoryCategoryId: category.id,
				parentId: inventory.id,
				defaultInventoryId: inventory.id,
				required: true,
			},
		});
		const salesIds: number[] = [];
		const componentIds: number[] = [];
		const inboundIds: number[] = [];
		try {
			expect(
				(await getCategoryStockPolicy(db, { stepId: step.id })).categoryId,
			).toBe(category.id);
			await setCategoryStockPolicy(db, {
				categoryId: category.id,
				tracked: false,
				lowStockAlert: 2,
				promptAvailableStock: false,
			});
			expect(
				(await getCategoryStockPolicy(db, { stepId: step.id })).tracked,
			).toBe(false);
			await setCategoryStockPolicy(db, {
				categoryId: category.id,
				tracked: true,
				lowStockAlert: 3,
				promptAvailableStock: true,
			});
			expect(
				(await getWorkflowStock(db, { stepId: step.id, componentUids: [uid] }))
					.components[0]?.variants[0]?.level,
			).toBe("available");
			await setVariantStockThreshold(db, {
				inventoryVariantId: variant.id,
				lowStockAlert: 5,
			});
			expect(
				(await getWorkflowStock(db, { stepId: step.id, componentUids: [uid] }))
					.components[0]?.variants[0]?.level,
			).toBe("low_stock");
			await setVariantStockThreshold(db, {
				inventoryVariantId: variant.id,
				lowStockAlert: 0,
			});
			expect(
				(await getWorkflowStock(db, { stepId: step.id, componentUids: [uid] }))
					.components[0]?.variants[0]?.threshold,
			).toBe(0);
			await setVariantStockThreshold(db, {
				inventoryVariantId: variant.id,
				lowStockAlert: null,
			});
			expect(
				(await getWorkflowStock(db, { stepId: step.id, componentUids: [uid] }))
					.components[0]?.variants[0]?.threshold,
			).toBe(3);
			for (let i = 0; i < 2; i++) {
				const sale = await db.salesOrders.create({
					data: {
						slug: `${uid}-${i}`,
						orderId: `${uid}-${i}`,
						type: "order",
						status: "Draft",
						inventoryStatus: "configured",
						isDyke: true,
					},
				});
				salesIds.push(sale.id);
				const salesItem = await db.salesOrderItems.create({
					data: {
						salesOrderId: sale.id,
						description: uid,
						qty: 4,
						rate: 1,
						total: 4,
						meta: {
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
							formSteps: [
								{
									prodUid: uid,
									qty: 4,
									step: { uid, title: uid },
									component: { uid, name: uid },
								},
							],
						},
					},
				});
				const line = await db.lineItem.create({
					data: {
						saleId: sale.id,
						salesItemId: salesItem.id,
						lineItemType: "SALE",
						inventoryVariantId: variant.id,
						inventoryId: inventory.id,
						inventoryCategoryId: category.id,
						qty: 4,
						title: uid,
					},
				});
				// Imported local history contains orphan IDs above the component auto-increment.
				const component = await db.$transaction(async (tx) => {
					const [next] = await tx.$queryRaw<
						Array<{ id: bigint }>
					>`SELECT GREATEST(COALESCE((SELECT MAX(id) FROM LineItemComponents),0),COALESCE((SELECT MAX(lineItemComponentId) FROM StockAllocation),0),COALESCE((SELECT MAX(lineItemComponentId) FROM InboundDemand),0))+1 AS id`;
					return tx.lineItemComponents.create({
						data: {
							id: Number(next?.id),
							lineItemId: line.id,
							subComponentId: sub.id,
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
							required: true,
							qty: 4,
						},
					});
				});
				componentIds.push(component.id);
			}
			for (const salesOrderId of salesIds)
				await runSalesInventoryProjectionSync(db, {
					salesOrderId,
					source: "manual",
					triggeredByUserId: actor.id,
				});
			await expect(getSalesFormStockPlan(db, required(salesIds[0]), [required(componentIds[1])])).rejects.toThrow("Selected needs must belong to this order");
			const selectedPlan = await getSalesFormStockPlan(db, required(salesIds[0]), [required(componentIds[0])]);
			expect(selectedPlan.rows.map((row) => row.componentId)).toEqual([componentIds[0]]);
			const plans = await Promise.all(
				salesIds.map((id) => getSalesFormStockPlan(db, id)),
			);
			expect(plans.map((plan) => plan.canApply)).toEqual([true, true]);
			expect(plans.map((plan) => plan.rows[0]?.applyQty)).toEqual([4, 4]);
			expect(
				plans.every((plan) =>
					plan.rows.some((row) => row.promptAvailableStock && row.applyQty > 0),
				),
			).toBe(true);
			// Preview/decline is read-only: no reservation exists until confirmation.
			expect(
				await db.stockAllocation.count({
					where: {
						inventoryVariantId: variant.id,
						deletedAt: null,
						status: { in: ["reserved", "approved", "picked", "consumed"] },
					},
				}),
			).toBe(0);
			const actorInput = {
				id: actor.id,
				name: actor.name || "Stock integration",
			};
			const results = await Promise.allSettled(
				plans.map((plan) =>
					applySalesFormStock(
						db,
						{
							salesOrderId: plan.salesOrderId,
							expectedRevision: plan.revision,
						},
						actorInput,
					),
				),
			);
			expect(
				results.filter((result) => result.status === "fulfilled"),
			).toHaveLength(1);
			expect(
				results.filter((result) => result.status === "rejected"),
			).toHaveLength(1);
			const winner = results.findIndex(
				(result) => result.status === "fulfilled",
			);
			const loser = 1 - winner;
			const replay = await applySalesFormStock(
				db,
				{
					salesOrderId: required(plans[winner]).salesOrderId,
					expectedRevision: required(plans[winner]).revision,
				},
				actorInput,
			);
			expect(replay).toMatchObject({ appliedQty: 4, replayed: true });
			await expect(applySalesFormStock(db, { salesOrderId: required(plans[winner]).salesOrderId, expectedRevision: required(plans[winner]).revision, componentIds: [required(componentIds[winner])] }, actorInput)).rejects.toThrow("different needs");
			const fresh = await getSalesFormStockPlan(db, required(salesIds[loser]));
			expect(fresh.rows[0]).toMatchObject({
				available: 1,
				applyQty: 1,
				shortage: 3,
			});
			await expect(
				applySalesFormStock(
					db,
					{
						salesOrderId: required(plans[loser]).salesOrderId,
						expectedRevision: required(plans[loser]).revision,
					},
					actorInput,
				),
			).rejects.toMatchObject({ code: "CONFLICT" });
			await applySalesFormStock(
				db,
				{ salesOrderId: fresh.salesOrderId, expectedRevision: fresh.revision },
				actorInput,
			);
			expect(
				(
					await db.stockAllocation.aggregate({
						where: {
							inventoryVariantId: variant.id,
							deletedAt: null,
							status: "reserved",
						},
						_sum: { qty: true },
					})
				)._sum.qty,
			).toBe(5);
			expect(
				(
					await db.inboundDemand.findMany({
						where: {
							lineItemComponentId: componentIds[loser],
							deletedAt: null,
							status: "pending",
						},
					})
				).map((row) => row.qty),
			).toEqual([3]);
			for (const salesOrderId of salesIds)
				await runSalesInventoryProjectionSync(db, {
					salesOrderId,
					source: "manual",
					triggeredByUserId: actor.id,
				});
			const reopened = await Promise.all(
				salesIds.map((id) => getSalesFormStockPlan(db, id)),
			);
			expect(reopened.map((plan) => plan.rows[0]?.applied).sort()).toEqual([
				1, 4,
			]);
			expect(
				reopened.every((plan) => plan.rows.every((row) => row.applyQty === 0)),
			).toBe(true);
			expect(
				(
					await db.lineItemComponents.aggregate({
						where: { id: { in: componentIds } },
						_sum: { qtyAllocated: true },
					})
				)._sum.qtyAllocated,
			).toBe(5);
			expect(
				(await getWorkflowStock(db, { stepId: step.id, componentUids: [uid] }))
					.components[0]?.variants[0],
			).toMatchObject({ available: 0, level: "out_of_stock" });
			await db.salesOrders.update({
				where: { id: salesIds[loser] },
				data: { status: "Completed", deliveredAt: new Date() },
			});
			const terminal = await getSalesFormStockPlan(
				db,
				required(salesIds[loser]),
			);
			expect(terminal.canApply).toBe(false);
			await expect(
				applySalesFormStock(
					db,
					{
						salesOrderId: terminal.salesOrderId,
						expectedRevision: terminal.revision,
					},
					actorInput,
				),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
			await db.salesOrders.update({
				where: { id: salesIds[loser] },
				data: { type: "quote" },
			});
			await expect(
				getSalesFormStockPlan(db, required(salesIds[loser])),
			).rejects.toMatchObject({ code: "BAD_REQUEST" });
			const request = {
				idempotencyKey: crypto.randomUUID(),
				reference: uid,
				items: [
					{
						inventoryVariantId: variant.id,
						qty: 5,
						unitPrice: 2,
						location: "QA warehouse",
					},
				],
			};
			const inbound = await createGeneralInbound(db, request, actor.id);
			inboundIds.push(inbound.inboundId);
			expect(await createGeneralInbound(db, request, actor.id)).toMatchObject({
				inboundId: inbound.inboundId,
				replayed: true,
			});
			await expect(
				createGeneralInbound(
					db,
					{ ...request, reference: "changed" },
					actor.id,
				),
			).rejects.toMatchObject({ code: "CONFLICT" });
			const item = await db.inboundShipmentItem.findFirstOrThrow({
				where: { inboundId: inbound.inboundId },
			});
			const receive = (qty: number) =>
				db.$transaction((tx) =>
					receiveInboundShipment(tx, {
						inboundId: inbound.inboundId,
						authorName: actorInput.name,
						items: [
							{
								inboundShipmentItemId: item.id,
								qtyReceived: qty,
								qtyGood: qty,
								qtyIssue: 0,
							},
						],
					}),
				);
			await receive(2);
			await receive(2);
			expect(
				(
					await db.inventoryStock.findFirstOrThrow({
						where: {
							inventoryVariantId: variant.id,
							location: "QA warehouse",
							deletedAt: null,
						},
					})
				).qty,
			).toBe(2);
			await receive(5);
			await receive(5);
			expect(
				(
					await db.inventoryStock.findFirstOrThrow({
						where: {
							inventoryVariantId: variant.id,
							location: "QA warehouse",
							deletedAt: null,
						},
					})
				).qty,
			).toBe(5);
			expect(
				(await db.inventoryStock.findUniqueOrThrow({ where: { id: stock.id } }))
					.qty,
			).toBe(5);
			expect(
				await db.inboundDemand.count({
					where: { inboundShipmentItemId: item.id },
				}),
			).toBe(0);
			expect(
				await db.stockAllocation.count({
					where: { inventoryVariantId: variant.id, deletedAt: null },
				}),
			).toBe(2);
			const movement = await db.stockMovement.findMany({
				where: { inventoryVariantId: variant.id, inboundStockItemId: item.id },
			});
			expect(
				movement.reduce((qty, row) => qty + Number(row.changeQty), 0),
			).toBe(5);
			expect(movement).toHaveLength(2);
			// Ordered inbound retains ownership while only the remaining free need is applied.
			await db.salesOrders.update({
				where: { id: salesIds[loser] },
				data: { type: "order", status: "Draft", deliveredAt: null },
			});
			const linkedInbound = await createGeneralInbound(
				db,
				{
					idempotencyKey: crypto.randomUUID(),
					reference: uid,
					items: [{ inventoryVariantId: variant.id, qty: 2 }],
				},
				actor.id,
			);
			inboundIds.push(linkedInbound.inboundId);
			const linkedItem = await db.inboundShipmentItem.findFirstOrThrow({
				where: { inboundId: linkedInbound.inboundId },
			});
			const linkedDemand = await db.inboundDemand.create({
				data: {
					lineItemComponentId: required(componentIds[loser]),
					inventoryVariantId: variant.id,
					inboundShipmentItemId: linkedItem.id,
					qty: 2,
					status: "ordered",
				},
			});
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: required(componentIds[loser]),
					inventoryVariantId: variant.id,
					inventoryStockId: stock.id,
					qty: 1,
					status: "pending_review",
				},
			});
			const covered = await getSalesFormStockPlan(
				db,
				required(salesIds[loser]),
			);
			expect(covered.rows[0]).toMatchObject({
				applied: 1,
				protectedInbound: 2,
				applyQty: 1,
				shortage: 0,
				pendingReview: 1,
			});
			await applySalesFormStock(
				db,
				{
					salesOrderId: covered.salesOrderId,
					expectedRevision: covered.revision,
				},
				actorInput,
			);
			expect(
				await db.inboundDemand.findUniqueOrThrow({
					where: { id: linkedDemand.id },
				}),
			).toMatchObject({ qty: 2, status: "ordered", deletedAt: null });
			expect(
				await db.stockAllocation.count({
					where: {
						lineItemComponentId: componentIds[loser],
						status: "pending_review",
						deletedAt: null,
					},
				}),
			).toBe(0);
			expect(
				await db.inboundDemand.count({
					where: {
						lineItemComponentId: componentIds[loser],
						status: "pending",
						deletedAt: null,
					},
				}),
			).toBe(0);
			const receiveLinked = (qty: number) =>
				receiveSalesInboundShipment(db, {
					inboundId: linkedInbound.inboundId,
					authorName: actorInput.name,
					items: [
						{
							inboundShipmentItemId: linkedItem.id,
							qtyReceived: qty,
							qtyGood: qty,
							qtyIssue: 0,
						},
					],
				});
			// A reservation failure must roll back physical receipt and its audit.
			const receiptMovementCount = await db.stockMovement.count({
				where: { inboundStockItemId: linkedItem.id },
			});
			await expect(
				receiveSalesInboundShipment(
					db,
					{
						inboundId: linkedInbound.inboundId,
						authorName: actorInput.name,
						items: [
							{
								inboundShipmentItemId: linkedItem.id,
								qtyReceived: 1,
								qtyGood: 1,
								qtyIssue: 0,
							},
						],
					},
					{
						allocate: async () => {
							throw new Error("QA allocation failure");
						},
					},
				),
			).rejects.toThrow("QA allocation failure");
			expect(
				(
					await db.inboundDemand.findUniqueOrThrow({
						where: { id: linkedDemand.id },
					})
				).qtyReceived,
			).toBe(0);
			expect(
				await db.stockMovement.count({
					where: { inboundStockItemId: linkedItem.id },
				}),
			).toBe(receiptMovementCount);
			expect((await receiveLinked(1)).allocation.allocatedQty).toBe(1);
			expect(
				(await getSalesFormStockPlan(db, required(salesIds[loser]))).rows[0],
			).toMatchObject({ applied: 3, protectedInbound: 1, shortage: 0 });
			// Spare stock still exists; retry must not reserve it a second time.
			expect((await receiveLinked(1)).allocation.allocatedQty).toBe(0);
			expect(
				(await getSalesFormStockPlan(db, required(salesIds[loser]))).rows[0]
					?.applied,
			).toBe(3);
			expect((await receiveLinked(2)).allocation.allocatedQty).toBe(1);
			expect((await receiveLinked(2)).allocation.allocatedQty).toBe(0);
			expect(
				(await getSalesFormStockPlan(db, required(salesIds[loser]))).rows[0],
			).toMatchObject({ applied: 4, protectedInbound: 0, shortage: 0 });
			expect(
				(
					await getSalesInventoryOverview(db, {
						salesOrderId: required(salesIds[loser]),
					})
				)?.rows[0],
			).toMatchObject({ qtyAllocated: 4, qtyPending: 0, status: "fulfilled" });
			expect(
				(
					await db.stockAllocation.aggregate({
						where: {
							inboundDemandId: linkedDemand.id,
							deletedAt: null,
							status: "reserved",
						},
						_sum: { qty: true },
					})
				)._sum.qty,
			).toBe(2);
			expect(
				(
					await allocateReceivedInboundToBackorders(db, {
						lineItemComponentIds: [required(componentIds[loser])],
					})
				).allocatedQty,
			).toBe(0);
			expect(
				(
					await db.stockMovement.findMany({
						where: { inboundStockItemId: linkedItem.id },
						orderBy: { id: "asc" },
					})
				).map((row) => row.changeQty),
			).toEqual([1, 1]);

			// Quotes, archived orders and historical types must not enter activation repair.
			for (const [index, type] of [
				"quote",
				"order-hx",
				"order",
				"order",
			].entries()) {
				const original = await db.salesOrders.findUniqueOrThrow({
					where: { id: required(salesIds[winner]) },
					select: {
						items: {
							where: { deletedAt: null },
							take: 1,
							select: { meta: true },
						},
					},
				});
				const sale = await db.salesOrders.create({
					data: {
						slug: `${uid}-scope-${index}`,
						orderId: `${uid}-scope-${index}`,
						type,
						status: "Draft",
						inventoryStatus: index === 3 ? null : "configured",
						archivedAt: index === 2 ? new Date() : null,
					},
				});
				salesIds.push(sale.id);
				const salesItem = await db.salesOrderItems.create({
					data: {
						salesOrderId: sale.id,
						qty: 4,
						description: uid,
						meta: original.items[0]?.meta ?? {},
					},
				});
				if (index === 3) {
					const product = await db.dykeStepProducts.create({
						data: { uid, name: uid, dykeStepId: step.id },
					});
					await db.dykeStepForm.create({
						data: {
							salesId: sale.id,
							salesItemId: salesItem.id,
							stepId: step.id,
							componentId: product.id,
							prodUid: uid,
							value: uid,
							qty: 4,
						},
					});
					const preview = await getSalesInventoryTrackingChangeRepairPreview(
						db,
						{ inventoryCategoryId: category.id, limit: 50 },
					);
					expect(preview.eligibleOrderCount).toBe(0);
					expect(
						preview.projectionCandidates.map((row) => row.salesOrderId),
					).toEqual([sale.id]);
					const repair = await repairSalesStockTracking(
						db,
						{ inventoryCategoryId: category.id, salesOrderIds: [sale.id] },
						actor.id,
					);
					expect(repair.results[0]?.state).toBe("ready");
					const first = await getSalesFormStockPlan(db, sale.id);
					expect(first.rows[0]?.required).toBe(4);
					await repairSalesStockTracking(
						db,
						{ inventoryCategoryId: category.id, salesOrderIds: [sale.id] },
						actor.id,
					);
					expect(
						(await getSalesFormStockPlan(db, sale.id)).rows.map(
							(row) => row.componentId,
						),
					).toEqual(first.rows.map((row) => row.componentId));
					for (const rejectedId of salesIds.slice(2, 5))
						await expect(
							repairSalesStockTracking(
								db,
								{
									inventoryCategoryId: category.id,
									salesOrderIds: [rejectedId],
								},
								actor.id,
							),
						).rejects.toMatchObject({ code: "CONFLICT" });
				} else {
					const line = await db.lineItem.create({
						data: {
							saleId: sale.id,
							salesItemId: salesItem.id,
							lineItemType: "SALE",
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
							qty: 4,
						},
					});
					const component = await db.lineItemComponents.create({
						data: {
							lineItemId: line.id,
							subComponentId: sub.id,
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
							required: true,
							qty: 4,
						},
					});
					componentIds.push(component.id);
				}
			}
		} finally {
			const deletedAt = new Date();
			await db.$transaction(async (tx) => {
				await tx.stockAllocation.updateMany({
					where: { inventoryVariantId: variant.id },
					data: { deletedAt, status: "released" },
				});
				await tx.inboundDemand.updateMany({
					where: { inventoryVariantId: variant.id },
					data: { deletedAt, status: "cancelled" },
				});
				await tx.lineItemComponents.updateMany({
					where: { id: { in: componentIds } },
					data: { status: "cancelled" },
				});
				await tx.lineItem.updateMany({
					where: { saleId: { in: salesIds } },
					data: { deletedAt },
				});
				await tx.salesOrderItems.updateMany({
					where: { salesOrderId: { in: salesIds } },
					data: { deletedAt },
				});
				await tx.dykeStepForm.updateMany({
					where: { salesId: { in: salesIds } },
					data: { deletedAt },
				});
				await tx.dykeStepProducts.updateMany({
					where: { uid },
					data: { deletedAt },
				});
				await tx.lineItemComponents.updateMany({
					where: { parent: { saleId: { in: salesIds } } },
					data: { status: "cancelled" },
				});
				await tx.salesOrders.updateMany({
					where: { id: { in: salesIds } },
					data: { deletedAt },
				});
				await tx.inboundShipmentItem.updateMany({
					where: { inboundId: { in: inboundIds } },
					data: { deletedAt },
				});
				await tx.inboundShipment.updateMany({
					where: { id: { in: inboundIds } },
					data: { deletedAt, status: "cancelled" },
				});
				await tx.inventoryStock.updateMany({
					where: { inventoryVariantId: variant.id },
					data: { deletedAt },
				});
				await tx.inventoryVariant.update({
					where: { id: variant.id },
					data: { deletedAt },
				});
				await tx.subComponents.update({
					where: { id: sub.id },
					data: { deletedAt },
				});
				await tx.inventory.update({
					where: { id: inventory.id },
					data: { deletedAt },
				});
				await tx.inventoryCategory.update({
					where: { id: category.id },
					data: { deletedAt },
				});
				await tx.dykeSteps.update({
					where: { id: step.id },
					data: { deletedAt },
				});
			});
		}
	},
	60_000,
);
