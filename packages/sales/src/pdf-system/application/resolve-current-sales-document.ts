import type {
	SalesDocumentSnapshotRecord,
	SalesDocumentSnapshotRepository,
	SalesDocumentType,
} from "../contracts";

export async function resolveCurrentSalesDocument(
	repository: SalesDocumentSnapshotRepository,
	input: {
		salesOrderId: number;
		documentType: SalesDocumentType;
		allowStale?: boolean;
	},
): Promise<SalesDocumentSnapshotRecord | null> {
	const current = await repository.findCurrentByType({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
	});

	if (!current) return null;
	if (current.generationStatus === "ready") return current;
	if (input.allowStale && current.generationStatus === "stale") return current;
	return null;
}
