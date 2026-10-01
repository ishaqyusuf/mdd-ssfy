import type { Prisma, TransactionClient } from "@gnd/db";
import { getApprovedNewHousePackageLines } from "@gnd/sales/adjustment-system";
import { projectApprovedHousePackageLine } from "./sales-adjustment-door-projection";

function json(value: unknown): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/** Called inside the commercial transaction, before its durable checkpoint. */
export async function createApprovedNewHousePackageLines(input: {
	tx: TransactionClient;
	salesOrderId: number;
	beforeLines: unknown[];
	proposedLines: Record<string, unknown>[];
}) {
	const added = getApprovedNewHousePackageLines(input);
	const assigned = new Map<string, number>();
	for (const { original, line, hpt } of added) {
		const description = line.description || line.title;
		const item = await input.tx.salesOrderItems.create({
			data: {
				salesOrderId: input.salesOrderId,
				dykeDescription: line.title,
				description,
				qty: line.qty,
				rate: line.unitPrice,
				total: line.lineTotal,
				multiDykeUid: null,
				multiDyke: false,
				dykeProduction: false,
				meta: json({
					uid: line.uid,
					title: line.title,
					description,
					tax: line.taxxable !== false,
					meta: {
						...line.meta,
						itemIndex: input.proposedLines.indexOf(original),
					},
				}),
			},
			select: { id: true },
		});
		line.id = item.id;
		for (const step of line.formSteps || []) {
			const stepId = Number(step.stepId || step.step?.id || 0);
			if (!stepId) continue;
			const saved = await input.tx.dykeStepForm.create({
				data: {
					salesId: input.salesOrderId,
					salesItemId: item.id,
					stepId,
					componentId: step.componentId || null,
					prodUid: step.prodUid || null,
					value: step.value || null,
					qty: Number(step.qty || 0),
					price: Number(step.price || 0),
					basePrice: Number(step.basePrice || 0),
					meta: json(step.meta || {}),
				},
				select: { id: true },
			});
			step.id = saved.id;
		}
		const savedHpt = await input.tx.housePackageTools.create({
			data: {
				salesOrderId: input.salesOrderId,
				orderItemId: item.id,
				height: hpt.height || null,
				doorType: hpt.doorType || null,
				doorId: hpt.doorId || null,
				dykeDoorId: hpt.dykeDoorId || null,
				jambSizeId: hpt.jambSizeId || null,
				casingId: hpt.casingId || null,
				moldingId: hpt.moldingId || null,
				stepProductId: hpt.stepProductId || null,
				totalDoors: line.qty,
				totalPrice: line.lineTotal,
				meta: json(hpt.meta || {}),
			},
			select: { id: true },
		});
		hpt.id = savedHpt.id;
		hpt.totalDoors = line.qty;
		hpt.totalPrice = line.lineTotal;
		Object.assign(original, line);
		await projectApprovedHousePackageLine({
			tx: input.tx,
			salesOrderId: input.salesOrderId,
			salesOrderItemId: item.id,
			line: original,
		});
		assigned.set(line.uid, item.id);
	}
	return assigned;
}
