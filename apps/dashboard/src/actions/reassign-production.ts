"use server";

import { prisma } from "@/db";
import { getLoggedInProfile } from "./cache/get-loggedin-profile";
import { requireProductionAssignmentAuthority } from "./production-submission-authority";
import { actionClient } from "./safe-action";
import { getSalesPipelineSnapshots, runSalesPipelineCommandTransaction } from "@sales/exports";
import { reassignProductionInTransaction } from "@sales/production-reassignment";
import { resetSalesAction } from "@sales/sales-control/actions";
import { reconcileSalesHandoffAfterCommit } from "@api/db/queries/sales-handoff-actions";
import { z } from "zod";

export const reassignProductionAction = actionClient.schema(z.object({
 salesId: z.number().int().positive(),
 assignmentIds: z.array(z.number().int().positive()).min(1).max(500),
 assignedToId: z.number().int().positive(),
})).metadata({name: "reassign-production", track: {}}).action(async ({parsedInput: input}) => {
 const actor = await getLoggedInProfile();
 if (!actor.userId) throw new Error("Authentication is required.");
 requireProductionAssignmentAuthority(actor);
 const snapshot = (await getSalesPipelineSnapshots(prisma as never, [input.salesId])).get(input.salesId);
 if (!snapshot) throw new Error("Order is no longer available.");
 const execution = await runSalesPipelineCommandTransaction(prisma as never, {
  salesOrderId: input.salesId, action: "production.assign", authorized: true,
  expectedRevision: snapshot.revision, enforce: true, operation: "dashboard.production.reassign",
 }, async tx => {
  const result = await reassignProductionInTransaction(tx, {...input, actorId: actor.userId});
  await resetSalesAction(tx, input.salesId);
  return result;
 });
 if (!execution.executed) throw new Error("Order changed. Refresh and try again.");
 await reconcileSalesHandoffAfterCommit(prisma, {salesOrderIds: [input.salesId], actorUserId: actor.userId, source: "dashboard.production.reassign"});
 return execution.value;
});
