import type { TransactionClient } from "@gnd/db";
import {
	getSalesDoorActiveIdentity,
	normalizeSalesDoorDimension,
} from "@gnd/sales/sales-form";
function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}
export async function projectApprovedHousePackageLine(input: {
	tx: TransactionClient;
	salesOrderId: number;
	salesOrderItemId: number;
	line: Record<string, unknown>;
}) {
	const proposedHpt = record(input.line.housePackageTool);
	if (!Object.keys(proposedHpt).length) return;
	const hpt = await input.tx.housePackageTools.findUnique({
		where: { orderItemId: input.salesOrderItemId },
		select: { id: true, doorType: true },
	});
	if (!hpt) {
		throw new Error(
			`Approved adjustment line ${input.salesOrderItemId} is missing its house-package row.`,
		);
	}

	await input.tx.housePackageTools.update({
		where: { id: hpt.id },
		data: {
			totalDoors: Number(proposedHpt.totalDoors || input.line.qty || 0),
			totalPrice: Number(proposedHpt.totalPrice || input.line.lineTotal || 0),
		},
	});
	const existingDoors = await input.tx.dykeSalesDoors.findMany({
		where: { housePackageToolId: hpt.id, deletedAt: null },
		select: {
			id: true,
			dimension: true,
			stepProductId: true,
			meta: true,
		},
	});
	await input.tx.dykeSalesDoors.updateMany({
		where: { housePackageToolId: hpt.id, deletedAt: null },
		data: { activeIdentity: null },
	});
	const existingIds = new Set(existingDoors.map((door) => door.id));
	const existingByIdentity = new Map(
		existingDoors.map((door) => [getSalesDoorActiveIdentity(door), door.id]),
	);
	const retainedIds: number[] = [];
	const proposedDoors = Array.isArray(proposedHpt.doors)
		? proposedHpt.doors.map(record)
		: [];
	for (const door of proposedDoors) {
		const dimension = normalizeSalesDoorDimension(door.dimension);
		const totalQty = Math.round(
			Number(door.totalQty || 0) ||
				Number(door.lhQty || 0) + Number(door.rhQty || 0),
		);
		if (!dimension || totalQty <= 0) continue;
		const doorData = {
			housePackageToolId: hpt.id,
			salesOrderId: input.salesOrderId,
			salesOrderItemId: input.salesOrderItemId,
			dimension,
			swing: typeof door.swing === "string" ? door.swing : null,
			doorType:
				typeof door.doorType === "string" ? door.doorType : hpt.doorType,
			doorPrice: Number(door.doorPrice || 0),
			jambSizePrice: Number(door.jambSizePrice || 0),
			casingPrice: Number(door.casingPrice || 0),
			unitPrice: Number(door.unitPrice || 0),
			lhQty: Math.round(Number(door.lhQty || 0)),
			rhQty: Math.round(Number(door.rhQty || 0)),
			totalQty,
			lineTotal: Number(door.lineTotal || 0),
			stepProductId: Number(door.stepProductId || 0) || null,
			meta: record(door.meta),
			deletedAt: null,
		};
		const identity = getSalesDoorActiveIdentity(doorData);
		const requestedId = Number(door.id || 0);
		const existingId = existingIds.has(requestedId)
			? requestedId
			: Number(existingByIdentity.get(identity) || 0);
		const activeIdentity = `${hpt.id}|${identity}`;
		if (existingId > 0) {
			await input.tx.dykeSalesDoors.update({
				where: { id: existingId },
				data: { ...doorData, activeIdentity },
			});
			door.id = existingId;
			retainedIds.push(existingId);
		} else {
			const created = await input.tx.dykeSalesDoors.create({
				data: { ...doorData, activeIdentity },
				select: { id: true },
			});
			door.id = created.id;
			retainedIds.push(created.id);
		}
	}
	await input.tx.dykeSalesDoors.updateMany({
		where: {
			housePackageToolId: hpt.id,
			deletedAt: null,
			id: { notIn: retainedIds.length ? retainedIds : [0] },
		},
		data: { deletedAt: new Date(), activeIdentity: null },
	});
}
