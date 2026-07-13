import {
	finalizeTaskRunDiagnosticWithRetriever,
	getTaskRunDiagnostic,
	listTaskRunDiagnostics,
	markTaskRunDiagnosticReviewed,
	recordTaskRunStartFailure,
	registerTaskRunDiagnostic,
} from "@api/db/queries/task-run-diagnostics";
import {
	finalizeTaskRunDiagnosticSchema,
	getTaskRunDiagnosticSchema,
	listTaskRunDiagnosticsSchema,
	markTaskRunDiagnosticReviewedSchema,
	recordTaskRunStartFailureSchema,
	registerTaskRunDiagnosticSchema,
} from "@api/schemas/task-run-diagnostics";
import { runs } from "@trigger.dev/sdk/v3";
import { createTRPCRouter, protectedProcedure } from "../init";

export const taskRunDiagnosticsRouter = createTRPCRouter({
	list: protectedProcedure
		.input(listTaskRunDiagnosticsSchema.optional())
		.query(async ({ ctx, input }) => {
			return listTaskRunDiagnostics(ctx, input ?? {});
		}),
	get: protectedProcedure
		.input(getTaskRunDiagnosticSchema)
		.query(async ({ ctx, input }) => {
			return getTaskRunDiagnostic(ctx, input.id);
		}),
	register: protectedProcedure
		.input(registerTaskRunDiagnosticSchema)
		.mutation(async ({ ctx, input }) => {
			return registerTaskRunDiagnostic(ctx, input);
		}),
	startFailure: protectedProcedure
		.input(recordTaskRunStartFailureSchema)
		.mutation(async ({ ctx, input }) => {
			return recordTaskRunStartFailure(ctx, input);
		}),
	finalize: protectedProcedure
		.input(finalizeTaskRunDiagnosticSchema)
		.mutation(async ({ ctx, input }) => {
			return finalizeTaskRunDiagnosticWithRetriever(ctx, input, (runId) =>
				runs.retrieve(runId),
			);
		}),
	markReviewed: protectedProcedure
		.input(markTaskRunDiagnosticReviewedSchema)
		.mutation(async ({ ctx, input }) => {
			return markTaskRunDiagnosticReviewed(ctx, input.id);
		}),
});
