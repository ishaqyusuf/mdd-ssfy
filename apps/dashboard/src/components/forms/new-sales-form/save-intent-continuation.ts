export type SaveIntent = "draft" | "close" | "new" | "final";

type ContinueSaveAfterCommittedChangeReviewInput<TRecord> = {
	intent: SaveIntent | null;
	refreshedRecord: TRecord | null;
	promptForSpecialOrderDeclaration: (
		intent: SaveIntent,
		record: TRecord,
	) => boolean;
	executeSaveIntent: (intent: SaveIntent, record: TRecord) => Promise<void>;
};

export async function continueSaveAfterCommittedChangeReview<TRecord>(
	input: ContinueSaveAfterCommittedChangeReviewInput<TRecord>,
) {
	if (!input.intent || !input.refreshedRecord) return "cancelled" as const;
	if (
		input.promptForSpecialOrderDeclaration(input.intent, input.refreshedRecord)
	) {
		return "interrupted" as const;
	}
	await input.executeSaveIntent(input.intent, input.refreshedRecord);
	return "completed" as const;
}
