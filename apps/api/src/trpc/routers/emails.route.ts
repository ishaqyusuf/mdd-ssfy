import { getSalesEmailMeta } from "@api/db/queries/email";
import {
	listSalesEmailAttempts,
	resendSalesEmailAttempt,
} from "@api/db/queries/sales-email-attempts";
import {
	listSalesEmailAttemptsSchema,
	resendSalesEmailAttemptSchema,
} from "@api/schemas/emails";
import { salesQueryParamsSchema } from "@api/schemas/sales";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const emailsRoute = createTRPCRouter({
	getSalesEmailMeta: publicProcedure
		.input(salesQueryParamsSchema)
		.query(async (props) => {
			return getSalesEmailMeta(props.ctx, props.input);
		}),
	salesEmailAttempts: protectedProcedure
		.input(listSalesEmailAttemptsSchema)
		.query(async (props) => {
			return listSalesEmailAttempts(props.ctx, props.input);
		}),
	resendSalesEmailAttempt: protectedProcedure
		.input(resendSalesEmailAttemptSchema)
		.mutation(async (props) => {
			return resendSalesEmailAttempt(props.ctx, props.input);
		}),
});
