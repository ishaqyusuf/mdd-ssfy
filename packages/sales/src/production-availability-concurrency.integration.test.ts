import { expect, test } from "bun:test";
import { db, Prisma, type Db, type TransactionClient } from "@gnd/db";
import {
	fixture,
	cleanup,
} from "./production-inbound-concurrency.integration.test";
import {
	getProductionAvailability,
	getProductionAvailabilitySuppliers,
	markProductionMaterialsAvailable,
} from "./production-availability";

const localTest =
	process.env.GND_AVAILABILITY_DB_TEST === "1" ? test : test.skip;
type Fixture = Awaited<ReturnType<typeof fixture>>;
async function availabilityFixture() {
	const f = await fixture("availability");
	await db.inboundDemand.deleteMany({
		where: { lineItemComponentId: f.component.id },
	});
	await db.inventoryCategory.update({
		where: { id: f.category.id },
		data: { stockMode: "monitored" },
	});
	await db.lineItemComponents.update({
		where: { id: f.component.id },
		data: { inventoryCategoryId: f.category.id },
	});
	return { ...f, actor: { ...f.actor, canMarkAvailable: true } };
}
async function clean(f: Fixture) {
	const items = await db.inboundShipmentItem.findMany({
		where: { inventoryVariantId: f.variant.id },
		select: { inboundId: true },
	});
	await db.event.deleteMany({
		where: {
			type: "production_materials_available",
			data: { path: "$.salesOrderId", equals: f.sale.id },
		},
	});
	await db.inboundDemand.deleteMany({
		where: { lineItemComponentId: f.component.id },
	});
	await db.inboundShipmentItem.deleteMany({
		where: { inventoryVariantId: f.variant.id },
	});
	await db.inboundShipment.deleteMany({
		where: { id: { in: items.map((item) => item.inboundId) } },
	});
	await db.payrollHistory.deleteMany({
		where: { payroll: { orderId: f.sale.id } },
	});
	await db.payroll.deleteMany({ where: { orderId: f.sale.id } });
	await cleanup(f);
}
async function inputFor(
	f: Awaited<ReturnType<typeof availabilityFixture>>,
	client: Db = db,
	actor = f.actor,
) {
	const before = await getProductionAvailability(client, f.sale.id, actor);
	return {
		salesOrderId: f.sale.id,
		expectedRevision: before.revision,
		idempotencyKey: crypto.randomUUID(),
		supplierId: null,
		receivedDate: "2026-09-08",
		selection: { mode: "all" as const },
	};
}
// Only replace the policy lookup with a private fixture row. Actual domain SQL,
// independent transactions, authority scope and stock effects remain real.
export function workerClient(f: Fixture): Db {
	const scope = (client: TransactionClient) =>
		new Proxy(client, {
			get(target, key) {
				if (key === "settings")
					return new Proxy(target.settings, {
						get(model, method) {
							return method === "findFirst"
								? (args: Prisma.SettingsFindFirstArgs) =>
										model.findFirst({
											...args,
											where: { ...args.where, type: f.policy.type },
										})
								: Reflect.get(model, method);
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
			return key === "$transaction"
				? (fn: (tx: TransactionClient) => Promise<unknown>, options: object) =>
						target.$transaction((tx) => fn(scope(tx)), options)
				: Reflect.get(scope(target), key);
		},
	}) as Db;
}
for (const sameKey of [true, false])
	localTest(
		`availability concurrent ${sameKey ? "same" : "different"} request keys receive stock once`,
		async () => {
			const f = await availabilityFixture();
			try {
				const input = await inputFor(f);
				const outcomes = await Promise.allSettled([
					markProductionMaterialsAvailable(db, input, async () => f.actor),
					markProductionMaterialsAvailable(
						db,
						{
							...input,
							idempotencyKey: sameKey
								? input.idempotencyKey
								: crypto.randomUUID(),
						},
						async () => f.actor,
					),
				]);
				expect(
					outcomes.filter((result) => result.status === "fulfilled"),
				).toHaveLength(sameKey ? 2 : 1);
				expect(
					(
						await db.inventoryStock.aggregate({
							where: { inventoryVariantId: f.variant.id },
							_sum: { qty: true },
						})
					)._sum.qty,
				).toBe(10);
				expect(
					await db.event.count({
						where: {
							type: "production_materials_available",
							data: { path: "$.salesOrderId", equals: f.sale.id },
						},
					}),
				).toBe(1);
				expect(
					await getProductionAvailability(db, f.sale.id, f.actor),
				).toMatchObject({ state: "covered", pendingQty: 0 });
			} finally {
				await clean(f);
			}
		},
		60000,
	);
localTest(
	"availability rolls back a receipt if downstream allocation fails",
	async () => {
		const f = await availabilityFixture();
		try {
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					qty: 20,
					status: "pending_review",
				},
			});
			const input = await inputFor(f);
			await expect(
				markProductionMaterialsAvailable(db, input, async () => f.actor),
			).rejects.toThrow();
			expect(
				await db.inventoryStock.count({
					where: { inventoryVariantId: f.variant.id },
				}),
			).toBe(0);
			expect(
				await db.inboundDemand.count({
					where: { lineItemComponentId: f.component.id },
				}),
			).toBe(0);
			expect(
				await db.event.count({
					where: {
						type: "production_materials_available",
						data: { path: "$.salesOrderId", equals: f.sale.id },
					},
				}),
			).toBe(0);
		} finally {
			await clean(f);
		}
	},
	60000,
);
localTest(
	"availability rejects stale material and invalid supplier snapshots without receiving",
	async () => {
		const f = await availabilityFixture();
		try {
			const input = await inputFor(f);
			await expect(
				markProductionMaterialsAvailable(
					db,
					{ ...input, supplierId: 2147483647 },
					async () => f.actor,
				),
			).rejects.toThrow("supplier");
			await db.lineItemComponents.update({
				where: { id: f.component.id },
				data: { qty: 9 },
			});
			await expect(
				markProductionMaterialsAvailable(db, input, async () => f.actor),
			).rejects.toThrow("changed");
			expect(
				await db.inventoryStock.count({
					where: { inventoryVariantId: f.variant.id },
				}),
			).toBe(0);
		} finally {
			await clean(f);
		}
	},
	60000,
);
for (const change of ["none", "assignment", "policy"] as const)
	localTest(
		`worker availability uses assigned scope and current authority: ${change}`,
		async () => {
			const f = await availabilityFixture();
			const client = workerClient(f);
			const worker = {
				...f.actor,
				canViewAll: false,
				canEditInbound: false,
				canMarkAvailable: false,
			};
			try {
				const before = await getProductionAvailability(
					client,
					f.sale.id,
					worker,
				);
				expect(before).toMatchObject({
					workerMode: true,
					markableQty: 10,
					canMarkAvailable: true,
				});
				const suppliers = await getProductionAvailabilitySuppliers(
					client,
					f.sale.id,
					worker,
				);
				expect(
					suppliers.every(
						(supplier) => Object.keys(supplier).sort().join(",") === "id,name",
					),
				).toBe(true);
				const input = await inputFor(f, client, worker);
				if (change === "assignment")
					await db.orderItemProductionAssignments.update({
						where: { id: f.assignment.id },
						data: { assignedToId: null },
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
				if (change === "none")
					expect(
						await markProductionMaterialsAvailable(
							client,
							input,
							async () => worker,
						),
					).toMatchObject({ receivedQty: 10, remainingQty: 0 });
				else {
					await expect(
						markProductionMaterialsAvailable(client, input, async () => worker),
					).rejects.toThrow();
					expect(
						await db.inventoryStock.count({
							where: { inventoryVariantId: f.variant.id },
						}),
					).toBe(0);
				}
			} finally {
				await clean(f);
			}
		},
		60000,
	);
localTest(
	"unlinked ordered demands with existing stock proposals remain markable",
	async () => {
		const f = await availabilityFixture();
		try {
			const stock = await db.inventoryStock.create({
				data: { inventoryVariantId: f.variant.id, qty: 3 },
			});
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					inventoryStockId: stock.id,
					qty: 3,
					status: "pending_review",
				},
			});
			await db.inboundDemand.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					qty: 7,
					status: "ordered",
				},
			});
			expect(
				await markProductionMaterialsAvailable(
					db,
					await inputFor(f),
					async () => f.actor,
				),
			).toMatchObject({ receivedQty: 10, remainingQty: 0 });
			expect(
				(
					await db.stockAllocation.aggregate({
						where: {
							lineItemComponentId: f.component.id,
							status: { in: ["approved", "reserved"] },
						},
						_sum: { qty: true },
					})
				)._sum.qty,
			).toBe(10);
		} finally {
			await clean(f);
		}
	},
	60000,
);
localTest(
	"unrelated stock allocations do not conceal an unapplied receipt",
	async () => {
		const f = await availabilityFixture();
		try {
			const stock = await db.inventoryStock.create({
				data: { inventoryVariantId: f.variant.id, qty: 5 },
			});
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					inventoryStockId: stock.id,
					qty: 5,
					status: "reserved",
					notes: "Existing warehouse stock",
				},
			});
			await db.inboundDemand.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					qty: 4,
					qtyReceived: 4,
					status: "received",
				},
			});
			await db.lineItemComponents.update({
				where: { id: f.component.id },
				data: { qtyAllocated: 5, qtyReceived: 4, status: "partially_received" },
			});
			expect(
				await getProductionAvailability(db, f.sale.id, f.actor),
			).toMatchObject({ pendingQty: 5, markableQty: 1 });
		} finally {
			await clean(f);
		}
	},
	60000,
);
localTest(
	"repeated partial receipts cannot consume unrelated free stock beyond their selected quantities",
	async () => {
		const f = await availabilityFixture();
		try {
			await db.inventoryStock.create({
				data: { inventoryVariantId: f.variant.id, qty: 20 },
			});
			for (const [qty, remaining] of [
				[4, 6],
				[2, 4],
				[4, 0],
			]) {
				await db.stockAllocation.updateMany({
					where: { lineItemComponentId: f.component.id },
					data: { notes: "Updated during production" },
				});
				const preview = await getProductionAvailability(db, f.sale.id, f.actor);
				const input = await inputFor(f);
				expect(
					await markProductionMaterialsAvailable(
						db,
						{
							...input,
							selection: {
								mode: "selected",
								items: [{ id: preview.needs[0]!.id, qty: qty! }],
							},
						},
						async () => f.actor,
					),
				).toMatchObject({ receivedQty: qty, remainingQty: remaining });
			}
			expect(
				(
					await db.stockAllocation.aggregate({
						where: { lineItemComponentId: f.component.id },
						_sum: { qty: true },
					})
				)._sum.qty,
			).toBe(10);
		} finally {
			await clean(f);
		}
	},
	60000,
);
localTest(
	"merged materials preserve each component's unapplied-receipt cap",
	async () => {
		const f = await availabilityFixture();
		let secondId: number | undefined;
		let secondLineId: number | undefined;
		try {
			const stock = await db.inventoryStock.create({
				data: { inventoryVariantId: f.variant.id, qty: 5 },
			});
			await db.stockAllocation.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					inventoryStockId: stock.id,
					qty: 5,
					status: "reserved",
					notes: "Warehouse stock",
				},
			});
			await db.inboundDemand.create({
				data: {
					lineItemComponentId: f.component.id,
					inventoryVariantId: f.variant.id,
					qty: 4,
					qtyReceived: 4,
					status: "received",
				},
			});
			await db.lineItemComponents.update({
				where: { id: f.component.id },
				data: { qtyAllocated: 5, qtyReceived: 4 },
			});
			const item = await db.salesOrderItems.create({
				data: { salesOrderId: f.sale.id, qty: 10, dykeProduction: true },
			});
			const line = await db.lineItem.create({
				data: {
					lineItemType: "SALE",
					saleId: f.sale.id,
					salesItemId: item.id,
					qty: 10,
					inventoryId: f.inventory.id,
					inventoryVariantId: f.variant.id,
					inventoryCategoryId: f.category.id,
				},
			});
			secondLineId = line.id;
			const second = await db.lineItemComponents.create({
				data: {
					lineItemId: line.id,
					subComponentId: f.sub.id,
					inventoryId: f.inventory.id,
					inventoryVariantId: f.variant.id,
					inventoryCategoryId: f.category.id,
					qty: 10,
					required: true,
					status: "inbound_required",
				},
			});
			secondId = second.id;
			const preview = await getProductionAvailability(db, f.sale.id, f.actor);
			expect(preview.needs).toHaveLength(1);
			expect(preview.markableQty).toBe(11);
			expect(
				await markProductionMaterialsAvailable(
					db,
					await inputFor(f),
					async () => f.actor,
				),
			).toMatchObject({ receivedQty: 11, remainingQty: 4 });
			expect(
				(
					await db.lineItemComponents.findUniqueOrThrow({
						where: { id: f.component.id },
					})
				).qtyReceived,
			).toBe(5);
			expect(
				(
					await db.lineItemComponents.findUniqueOrThrow({
						where: { id: second.id },
					})
				).qtyReceived,
			).toBe(10);
		} finally {
			if (secondId) {
				await db.stockAllocation.deleteMany({
					where: { lineItemComponentId: secondId },
				});
				await db.inboundDemand.deleteMany({
					where: { lineItemComponentId: secondId },
				});
				await db.lineItemComponents.delete({ where: { id: secondId } });
			}
			if (secondLineId)
				await db.lineItem.delete({ where: { id: secondLineId } });
			await clean(f);
		}
	},
	60000,
);
localTest("receipt provenance survives partial allocation splits and consumption",async()=>{
 const f=await availabilityFixture();
 try{
  const preview=await getProductionAvailability(db,f.sale.id,f.actor);
  await markProductionMaterialsAvailable(db,{...await inputFor(f),selection:{mode:"selected",items:[{id:preview.needs[0]!.id,qty:4}]}},async()=>f.actor);
  const allocation=await db.stockAllocation.findFirstOrThrow({where:{lineItemComponentId:f.component.id}});
  const {transitionInventoryDispatchAllocationsInTransaction}=await import("./sales-fulfillment-plan");
  await db.$transaction(tx=>transitionInventoryDispatchAllocationsInTransaction(tx,"pack",{salesOrderId:f.sale.id,allocationSelections:[{allocationId:allocation.id,qty:2}],note:"Packed for partial delivery"}));
  expect(await getProductionAvailability(db,f.sale.id,f.actor)).toMatchObject({pendingQty:6,markableQty:6});
  await db.stockAllocation.updateMany({where:{lineItemComponentId:f.component.id,status:"picked"},data:{status:"consumed",notes:"Consumed by partial delivery"}});
  expect(await getProductionAvailability(db,f.sale.id,f.actor)).toMatchObject({pendingQty:6,markableQty:6});
 }finally{await clean(f);}
},60000);
