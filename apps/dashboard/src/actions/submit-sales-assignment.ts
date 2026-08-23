"use server";

import { prisma } from "@/db";
import { sum } from "@/lib/utils";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { submitProductionAssignment } from "@sales/production-submission-review";

import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionSubmissionAuthority } from "./production-submission-authority";
import { actionClient } from "./safe-action";
import { createSubmissionSchema } from "./schema";

export const submitSalesAssignmentAction = actionClient
    .schema(createSubmissionSchema)
    .metadata({
        name: "submit-sales-assignment",
        track: {},
    })
    .action(async ({ parsedInput: input }) => {
		const actor = await getLoggedInProfile();
		if (!actor.userId) throw new Error("Authentication is required.");
		const authority = requireProductionSubmissionAuthority(actor);
        if (!input.qty.qty) input.qty.qty = sum([input.qty.lh, input.qty.rh]);
			const result = await submitProductionAssignment(prisma as any, {
			salesOrderId: input.salesId,
			salesOrderItemId: input.itemId,
			assignmentId: input.assignmentId,
			submittedById: actor.userId,
			idempotencyKey:
				input.idempotencyKey ||
				`production:${input.salesId}:${input.assignmentId}:${actor.userId}`,
			qty: input.qty.qty,
			lhQty: input.qty.lh,
			rhQty: input.qty.rh,
			note: input.note,
				allowSubmitForOthers: authority.allowSubmitForOthers,
		        });
			await reconcileSalesHandoffAfterCommit(prisma, {
				salesOrderIds: [input.salesId],
				actorUserId: actor.userId,
				source: "dashboard.production.submit-assignment",
			});
			return result;
	    });
