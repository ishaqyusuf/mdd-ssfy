import type {
	SalesDocumentReason,
	SalesDocumentSnapshotRecord,
	SalesDocumentSnapshotRepository,
	SalesDocumentType,
} from "../contracts";

export async function invalidateSalesDocument(
	repository: SalesDocumentSnapshotRepository,
	input: {
		salesOrderId: number;
		documentType: SalesDocumentType;
		reason: SalesDocumentReason;
		sourceUpdatedAt?: Date | null;
		meta?: Record<string, unknown> | null;
	},
): Promise<SalesDocumentSnapshotRecord> {
	const current = await repository.findCurrentByType({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
	});

	if (current) {
		await repository.update({
			id: current.id,
			generationStatus: "stale",
			isCurrent: false,
			invalidatedAt: new Date(),
			reason: input.reason,
			meta: current.meta || null,
		});
	}

	const latest = await repository.findLatestVersion({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
	});

	return repository.create({
		salesOrderId: input.salesOrderId,
		documentType: input.documentType,
		version: (latest?.version || 0) + 1,
		generationStatus: "pending",
		reason: input.reason,
		isCurrent: true,
		sourceUpdatedAt: input.sourceUpdatedAt || null,
		meta: input.meta || null,
	});
}
