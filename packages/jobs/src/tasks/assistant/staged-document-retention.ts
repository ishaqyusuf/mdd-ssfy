import { db } from "@gnd/db";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { del } from "@vercel/blob";

export const ASSISTANT_STAGED_DOCUMENT_TTL_MS = 24 * 60 * 60 * 1_000;
export const ASSISTANT_RETENTION_CLAIM_TTL_MS = 60 * 60 * 1_000;
export const ASSISTANT_RETENTION_BATCH_SIZE = 100;
export const ASSISTANT_RETENTION_MAX_BATCHES = 10;

export function assistantStagedDocumentCutoff(now = new Date()) {
	return new Date(now.getTime() - ASSISTANT_STAGED_DOCUMENT_TTL_MS);
}

export function assistantRetentionClaimCutoff(now = new Date()) {
	return new Date(now.getTime() - ASSISTANT_RETENTION_CLAIM_TTL_MS);
}

type RetentionDocument = {
	id: string;
	ownerId: string;
	pathname: string;
	uploadedBy?: number | null;
};

type RetentionRepository = {
	findMany(input: Record<string, unknown>): Promise<RetentionDocument[]>;
	updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
};

export async function runAssistantStagedDocumentRetention(input: {
	repository: RetentionRepository;
	deleteBlob: (pathname: string) => Promise<unknown>;
	now?: Date;
	createClaimId?: () => string;
	logError?: (message: string, attributes: Record<string, unknown>) => void;
}) {
	const now = input.now ?? new Date();
	const createClaimId = input.createClaimId ?? crypto.randomUUID;
	const logError = input.logError ?? (() => undefined);
	const staleReservations = await input.repository.findMany({
		where: {
			ownerType: "user",
			ownerKey: "staged:assistant-documents",
			status: "uploading",
			deletedAt: null,
			updatedAt: { lt: assistantRetentionClaimCutoff(now) },
		},
		select: { id: true, ownerId: true, pathname: true, uploadedBy: true },
		orderBy: { updatedAt: "asc" },
		take: ASSISTANT_RETENTION_BATCH_SIZE,
	});
	let abandonedReservations = 0;
	for (const document of staleReservations) {
		try {
			await input.deleteBlob(document.pathname);
		} catch (error) {
			logError("Assistant abandoned upload cleanup failed", {
				documentId: document.id,
				error: error instanceof Error ? error.message : "unknown",
			});
			continue;
		}
		const abandoned = await input.repository.updateMany({
			where: {
				id: document.id,
				ownerType: "user",
				ownerId: document.ownerId,
				ownerKey: "staged:assistant-documents",
				status: "uploading",
				updatedAt: { lt: assistantRetentionClaimCutoff(now) },
			},
			data: { status: "failed", deletedAt: now },
		});
		abandonedReservations += abandoned.count;
	}
	const staleClaims = await input.repository.findMany({
		where: {
			ownerType: "assistant_retention_claim",
			ownerKey: "staged:assistant-documents",
			status: "deleting",
			deletedAt: null,
			uploadedBy: { not: null },
			updatedAt: { lt: assistantRetentionClaimCutoff(now) },
		},
		select: { id: true, ownerId: true, pathname: true, uploadedBy: true },
		orderBy: { updatedAt: "asc" },
		take: ASSISTANT_RETENTION_BATCH_SIZE,
	});
	let recovered = 0;
	for (const document of staleClaims) {
		if (document.uploadedBy == null) continue;
		const recovery = await input.repository.updateMany({
			where: {
				id: document.id,
				ownerType: "assistant_retention_claim",
				ownerId: document.ownerId,
				ownerKey: "staged:assistant-documents",
				status: "deleting",
				updatedAt: { lt: assistantRetentionClaimCutoff(now) },
			},
			data: {
				ownerType: "user",
				ownerId: String(document.uploadedBy),
				status: "ready",
			},
		});
		recovered += recovery.count;
	}

	const attemptedIds: string[] = [];
	let scanned = 0;
	let deleted = 0;
	for (let batch = 0; batch < ASSISTANT_RETENTION_MAX_BATCHES; batch += 1) {
		const expired = await input.repository.findMany({
			where: {
				ownerType: "user",
				ownerKey: "staged:assistant-documents",
				status: "ready",
				isCurrent: false,
				deletedAt: null,
				createdAt: { lt: assistantStagedDocumentCutoff(now) },
				...(attemptedIds.length ? { id: { notIn: attemptedIds } } : {}),
			},
			select: { id: true, ownerId: true, pathname: true, uploadedBy: true },
			orderBy: { createdAt: "asc" },
			take: ASSISTANT_RETENTION_BATCH_SIZE,
		});
		if (!expired.length) break;
		scanned += expired.length;
		for (const document of expired) {
			attemptedIds.push(document.id);
			const claimId = createClaimId();
			const claim = await input.repository.updateMany({
				where: {
					id: document.id,
					ownerType: "user",
					ownerId: document.ownerId,
					ownerKey: "staged:assistant-documents",
					status: "ready",
					deletedAt: null,
				},
				data: {
					ownerType: "assistant_retention_claim",
					ownerId: claimId,
					status: "deleting",
				},
			});
			if (!claim.count) continue;
			try {
				await input.deleteBlob(document.pathname);
				await input.repository.updateMany({
					where: {
						id: document.id,
						ownerType: "assistant_retention_claim",
						ownerId: claimId,
						status: "deleting",
					},
					data: {
						ownerType: "user",
						ownerId: document.ownerId,
						status: "deleted",
						deletedAt: now,
					},
				});
				deleted += 1;
			} catch (error) {
				await input.repository.updateMany({
					where: {
						id: document.id,
						ownerType: "assistant_retention_claim",
						ownerId: claimId,
					},
					data: {
						ownerType: "user",
						ownerId: document.ownerId,
						status: "ready",
					},
				});
				logError("Assistant staged document retention failed", {
					documentId: document.id,
					error: error instanceof Error ? error.message : "unknown",
				});
			}
		}
		if (expired.length < ASSISTANT_RETENTION_BATCH_SIZE) break;
	}
	return {
		scanned,
		deleted,
		recovered,
		abandonedReservations,
	};
}

export const assistantStagedDocumentRetention = schedules.task({
	id: "assistant-staged-document-retention",
	cron: "23 * * * *",
	run: () =>
		runAssistantStagedDocumentRetention({
			repository: db.storedDocument as unknown as RetentionRepository,
			deleteBlob: del,
			logError: (message, attributes) => logger.error(message, attributes),
		}),
});
