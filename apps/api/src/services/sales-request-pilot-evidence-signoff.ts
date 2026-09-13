import { z } from "zod";

const signoffCountSchema = z.number().int().nonnegative().max(100_000);
const signoffValuesShape = {
	unsafeApplyCount: z.number().int().nonnegative().max(10_000),
	ambiguousUnsupportedFactCount: signoffCountSchema,
	ambiguousUnsupportedVisibleCount: signoffCountSchema,
	saveReopenCheckedCount: z.number().int().nonnegative().max(10_000),
	saveReopenSucceededCount: z.number().int().nonnegative().max(10_000),
};

function validateSignoffCounts(
	value: {
		ambiguousUnsupportedFactCount: number;
		ambiguousUnsupportedVisibleCount: number;
		saveReopenCheckedCount: number;
		saveReopenSucceededCount: number;
	},
	context: z.RefinementCtx,
) {
	if (
		value.ambiguousUnsupportedVisibleCount > value.ambiguousUnsupportedFactCount
	) {
		context.addIssue({
			code: "custom",
			path: ["ambiguousUnsupportedVisibleCount"],
			message: "Visible facts cannot exceed reviewed ambiguous facts",
		});
	}
	if (value.saveReopenSucceededCount > value.saveReopenCheckedCount) {
		context.addIssue({
			code: "custom",
			path: ["saveReopenSucceededCount"],
			message: "Successful reopen checks cannot exceed checked saves",
		});
	}
}

export const salesRequestPilotEvidenceSignoffValuesSchema = z
	.object(signoffValuesShape)
	.strict()
	.superRefine(validateSignoffCounts);

/** Canonical aggregate-only reviewer signoff shared by evaluation and storage. */
export const salesRequestPilotEvidenceSignoffSchema = z
	.object({
		status: z.literal("verified"),
		reviewerUserId: z.number().int().positive(),
		reviewedAt: z.string().datetime({ offset: false }).regex(/Z$/),
		evidenceDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
		authorityMatched: z.boolean(),
		benchmarkPassed: z.boolean(),
		...signoffValuesShape,
	})
	.strict()
	.superRefine(validateSignoffCounts);

export type SalesRequestPilotEvidenceSignoff = z.infer<
	typeof salesRequestPilotEvidenceSignoffSchema
>;

export type SalesRequestPilotEvidenceSignoffValues = z.infer<
	typeof salesRequestPilotEvidenceSignoffValuesSchema
>;
