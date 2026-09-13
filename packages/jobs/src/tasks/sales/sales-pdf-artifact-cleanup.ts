import { db } from "@gnd/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { del } from "@vercel/blob";

export const SALES_PDF_CLEANUP_BATCH_SIZE = 100;
export const SALES_PDF_CLEANUP_CLAIM_TTL_MS = 60 * 60 * 1000;
export const SALES_PDF_ARTIFACT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CleanupDocument = { id: string; pathname: string };
type CleanupRepository = {
	findMany(input: Record<string, unknown>): Promise<CleanupDocument[]>;
	updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
};
type ExpiredSnapshot = { id: string; storedDocumentId: string | null };
type CleanupSnapshotRepository = {
	findMany(input: Record<string, unknown>): Promise<ExpiredSnapshot[]>;
};
type InvalidateExpiredSnapshot = (
	snapshot: ExpiredSnapshot,
	now: Date,
) => Promise<{ count: number }>;

export async function runSalesPdfArtifactCleanup(input: {
	repository: CleanupRepository;
	snapshotRepository?: CleanupSnapshotRepository;
	invalidateExpiredSnapshot?: InvalidateExpiredSnapshot;
	deleteBlob: (pathname: string) => Promise<unknown>;
	now?: Date;
	logError?: (message: string, attributes: Record<string, unknown>) => void;
}) {
	const now = input.now ?? new Date();
	const logError = input.logError ?? (() => undefined);
	const recovered = await input.repository.updateMany({
		where: {
			ownerType: "sales_order",
			kind: { startsWith: "sales_pdf_snapshot:" },
			provider: "vercel-blob",
			status: "deleting",
			isCurrent: false,
			deletedAt: null,
			updatedAt: {
				lt: new Date(now.getTime() - SALES_PDF_CLEANUP_CLAIM_TTL_MS),
			},
		},
		data: { status: "cleanup_required" },
	});
	const expiredSnapshots = input.snapshotRepository
		? await input.snapshotRepository.findMany({
				where: {
					generationStatus: "ready",
					isCurrent: true,
					deletedAt: null,
					generatedAt: {
						lt: new Date(now.getTime() - SALES_PDF_ARTIFACT_TTL_MS),
					},
				},
				select: { id: true, storedDocumentId: true },
				orderBy: { generatedAt: "asc" },
				take: SALES_PDF_CLEANUP_BATCH_SIZE,
			})
		: [];
	let expired = 0;
	for (const snapshot of expiredSnapshots) {
		if (!input.invalidateExpiredSnapshot) {
			throw new Error(
				"Expired Sales PDF cleanup requires an atomic invalidator",
			);
		}
		const invalidated = await input.invalidateExpiredSnapshot(snapshot, now);
		expired += invalidated.count;
	}
	const documents = await input.repository.findMany({
		where: {
			ownerType: "sales_order",
			kind: { startsWith: "sales_pdf_snapshot:" },
			provider: "vercel-blob",
			status: "cleanup_required",
			isCurrent: false,
			deletedAt: null,
		},
		select: { id: true, pathname: true },
		orderBy: { updatedAt: "asc" },
		take: SALES_PDF_CLEANUP_BATCH_SIZE,
	});
	let claimed = 0;
	let deleted = 0;
	for (const document of documents) {
		const claim = await input.repository.updateMany({
			where: {
				id: document.id,
				status: "cleanup_required",
				isCurrent: false,
				deletedAt: null,
			},
			data: { status: "deleting" },
		});
		if (!claim.count) continue;
		claimed += 1;
		try {
			await input.deleteBlob(document.pathname);
			const tombstone = await input.repository.updateMany({
				where: {
					id: document.id,
					status: "deleting",
					isCurrent: false,
					deletedAt: null,
				},
				data: { status: "deleted", deletedAt: now },
			});
			deleted += tombstone.count;
		} catch (error) {
			await input.repository
				.updateMany({
					where: { id: document.id, status: "deleting", deletedAt: null },
					data: { status: "cleanup_required" },
				})
				.catch(() => undefined);
			logError("Sales PDF artifact cleanup failed", {
				documentId: document.id,
				error: error instanceof Error ? error.message : "unknown",
			});
		}
	}
	return {
		scanned: documents.length,
		claimed,
		deleted,
		expired,
		recovered: recovered.count,
	};
}

export const salesPdfArtifactCleanup = schedules.task({
	id: "sales-pdf-artifact-cleanup",
	cron: "37 * * * *",
	run: () =>
		runSalesPdfArtifactCleanup({
			repository: db.storedDocument as unknown as CleanupRepository,
			snapshotRepository:
				db.salesDocumentSnapshot as unknown as CleanupSnapshotRepository,
			invalidateExpiredSnapshot: (snapshot, now) =>
				db.$transaction(async (transaction) => {
					const invalidated =
						await transaction.salesDocumentSnapshot.updateMany({
							where: {
								id: snapshot.id,
								generationStatus: "ready",
								isCurrent: true,
								deletedAt: null,
							},
							data: {
								generationStatus: "stale",
								isCurrent: false,
								invalidatedAt: now,
							},
						});
					if (!invalidated.count || !snapshot.storedDocumentId) {
						return invalidated;
					}
					await transaction.storedDocument.updateMany({
						where: {
							id: snapshot.storedDocumentId,
							sourceType: "sales_document_snapshot",
							sourceId: snapshot.id,
							status: "ready",
							isCurrent: true,
							deletedAt: null,
						},
						data: { status: "cleanup_required", isCurrent: false },
					});
					return invalidated;
				}),
			deleteBlob: del,
			logError: (message, attributes) => logger.error(message, attributes),
		}),
});
