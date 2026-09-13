export const ASSISTANT_PDF_MAX_ATTEMPTS = 3;

export function assistantPdfFailureState(input: {
	hasAssistantSnapshot: boolean;
	attemptNumber: number;
}) {
	const retry =
		input.hasAssistantSnapshot &&
		input.attemptNumber < ASSISTANT_PDF_MAX_ATTEMPTS;
	return retry
		? ({ generationStatus: "pending", isCurrent: true } as const)
		: ({ generationStatus: "failed", isCurrent: false } as const);
}

export async function cleanupAssistantPdfUpload(input: {
	pathname: string;
	storedDocumentId?: string | null;
	deleteBlob: (pathname: string) => Promise<unknown>;
	markDeleted: (documentId: string) => Promise<unknown>;
	markCleanupRequired: (documentId: string) => Promise<unknown>;
	recordCleanupRequired: () => Promise<unknown>;
}) {
	try {
		await input.deleteBlob(input.pathname);
	} catch (error) {
		if (input.storedDocumentId) {
			await input
				.markCleanupRequired(input.storedDocumentId)
				.catch(() => undefined);
		} else {
			await input.recordCleanupRequired().catch(() => undefined);
		}
		return { status: "cleanup_required" as const, error };
	}
	if (input.storedDocumentId) {
		try {
			await input.markDeleted(input.storedDocumentId);
		} catch (error) {
			await input
				.markCleanupRequired(input.storedDocumentId)
				.catch(() => undefined);
			return { status: "cleanup_required" as const, error };
		}
	}
	return { status: "deleted" as const, error: null };
}
