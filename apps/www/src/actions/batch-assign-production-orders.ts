"use server";

import { serverSession } from "@/app-deps/(v1)/_actions/utils";
import { prisma } from "@/db";
import { actionClient } from "./safe-action";
import { createAssignmentsTask, getSaleInformation } from "@sales/exports";
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
		let ordersUpdated = 0;
		let assignmentsQueued = 0;

		for (const salesId of input.salesIds) {
			const info = await getSaleInformation(prisma as any, {
				salesId,
			});

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

			ordersUpdated += 1;
			assignmentsQueued += selections.length;
		}

		return {
			ordersUpdated,
			assignmentsQueued,
		};
	});
