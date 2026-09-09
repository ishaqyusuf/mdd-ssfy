import {
	listReliabilityIncidents,
	previewReliabilityIncident,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { resolveReliabilityReviewer } from "../../rest/reliability-reviewer";
import { createTRPCRouter, protectedProcedure } from "../init";

const identity = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}$/);

export const reliabilityRouter = createTRPCRouter({
	services: protectedProcedure.query(({ ctx }) => {
		const principal = resolveReliabilityReviewer(ctx.userId, process.env);
		return { serviceIds: principal?.serviceIds ?? [] };
	}),
	list: protectedProcedure
		.input(
			z.object({ serviceId: identity, cursor: identity.optional() }).strict(),
		)
		.query(async ({ ctx, input }) => {
			const principal = resolveReliabilityReviewer(ctx.userId, process.env);
			if (!principal) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await listReliabilityIncidents(ctx.db, input, principal);
			if (result.status === "forbidden")
				throw new TRPCError({ code: "FORBIDDEN" });
			return result;
		}),
	preview: protectedProcedure
		.input(
			z
				.object({
					incidentId: identity,
					serviceId: identity,
					revision: z.number().int().positive().safe(),
				})
				.strict(),
		)
		.query(async ({ ctx, input }) => {
			const principal = resolveReliabilityReviewer(ctx.userId, process.env);
			if (!principal) throw new TRPCError({ code: "FORBIDDEN" });
			const result = await previewReliabilityIncident(ctx.db, input, principal);
			if (result.status === "forbidden")
				throw new TRPCError({ code: "FORBIDDEN" });
			return result;
		}),
});
