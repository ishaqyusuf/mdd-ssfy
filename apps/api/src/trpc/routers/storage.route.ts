import { resolveAssistantActor } from "@api/assistant/actor";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { registerStoredDocumentUpload } from "@api/utils/stored-documents";
import { finalizeUploadedDocument } from "@api/utils/upload-finalization";
import {
	decodeValidatedDocumentBase64,
	supportedDocumentMimeTypes,
} from "@api/utils/upload-validation";
import type { Db } from "@gnd/db";
import { buildOwnerDocumentFolder, withFolder } from "@gnd/documents";
import { blobPaths } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

export const ASSISTANT_STAGED_MAX_FILES_PER_ACTOR = 10;
export const ASSISTANT_STAGED_MAX_BYTES_PER_ACTOR = 40_000_000;

class AssistantStagedQuotaError extends Error {}

function isRetryableReservationError(error: unknown) {
	return (
		Boolean(error && typeof error === "object" && "code" in error) &&
		(error as { code?: unknown }).code === "P2034"
	);
}

export async function reserveAssistantStagedUpload(
	db: Db,
	input: {
		userId: number;
		filename: string;
		contentType: string;
		size: number;
		pathname: string;
	},
) {
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			return await db.$transaction(
				async (tx) => {
					const where = {
						ownerType: "user",
						ownerId: String(input.userId),
						ownerKey: "staged:assistant-documents",
						kind: "attachment",
						status: { in: ["uploading", "ready"] },
						deletedAt: null,
					};
					const [count, aggregate] = await Promise.all([
						tx.storedDocument.count({ where }),
						tx.storedDocument.aggregate({
							where,
							_sum: { size: true },
						}),
					]);
					if (
						count >= ASSISTANT_STAGED_MAX_FILES_PER_ACTOR ||
						(aggregate._sum.size ?? 0) + input.size >
							ASSISTANT_STAGED_MAX_BYTES_PER_ACTOR
					) {
						throw new AssistantStagedQuotaError();
					}
					return tx.storedDocument.create({
						data: {
							kind: "attachment",
							ownerType: "user",
							ownerId: String(input.userId),
							ownerKey: "staged:assistant-documents",
							provider: "vercel-blob",
							pathname: input.pathname,
							filename: input.filename,
							mimeType: input.contentType,
							size: input.size,
							visibility: "private",
							status: "uploading",
							isCurrent: false,
							sourceType: "authenticated_browser_upload",
							sourceId: "assistant-documents",
							uploadedBy: input.userId,
							title: input.filename,
							meta: { workflow: "assistant-documents", staged: true },
						},
					});
				},
				{ isolationLevel: "Serializable" },
			);
		} catch (error) {
			if (error instanceof AssistantStagedQuotaError) throw error;
			if (attempt === 2 || !isRetryableReservationError(error)) throw error;
		}
	}
	throw new Error("Assistant upload reservation retry limit reached");
}

export async function cleanupAssistantStagedUploadFailure(
	db: Db,
	input: { reservationId: string; pathname: string },
	deleteUpload: (pathname: string) => Promise<unknown> = del,
) {
	await deleteUpload(input.pathname);
	await db.storedDocument.updateMany({
		where: { id: input.reservationId, status: "uploading" },
		data: { status: "failed", deletedAt: new Date() },
	});
}

export const storageRouter = createTRPCRouter({
	upload: protectedProcedure
		.input(
			z.object({
				path: z.enum(blobPaths),
				filename: z.string().trim().min(1).max(255),
				contentType: z.enum(supportedDocumentMimeTypes),
				content: z
					.string()
					.min(1)
					.max(10_700_000)
					.regex(/^[A-Za-z0-9+/]*={0,2}$/),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			if (
				input.path === "assistant-documents" &&
				!(await resolveAssistantActor(ctx.db, ctx.userId))
			) {
				throw new TRPCError({ code: "FORBIDDEN" });
			}
			const body = await decodeValidatedDocumentBase64({
				...input,
				maxPdfPages: input.path === "assistant-documents" ? 50 : undefined,
			});
			const owner = {
				ownerType: "user" as const,
				ownerId: String(ctx.userId),
				ownerKey: `staged:${input.path}`,
				kind: "attachment" as const,
			};
			const documents = createApiVercelBlobDocumentService({
				put,
				access: input.path === "assistant-documents" ? "private" : "public",
				addRandomSuffix:
					input.path === "assistant-documents" ? false : undefined,
			});
			if (input.path === "assistant-documents") {
				const extension = input.filename.match(/\.[a-z0-9]{1,10}$/i)?.[0] ?? "";
				const reservationFilename = `${crypto.randomUUID()}${extension.toLowerCase()}`;
				const reservationPathname = withFolder(
					reservationFilename,
					buildOwnerDocumentFolder(owner),
				);
				let reservation: Awaited<
					ReturnType<typeof reserveAssistantStagedUpload>
				>;
				try {
					reservation = await reserveAssistantStagedUpload(ctx.db, {
						userId: ctx.userId,
						filename: input.filename,
						contentType: input.contentType,
						size: body.byteLength,
						pathname: reservationPathname,
					});
				} catch (error) {
					if (error instanceof AssistantStagedQuotaError) {
						throw new TRPCError({
							code: "TOO_MANY_REQUESTS",
							message:
								"Remove or send existing assistant attachments before uploading more.",
						});
					}
					throw error;
				}
				let uploaded: Awaited<ReturnType<typeof documents.upload>> | undefined;
				try {
					uploaded = await documents.upload({
						filename: reservationFilename,
						folder: buildOwnerDocumentFolder(owner),
						contentType: input.contentType,
						body,
					});
					if (uploaded.pathname !== reservationPathname) {
						throw new Error(
							"Assistant upload pathname did not match reservation",
						);
					}
					const storedDocument = await ctx.db.storedDocument.update({
						where: { id: reservation.id },
						data: {
							provider: uploaded.provider,
							pathname: uploaded.pathname,
							url: uploaded.url ?? null,
							size: uploaded.size ?? body.byteLength,
							checksum: uploaded.etag ?? null,
							status: "ready",
						},
					});
					return {
						url: uploaded.pathname,
						downloadUrl: uploaded.pathname,
						pathname: uploaded.pathname,
						contentType: input.contentType,
						size: uploaded.size ?? body.byteLength,
						storedDocumentId: storedDocument.id,
					};
				} catch (error) {
					await cleanupAssistantStagedUploadFailure(ctx.db, {
						reservationId: reservation.id,
						pathname: reservation.pathname,
					});
					throw error;
				}
			}
			const uploaded = await documents.upload({
				filename: input.filename,
				folder: buildOwnerDocumentFolder(owner),
				contentType: input.contentType,
				body,
			});
			return finalizeUploadedDocument({
				pathname: uploaded.pathname,
				deleteUpload: del,
				register: () =>
					registerStoredDocumentUpload(ctx.db, {
						...owner,
						upload: uploaded,
						isCurrent: false,
						uploadedBy: ctx.userId,
						sourceType: "authenticated_browser_upload",
						sourceId: input.path,
						title: input.filename,
						meta: {
							workflow: input.path,
							staged: true,
						},
					}),
				finalize: async (storedDocument) => ({
					url: uploaded.url || uploaded.pathname,
					downloadUrl: uploaded.url || uploaded.pathname,
					pathname: uploaded.pathname,
					contentType: input.contentType,
					size: uploaded.size ?? null,
					storedDocumentId: storedDocument.id,
				}),
				markFailed: (storedDocument) =>
					ctx.db.storedDocument.update({
						where: { id: storedDocument.id },
						data: {
							status: "failed",
							isCurrent: false,
							deletedAt: new Date(),
						},
					}),
			});
		}),
	delete: protectedProcedure
		.input(
			z.object({
				pathname: z.string().trim().min(1).max(512),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const deleteClaimId = crypto.randomUUID();
			await ctx.db.storedDocument.updateMany({
				where: {
					provider: "vercel-blob",
					pathname: input.pathname,
					ownerType: "user_delete_claim",
					uploadedBy: ctx.userId,
					sourceType: "authenticated_browser_upload",
					ownerKey: { startsWith: "staged:" },
					status: "deleting",
					updatedAt: {
						lt: new Date(Date.now() - 60 * 60 * 1000),
					},
					deletedAt: null,
				},
				data: {
					ownerType: "user",
					ownerId: String(ctx.userId),
					status: "ready",
				},
			});
			const document = await ctx.db.storedDocument.findFirst({
				where: {
					provider: "vercel-blob",
					pathname: input.pathname,
					ownerType: "user",
					ownerId: String(ctx.userId),
					uploadedBy: ctx.userId,
					sourceType: "authenticated_browser_upload",
					ownerKey: { startsWith: "staged:" },
					status: "ready",
					deletedAt: null,
				},
				select: { id: true, pathname: true },
			});
			if (!document) {
				return { deleted: false };
			}

			const claimed = await ctx.db.storedDocument.updateMany({
				where: {
					id: document.id,
					provider: "vercel-blob",
					pathname: input.pathname,
					ownerType: "user",
					ownerId: String(ctx.userId),
					uploadedBy: ctx.userId,
					sourceType: "authenticated_browser_upload",
					ownerKey: { startsWith: "staged:" },
					status: "ready",
					deletedAt: null,
				},
				data: {
					ownerType: "user_delete_claim",
					ownerId: deleteClaimId,
					status: "deleting",
				},
			});
			if (!claimed.count) {
				return { deleted: false };
			}
			try {
				await del(document.pathname);
			} catch (error) {
				await ctx.db.storedDocument.updateMany({
					where: {
						id: document.id,
						ownerType: "user_delete_claim",
						ownerId: deleteClaimId,
						status: "deleting",
						deletedAt: null,
					},
					data: {
						ownerType: "user",
						ownerId: String(ctx.userId),
						status: "ready",
					},
				});
				throw error;
			}
			const tombstoned = await ctx.db.storedDocument.updateMany({
				where: {
					id: document.id,
					ownerType: "user_delete_claim",
					ownerId: deleteClaimId,
					status: "deleting",
					deletedAt: null,
				},
				data: {
					ownerType: "user",
					ownerId: String(ctx.userId),
					status: "deleted",
					isCurrent: false,
					deletedAt: new Date(),
				},
			});
			if (!tombstoned.count) {
				throw new Error("The staged document delete claim was lost.");
			}
			return { deleted: true };
		}),
});
