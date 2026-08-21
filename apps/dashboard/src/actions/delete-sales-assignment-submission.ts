"use server";

import { type Prisma, prisma } from "@/db";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import { resetSalesAction } from "@sales/sales-control/actions";
import type z from "zod";

import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { actionClient } from "./safe-action";
import { deleteSalesAssignmentSubmissionSchema } from "./schema";

async function deleteSalesAssignmentSubmission(
	data: z.infer<typeof deleteSalesAssignmentSubmissionSchema>,
	actor: {
		userId: number;
		allowDeleteForOthers: boolean;
	},
	tx: typeof prisma = prisma,
) {
	const whereQueries: Prisma.OrderProductionSubmissionsWhereInput[] = [];
	if (data.submissionId) {
		whereQueries.push({ id: data.submissionId });
	} else if (data.assignmentId) {
		whereQueries.push({ assignmentId: data.assignmentId });
	}
	if (!whereQueries.length) {
		throw new Error("A production submission is required.");
	}

	const where: Prisma.OrderProductionSubmissionsWhereInput = {
		OR: whereQueries,
		salesOrderId: data.salesId,
		deletedAt: null,
		...(actor.allowDeleteForOthers
			? {}
			: {
					submittedById: actor.userId,
					assignment: {
						assignedToId: actor.userId,
					},
				}),
	};
	const submissions = await tx.orderProductionSubmissions.findMany({
		where,
		select: {
			id: true,
			qty: true,
			lhQty: true,
			rhQty: true,
			payroll: {
				select: {
					id: true,
					status: true,
				},
			},
			assignment: {
				select: {
					id: true,
					salesItemControlUid: true,
					qtyAssigned: true,
					lhQty: true,
					rhQty: true,
				},
			},
		},
	});
	if (!submissions.length) {
		throw new Error("Production submission not found or not owned by you.");
	}
	await tx.orderProductionSubmissions.updateMany({
		where,
		data: {
			deletedAt: new Date(),
		},
	});
	return submissions;
}

export const deleteSalesAssignmentSubmissionAction = actionClient
	.schema(deleteSalesAssignmentSubmissionSchema)
	.metadata({
		name: "delete-sales-assignment-submission",
		track: {},
	})
	.action(async ({ parsedInput: input }) => {
		const profile = await getLoggedInProfile();
		if (!profile.userId) throw new Error("Authentication is required.");
		const resp = await prisma.$transaction(async (tx: typeof prisma) => {
			await deleteSalesAssignmentSubmission(
				input,
				{
					userId: profile.userId,
					allowDeleteForOthers: Boolean(profile.can?.editProduction),
				},
				tx,
			);
			await resetSalesAction(tx, input.salesId);
			return {};
		});
		await syncInventoryProductionLifecycleForSale(prisma, input.salesId);
		return resp;
	});
