import {
	auth,
	changePassword,
	deleteUserDocument,
	getDocumentReview,
	getLoginByToken,
	getProfile,
	login,
	loginSchema,
	saveDocumentReviewNote,
	saveUserDocument,
	updateNotificationPreferences,
	updateProfile,
} from "@api/db/queries/user";
import { loginByTokenSchema } from "@api/schemas/hrm";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import { registerStoredDocumentUpload } from "@api/utils/stored-documents";
import { finalizeUploadedDocument } from "@api/utils/upload-finalization";
import {
	decodeValidatedDocumentBase64,
	supportedDocumentMimeTypes,
} from "@api/utils/upload-validation";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import { consoleLog } from "@gnd/utils";
import { getContact } from "@notifications/activities";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
import { TRPCError } from "@trpc/server";
import { del, put } from "@vercel/blob";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../init";

export const userRoutes = createTRPCRouter({
	// validateAuth: publicProcedure.input()
	getLoginByToken: publicProcedure
		.input(loginByTokenSchema)
		.query(async (props) => {
			return getLoginByToken(props.ctx, props.input);
		}),
	auth: publicProcedure.query(async (props) => {
		return auth(props.ctx);
	}),
	getProfile: protectedProcedure.query(async (props) => {
		return getProfile(props.ctx);
	}),
	updateProfile: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1),
				username: z.string().optional().nullable(),
				phoneNo: z.string().optional().nullable(),
				avatarUrl: z.string().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			return updateProfile(props.ctx, props.input);
		}),
	changePassword: protectedProcedure
		.input(
			z.object({
				currentPassword: z.string().min(1),
				newPassword: z.string().min(6),
			}),
		)
		.mutation(async (props) => {
			return changePassword(props.ctx, props.input);
		}),
	saveDocument: protectedProcedure
		.input(
			z.object({
				id: z.number().optional().nullable(),
				userId: z.number().optional().nullable(),
				title: z.string().min(1),
				url: z.string().min(1),
				description: z.string().optional().nullable(),
				expiresAt: z.string().optional().nullable(),
				storedDocumentId: z.string().min(1).optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			return saveUserDocument(props.ctx, props.input);
		}),
	uploadDocumentAsset: protectedProcedure
		.input(
			z.object({
				filename: z.string().min(1),
				contentType: z.enum(supportedDocumentMimeTypes),
				content: z
					.string()
					.min(1)
					.max(10_700_000)
					.regex(/^[A-Za-z0-9+/]*={0,2}$/),
				title: z.string().trim().min(1),
				description: z.string().optional().nullable(),
				expiresAt: z.string().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			const documents = createApiVercelBlobDocumentService({
				put,
			});
			const owner = {
				ownerType: "user" as const,
				ownerId: String(props.ctx.userId),
				kind: "attachment" as const,
			};
			const body = decodeValidatedDocumentBase64(props.input);
			const uploaded = await documents.upload({
				filename: props.input.filename,
				folder: buildOwnerDocumentFolder(owner),
				contentType: props.input.contentType,
				body,
			});
			return finalizeUploadedDocument({
				pathname: uploaded.pathname,
				deleteUpload: del,
				register: () =>
					registerStoredDocumentUpload(props.ctx.db, {
						...owner,
						upload: uploaded,
						isCurrent: false,
						uploadedBy: props.ctx.userId,
						title: props.input.filename,
						meta: {
							workflow: "employee_document",
							source: "mobile_gallery",
						},
					}),
				finalize: async (storedDocument) => {
					const document = await saveUserDocument(props.ctx, {
						title: props.input.title,
						description: props.input.description,
						expiresAt: props.input.expiresAt,
						url: uploaded.url || uploaded.pathname,
						storedDocumentId: storedDocument.id,
					});
					return {
						...document,
						provider: uploaded.provider,
						pathname: uploaded.pathname,
						storedDocumentId: storedDocument.id,
					};
				},
				markFailed: (storedDocument) =>
					props.ctx.db.storedDocument.update({
						where: { id: storedDocument.id },
						data: {
							status: "failed",
							isCurrent: false,
							deletedAt: new Date(),
						},
					}),
			});
		}),
	getDocumentReview: protectedProcedure
		.input(z.object({ id: z.number() }))
		.query(async (props) => {
			return getDocumentReview(props.ctx, props.input.id);
		}),
	saveDocumentReviewNote: protectedProcedure
		.input(
			z.object({
				documentId: z.number(),
				userId: z.number(),
				title: z.string().min(1),
				note: z.string().min(1),
			}),
		)
		.mutation(async (props) => {
			return saveDocumentReviewNote(props.ctx, props.input);
		}),
	deleteDocument: protectedProcedure
		.input(z.object({ id: z.number() }))
		.mutation(async (props) => {
			return deleteUserDocument(props.ctx, props.input.id);
		}),
	updateNotificationPreferences: protectedProcedure
		.input(
			z.object({
				emailNotifications: z.boolean(),
				smsNotifications: z.boolean(),
				orderUpdates: z.boolean(),
				dispatchAlerts: z.boolean(),
				paymentAlerts: z.boolean(),
				systemAnnouncements: z.boolean(),
			}),
		)
		.mutation(async (props) => {
			return updateNotificationPreferences(props.ctx, props.input);
		}),
	notificationAccount: protectedProcedure.query(async (props) => {
		const user = await auth(props.ctx);
		const recipient = await getSubscriberAccount(
			props.ctx.db,
			user.id,
			// {
			//   email: user?.email || "",
			//   name: user?.name || "",
			//   phoneNo: user?.phoneNo || "",
			//   id: user.id,
			// },
			"employee",
		);
		if (!recipient) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Notification account not found.",
			});
		}
		return {
			id: recipient.id,
			email: recipient.email,
			name: recipient.name,
			phoneNo: recipient.phoneNo,
		};
	}),
	loginExample: publicProcedure.input(loginSchema).mutation(async (props) => {
		return {};
	}),
	login: publicProcedure.input(loginSchema).mutation(async (props) => {
		const data = await login(props.ctx, props.input);
		if (!data) throw Error("Invalid credential");
		const jwtSecret = process.env.JWT_SECRET;
		if (!jwtSecret) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Login token configuration is unavailable.",
			});
		}
		const token = sign(
			{
				sessionId: data?.sessionId,
				userId: data?.user?.id,
			},
			jwtSecret,
			{
				expiresIn: "30d",
			},
		);

		return {
			...data,
			token,
		};
	}),
});
