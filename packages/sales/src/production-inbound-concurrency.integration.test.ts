import { expect, test } from "bun:test";
import { db, Prisma, type Db, type TransactionClient } from "@gnd/db";
import { getSalesPipelineSnapshots } from "./sales-pipeline-order";
import {
	getProductionPendingInbounds,
	receiveProductionInbound,
} from "./production-inbound";

// Explicitly opt-in: committed disposable fixtures are required to exercise
// independent connections and the command's own transaction rollback.
const localTest = process.env.GND_RECEIPT_DB_TEST === "1" ? test : test.skip;
export async function fixture(scenario: string) {
	const target = new URL(process.env.DATABASE_URL || "mysql://missing");
	if (!["127.0.0.1", "localhost", "::1"].includes(target.hostname))
		throw new Error("Local fixtures only");
	return db.$transaction(
		async (tx) => {
			const unique = `receipt-test-${crypto.randomUUID()}`;
			const user = await tx.users.findFirstOrThrow({
				select: { id: true },
			});
			const actor = {
				id: user.id,
				canEditInbound: true,
				canViewAll: true,
			};
			const category = await tx.inventoryCategory.create({
				data: { title: unique, uid: unique },
			});
			const inventory = await tx.inventory.create({
				data: {
					name: unique,
					uid: unique,
					inventoryCategoryId: category.id,
				},
			});
			const variant = await tx.inventoryVariant.create({
				data: { uid: unique, inventoryId: inventory.id },
			});
			const sub = await tx.subComponents.create({
				data: {
					inventoryCategoryId: category.id,
					parentId: inventory.id,
				},
			});
			const sale = await tx.salesOrders.create({
				data: {
					orderId: unique,
					slug: unique,
					type: "order",
					status: "Draft",
				},
			});

			const salesItem = await tx.salesOrderItems.create({
				data: { salesOrderId: sale.id, qty: 10, dykeProduction: true },
			});
			const control = await tx.salesItemControl.create({
				data: {
					uid: `item-${salesItem.id}`,
					salesId: sale.id,
					orderItemId: salesItem.id,
					produceable: true,
				},
			});
			const assignment = await tx.orderItemProductionAssignments.create({
				data: {
					orderId: sale.id,
					itemId: salesItem.id,
					assignedToId: user.id,
					assignedById: user.id,
					qtyAssigned: 10,
					qtyCompleted: 3,
					salesItemControlUid: control.uid,
				},
			});
			const policy = await tx.settings.create({
				data: {
					type: unique,
					meta: { production: { workerCanReceiveInbound: true, revision: 1 } },
				},
			});
			for (const status of ["PENDING", "APPROVED"] as const) {
				const review = await tx.salesProductionSubmissionMaterialReview.create({
					data: {
						salesOrderId: sale.id,
						submittedById: user.id,
						status,
						classificationReason: "AWAITING_INBOUND",
						idempotencyKey: `${unique}-${status}`,
						assignmentScope: [
							{
								controlUid: control.uid,
								salesItemId: salesItem.id,
								assignmentId: assignment.id,
								assignedToId: user.id,
							},
						],
						materialSnapshot: [
							{ componentId: null, readiness: "awaiting_inbound" },
						],
					},
				});
				await tx.orderProductionSubmissions.create({
					data: {
						salesOrderId: sale.id,
						salesOrderItemId: salesItem.id,
						assignmentId: assignment.id,
						submittedById: user.id,
						materialReviewId: review.id,
						qty: status === "PENDING" ? 2 : 3,
					},
				});
			}
			const line = await tx.lineItem.create({
				data: {
					lineItemType: "SALE",
					salesItemId: salesItem.id,
					inventoryId: inventory.id,
					inventoryCategoryId: category.id,
					inventoryVariantId: variant.id,
					saleId: sale.id,
					qty: 10,
				},
			});
			const component = await tx.lineItemComponents.create({
				data: {
					lineItemId: line.id,
					subComponentId: sub.id,
					inventoryId: inventory.id,
					inventoryVariantId: variant.id,
					qty: 10,
					required: true,
				},
			});
			const inbound = await tx.inboundShipment.create({
				data: { status: "pending", reference: unique },
			});
			const delivered = scenario === "partial" ? 5 : 10;
			if (scenario === "shared-shipment")
				await tx.inboundShipmentItem.createMany({
					data: Array.from({ length: 52 }, () => ({
						inboundId: inbound.id,
						inventoryVariantId: variant.id,
						qty: 1,
						qtyGood: 0,
						qtyIssue: 0,
					})),
				});
			const item = await tx.inboundShipmentItem.create({
				data: {
					inboundId: inbound.id,
					inventoryVariantId: variant.id,
					qty: delivered,
					qtyGood: 0,
					qtyIssue: 0,
				},
			});
			const unrelatedItem = await tx.inboundShipmentItem.create({
				data: {
					inboundId: inbound.id,
					inventoryVariantId: variant.id,
					qty: 7,
					qtyGood: 0,
					qtyIssue: 0,
				},
			});
			const quantities = scenario === "split-demand" ? [5, 5] : [delivered];
			for (const qty of quantities)
				await tx.inboundDemand.create({
					data: {
						lineItemComponentId: component.id,
						inventoryVariantId: variant.id,
						inboundShipmentItemId: item.id,
						qty,
						status: "pending",
					},
				});
			if (scenario === "invalid-pending")
				await tx.stockAllocation.create({
					data: {
						lineItemComponentId: component.id,
						inventoryVariantId: variant.id,
						qty: 20,
						status: "pending_review",
					},
				});

			return {
				actor,
				salesItem,
				control,
				assignment,
				policy,
				sale,
				line,
				component,
				inbound,
				item,
				unrelatedItem,
				variant,
				inventory,
				category,
				sub,
			};
		},
		{ timeout: 30000 },
	);
}
type Fixture = Awaited<ReturnType<typeof fixture>>;
export async function cleanup(f: Fixture) {
	await db.$transaction(
		async (tx) => {
			await tx.event.deleteMany({
				where: {
					type: "production_inbound_received",
					data: { path: "$.salesOrderId", equals: f.sale.id },
				},
			});
			await tx.stockMovement.deleteMany({
				where: { inventoryVariantId: f.variant.id },
			});
			await tx.stockAllocation.deleteMany({
				where: { lineItemComponentId: f.component.id },
			});
			await tx.inboundDemand.deleteMany({
				where: { lineItemComponentId: f.component.id },
			});
			await tx.inventoryLog.deleteMany({
				where: { inventoryVariantId: f.variant.id },
			});
			await tx.inventoryStock.deleteMany({
				where: { inventoryVariantId: f.variant.id },
			});
			await tx.inboundShipmentItem.deleteMany({
				where: { inboundId: f.inbound.id },
			});
			await tx.inboundShipment.deleteMany({ where: { id: f.inbound.id } });
			await tx.salesOrderListProjection.deleteMany({
				where: { salesOrderId: f.sale.id },
			});
			await tx.orderProductionSubmissions.deleteMany({
				where: { salesOrderId: f.sale.id },
			});
			await tx.salesProductionSubmissionMaterialReview.deleteMany({
				where: { salesOrderId: f.sale.id },
			});
			await tx.orderItemProductionAssignments.deleteMany({
				where: { orderId: f.sale.id },
			});
			await tx.qtyControl.deleteMany({
				where: { itemControlUid: f.control.uid },
			});
			await tx.salesInventoryProjectionState.deleteMany({
				where: { salesOrderId: f.sale.id },
			});
			await tx.salesItemControl.deleteMany({ where: { salesId: f.sale.id } });
			await tx.settings.deleteMany({ where: { id: f.policy.id } });
			await tx.lineItemComponents.deleteMany({ where: { id: f.component.id } });
			await tx.lineItem.deleteMany({ where: { id: f.line.id } });
			await tx.salesOrderItems.deleteMany({
				where: { salesOrderId: f.sale.id },
			});
			await tx.salesOrders.deleteMany({ where: { id: f.sale.id } });
			await tx.subComponents.deleteMany({ where: { id: f.sub.id } });
			await tx.inventoryVariant.deleteMany({ where: { id: f.variant.id } });
			await tx.inventory.deleteMany({ where: { id: f.inventory.id } });
			await tx.inventoryCategory.deleteMany({ where: { id: f.category.id } });
		},
		{ timeout: 30000 },
	);
	expect(await db.salesOrders.count({ where: { id: f.sale.id } })).toBe(0);
	expect(
		await db.stockMovement.count({
			where: { inventoryVariantId: f.variant.id },
		}),
	).toBe(0);
}
async function inputFor(f: Fixture) {
	const p = await getProductionPendingInbounds(
		db,
		{ salesOrderId: f.sale.id, take: 10 },
		f.actor,
	);
	expect(p.rows[0]?.canReceive).toBe(true);
	return {
		salesOrderId: f.sale.id,
		inboundId: f.inbound.id,
		expectedRevision: p.rows[0]!.revision,
		idempotencyKey: crypto.randomUUID(),
	};
}
export async function productionState(f: Fixture) {
	return {
		submissions: await db.orderProductionSubmissions.findMany({
			where: { salesOrderId: f.sale.id },
			orderBy: { id: "asc" },
		}),
		reviews: await db.salesProductionSubmissionMaterialReview.findMany({
			where: { salesOrderId: f.sale.id },
			orderBy: { id: "asc" },
		}),
		payroll: await db.payroll.findMany({
			where: { orderId: f.sale.id },
			orderBy: { id: "asc" },
		}),
		assignment: await db.orderItemProductionAssignments.findUnique({
			where: { id: f.assignment.id },
		}),
	};
}
async function state(f: Fixture) {
	return {
		item: await db.inboundShipmentItem.findUniqueOrThrow({
			where: { id: f.item.id },
		}),
		demands: await db.inboundDemand.findMany({
			where: { lineItemComponentId: f.component.id },
		}),
		stocks: await db.inventoryStock.findMany({
			where: { inventoryVariantId: f.variant.id },
		}),
		movements: await db.stockMovement.findMany({
			where: { inventoryVariantId: f.variant.id },
		}),
		allocations: await db.stockAllocation.findMany({
			where: { lineItemComponentId: f.component.id },
		}),
		audit: await db.event.findMany({
			where: {
				type: "production_inbound_received",
				data: { path: "$.salesOrderId", equals: f.sale.id },
			},
		}),
		projection: await db.salesOrderListProjection.findUnique({
			where: { salesOrderId: f.sale.id },
		}),
	};
}
localTest(
	"receipt command rolls back its own stock, demand, allocation and audit writes after allocation rejection",
	async () => {
		const f = await fixture("invalid-pending");
		try {
			const input = await inputFor(f);
			const priorProduction = await productionState(f);
			const before = await state(f);
			await expect(
				receiveProductionInbound(db, input, async () => f.actor),
			).rejects.toThrow("exceed material needs");
			expect(await state(f)).toEqual(before);
			expect(await productionState(f)).toEqual(priorProduction);
		} finally {
			await cleanup(f);
		}
	},
	40000,
);

for (const duplicateKey of [true, false])
	localTest(
		`independent concurrent receipts apply quantities once (same key: ${duplicateKey})`,
		async () => {
			const f = await fixture("single");
			try {
				const input = await inputFor(f);
				const priorProduction = await productionState(f);
				const other = {
					...input,
					idempotencyKey: duplicateKey
						? input.idempotencyKey
						: crypto.randomUUID(),
				};
				const results = await Promise.allSettled([
					receiveProductionInbound(db, input, async () => f.actor),
					receiveProductionInbound(db, other, async () => f.actor),
				]);
				expect(
					results.filter((r) => r.status === "fulfilled").length,
				).toBeGreaterThan(0);
				// A database contention rejection is safe and retryable. The committed request
				// must replay, while a distinct stale request must conflict without new writes.
				const winner = results[0]!.status === "fulfilled" ? input : other;
				expect(
					(await receiveProductionInbound(db, winner, async () => f.actor))
						.replayed,
				).toBe(true);
				const after = await state(f);
				expect(after.item.qtyGood).toBe(10);
				expect(
					after.demands.reduce((n, d) => n + (d.qtyReceived ?? 0), 0),
				).toBe(10);
				expect(after.stocks.reduce((n, s) => n + s.qty, 0)).toBe(10);
				expect(after.allocations.reduce((n, a) => n + a.qty, 0)).toBe(10);
				expect(after.movements.length).toBe(1);
				expect(await productionState(f)).toEqual(priorProduction);
				expect(after.audit.length).toBe(1);
				expect(after.audit[0]!.data).toMatchObject({
					salesOrderId: f.sale.id,
					inboundId: f.inbound.id,
					remainingBackorderQty: 0,
					allocatedQty: 10,
					itemIds: [f.item.id],
					componentIds: [f.component.id],
					receivedItems: [{ id: f.item.id, previousGood: 0, receivedGood: 10 }],
				});
				expect(after.projection?.state).toBe("ready");
				const canonical = (
					await getSalesPipelineSnapshots(db, [f.sale.id])
				).get(f.sale.id)!;
				expect(after.projection?.sourceUpdatedAt.toISOString()).toBe(
					new Date(canonical.freshness.evidenceUpdatedAt!).toISOString(),
				);
				expect(after.projection?.pipelineRevision).toBe(canonical.revision);
				expect(after.projection?.pipelineRevision).toBeTruthy();
			} finally {
				await cleanup(f);
			}
		},
		60000,
	);

// Route only the global Sales policy row to this fixture's private Settings row.
// Production SQL, assignment scope, locks, writes and transaction boundaries are
// otherwise real. This keeps tests from enabling receipt for interactive users.
function workerClient(f: Fixture): Db {
	const scope = (client: TransactionClient) =>
		new Proxy(client, {
			get(target, key) {
				if (key === "settings")
					return new Proxy(target.settings, {
						get(model, method) {
							if (method === "findFirst")
								return (args: Prisma.SettingsFindFirstArgs) =>
									model.findFirst({
										...args,
										where: { ...args.where, type: f.policy.type },
									});
							return Reflect.get(model, method);
						},
					});
				if (key === "$queryRaw")
					return (query: Prisma.Sql) =>
						target.$queryRaw(
							query.sql.includes("FROM Settings WHERE type='sales-settings'")
								? Prisma.sql`SELECT id FROM Settings WHERE id=${f.policy.id} FOR UPDATE`
								: query,
						);
				return Reflect.get(target, key);
			},
		});
	return new Proxy(db, {
		get(target, key) {
			if (key === "$transaction")
				return (
					fn: (tx: TransactionClient) => Promise<unknown>,
					options: {
						maxWait?: number;
						timeout?: number;
						isolationLevel?: Prisma.TransactionIsolationLevel;
					},
				) => target.$transaction((tx) => fn(scope(tx)), options);
			return Reflect.get(scope(target), key);
		},
	}) as Db;
}
const asWorker = (f: Fixture) => ({
	id: f.actor.id,
	canEditInbound: false,
	canViewAll: false,
});

for (const workerFirst of [true, false])
	localTest(
		`enabled worker/admin receipt preserves reviews and scope (worker first: ${workerFirst})`,
		async () => {
			const f = await fixture("single");
			try {
				const client = workerClient(f);
				const worker = asWorker(f);
				const preview = await getProductionPendingInbounds(
					client,
					{ salesOrderId: f.sale.id, take: 10 },
					worker,
				);
				expect(preview.receivingEnabled).toBe(true);
				expect(preview.rows[0]?.canReceive).toBe(true);
				const input = {
					salesOrderId: f.sale.id,
					inboundId: f.inbound.id,
					expectedRevision: preview.rows[0]!.revision,
					idempotencyKey: crypto.randomUUID(),
				};
				const before = await productionState(f);
				const adminPreview = await getProductionPendingInbounds(
					client,
					{ salesOrderId: f.sale.id, take: 10 },
					f.actor,
				);
				const adminInput = {
					...input,
					expectedRevision: adminPreview.rows[0]!.revision,
					idempotencyKey: crypto.randomUUID(),
				};
				if (workerFirst)
					expect(
						(await receiveProductionInbound(client, input, async () => worker))
							.replayed,
					).toBe(false);
				const result = await Promise.allSettled([
					receiveProductionInbound(client, input, async () => worker),
					receiveProductionInbound(client, adminInput, async () => f.actor),
				]);
				if (workerFirst) expect(result[0]!.status).toBe("fulfilled");
				expect(result.filter((r) => r.status === "fulfilled").length).toBe(1);
				expect(
					(
						await db.inboundShipmentItem.findUniqueOrThrow({
							where: { id: f.unrelatedItem.id },
						})
					).qtyGood,
				).toBe(0);
				const after = await state(f);
				expect(after.item.qtyGood).toBe(10);
				expect(after.movements.length).toBe(1);
				expect(after.audit.length).toBe(1);
				expect(await productionState(f)).toEqual(before);
			} finally {
				await cleanup(f);
			}
		},
		60000,
	);

for (const change of ["reassigned", "policy-revoked", "cancelled"] as const)
	localTest(
		`receipt revalidates concurrent ${change} before writing`,
		async () => {
			const f = await fixture("single");
			try {
				const client = workerClient(f),
					worker = asWorker(f);
				const preview = await getProductionPendingInbounds(
					client,
					{ salesOrderId: f.sale.id, take: 10 },
					worker,
				);
				const input = {
					salesOrderId: f.sale.id,
					inboundId: f.inbound.id,
					expectedRevision: preview.rows[0]!.revision,
					idempotencyKey: crypto.randomUUID(),
				};
				let release!: () => void, locked!: () => void;
				const ready = new Promise<void>((r) => (locked = r)),
					hold = new Promise<void>((r) => (release = r));
				const concurrent = db.$transaction(
					async (tx) => {
						await tx.$queryRaw(
							Prisma.sql`SELECT id FROM SalesOrders WHERE id=${f.sale.id} FOR UPDATE`,
						);
						if (change === "reassigned")
							await tx.orderItemProductionAssignments.update({
								where: { id: f.assignment.id },
								data: { assignedToId: null },
							});
						if (change === "policy-revoked")
							await tx.settings.update({
								where: { id: f.policy.id },
								data: {
									meta: {
										production: { workerCanReceiveInbound: false, revision: 2 },
									},
								},
							});
						if (change === "cancelled")
							await tx.inboundShipment.update({
								where: { id: f.inbound.id },
								data: { status: "cancelled" },
							});
						locked();
						await hold;
					},
					{ timeout: 15000 },
				);
				await ready;
				const receipt = receiveProductionInbound(
					client,
					input,
					async () => worker,
				);
				// Observe rejection immediately to avoid an unhandled-promise failure.
				const outcome = receipt.then(
					(value) => ({ value, error: null }),
					(error) => ({ value: null, error }),
				);
				release();
				await concurrent;
				const result = await outcome;
				expect(result.value).toBeNull();
				expect(String(result.error)).toContain(
					change === "reassigned"
						? "No active assignment"
						: change === "policy-revoked"
							? "disabled"
							: "changed",
				);
				const after = await state(f);
				expect(after.item.qtyGood).toBe(0);
				expect(after.stocks.length).toBe(0);
				expect(after.movements.length).toBe(0);
				expect(after.audit.length).toBe(0);
			} finally {
				await cleanup(f);
			}
		},
		60000,
	);

localTest(
	"different orders receiving the same variant cannot over-approve shared stock",
	async () => {
		const first = await fixture("single"),
			second = await fixture("single");
		try {
			await db.$transaction(async (tx) => {
				await tx.lineItemComponents.update({
					where: { id: second.component.id },
					data: {
						inventoryVariantId: first.variant.id,
						inventoryId: first.inventory.id,
					},
				});
				await tx.inboundShipmentItem.update({
					where: { id: second.item.id },
					data: { inventoryVariantId: first.variant.id },
				});
				await tx.inboundDemand.updateMany({
					where: { lineItemComponentId: second.component.id },
					data: { inventoryVariantId: first.variant.id },
				});
				const sharedStock = await tx.inventoryStock.create({
					data: { inventoryVariantId: first.variant.id, qty: 10 },
				});
				for (const f of [first, second]) {
					await tx.inboundShipmentItem.update({
						where: { id: f.item.id },
						data: { qty: 1 },
					});
					await tx.inboundDemand.updateMany({
						where: { lineItemComponentId: f.component.id },
						data: { qty: 1 },
					});
					await tx.stockAllocation.create({
						data: {
							lineItemComponentId: f.component.id,
							inventoryStockId: sharedStock.id,
							inventoryVariantId: first.variant.id,
							qty: 10,
							status: "pending_review",
						},
					});
				}
			});
			const fixtures = [first, second];
			const inputs = await Promise.all(fixtures.map(inputFor));
			const outcomes = await Promise.allSettled(
				fixtures.map((f, i) =>
					receiveProductionInbound(db, inputs[i]!, async () => f.actor),
				),
			);
			expect(outcomes.filter((r) => r.status === "fulfilled").length).toBe(1);
			const verifyCapacity = async () => {
				const physical =
					(
						await db.inventoryStock.aggregate({
							where: { inventoryVariantId: first.variant.id },
							_sum: { qty: true },
						})
					)._sum.qty ?? 0;
				const committed =
					(
						await db.stockAllocation.aggregate({
							where: {
								inventoryVariantId: first.variant.id,
								status: { in: ["approved", "reserved", "picked", "consumed"] },
							},
							_sum: { qty: true },
						})
					)._sum.qty ?? 0;
				expect(committed).toBeLessThanOrEqual(physical);
				return { physical, committed };
			};
			expect(await verifyCapacity()).toEqual({ physical: 11, committed: 10 });
			const loser = outcomes.findIndex((r) => r.status === "rejected");
			await expect(
				receiveProductionInbound(
					db,
					inputs[loser]!,
					async () => fixtures[loser]!.actor,
				),
			).rejects.toThrow("exceed available physical stock");
			expect(await verifyCapacity()).toEqual({ physical: 11, committed: 10 });
			expect(
				await db.stockMovement.count({
					where: { inventoryVariantId: first.variant.id },
				}),
			).toBe(1);
		} finally {
			await cleanup(second);
			await cleanup(first);
		}
	},
	60000,
);
