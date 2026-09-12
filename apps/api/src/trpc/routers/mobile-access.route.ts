import {
	getMobileAccessRequestsForAdmin,
	getMyMobileAccessRequests,
	requestMobileAccess,
	updateMobileAccessRequest,
} from "@api/db/queries/mobile-access";
import {
	requestMobileAccessSchema,
	updateMobileAccessRequestSchema,
} from "@api/schemas/mobile-access";

import { createTRPCRouter, protectedProcedure } from "../init";

export const mobileAccessRouter = createTRPCRouter({
	myRequests: protectedProcedure.query(({ ctx }) =>
		getMyMobileAccessRequests(ctx),
	),
	request: protectedProcedure
		.input(requestMobileAccessSchema)
		.mutation(({ ctx, input }) => requestMobileAccess(ctx, input)),
	adminList: protectedProcedure.query(({ ctx }) =>
		getMobileAccessRequestsForAdmin(ctx),
	),
	adminUpdate: protectedProcedure
		.input(updateMobileAccessRequestSchema)
		.mutation(({ ctx, input }) => updateMobileAccessRequest(ctx, input)),
});
