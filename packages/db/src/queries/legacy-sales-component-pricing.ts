import type { Db, Prisma, TransactionClient } from "@gnd/db";
import { advanceSalesWorkflowCatalogRevision } from "./sales-workflow-catalog-revision";

type PricingInput = Partial<Prisma.DykePricingSystemCreateManyInput>;

async function updatePricingRows(tx: TransactionClient, data: PricingInput[]) {
	const pricingIds = data.map((item) => Number(item.id || 0)).filter(Boolean);
	const existing = pricingIds.length
		? await tx.dykePricingSystem.findMany({
				where: { id: { in: pricingIds } },
				select: { dykeStepId: true },
			})
		: [];
	const byPrice = new Map<string, number[]>();
	const deleteIds: number[] = [];
	for (const item of data) {
		const id = Number(item.id || 0);
		if (!id) continue;
		const key = String(item.price);
		byPrice.set(key, [...(byPrice.get(key) || []), id]);
		if (!item.price) deleteIds.push(id);
	}
	for (const [price, ids] of byPrice) {
		await tx.dykePricingSystem.updateMany({
			where: { id: { in: ids } },
			data:
				price === "del" ? { deletedAt: new Date() } : { price: Number(price) },
		});
	}
	if (deleteIds.length) {
		await tx.dykePricingSystem.updateMany({
			where: { id: { in: deleteIds } },
			data: { deletedAt: new Date() },
		});
	}
	return [
		...new Set([
			...data.map((item) => Number(item.dykeStepId || 0)),
			...existing.map((item) => item.dykeStepId),
		]),
	].filter(Boolean);
}

export async function updateLegacyComponentPricings(
	db: Db,
	data: PricingInput[],
) {
	if (!data.length) return [] as number[];
	return db.$transaction(async (tx) => {
		const stepIds = await updatePricingRows(tx, data);
		await advanceSalesWorkflowCatalogRevision(tx);
		return stepIds;
	});
}

export async function saveLegacyComponentPricings(
	db: Db,
	data: Prisma.DykePricingSystemCreateManyInput[],
) {
	const newData = data
		.filter((item) => !item.id && item.price)
		.map(({ id, ...rest }) => rest);
	const updates = data.filter((item) => item.id);
	if (!newData.length && !updates.length) return [] as number[];
	return db.$transaction(async (tx) => {
		if (newData.length)
			await tx.dykePricingSystem.createMany({ data: newData });
		const stepIds = await updatePricingRows(tx, updates);
		await advanceSalesWorkflowCatalogRevision(tx);
		return [
			...new Set([
				...stepIds,
				...newData.map((item) => Number(item.dykeStepId || 0)),
			]),
		].filter(Boolean);
	});
}

export async function saveLegacyHarvestedPricings(
	db: Db,
	data: Prisma.DykePricingSystemCreateManyInput[],
) {
	return db.$transaction(async (tx) => {
		const result = await tx.dykePricingSystem.createMany({ data });
		if (result.count) await advanceSalesWorkflowCatalogRevision(tx);
		return result;
	});
}
