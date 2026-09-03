"use server";

import { prisma } from "@/db";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { Notifications } from "@gnd/notifications";
import {
	type SpecialOrderOperationalDecision,
	attachSpecialOrderOperationFeedback,
} from "@gnd/sales/special-order";
import {
	assertSpecialOrderOperationAllowed,
	createAssignmentsTask,
	getSaleInformation,
	getSalesPipelineSnapshots,
	runSalesPipelineCommandTransaction,
	shouldEnforceCanonicalSalesPipelineCommands,
} from "@sales/exports";
import { z } from "zod";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "./production-submission-authority";
import { actionClient } from "./safe-action";

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
			const snapshot = (
				await getSalesPipelineSnapshots(prisma as never, [salesId])
			).get(salesId);
			if (!snapshot) throw new Error("The sales order is no longer available.");
			const execution = await runSalesPipelineCommandTransaction(
				prisma as never,
				{
					salesOrderId: salesId,
					action: "production.assign",
					authorized: true,
					expectedRevision: snapshot.revision,
					enforce: shouldEnforceCanonicalSalesPipelineCommands(salesId),
					operation: "dashboard.batch-assign-production-orders",
				},
				async (transactionDb) => {
					const operationalDecision = await assertSpecialOrderOperationAllowed(
						transactionDb,
						{
							salesOrderId: salesId,
							operation: "PRODUCTION",
							actorUserId,
							authorName: actor.name || "Unknown",
							source: "dashboard.batch-assign-production-orders",
						},
					);
					const info = await getSaleInformation(
						transactionDb,
						{ salesId },
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
					if (selections.length) {
						await createAssignmentsTask(transactionDb, {
							meta: {
								salesId,
								authorId: actorUserId,
								authorName: actor.name || "Unknown",
								pipelineRevision: snapshot.revision,
							},
							createAssignments: {
								retries: 0,
								assignedToId: input.assignedToId ?? null,
								dueDate: input.dueDate ?? null,
								selections,
							},
						});
					}
					return { operationalDecision, selections };
				},
			);
			if (!execution.executed || !execution.value.selections.length) continue;
			const { operationalDecision, selections } = execution.value;
			operationalDecisions.push(operationalDecision);
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
								(total, selection) => total + Number(selection.qty?.qty || 0),
								0,
							),
							itemCount: selections.length,
							dueDate: input.dueDate || undefined,
						},
						{
							author: { id: actorUserId, role: "employee" },
							recipients: [{ ids: [input.assignedToId], role: "employee" }],
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
