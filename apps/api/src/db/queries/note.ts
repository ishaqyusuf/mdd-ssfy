import type { SaveInboundNoteSchema } from "@api/schemas/notes";
import type { TRPCContext } from "@api/trpc/init";
import type { NoteTagNames } from "@gnd/utils/constants";
import {
	getSubscribersAccount,
	getSubscriberAccount,
} from "@notifications/channel-subscribers";
import {
	getChannels,
	syncChannels,
} from "@notifications/channels-query";
import type { GetNotificationChannelsSchema } from "@notifications/schemas";
import { getAuthUser } from "./user";

export async function getNotificationChannels(
	ctx: TRPCContext,
	query: GetNotificationChannelsSchema,
) {
	const { db } = ctx;
	return getChannels(db, query);
}

export async function syncNotificationChannels(ctx: TRPCContext) {
	return syncChannels(ctx.db);
}

export async function addNotificationChannelSubscriber(
	ctx: TRPCContext,
	input: {
		notificationChannelId: number;
		subscriberId: number;
	},
) {
	const [subscriber] = await getSubscribersAccount(
		ctx.db,
		[input.subscriberId],
		{
			role: "employee",
		},
	);
	if (!subscriber) {
		throw new Error("Subscriber not found");
	}

	const existingAssignment = await ctx.db.assignedUserNoteChannel.findFirst({
		where: {
			noteChannelId: input.notificationChannelId,
			notePadContactId: subscriber.id,
		},
		select: {
			id: true,
		},
	});
	if (existingAssignment) return existingAssignment;

	return ctx.db.assignedUserNoteChannel.create({
		data: {
			noteChannelId: input.notificationChannelId,
			notePadContactId: subscriber.id,
		},
	});
}

export async function removeNotificationChannelSubscriber(
	ctx: TRPCContext,
	input: {
		notificationChannelId: number;
		subscriberId: number;
	},
) {
	const contact = await ctx.db.notePadContacts.findFirst({
		where: {
			profileId: input.subscriberId,
			role: "employee",
			deletedAt: null,
		},
		select: {
			id: true,
		},
	});
	if (!contact) return { count: 0 };

	return ctx.db.assignedUserNoteChannel.deleteMany({
		where: {
			noteChannelId: input.notificationChannelId,
			notePadContactId: contact.id,
		},
	});
}

// export async function saveNote(ctx: TRPCContext, data: SaveNoteSchema) {
//   const senderId = await getSenderId(ctx);
//   const note = await ctx.db.notePad.create({
//     data: {
//       headline: data.headline,
//       subject: data.subject,
//       note: `${data.note}`,
//       color: data.noteColor,
//       senderContact: {
//         connect: {
//           id: senderId,
//         },
//       },
//       tags: {
//         createMany: {
//           data: data.tags,
//         },
//       },
//     },
//   });
// }
export async function saveInboundNote(
	ctx: TRPCContext,
	data: SaveInboundNoteSchema,
) {
	const senderId = await getSenderId(ctx);
	const note = await ctx.db.notePad.create({
		data: {
			headline: `Sales Inbound`,
			subject: `${data.status}`,
			note: `${data.note}`,
			color: data.noteColor,
			senderContact: {
				connect: {
					id: senderId,
				},
			},
			tags: {
				createMany: {
					data: [
						{
							tagName: "salesId" as NoteTagNames,
							tagValue: `${data.salesId}`,
						},
						{
							tagName: "inboundStatus" as NoteTagNames,
							tagValue: `${data.status}`,
						},
						{
							tagName: "type" as NoteTagNames,
							tagValue: "inbound",
						},
						...(data?.attachments || [])?.map(({ pathname: tagValue }) => ({
							tagValue,
							tagName: "attachment" as NoteTagNames,
						})),
					],
				},
			},
		},
	});
}

export async function getSenderId(ctx: TRPCContext) {
	const user = await getAuthUser(ctx);
	if (!user) throw new Error("Unauthorized!");
	const senderContactId = (await getSubscriberAccount(ctx.db, user.id))?.id!;
	return senderContactId;
}

export async function deleteNotification(
	ctx: TRPCContext,
	input: {
		activityId: number;
	},
) {
	const user = await getAuthUser(ctx);
	const roleName = user.role?.name?.trim().toLowerCase();

	if (roleName !== "super admin") {
		throw new Error("Only super admin can delete notifications.");
	}

	const now = new Date();

	await ctx.db.$transaction([
		ctx.db.noteRecipients.updateMany({
			where: {
				notePadId: input.activityId,
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
		ctx.db.notePadEvent.updateMany({
			where: {
				notePadId: input.activityId,
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
		ctx.db.notePadReadReceipt.updateMany({
			where: {
				notePadId: input.activityId,
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
		ctx.db.noteTags.updateMany({
			where: {
				notePadId: input.activityId,
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
		ctx.db.noteComments.updateMany({
			where: {
				OR: [
					{
						notePadId: input.activityId,
					},
					{
						commentNotePadId: input.activityId,
					},
				],
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
		ctx.db.notePad.updateMany({
			where: {
				id: input.activityId,
				deletedAt: null,
			},
			data: {
				deletedAt: now,
			},
		}),
	]);

	return {
		success: true,
	};
}
