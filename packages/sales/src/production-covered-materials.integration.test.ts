import { expect, test } from "bun:test";
import { db } from "@gnd/db";
import { workerClient } from "./production-availability-concurrency.integration.test";
import {
	getScopedReceivedNeedsPlan,
	applyScopedReceivedNeedsPlan,
} from "@gnd/inventory";
import {
	fixture,
	cleanup,
} from "./production-inbound-concurrency.integration.test";
import {
	getCoveredProductionMaterials,
	applyCoveredProductionMaterials,
} from "./production-covered-materials";
const localTest =
	process.env.GND_AVAILABILITY_DB_TEST === "1" ? test : test.skip;

localTest("Sync repairs stale proposals and derived classification before finalizing once", async () => {
	const f = await fixture("sync-repair");
	try {
		await db.inventoryCategory.update({ where: { id: f.category.id }, data: { stockMode: "monitored" } });
		await db.lineItem.update({ where: { id: f.line.id }, data: { meta: { production: { produceable: false }, inventorySync: { source: "copy-sales", productionProduceable: false } } } });
		await db.lineItemComponents.update({ where: { id: f.component.id }, data: { inventoryCategoryId: f.category.id, qtyReceived: 10, qtyAllocated: 0 } });
		await db.inboundDemand.updateMany({ where: { lineItemComponentId: f.component.id }, data: { qtyReceived: 10, status: "received" } });
		await db.inboundShipment.update({ where: { id: f.inbound.id }, data: { status: "completed" } });
		await db.inboundShipmentItem.update({ where: { id: f.item.id }, data: { qtyGood: 10 } });
		const exhausted = await db.inventoryStock.create({ data: { inventoryVariantId: f.variant.id, qty: 0 } });
		const received = await db.inventoryStock.create({ data: { inventoryVariantId: f.variant.id, qty: 10 } });
		const suggestion = await db.stockAllocation.create({ data: { lineItemComponentId: f.component.id, inventoryVariantId: f.variant.id, inventoryStockId: exhausted.id, qty: 10, status: "pending_review" } });
		await db.salesProductionSubmissionMaterialReview.updateMany({ where: { salesOrderId: f.sale.id, status: "PENDING" }, data: {
			materialSnapshot: [{ componentId: f.component.id, readiness: "awaiting_inbound" }],
			assignmentScope: [{ controlUid: f.control.uid, salesItemId: f.salesItem.id, assignmentId: f.assignment.id, assignedToId: f.assignment.assignedToId, assignmentUpdatedAt: f.assignment.updatedAt!.toISOString(), laborCost: f.assignment.laborCost }],
		} });
		await db.orderItemProductionAssignments.update({ where: { id: f.assignment.id }, data: { dueDate: new Date("2026-09-10T00:00:00Z") } });
		const actor = { ...f.actor, canMarkAvailable: true, canReconcileMaterials: true };
		await db.salesOrderItems.update({ where: { id: f.salesItem.id }, data: { meta: { produceable: false } } });
		const explicitConflict = await getCoveredProductionMaterials(db, f.sale.id, actor);
		expect(explicitConflict.repairableClassificationCount).toBe(0);
		expect(explicitConflict.blockers.join(" ")).toContain("sales configuration excludes production");
		await db.salesOrderItems.update({ where: { id: f.salesItem.id }, data: { meta: {} } });
		expect((await getCoveredProductionMaterials(db, f.sale.id, { ...actor, canViewAll: false })).repairableClassificationCount).toBe(0);
		const preview = await getCoveredProductionMaterials(db, f.sale.id, actor);
		expect(preview).toMatchObject({ canApply: true, repairableAllocationCount: 1, repairableClassificationCount: 1, eligibleReviewCount: 0 });
		await db.inventoryStock.update({ where: { id: received.id }, data: { qty: 5 } });
		expect((await getCoveredProductionMaterials(db, f.sale.id, actor)).repairableAllocationCount).toBe(0);
		await expect(applyCoveredProductionMaterials(db, { salesOrderId: f.sale.id, expectedRevision: preview.revision, idempotencyKey: crypto.randomUUID() }, async () => actor)).rejects.toThrow("changed");
		expect((await db.stockAllocation.findUniqueOrThrow({ where: { id: suggestion.id } })).status).toBe("pending_review");
		await db.inventoryStock.update({ where: { id: received.id }, data: { qty: 10 } });
		const current = await getCoveredProductionMaterials(db, f.sale.id, actor);
		const input = { salesOrderId: f.sale.id, expectedRevision: current.revision, idempotencyKey: crypto.randomUUID() };
		const results = await Promise.all([applyCoveredProductionMaterials(db, input, async () => actor), applyCoveredProductionMaterials(db, input, async () => actor)]);
		const result = results.find(row => !row.replayed)!;
		expect(results.filter(row => row.replayed)).toHaveLength(1);
		expect(result).toMatchObject({ repairedAllocationCount: 1, repairedClassificationCount: 1, refreshedReviewCount: 1, resolvedCount: 1, remainingMaterialQty: 0, remainingReviewCount: 0, remainingAllocationBlockCount: 0 });
		expect((await db.stockAllocation.findUniqueOrThrow({ where: { id: suggestion.id } })).status).toBe("cancelled");
		expect((await db.stockAllocation.aggregate({ where: { lineItemComponentId: f.component.id, status: "reserved", deletedAt: null }, _sum: { qty: true } }))._sum.qty).toBe(10);
		expect(await applyCoveredProductionMaterials(db, input, async () => actor)).toMatchObject({ replayed: true, repairedAllocationCount: 1 });
		expect((await getCoveredProductionMaterials(db, f.sale.id, actor)).canApply).toBe(false);
		expect((await db.inventoryStock.findUniqueOrThrow({ where: { id: received.id } })).qty).toBe(10);
		expect(await db.stockMovement.count({ where: { inventoryVariantId: f.variant.id } })).toBe(0);
	} finally {
		await db.event.deleteMany({ where: { type: "production_covered_materials_applied", data: { path: "$.salesOrderId", equals: f.sale.id } } });
		await db.payrollHistory.deleteMany({ where: { payroll: { orderId: f.sale.id } } });
		await db.payroll.deleteMany({ where: { orderId: f.sale.id } });
		await cleanup(f);
	}
}, 60000);

localTest(
	"scoped shipment application excludes issues and preserves another order's received demand",
	async () => {
		const own = await fixture("scope-own");
		const other = await fixture("scope-other");
		try {
			await db.inboundShipment.update({
				where: { id: own.inbound.id },
				data: { status: "completed" },
			});
			await db.inboundShipmentItem.update({
				where: { id: own.item.id },
				data: { qtyGood: 6, qtyIssue: 4 },
			});
			await db.inboundDemand.updateMany({
				where: { lineItemComponentId: other.component.id },
				data: {
					inboundShipmentItemId: own.item.id,
					qtyReceived: 2,
					status: "partially_received",
				},
			});
			const plan = await getScopedReceivedNeedsPlan(db, [own.component.id]);
			expect(plan.rows.length).toBe(1);
			expect(plan.rows[0]).toMatchObject({
				componentId: own.component.id,
				beforeQty: 0,
				afterQty: 4,
			});
			await db.$transaction(
				async (tx) =>
					applyScopedReceivedNeedsPlan(
						tx,
						await getScopedReceivedNeedsPlan(tx, [own.component.id]),
					),
				{ isolationLevel: "Serializable" },
			);
			expect(
				(
					await db.inboundDemand.findFirstOrThrow({
						where: { lineItemComponentId: other.component.id },
					})
				).qtyReceived,
			).toBe(2);
			expect(
				(
					await db.lineItemComponents.findUniqueOrThrow({
						where: { id: own.component.id },
					})
				).qtyReceived,
			).toBe(4);
			expect(
				(await getScopedReceivedNeedsPlan(db, [own.component.id])).rows.length,
			).toBe(0);
		} finally {
			await cleanup(other);
			await cleanup(own);
		}
	},
	60000,
);
for (const allocationStatus of [
	"reserved",
	"pending_review",
	"received_unallocated",
	"shipment_unapplied",
])
	localTest(
		`covered material reviews finalize once without receiving stock or duplicating payroll (${allocationStatus})`,
		async () => {
			const f = await fixture("covered-review");
			const unallocated = [
				"received_unallocated",
				"shipment_unapplied",
			].includes(allocationStatus);
			try {
				await db.inventoryCategory.update({
					where: { id: f.category.id },
					data: { stockMode: "monitored" },
				});
				const assignment = await db.orderItemProductionAssignments.update({
					where: { id: f.assignment.id },
					data: { laborCost: 10 },
				});
				const stock = await db.inventoryStock.create({
					data: { inventoryVariantId: f.variant.id, qty: 10 },
				});
				if (!unallocated)
					await db.stockAllocation.create({
						data: {
							lineItemComponentId: f.component.id,
							inventoryVariantId: f.variant.id,
							inventoryStockId: stock.id,
							qty: 10,
							status: allocationStatus,
						},
					});
				await db.lineItemComponents.update({
					where: { id: f.component.id },
					data: {
						inventoryCategoryId: f.category.id,
						qtyAllocated: unallocated ? 0 : 10,
						qtyReceived: allocationStatus === "received_unallocated" ? 10 : 0,
						status:
							allocationStatus === "received_unallocated"
								? "partially_allocated"
								: "allocated",
					},
				});
				if (allocationStatus === "received_unallocated") {
					await db.inboundDemand.updateMany({
						where: { lineItemComponentId: f.component.id },
						data: { qtyReceived: 10, status: "received" },
					});
					await db.inboundShipmentItem.update({
						where: { id: f.item.id },
						data: { qtyGood: 10 },
					});
				}
				if (allocationStatus === "shipment_unapplied") {
					await db.inboundShipment.update({
						where: { id: f.inbound.id },
						data: { status: "completed" },
					});
					await db.inboundShipmentItem.update({
						where: { id: f.item.id },
						data: { qtyGood: 10 },
					});
				}
				const review =
					await db.salesProductionSubmissionMaterialReview.findFirstOrThrow({
						where: { salesOrderId: f.sale.id, status: "PENDING" },
					});
				await db.salesProductionSubmissionMaterialReview.update({
					where: { id: review.id },
					data: {
						assignmentScope: [
							{
								controlUid: f.control.uid,
								salesItemId: f.salesItem.id,
								assignmentId: assignment.id,
								assignedToId: assignment.assignedToId,
								assignmentUpdatedAt: assignment.updatedAt.toISOString(),
								laborCost: 10,
							},
						],
						materialSnapshot: [
							{ componentId: f.component.id, readiness: "awaiting_inbound" },
						],
					},
				});
				const actor = {
					...f.actor,
					canMarkAvailable: true,
					canReconcileMaterials: true,
				};
				const before = await getCoveredProductionMaterials(
					db,
					f.sale.id,
					actor,
				);
				expect(before).toMatchObject({
					canApply: true,
					applicableAllocationCount:
						allocationStatus === "pending_review" ? 1 : 0,
					applicableDemandCount:
						allocationStatus === "shipment_unapplied" ? 1 : 0,
				});
				const input = {
					salesOrderId: f.sale.id,
					expectedRevision: before.revision,
					idempotencyKey: crypto.randomUUID(),
				};
				if (allocationStatus === "pending_review") {
					const noInventoryAuthority = {
						...actor,
						canMarkAvailable: false,
						canEditInbound: false,
					};
					const deniedPreview = await getCoveredProductionMaterials(
						db,
						f.sale.id,
						noInventoryAuthority,
					);
					expect(deniedPreview).toMatchObject({
						canApply: false,
						canApplyAllocations: false,
					});
					await expect(
						applyCoveredProductionMaterials(
							db,
							{ ...input, expectedRevision: deniedPreview.revision },
							async () => noInventoryAuthority,
						),
					).rejects.toThrow("No covered production reviews are ready");
					await db.inventoryStock.update({
						where: { id: stock.id },
						data: { qty: 4 },
					});
					expect(
						await getCoveredProductionMaterials(db, f.sale.id, actor),
					).toMatchObject({ canApply: false, allocationBlocked: true });
					await expect(
						applyCoveredProductionMaterials(db, input, async () => actor),
					).rejects.toThrow("Materials or production reviews changed");
					await db.inventoryStock.update({
						where: { id: stock.id },
						data: { qty: 10 },
					});
				}
				const readOnlyActor = { ...actor, canReconcileMaterials: false };
				expect(
					await getCoveredProductionMaterials(db, f.sale.id, readOnlyActor),
				).toMatchObject({ canApply: false });
				await expect(
					applyCoveredProductionMaterials(db, input, async () => readOnlyActor),
				).rejects.toThrow("You cannot apply covered production materials.");
				await expect(
					applyCoveredProductionMaterials(
						db,
						{ ...input, expectedRevision: "0".repeat(64) },
						async () => actor,
					),
				).rejects.toThrow("Materials or production reviews changed.");
				expect(await db.payroll.count({ where: { orderId: f.sale.id } })).toBe(
					0,
				);
				expect(
					(
						await db.salesProductionSubmissionMaterialReview.findUniqueOrThrow({
							where: { id: review.id },
						})
					).status,
				).toBe("PENDING");
				expect(
					await applyCoveredProductionMaterials(db, input, async () => actor),
				).toMatchObject({
					resolvedCount: 1,
					replayed: false,
					remainingMaterialQty: 0,
					remainingAllocationBlockCount: 0,
				});
				expect(
					await applyCoveredProductionMaterials(db, input, async () => actor),
				).toMatchObject({
					resolvedCount: 1,
					replayed: true,
					remainingMaterialQty: 0,
					remainingAllocationBlockCount: 0,
				});
				await expect(
					applyCoveredProductionMaterials(
						db,
						{ ...input, expectedRevision: "0".repeat(64) },
						async () => actor,
					),
				).rejects.toThrow("already used with different details");
				expect(await db.payroll.count({ where: { orderId: f.sale.id } })).toBe(
					1,
				);
				expect(
					(await db.payroll.findFirstOrThrow({ where: { orderId: f.sale.id } }))
						.amount,
				).toBe(20);
				expect(
					await db.stockMovement.count({
						where: { inventoryVariantId: f.variant.id },
					}),
				).toBe(0);
				expect(
					(
						await db.inboundShipmentItem.findUniqueOrThrow({
							where: { id: f.item.id },
						})
					).qtyGood,
				).toBe(unallocated ? 10 : 0);
				expect(
					await getCoveredProductionMaterials(db, f.sale.id, actor),
				).toMatchObject({ eligibleReviewCount: 0, canApply: false });
				if (allocationStatus === "received_unallocated") {
					await db.lineItemComponents.update({
						where: { id: f.component.id },
						data: { qty: 20 },
					});
					await db.inventoryStock.update({
						where: { id: stock.id },
						data: { qty: 20 },
					});
					expect(
						await getCoveredProductionMaterials(db, f.sale.id, actor),
					).toMatchObject({ applicableReceivedQty: 0, canApply: false });
					expect(
						(
							await db.stockAllocation.aggregate({
								where: { lineItemComponentId: f.component.id, deletedAt: null },
								_sum: { qty: true },
							})
						)._sum.qty,
					).toBe(10);
				}
			} finally {
				await db.event.deleteMany({
					where: {
						type: "production_covered_materials_applied",
						data: { path: "$.salesOrderId", equals: f.sale.id },
					},
				});
				await db.payrollHistory.deleteMany({
					where: { payroll: { orderId: f.sale.id } },
				});
				await db.payroll.deleteMany({ where: { orderId: f.sale.id } });
				await cleanup(f);
			}
		},
		60000,
	);

for (const change of ["none", "assignment", "policy"] as const) {
	localTest(
		`worker synchronization revalidates assignment and receiving policy: ${change}`,
		async () => {
			const f = await fixture("worker-sync");
			try {
				await db.inventoryCategory.update({
					where: { id: f.category.id },
					data: { stockMode: "monitored" },
				});
				await db.lineItemComponents.update({
					where: { id: f.component.id },
					data: {
						inventoryCategoryId: f.category.id,
						qtyAllocated: 10,
						status: "partially_allocated",
					},
				});
				const stock = await db.inventoryStock.create({
					data: { inventoryVariantId: f.variant.id, qty: 10 },
				});
				const allocation = await db.stockAllocation.create({
					data: {
						lineItemComponentId: f.component.id,
						inventoryVariantId: f.variant.id,
						inventoryStockId: stock.id,
						qty: 10,
						status: "pending_review",
					},
				});
				const client = workerClient(f);
				const actor = {
					...f.actor,
					canViewAll: false,
					canEditInbound: false,
					canMarkAvailable: false,
					canReconcileMaterials: false,
				};
				const preview = await getCoveredProductionMaterials(
					client,
					f.sale.id,
					actor,
				);
				expect(preview).toMatchObject({
					workerMode: true,
					canApply: true,
					applicableAllocationCount: 1,
				});
				if (change === "assignment")
					await db.orderItemProductionAssignments.update({
						where: { id: f.assignment.id },
						data: { deletedAt: new Date() },
					});
				if (change === "policy")
					await db.settings.update({
						where: { id: f.policy.id },
						data: {
							meta: {
								production: { workerCanReceiveInbound: false, revision: 2 },
							},
						},
					});
				const input = {
					salesOrderId: f.sale.id,
					expectedRevision: preview.revision,
					idempotencyKey: crypto.randomUUID(),
				};
				if (change === "none") {
					expect(
						await applyCoveredProductionMaterials(
							client,
							input,
							async () => actor,
						),
					).toMatchObject({ appliedAllocationCount: 1, replayed: false });
					expect(
						await applyCoveredProductionMaterials(
							client,
							input,
							async () => actor,
						),
					).toMatchObject({ appliedAllocationCount: 1, replayed: true });
				} else {
					await expect(
						applyCoveredProductionMaterials(client, input, async () => actor),
					).rejects.toThrow();
					expect(
						(
							await db.stockAllocation.findUniqueOrThrow({
								where: { id: allocation.id },
							})
						).status,
					).toBe("pending_review");
				}
				expect(
					await db.stockMovement.count({
						where: { inventoryVariantId: f.variant.id },
					}),
				).toBe(0);
				expect(
					(
						await db.inventoryStock.findUniqueOrThrow({
							where: { id: stock.id },
						})
					).qty,
				).toBe(10);
			} finally {
				await db.event.deleteMany({
					where: {
						type: "production_covered_materials_applied",
						data: { path: "$.salesOrderId", equals: f.sale.id },
					},
				});
				await db.payrollHistory.deleteMany({
					where: { payroll: { orderId: f.sale.id } },
				});
				await db.payroll.deleteMany({ where: { orderId: f.sale.id } });
				await cleanup(f);
			}
		},
		60000,
	);
}
