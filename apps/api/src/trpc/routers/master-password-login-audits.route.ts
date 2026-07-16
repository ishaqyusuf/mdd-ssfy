import {
	clearMasterPasswordLoginAudits,
	listMasterPasswordLoginAudits,
} from "@api/db/queries/master-password-login-audits";
import {
	clearMasterPasswordLoginAuditsSchema,
	listMasterPasswordLoginAuditsSchema,
} from "@api/schemas/master-password-login-audits";
import { createTRPCRouter, protectedProcedure } from "../init";

export const masterPasswordLoginAuditsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(listMasterPasswordLoginAuditsSchema.optional())
		.query(async ({ ctx, input }) => {
			return listMasterPasswordLoginAudits(ctx, input ?? {});
		}),
	clear: protectedProcedure
		.input(clearMasterPasswordLoginAuditsSchema)
		.mutation(async ({ ctx, input }) => {
			return clearMasterPasswordLoginAudits(ctx, input);
		}),
});
