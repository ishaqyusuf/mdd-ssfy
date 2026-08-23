"use server";

import { serverSession } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { actionClient } from "./safe-action";
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
			const session = await serverSession();
			const actorUserId = Number(session.user.id);
		let ordersUpdated = 0;
		let assignmentsQueued = 0;
		const operationalDecisions: SpecialOrderOperationalDecision[] = [];

		for (const salesId of input.salesIds) {
			operationalDecisions.push(
				await assertSpecialOrderOperationAllowed(prisma as any, {
					salesOrderId: salesId,
					operation: "PRODUCTION",
						actorUserId,
					authorName: session.user.name || "Unknown",
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
					authorId: Number(session.user.id),
					authorName: session.user.name || "Unknown",
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
