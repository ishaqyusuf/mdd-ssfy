import type { TRPCContext } from "@api/trpc/init";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
import { explodeTagEntries, mergeTagRows } from "@notifications/tag-values";
import { TRPCError } from "@trpc/server";

const MANUAL_CHANNELS = new Set(["sales_info", "inventory_inbound"]);

export function canManageManualActivityNote(input: {
	channel?: unknown;
	activityType?: unknown;
	actorUserId: number;
	authorUserId?: number | null;
	isSuperAdmin: boolean;
}) {
	return (
		input.activityType !== "activity_note_revision" &&
		typeof input.channel === "string" &&
		MANUAL_CHANNELS.has(input.channel) &&
		(input.isSuperAdmin || input.authorUserId === input.actorUserId)
	);
}

async function getActor(ctx: TRPCContext) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const [user, contact] = await Promise.all([
		ctx.db.users.findFirst({
			where: { id: ctx.userId, deletedAt: null, accessRevokedAt: null },
			select: {
				roles: {
					where: { deletedAt: null, role: { deletedAt: null } },
					select: { role: { select: { name: true } } },
				},
			},
		}),
		getSubscriberAccount(ctx.db, ctx.userId, "employee"),
	]);
	if (!contact?.id) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Notification account not found.",
		});
	}
	return {
		userId: ctx.userId,
		contactId: contact.id,
		isSuperAdmin: Boolean(
			user?.roles.some(
				(entry) => entry.role?.name?.toLowerCase() === "super admin",
			),
		),
	};
}

async function getManageableNote(ctx: TRPCContext, activityId: number) {
	const [actor, note] = await Promise.all([
		getActor(ctx),
		ctx.db.notePad.findFirst({
			where: { id: activityId, deletedAt: null },
			select: {
				id: true,
				note: true,
				senderContactId: true,
				senderContact: { select: { profileId: true } },
				tags: {
					where: { deletedAt: null },
					select: { tagName: true, tagValue: true },
				},
			},
		}),
	]);
	if (!note) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Activity note not found.",
		});
	}
	const tags = mergeTagRows(note.tags);
	const channel = tags.channel ?? tags.type;
	if (
		!canManageManualActivityNote({
			channel,
			activityType: tags.type,
			actorUserId: actor.userId,
			authorUserId: note.senderContact?.profileId,
			isSuperAdmin: actor.isSuperAdmin,
		})
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You cannot manage this activity note.",
		});
	}
	return { actor, note, tags, channel: String(channel) };
}

async function createRevision(
	tx: TRPCContext["db"],
	input: {
		activityId: number;
		note: string | null;
		senderContactId: number;
		originalAuthorContactId: number;
		actorUserId: number;
		channel: string;
		action: "edited" | "deleted";
	},
) {
	const revision = await tx.notePad.create({
		data: {
			note: input.note,
			subject:
				input.action === "edited"
					? "Previous note version"
					: "Deleted note snapshot",
			headline:
				input.action === "edited"
					? "This note was replaced by a newer version."
					: "This note was soft-deleted and retained for audit.",
			senderContactId: input.senderContactId,
			tags: {
				createMany: {
					data: explodeTagEntries({
						type: "activity_note_revision",
						channel: input.channel,
						source: "system",
						revisionAction: input.action,
						revisionOf: input.activityId,
						originalAuthorContactId: input.originalAuthorContactId,
						changedByUserId: input.actorUserId,
					}),
				},
			},
		},
		select: { id: true },
	});
	await tx.noteComments.create({
		data: { notePadId: input.activityId, commentNotePadId: revision.id },
	});
	return revision.id;
}

export async function updateManualActivityNoteQuery(
	ctx: TRPCContext,
	input: { activityId: number; note: string },
) {
	const current = await getManageableNote(ctx, input.activityId);
	const nextNote = input.note.trim();
	if (!nextNote) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Note text is required.",
		});
	}
	return ctx.db.$transaction(async (tx) => {
		const revisionId = await createRevision(tx as TRPCContext["db"], {
			activityId: input.activityId,
			note: current.note.note,
			senderContactId: current.actor.contactId,
			originalAuthorContactId: current.note.senderContactId,
			actorUserId: current.actor.userId,
			channel: current.channel,
			action: "edited",
		});
		await tx.notePad.update({
			where: { id: input.activityId },
			data: { note: nextNote },
		});
		return { id: input.activityId, note: nextNote, revisionId };
	});
}

export async function deleteManualActivityNoteQuery(
	ctx: TRPCContext,
	input: { activityId: number },
) {
	const current = await getManageableNote(ctx, input.activityId);
	return ctx.db.$transaction(async (tx) => {
		const revisionId = await createRevision(tx as TRPCContext["db"], {
			activityId: input.activityId,
			note: current.note.note,
			senderContactId: current.actor.contactId,
			originalAuthorContactId: current.note.senderContactId,
			actorUserId: current.actor.userId,
			channel: current.channel,
			action: "deleted",
		});
		await tx.notePad.update({
			where: { id: input.activityId },
			data: { deletedAt: new Date() },
		});
		return { id: input.activityId, deleted: true, revisionId };
	});
}
