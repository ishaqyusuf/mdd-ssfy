"use server";

import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "@/actions/production-submission-authority";
import { actionClient } from "@/actions/safe-action";
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
} from "@sales/exports";
import { z } from "zod";

const batchEditProductionOrdersSchema = z
	.object({
		salesIds: z.array(z.number().int().positive()).min(1).max(100),
		assignedToId: z.number().int().positive().nullable().optional(),
		dueDate: z.date().nullable().optional(),
	})
	.refine(
		(input) => input.assignedToId !== undefined || input.dueDate !== undefined,
		{ message: "Choose an assignee or due date to update." },
	);

export const batchEditProductionOrdersAction = actionClient
	.schema(batchEditProductionOrdersSchema)
	.metadata({
		name: "batch-edit-production-orders",
		track: {},
	})
	.action(async ({ parsedInput: input }) => {
		const actor = await getLoggedInProfile();
		if (!actor.userId) throw new Error("Authentication is required.");
		requireProductionAssignmentAuthority(actor);

		const operationalDecisions: SpecialOrderOperationalDecision[] = [];
		let ordersUpdated = 0;
		let assignmentsUpdated = 0;
		let assignmentsCreated = 0;

		for (const salesId of input.salesIds) {
			operationalDecisions.push(
				await assertSpecialOrderOperationAllowed(prisma as never, {
					salesOrderId: salesId,
					operation: "PRODUCTION",
					actorUserId: actor.userId,
					authorName: actor.name || "Unknown",
					source: "dashboard.batch-edit-production-orders",
				}),
			);

			const activeAssignmentWhere = {
				orderId: salesId,
				deletedAt: null,
				completedAt: null,
			};
			let updatedCount = 0;
			if (input.assignedToId !== undefined) {
				const ownershipUpdated =
					await prisma.orderItemProductionAssignments.updateMany({
						where: {
							...activeAssignmentWhere,
							OR:
								input.assignedToId == null
									? [{ assignedToId: { not: null } }]
									: [
											{ assignedToId: null },
											{ assignedToId: { not: input.assignedToId } },
										],
						},
						data: {
							assignedToId: input.assignedToId,
							assignedAt: input.assignedToId == null ? null : new Date(),
							...(input.dueDate !== undefined
								? { dueDate: input.dueDate }
								: {}),
						},
					});
				updatedCount += ownershipUpdated.count;

				if (input.dueDate !== undefined) {
					const scheduleUpdated =
						await prisma.orderItemProductionAssignments.updateMany({
							where: {
								...activeAssignmentWhere,
								assignedToId: input.assignedToId,
							},
							data: { dueDate: input.dueDate },
						});
					updatedCount += scheduleUpdated.count;
				}
			} else if (input.dueDate !== undefined) {
				const scheduleUpdated =
					await prisma.orderItemProductionAssignments.updateMany({
						where: activeAssignmentWhere,
						data: { dueDate: input.dueDate },
					});
				updatedCount = scheduleUpdated.count;
			}

			let createdForOrder = 0;
			if (typeof input.assignedToId === "number") {
				const info = await getSaleInformation(
					prisma as never,
					{ salesId },
					{ persistDerivedState: true },
				);
				const selections = info.items
					.filter(
						(item) =>
							item.itemConfig?.production &&
							Number(item.analytics?.assignment?.pending?.qty || 0) > 0,
					)
					.map((item) => ({
						uid: item.controlUid,
						qty: item.analytics.assignment.pending,
					}));

				if (selections.length) {
					await createAssignmentsTask(prisma as never, {
						meta: {
							salesId,
							authorId: actor.userId,
							authorName: actor.name || "Unknown",
						},
						createAssignments: {
							retries: 0,
							assignedToId: input.assignedToId,
							dueDate: input.dueDate ?? null,
							selections,
						},
					});
					createdForOrder = selections.length;
				}
			}

			if (updatedCount || createdForOrder) {
				ordersUpdated += 1;
				assignmentsUpdated += updatedCount;
				assignmentsCreated += createdForOrder;
				await reconcileSalesHandoffAfterCommit(prisma, {
					salesOrderIds: [salesId],
					actorUserId: actor.userId,
					source: "dashboard.production.batch-edit",
				});
			}

			if (
				typeof input.assignedToId === "number" &&
				(updatedCount || createdForOrder)
			) {
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
							itemCount: updatedCount + createdForOrder,
							dueDate: input.dueDate || undefined,
						},
						{
							author: { id: actor.userId, role: "employee" },
							recipients: [{ ids: [input.assignedToId], role: "employee" }],
							includeChannelSubscribers: false,
							allowFallbackRecipient: false,
							forceInAppRecipients: true,
						},
					);
				} catch (error) {
					console.warn(
						"Batch production changes were saved, but the assignment notification failed.",
						{ error, salesId },
					);
				}
			}
		}

		return attachSpecialOrderOperationFeedback(
			{ ordersUpdated, assignmentsUpdated, assignmentsCreated },
			operationalDecisions,
		);
	});
