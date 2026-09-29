export type SaveIntent = "draft" | "close" | "new" | "final";

export type SaveContinuationGuard = {
	status: "idle" | "running" | "completed";
};

export function createSaveContinuationGuard(): SaveContinuationGuard {
	return { status: "idle" };
}

export function resolveCommittedChangeSubmissionAction(
	alreadyCreated: boolean,
) {
	return alreadyCreated ? ("poll" as const) : ("create-and-poll" as const);
}

export async function runCommittedChangeSubmission<TRecord>(input: {
	alreadyCreated: boolean;
	createAdjustment: () => Promise<void>;
	pollForRefreshedRecord: () => Promise<TRecord | null>;
}) {
	let creationError: unknown;
	if (
		resolveCommittedChangeSubmissionAction(input.alreadyCreated) ===
		"create-and-poll"
	) {
		try {
			await input.createAdjustment();
		} catch (error) {
			creationError = error;
		}
	}
	const refreshedRecord = await input.pollForRefreshedRecord();
	if (creationError && refreshedRecord === null) throw creationError;
	return {
		alreadyCreated: refreshedRecord === null,
		refreshedRecord,
	};
}

type ContinueSaveAfterCommittedChangeReviewInput<TRecord> = {
	intent: SaveIntent | null;
	refreshedRecord: TRecord | null;
	promptForSpecialOrderDeclaration: (
		intent: SaveIntent,
		record: TRecord,
	) => boolean;
	executeSaveIntent: (intent: SaveIntent, record: TRecord) => Promise<void>;
	guard?: SaveContinuationGuard;
};

export async function continueSaveAfterCommittedChangeReview<TRecord>(
	input: ContinueSaveAfterCommittedChangeReviewInput<TRecord>,
) {
	if (!input.intent || !input.refreshedRecord) return "cancelled" as const;
	if (input.guard?.status !== undefined && input.guard.status !== "idle") {
		return "duplicate" as const;
	}
	if (input.guard) input.guard.status = "running";
	try {
		if (
			input.promptForSpecialOrderDeclaration(
				input.intent,
				input.refreshedRecord,
			)
		) {
			if (input.guard) input.guard.status = "completed";
			return "interrupted" as const;
		}
		await input.executeSaveIntent(input.intent, input.refreshedRecord);
		if (input.guard) input.guard.status = "completed";
		return "completed" as const;
	} catch (error) {
		if (input.guard) input.guard.status = "idle";
		throw error;
	}
}

export function isReviewedAdjustmentApplied(
	record:
		| {
				version?: string | null;
				appliedAdjustmentId?: string | null;
				activeAdjustment?: unknown;
		  }
		| null
		| undefined,
	adjustmentId: string | null,
	sourceVersion: string,
) {
	return Boolean(
		adjustmentId &&
			record?.version &&
			record.version !== sourceVersion &&
			record.appliedAdjustmentId === adjustmentId &&
			!record.activeAdjustment,
	);
}

export function preserveReviewedFormFields<
	T extends {
		form?: unknown;
		extraCosts?: unknown;
		summary?: unknown;
		specialOrder?: unknown;
	},
>(refreshed: T, reviewed: T): T {
	return {
		...refreshed,
		form: reviewed.form,
		extraCosts: reviewed.extraCosts,
		summary: reviewed.summary,
		specialOrder: reviewed.specialOrder,
	};
}
