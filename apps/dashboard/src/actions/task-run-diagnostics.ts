"use server";

import { finalizeTaskRunDiagnostic } from "@/lib/task-run-diagnostics.server";
import { z } from "zod";
import { actionClient } from "./safe-action";

const taskDiagnosticMetadataSchema = z
	.object({
		taskName: z.string().nullish(),
		type: z.string().nullish(),
		entityId: z.union([z.string(), z.number()]).nullish(),
		entityLabel: z.string().nullish(),
	})
	.optional();

export const finalizeTaskRunDiagnosticAction = actionClient
	.schema(
		z.object({
			runId: z.string().min(1),
			observedStatus: z.enum(["COMPLETED", "FAILED", "CANCELED"]).optional(),
			errorMessage: z.string().optional(),
			metadata: taskDiagnosticMetadataSchema,
			finishedAt: z.coerce.date().optional(),
		}),
	)
	.metadata({
		name: "finalize-task-run-diagnostic",
	})
	.action(async ({ parsedInput }) => {
		await finalizeTaskRunDiagnostic(parsedInput);
		return {
			ok: true,
		};
	});
