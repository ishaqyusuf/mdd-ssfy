type FinalSaveExceptionRow = {
	generationId: string;
	saveFinalAt: Date | null;
	retentionUntil: Date;
};

export type SalesRequestFinalSaveExceptionDatabase = {
	salesRequestGenerationRun: {
		findMany: (args: {
			where: Record<string, unknown>;
			orderBy: Array<Record<string, "asc" | "desc">>;
			take: number;
			select: {
				generationId: true;
				saveFinalAt: true;
				retentionUntil: true;
			};
		}) => Promise<FinalSaveExceptionRow[]>;
	};
};

export async function listSalesRequestFinalSaveExceptions(
	db: SalesRequestFinalSaveExceptionDatabase,
	input: {
		actorUserId: number;
		limit: number;
		now?: Date;
	},
) {
	const now = input.now ?? new Date();
	const rows = await db.salesRequestGenerationRun.findMany({
		where: {
			actorUserId: input.actorUserId,
			status: "succeeded",
			hasText: true,
			applyOutcome: "applied",
			saveFinalOutcome: "failed",
			deletedAt: null,
			retentionUntil: { gt: now },
		},
		orderBy: [{ saveFinalAt: "desc" }, { generationId: "desc" }],
		take: input.limit + 1,
		select: {
			generationId: true,
			saveFinalAt: true,
			retentionUntil: true,
		},
	});
	return {
		items: rows.slice(0, input.limit).map((row) => ({
			generationId: row.generationId,
			kind: "final-save-failed" as const,
			failedAt: row.saveFinalAt,
			retentionUntil: row.retentionUntil,
		})),
		truncated: rows.length > input.limit,
	};
}
