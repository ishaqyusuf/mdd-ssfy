import { db } from "@gnd/db";
import {
	getAssistantConversationRetentionPolicy,
	listAssistantConversationDocumentsForRetention,
	listAssistantConversationsDueForRetention,
	isAssistantConversationDocumentPathShared,
	purgeAssistantConversationDueForRetention,
} from "@gnd/db/queries";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { del } from "@vercel/blob";

export const ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE = 100;

type RetentionCandidate = { id: string };
type RetentionDocument = { id: string; provider: string; pathname: string };

type ConversationRetentionDependencies = {
	listDue: (input: {
		before: Date;
		take: number;
	}) => Promise<RetentionCandidate[]>;
	listDocuments: (input: {
		conversationId: string;
		before: Date;
	}) => Promise<RetentionDocument[]>;
	deleteBlob: (pathname: string) => Promise<unknown>;
	isPathShared: (
		document: RetentionDocument & { conversationId: string },
	) => Promise<boolean>;
	purge: (input: {
		conversationId: string;
		before: Date;
	}) => Promise<{ purged: boolean }>;
	logError?: (message: string, attributes: Record<string, unknown>) => void;
};

export async function runAssistantConversationRetention(
	dependencies: ConversationRetentionDependencies,
	now = new Date(),
) {
	const logError = dependencies.logError ?? (() => undefined);
	const candidates = await dependencies.listDue({
		before: now,
		take: ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE,
	});
	let purged = 0;
	let blobsDeleted = 0;
	let sharedBlobsPreserved = 0;
	let failed = 0;

	for (const candidate of candidates) {
		try {
			const documents = await dependencies.listDocuments({
				conversationId: candidate.id,
				before: now,
			});
			const deletablePathnames = new Set<string>();
			const sharedPathnames = new Set<string>();
			for (const document of documents) {
				if (document.provider !== "vercel-blob") {
					throw new Error(
						`Unsupported Assistant document provider: ${document.provider}`,
					);
				}
				const shared = await dependencies.isPathShared({
					...document,
					conversationId: candidate.id,
				});
				if (shared) {
					sharedPathnames.add(document.pathname);
					continue;
				}
				deletablePathnames.add(document.pathname);
			}
			for (const pathname of deletablePathnames) {
				await dependencies.deleteBlob(pathname);
				blobsDeleted += 1;
			}
			sharedBlobsPreserved += sharedPathnames.size;
			const result = await dependencies.purge({
				conversationId: candidate.id,
				before: now,
			});
			if (result.purged) purged += 1;
		} catch (error) {
			failed += 1;
			logError("Assistant conversation retention failed", {
				conversationId: candidate.id,
				error: error instanceof Error ? error.message : "unknown",
			});
		}
	}

	return {
		scanned: candidates.length,
		purged,
		blobsDeleted,
		sharedBlobsPreserved,
		failed,
		moreMayRemain:
			candidates.length === ASSISTANT_CONVERSATION_RETENTION_BATCH_SIZE,
	};
}

export const assistantConversationRetention = schedules.task({
	id: "assistant-conversation-retention",
	cron: "47 * * * *",
	maxDuration: 300,
	queue: { concurrencyLimit: 1 },
	run: async () => {
		const policy = getAssistantConversationRetentionPolicy();
		if (!policy.configured) {
			logger.warn("Assistant conversation retention policy is not configured");
			return {
				scanned: 0,
				purged: 0,
				blobsDeleted: 0,
				sharedBlobsPreserved: 0,
				failed: 0,
				moreMayRemain: false,
				policyConfigured: false,
			};
		}
		const result = await runAssistantConversationRetention({
			listDue: (input) =>
				listAssistantConversationsDueForRetention(db, input),
			listDocuments: (input) =>
				listAssistantConversationDocumentsForRetention(db, input),
			deleteBlob: del,
			isPathShared: ({ id, ...document }) =>
				isAssistantConversationDocumentPathShared(db, {
					...document,
					documentId: id,
				}),
			purge: (input) =>
				purgeAssistantConversationDueForRetention(db, input),
			logError: (message, attributes) => logger.error(message, attributes),
		});
		return {
			...result,
			policyConfigured: true,
			retentionDays: policy.days,
		};
	},
});
