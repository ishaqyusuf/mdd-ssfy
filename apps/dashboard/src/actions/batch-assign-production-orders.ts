"use server";

import { prisma } from "@/db";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { actionClient } from "./safe-action";
import { Notifications } from "@gnd/notifications";
import {
	assertSpecialOrderOperationAllowed,
	createAssignmentsTask,
	getSaleInformation,
} from "@sales/exports";
import {
	attachSpecialOrderOperationFeedback,
	type SpecialOrderOperationalDecision,
} from "@gnd/sales/special-order";
import { z } from "zod";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "./production-submission-authority";

const batchAssignProductionOrdersSchema = z.object({
	salesIds: z.array(z.number()).min(1),
	assignedToId: z.number().nullable().optional(),
	dueDate: z.date().nullable().optional(),
});

export const batchAssignProductionOrdersAction = actionClient
	.schema(batchAssignProductionOrdersSchema)
	.metadata({
		name: "batch-assign-production-orders",
		track: {},
	})
		.action(async ({ parsedInput: input }) => {
			const actor = await getLoggedInProfile();
			if (!actor.userId) throw new Error("Authentication is required.");
			requireProductionAssignmentAuthority(actor);
			const actorUserId = actor.userId;
		let ordersUpdated = 0;
		let assignmentsQueued = 0;
		const operationalDecisions: SpecialOrderOperationalDecision[] = [];

		for (const salesId of input.salesIds) {
			operationalDecisions.push(
				await assertSpecialOrderOperationAllowed(prisma as any, {
					salesOrderId: salesId,
					operation: "PRODUCTION",
						actorUserId,
					authorName: actor.name || "Unknown",
					source: "dashboard.batch-assign-production-orders",
				}),
			);
			const info = await getSaleInformation(
				prisma as any,
				{
					salesId,
				},
				{ persistDerivedState: true },
			);

			const selections = info.items
				.filter(
					(item) =>
						item.itemConfig?.production &&
						(item.analytics?.assignment?.pending?.qty || 0) > 0,
				)
				.map((item) => ({
					uid: item.controlUid,
					qty: item.analytics.assignment.pending,
				}));

			if (!selections.length) continue;

				await createAssignmentsTask(prisma as any, {
				meta: {
					salesId,
					authorId: actorUserId,
					authorName: actor.name || "Unknown",
				},
				createAssignments: {
					retries: 0,
					assignedToId: input.assignedToId ?? null,
					dueDate: input.dueDate ?? null,
					selections,
				},
				});
				await reconcileSalesHandoffAfterCommit(prisma, {
					salesOrderIds: [salesId],
					actorUserId,
					source: "dashboard.production.batch-assign",
				});
			if (input.assignedToId) {
				try {
					const order = await prisma.salesOrders.findFirst({
						where: { id: salesId, deletedAt: null },
						select: { orderId: true },
					});
					await new Notifications(prisma).create(
						"sales_production_assigned",
						{
							salesId,
							orderNo: order?.orderId || undefined,
							assignedToId: input.assignedToId,
							assignedQty: selections.reduce(
								(total, selection) =>
									total + Number(selection.qty?.qty || 0),
								0,
							),
							itemCount: selections.length,
							dueDate: input.dueDate || undefined,
						},
						{
							author: { id: actorUserId, role: "employee" },
							recipients: [
								{ ids: [input.assignedToId], role: "employee" },
							],
							includeChannelSubscribers: false,
							allowFallbackRecipient: false,
							forceInAppRecipients: true,
						},
					);
				} catch (error) {
					console.warn(
						"Batch production assignment was saved, but its notification failed.",
						{ error, salesId },
					);
				}
			}
			ordersUpdated += 1;
			assignmentsQueued += selections.length;
		}

		return attachSpecialOrderOperationFeedback(
			{
				ordersUpdated,
				assignmentsQueued,
			},
			operationalDecisions,
		);
	});
