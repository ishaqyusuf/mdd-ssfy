import {
	addNotificationChannelSubscriber,
	deleteNotification,
	getNotificationChannels,
	removeNotificationChannelSubscriber,
	saveInboundNote,
	syncNotificationChannels,
} from "@api/db/queries/note";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import {
	adoptStoredDocumentAttachments,
	saveNote,
	saveNoteSchema,
} from "@gnd/utils/note";
import {
	getActivityCount,
	getActivityTypeSummaries,
	getActivties,
	updateActivityStatus,
	updateAllActivitiesStatus,
} from "@notifications/activities";
import {
	type GetActivityTagSuggestionsQuery,
	type GetActivityTreeQuery,
	getActivityTagSuggestions,
	getActivityTree,
} from "@notifications/activity-tree";
import {
	getUserNotificationChannelPreferences,
	updateUserNotificationChannelPreference,
} from "@notifications/channel-preferences";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
import { channelNames } from "@notifications/channels";
import { Notifications } from "@notifications/index";
import {
	type NotificationTypes,
	getNotificationChannelsSchema,
} from "@notifications/schemas";
import z from "zod";
import {
	type TRPCContext,
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "../init";

const activityTagFilterLeafSchema = z.union([
	z.object({
		tagName: z.string().min(1),
		tagValue: z.any(),
	}),
	z.object({
		tagName: z.string().min(1),
		tagValues: z.array(z.any()),
	}),
	z.object({
		tagNames: z.array(z.string().min(1)).min(1),
		tagValue: z.any(),
	}),
	z.object({
		tagNames: z.array(z.string().min(1)).min(1),
		tagValues: z.array(z.any()),
	}),
]);

const activityTagFilterNodeSchema: z.ZodTypeAny = z.lazy(() =>
	z.union([
		activityTagFilterLeafSchema,
		z.object({
			op: z.enum(["and", "or"]),
			filters: z.array(activityTagFilterNodeSchema).min(1),
		}),
	]),
);

const noteStatusSchema = z.enum(["unread", "read", "archived"]);
const NOTIFICATION_ATTACHMENT_CLAIM_LEASE_MS = 15 * 60 * 1000;

function collectPayloadStrings(
	value: unknown,
	result = new Set<string>(),
	depth = 0,
) {
	if (result.size >= 200 || depth > 8) return result;
	if (typeof value === "string") {
		result.add(value);
		return result;
	}
	if (Array.isArray(value)) {
		for (const item of value) collectPayloadStrings(item, result, depth + 1);
		return result;
	}
	if (value && typeof value === "object") {
		for (const item of Object.values(value)) {
			collectPayloadStrings(item, result, depth + 1);
		}
	}
	return result;
}

async function getCurrentNotificationContactId(ctx: {
	db: TRPCContext["db"];
	userId: number;
}) {
	const contact = await getSubscriberAccount(ctx.db, ctx.userId, "employee");

	if (!contact?.id) {
		throw new Error("Notification account not found.");
	}

	return contact.id;
}

async function getEnabledInAppNotificationChannels(ctx: {
	db: TRPCContext["db"];
	userId: number;
}) {
	return (
		await getUserNotificationChannelPreferences(ctx.db, ctx.userId)
	).filter((channel) => channel.preferences.inApp);
}

export const notesRouter = createTRPCRouter({
	getNotificationChannels: publicProcedure
		.input(getNotificationChannelsSchema)
		.query(async (props) => {
			return getNotificationChannels(props.ctx, props.input);
		}),
	syncNotificationChannels: protectedProcedure.mutation(async (props) => {
		return syncNotificationChannels(props.ctx);
	}),
	getNotificationChannel: publicProcedure
		.input(
			z.object({
				id: z.number(),
			}),
		)
		.query(async (props) => {
			const { data } = await getNotificationChannels(props.ctx, {
				id: props.input.id,
			});
			return data[0];
		}),
	updateNotificationChannel: protectedProcedure
		.input(
			z.object({
				id: z.number(),
				// subscriberIds: z.array(z.number()),
				// roleIds: z.array(z.number()),
				inAppSupport: z.boolean().optional().nullable(),
				textSupport: z.boolean().optional().nullable(),
				whatsappSupport: z.boolean().optional().nullable(),
				emailSupport: z.boolean().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			const { id, whatsappSupport, textSupport, ...updates } = props.input;
			const normalizedWhatsApp = whatsappSupport ?? textSupport;
			await props.ctx.db.noteChannels.update({
				where: {
					id,
				},
				data: {
					...updates,
					...(normalizedWhatsApp === undefined
						? {}
						: {
								whatsappSupport: normalizedWhatsApp,
								textSupport: normalizedWhatsApp,
							}),
				},
			});
		}),
	removeNotificationChannelRole: protectedProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				roleId: z.number(),
			}),
		)
		.mutation(async (props) => {
			const { notificationChannelId, roleId } = props.input;
			await props.ctx.db.noteChannelRole.deleteMany({
				where: {
					noteChannelId: notificationChannelId,
					roleId,
				},
			});
		}),
	addNotificationChannelRole: protectedProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				roleId: z.number(),
				id: z.number().optional().nullable(),
			}),
		)
		.mutation(async (props) => {
			const { notificationChannelId, roleId } = props.input;
			// if (props.input.id)
			//   await props.ctx.db.noteChannelRole.updateMany({
			//     where: {
			//       deletedAt: {},
			//       id: props.input.id,
			//     },
			//     data: {
			//       deletedAt: null,
			//     },
			//   });
			// else
			await props.ctx.db.noteChannelRole.create({
				data: {
					noteChannelId: notificationChannelId,
					roleId,
				},
			});
		}),
	removeNotificationChannelSubscriber: protectedProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				subscriberId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return removeNotificationChannelSubscriber(props.ctx, props.input);
		}),
	addNotificationChannelSubscriber: protectedProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				subscriberId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return addNotificationChannelSubscriber(props.ctx, props.input);
		}),
	saveInboundNote: protectedProcedure
		.input(saveInboundNoteSchema)
		.mutation(async (props) => {
			return saveInboundNote(props.ctx, props.input);
		}),
	saveNote: protectedProcedure.input(saveNoteSchema).mutation(async (props) => {
		return props.ctx.db.$transaction((tx) =>
			saveNote(tx, props.input, props.ctx.userId),
		);
	}),
	createInboxActivity: protectedProcedure
		.input(
			z.object({
				channel: z.enum(channelNames),
				payload: z.record(z.string(), z.any()).optional(),
				attachments: z
					.array(z.string().trim().min(1).max(512))
					.max(25)
					.optional(),
				message: z.string().optional(),
				noteColor: z.string().optional(),
				contacts: z
					.array(
						z.object({
							role: z.enum(["employee", "customer"]).default("employee"),
							ids: z.array(z.number()).min(1),
						}),
					)
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const attachmentClaimId = crypto.randomUUID();
			const explicitAttachmentPathnames = Array.from(
				new Set(input.attachments || []),
			);
			const attachmentPathnames = Array.from(
				collectPayloadStrings(
					input.payload,
					new Set(explicitAttachmentPathnames),
				),
			);
			if (attachmentPathnames.length) {
				const staleBefore = new Date(
					Date.now() - NOTIFICATION_ATTACHMENT_CLAIM_LEASE_MS,
				);
				await ctx.db.$transaction(async (tx) => {
					await tx.storedDocument.updateMany({
						where: {
							pathname: { in: attachmentPathnames },
							ownerType: "user",
							ownerId: String(ctx.userId),
							uploadedBy: ctx.userId,
							sourceType: "notification_attachment_pending",
							status: "processing",
							updatedAt: { lt: staleBefore },
							deletedAt: null,
						},
						data: {
							sourceType: "authenticated_browser_upload",
							sourceId: null,
							status: "ready",
						},
					});
					await adoptStoredDocumentAttachments(tx, {
						pathnames: attachmentPathnames,
						uploadedBy: ctx.userId,
						ownerType: "user",
						ownerId: String(ctx.userId),
						sourceType: "notification_attachment_pending",
						sourceId: attachmentClaimId,
						status: "processing",
					});
					const competingClaim = await tx.storedDocument.findFirst({
						where: {
							pathname: { in: attachmentPathnames },
							ownerType: "user",
							ownerId: String(ctx.userId),
							uploadedBy: ctx.userId,
							sourceType: "notification_attachment_pending",
							sourceId: { not: attachmentClaimId },
							status: "processing",
							deletedAt: null,
						},
						select: { id: true },
					});
					if (competingClaim) {
						throw new Error("An attachment submission is already in progress.");
					}
				});
			}
			const recipientCount = Array.from(
				new Set((input.contacts || []).flatMap((group) => group.ids || [])),
			).length;
			const message = input.message?.trim();
			const payload = {
				...(input.payload || {}),
				...(message ? { note: `note: ${message}` } : {}),
				...(input.noteColor ? { color: input.noteColor } : {}),
			};

			let result: Awaited<ReturnType<Notifications["create"]>>;
			try {
				const notifications = new Notifications(ctx.db);
				const channel = input.channel as keyof NotificationTypes;
				result = await notifications.create(
					channel,
					payload as Omit<NotificationTypes[typeof channel], "users">,
					{
						author: {
							id: ctx.userId,
							role: "employee",
						},
						recipients: input.contacts,
						includeChannelSubscribers: false,
						allowFallbackRecipient: false,
					},
				);
			} catch (error) {
				await ctx.db.storedDocument.updateMany({
					where: {
						pathname: { in: attachmentPathnames },
						uploadedBy: ctx.userId,
						sourceType: "notification_attachment_pending",
						sourceId: attachmentClaimId,
						status: "processing",
						deletedAt: null,
					},
					data: {
						sourceType: "authenticated_browser_upload",
						sourceId: null,
						status: "ready",
					},
				});
				throw error;
			}
			const activityId = result.activityIds?.[0];
			if (attachmentPathnames.length) {
				await ctx.db.storedDocument.updateMany({
					where: {
						pathname: { in: attachmentPathnames },
						uploadedBy: ctx.userId,
						sourceType: "notification_attachment_pending",
						sourceId: attachmentClaimId,
						status: "processing",
						deletedAt: null,
					},
					data: {
						ownerType: "notification_activity",
						ownerId: String(activityId ?? attachmentClaimId),
						ownerKey: "attachment",
						sourceType: "notification_attachment",
						sourceId: String(activityId ?? attachmentClaimId),
						status: "ready",
					},
				});
			}

			return {
				activities: result.activities,
				recipientCount,
				noContact: recipientCount === 0,
			};
		}),
	deleteNotification: protectedProcedure
		.input(
			z.object({
				activityId: z.number(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			return deleteNotification(ctx, input);
		}),
	updateNotificationStatus: protectedProcedure
		.input(
			z.object({
				activityId: z.number(),
				status: noteStatusSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const notePadContactId = await getCurrentNotificationContactId(ctx);

			return updateActivityStatus(
				ctx.db,
				input.activityId,
				input.status,
				notePadContactId,
			);
		}),
	updateAllNotificationStatus: protectedProcedure
		.input(
			z.object({
				status: noteStatusSchema,
				fromStatus: z.array(noteStatusSchema).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const notePadContactId = await getCurrentNotificationContactId(ctx);

			return updateAllActivitiesStatus(ctx.db, {
				notePadContactId,
				status: input.status,
				fromStatus: input.fromStatus,
			});
		}),
	myNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
		return getUserNotificationChannelPreferences(ctx.db, ctx.userId);
	}),
	updateMyNotificationPreference: protectedProcedure
		.input(
			z.object({
				channelId: z.number(),
				emailEnabled: z.boolean().optional(),
				inAppEnabled: z.boolean().optional(),
				whatsappEnabled: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { channelId, ...preferences } = input;
			return updateUserNotificationChannelPreference(
				ctx.db,
				ctx.userId,
				channelId,
				preferences,
			);
		}),
	list: publicProcedure
		.input(
			z.object({
				contactIds: z.array(z.number()),
				maxPriority: z.number().optional(),
				cursor: z.string().nullable().optional(),
				pageSize: z.number().optional(),
				status: z.array(z.enum(["unread", "read", "archived"])).optional(),
				type: z.string().nullable().optional(),
			}),
		)
		.query(async (props) => {
			return getActivties(props.ctx.db, {
				contactIds: props.input.contactIds,
				cursor: props.input.cursor,
				pageSize: props.input.pageSize,
				status: props.input.status,
				type: props.input.type,
			});
			// const {
			//   maxPriority,
			//   pageSize = 20,
			//   status = ["unread", "read"],
			// } = props.input;

			// return {
			//   data: [],
			// };
		}),
	listMine: protectedProcedure
		.input(
			z.object({
				maxPriority: z.number().optional(),
				cursor: z.string().nullable().optional(),
				pageSize: z.number().optional(),
				status: z.array(noteStatusSchema).optional(),
				type: z.string().nullable().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const notePadContactId = await getCurrentNotificationContactId(ctx);
			const enabledTypes = (await getEnabledInAppNotificationChannels(ctx)).map(
				(channel) => channel.name,
			);

			return getActivties(ctx.db, {
				contactIds: [notePadContactId],
				cursor: input.cursor,
				pageSize: input.pageSize,
				status: input.status,
				type: input.type,
				types: enabledTypes,
			});
		}),
	unreadNotificationCount: protectedProcedure
		.input(
			z.object({
				type: z.string().nullable().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const notePadContactId = await getCurrentNotificationContactId(ctx);
			const enabledTypes = (await getEnabledInAppNotificationChannels(ctx)).map(
				(channel) => channel.name,
			);

			return getActivityCount(ctx.db, {
				contactIds: [notePadContactId],
				status: ["unread"],
				type: input.type,
				types: enabledTypes,
			});
		}),
	notificationTypeSummary: protectedProcedure
		.input(
			z.object({
				status: z.array(noteStatusSchema).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const notePadContactId = await getCurrentNotificationContactId(ctx);
			const enabledChannels = await getEnabledInAppNotificationChannels(ctx);
			const titleByType = new Map(
				enabledChannels.map((channel) => [channel.name, channel.title]),
			);

			const summaries = await getActivityTypeSummaries(ctx.db, {
				contactIds: [notePadContactId],
				status: input.status,
				types: enabledChannels.map((channel) => channel.name),
			});

			return summaries.map((summary) => ({
				...summary,
				title: titleByType.get(summary.type) ?? summary.title,
			}));
		}),
	activityTree: publicProcedure
		.input(
			z.object({
				contactIds: z.array(z.number()).optional(),
				status: z.array(z.enum(["unread", "read", "archived"])).optional(),
				tagFilters: z.array(activityTagFilterLeafSchema).optional(),
				tagFilterMode: z.enum(["all", "any"]).optional(),
				filter: activityTagFilterNodeSchema.optional(),
				pageSize: z.number().int().min(1).max(200).optional(),
				includeChildren: z.boolean().optional(),
				maxDepth: z.number().int().min(1).max(10).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getActivityTree(ctx.db, input as GetActivityTreeQuery);
		}),
	activityTagSuggestions: publicProcedure
		.input(
			z.object({
				contactIds: z.array(z.number()).optional(),
				status: z.array(z.enum(["unread", "read", "archived"])).optional(),
				tagFilters: z.array(activityTagFilterLeafSchema).optional(),
				tagFilterMode: z.enum(["all", "any"]).optional(),
				filter: activityTagFilterNodeSchema.optional(),
				channels: z.array(z.string()).optional(),
				tagName: z.string().optional(),
				q: z.string().optional(),
				limitPerTag: z.number().int().min(1).max(100).optional(),
				maxRows: z.number().int().min(1).max(10000).optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			return getActivityTagSuggestions(
				ctx.db,
				input as GetActivityTagSuggestionsQuery,
			);
		}),
});
