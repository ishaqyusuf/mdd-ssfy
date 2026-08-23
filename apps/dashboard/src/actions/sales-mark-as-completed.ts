"use server";

import { authUser } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import type { QtyControlType } from "@gnd/utils/sales";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import { resetSalesAction } from "@sales/sales-control/actions";

import { completeSalesDispatchBatch } from "./sales-mark-as-completed-domain";

export async function markSalesDispatchAsComplete(id) {
	const actor = await authUser();
	if (!actor) throw new Error("Authentication is required.");
	const authorName = actor.name;
	const order = await completeSalesDispatchBatch(prisma as any, id);
	await reconcileSalesHandoffAfterCommit(prisma, {
		salesOrderIds: [id],
		actorUserId: actor.id,
		source: "dashboard.fulfillment.mark-dispatch-completed",
	});
	await createNoteAction({
		type: "dispatch",
		note: `Dispatch marked as completed by ${authorName}`,
		headline: "Dispatch complete",
		tags: [
			{
				tagName: "salesId",
				tagValue: String(id),
			},
		],
	});
	return order;
}
export async function markSalesProductionAsCompleted(id) {
	const actor = await authUser();
	if (!actor) throw new Error("Authentication is required.");
	const authorName = actor.name;
	await markSalesAsCompleted(id, ["prodCompleted"]);
	await reconcileSalesHandoffAfterCommit(prisma, {
		salesOrderIds: [id],
		actorUserId: actor.id,
		source: "dashboard.production.mark-completed",
	});
	await createNoteAction({
		type: "production",
		note: `Production marked as completed by ${authorName}`,
		headline: "Production complete",
		tags: [
			{
				tagName: "salesId",
				tagValue: String(id),
			},
		],
	});
}
async function markSalesAsCompleted(id, types: QtyControlType[]) {
	await prisma.$transaction(async (tx: typeof prisma) => {
		await tx.qtyControl.updateMany({
			where: {
				type: {
					in: types,
				},
				itemControl: {
					salesId: id,
				},
			},
			data: {
				autoComplete: true,
			},
		});
		await resetSalesAction(tx as any, id);
	});
	await syncInventoryProductionLifecycleForSale(prisma as any, id);
	// authorName
}
