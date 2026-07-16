import {
	addNotificationChannelSubscriber,
	deleteNotification,
	getNotificationChannels,
	removeNotificationChannelSubscriber,
	saveInboundNote,
	syncNotificationChannels,
} from "@api/db/queries/note";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { saveNote, saveNoteSchema } from "@gnd/utils/note";
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
	return (await getUserNotificationChannelPreferences(ctx.db, ctx.userId)).filter(
		(channel) => channel.preferences.inApp,
	);
}

export const notesRouter = createTRPCRouter({
	getNotificationChannels: publicProcedure
		.input(getNotificationChannelsSchema)
		.query(async (props) => {
			return getNotificationChannels(props.ctx, props.input);
		}),
	syncNotificationChannels: publicProcedure.mutation(async (props) => {
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
	updateNotificationChannel: publicProcedure
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
	removeNotificationChannelRole: publicProcedure
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
	addNotificationChannelRole: publicProcedure
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
	removeNotificationChannelSubscriber: publicProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				subscriberId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return removeNotificationChannelSubscriber(props.ctx, props.input);
		}),
	addNotificationChannelSubscriber: publicProcedure
		.input(
			z.object({
				notificationChannelId: z.number(),
				subscriberId: z.number(),
			}),
		)
		.mutation(async (props) => {
			return addNotificationChannelSubscriber(props.ctx, props.input);
		}),
	saveInboundNote: publicProcedure
		.input(saveInboundNoteSchema)
		.mutation(async (props) => {
			return saveInboundNote(props.ctx, props.input);
		}),
	saveNote: publicProcedure.input(saveNoteSchema).mutation(async (props) => {
		return saveNote(props.ctx.db, props.input, props.ctx.userId);
	}),
	createInboxActivity: protectedProcedure
		.input(
			z.object({
				channel: z.enum(channelNames),
				payload: z.record(z.string(), z.any()).optional(),
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
			const recipientCount = Array.from(
				new Set((input.contacts || []).flatMap((group) => group.ids || [])),
			).length;
			const message = input.message?.trim();
			const payload = {
				...(input.payload || {}),
				...(message ? { note: `note: ${message}` } : {}),
				...(input.noteColor ? { color: input.noteColor } : {}),
			};

			const notifications = new Notifications(ctx.db);
			const channel = input.channel as keyof NotificationTypes;
			const result = await notifications.create(
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
			const enabledTypes = (
				await getEnabledInAppNotificationChannels(ctx)
			).map((channel) => channel.name);

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
			const enabledTypes = (
				await getEnabledInAppNotificationChannels(ctx)
			).map((channel) => channel.name);

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
