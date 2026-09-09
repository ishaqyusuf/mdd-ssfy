import { type Db, Prisma, type TransactionClient } from "@gnd/db";
import { isLineProductionEligible } from "./sales-fulfillment-plan";
import { resolveSalesItemProductionEligibility } from "./sync-sales-inventory-line-items";

function object(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function getProductionClassificationRepairs(db: Db | TransactionClient, salesOrderId: number, componentIds: number[]) {
	const lines = await db.lineItem.findMany({
		where: { saleId: salesOrderId, deletedAt: null, components: { some: { id: { in: componentIds } } }, salesItem: { deletedAt: null, assignments: { some: { deletedAt: null, orderId: salesOrderId, OR: [{ qtyAssigned: { gt: 0 } }, { lhQty: { gt: 0 } }, { rhQty: { gt: 0 } }] } } } },
		orderBy: { id: "asc" },
		select: {
			id: true, meta: true, updatedAt: true, title: true,
			salesItem: { select: {
				id: true, description: true, dykeProduction: true, meta: true, updatedAt: true,
				formSteps: { where: { deletedAt: null }, select: { prodUid: true, value: true, qty: true, meta: true, step: { select: { uid: true, title: true } }, component: { select: { uid: true, name: true } } } },
				housePackageTool: { select: { deletedAt: true, totalDoors: true, stepProduct: { select: { uid: true, name: true, step: { select: { uid: true, title: true } } } } } },
			} },
		},
	});
	const conflicts = lines.filter((line) => !isLineProductionEligible(line.meta));
	const rows = conflicts.filter((line) => line.salesItem && resolveSalesItemProductionEligibility({ ...line.salesItem, shelfItems: [] }));
	return {
		rows,
		blocked: conflicts.filter((line) => !rows.includes(line)).map((line) => ({ lineItemId: line.id, message: `${line.title || "Production item"}: sales configuration excludes production. Correct the sales item configuration before synchronizing.` })),
	};
}

export async function applyProductionClassificationRepairs(tx: Db | TransactionClient, rows: Awaited<ReturnType<typeof getProductionClassificationRepairs>>["rows"]) {
	for (const row of rows) {
		const meta = object(row.meta);
		await tx.lineItem.update({
			where: { id: row.id },
			data: { meta: { ...meta, production: { ...object(meta.production), produceable: true }, inventorySync: { ...object(meta.inventorySync), productionProduceable: true } } as Prisma.InputJsonValue },
		});
	}
}
