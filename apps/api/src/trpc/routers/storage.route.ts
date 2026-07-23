import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { registerStoredDocumentUpload } from "@api/utils/stored-documents";
import { finalizeUploadedDocument } from "@api/utils/upload-finalization";
import {
	decodeValidatedDocumentBase64,
	supportedDocumentMimeTypes,
} from "@api/utils/upload-validation";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import { blobPaths } from "@gnd/utils/constants";
import { del, put } from "@vercel/blob";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

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
			const owner = {
				ownerType: "user" as const,
				ownerId: String(ctx.userId),
				ownerKey: `staged:${input.path}`,
				kind: "attachment" as const,
			};
			const documents = createApiVercelBlobDocumentService({ put });
			const uploaded = await documents.upload({
				filename: input.filename,
				folder: buildOwnerDocumentFolder(owner),
				contentType: input.contentType,
				body: decodeValidatedDocumentBase64(input),
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
