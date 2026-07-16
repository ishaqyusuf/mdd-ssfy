import type { Db, Prisma } from "@gnd/db";
import { getSubscriberAccount } from "./channel-subscribers";
import { channelsConfig, priorityStrings } from "./channels";

type DeliveryPreferenceInput = {
	emailEnabled?: boolean;
	inAppEnabled?: boolean;
	whatsappEnabled?: boolean;
};

function resolvePreference(
	preference: boolean | null | undefined,
	supported: boolean | null | undefined,
) {
	return preference ?? supported ?? false;
}

function supportedPreference(
	preference: boolean | undefined,
	supported: boolean | null | undefined,
) {
	return supported ? preference : false;
}

function supportsAnyVisibleDeliveryMethod(channel: {
	emailSupport?: boolean | null;
	inAppSupport?: boolean | null;
	whatsappSupport?: boolean | null;
}) {
	return Boolean(
		channel.emailSupport || channel.inAppSupport || channel.whatsappSupport,
	);
}

async function getUserNotificationAccess(
	db: Db,
	userId: number,
	channelId?: number,
) {
	const contact = await getSubscriberAccount(db, userId, "employee");
	if (!contact?.id) {
		return {
			contact: null,
			channelWhere: null,
		};
	}

	const roleRows = await db.modelHasRoles.findMany({
		where: {
			modelId: userId,
			deletedAt: null,
		},
		select: {
			roleId: true,
			role: {
				select: {
					name: true,
				},
			},
		},
	});
	const isSuperAdmin = roleRows.some(
		(role) => role.role?.name?.toLowerCase() === "super admin",
	);
	if (isSuperAdmin) {
		return {
			contact,
			channelWhere: {
				deletedAt: null,
				...(channelId ? { id: channelId } : {}),
			} satisfies Prisma.NoteChannelsWhereInput,
		};
	}

	const roleIds = roleRows.map((role) => role.roleId);
	const access: Prisma.NoteChannelsWhereInput[] = [
		{
			assignedUsers: {
				some: {
					notePadContactId: contact.id,
				},
			},
		},
	];

	if (roleIds.length) {
		access.push({
			noteChannelRoles: {
				some: {
					deletedAt: null,
					roleId: {
						in: roleIds,
					},
				},
			},
		});
	}

	return {
		contact,
		channelWhere: {
			deletedAt: null,
			...(channelId ? { id: channelId } : {}),
			OR: access,
		} satisfies Prisma.NoteChannelsWhereInput,
	};
}

export async function getUserNotificationChannelPreferences(
	db: Db,
	userId: number,
) {
	const { contact, channelWhere } = await getUserNotificationAccess(db, userId);
	if (!contact || !channelWhere) return [];

	const channels = await db.noteChannels.findMany({
		where: channelWhere,
		orderBy: {
			channelName: "asc",
		},
		select: {
			id: true,
			channelName: true,
			priority: true,
			emailSupport: true,
			inAppSupport: true,
			whatsappSupport: true,
			assignedUsers: {
				where: {
					notePadContactId: contact.id,
				},
				select: {
					id: true,
					emailEnabled: true,
					inAppEnabled: true,
					whatsappEnabled: true,
				},
			},
		},
	});

	return channels.filter(supportsAnyVisibleDeliveryMethod).map((channel) => {
		const config =
			channelsConfig[channel.channelName as keyof typeof channelsConfig];
		const preference = channel.assignedUsers[0];

		return {
			id: channel.id,
			name: channel.channelName,
			title:
				config?.name || channel.channelName.split("_").join(" ").toUpperCase(),
			description: config?.description,
			category: config?.category,
			priority: priorityStrings[(channel.priority || 1) - 1] || "Low",
			supports: {
				email: channel.emailSupport ?? false,
				inApp: channel.inAppSupport ?? false,
				whatsapp: channel.whatsappSupport ?? false,
			},
			preferences: {
				email: resolvePreference(
					preference?.emailEnabled,
					channel.emailSupport,
				),
				inApp: resolvePreference(preference?.inAppEnabled, channel.inAppSupport),
				whatsapp: resolvePreference(
					preference?.whatsappEnabled,
					channel.whatsappSupport,
				),
			},
		};
	});
}

export async function getUserInAppNotificationTypes(db: Db, userId: number) {
	const channels = await getUserNotificationChannelPreferences(db, userId);
	return channels
		.filter((channel) => channel.preferences.inApp)
		.map((channel) => channel.name);
}

export async function updateUserNotificationChannelPreference(
	db: Db,
	userId: number,
	channelId: number,
	preferences: DeliveryPreferenceInput,
) {
	const { contact, channelWhere } = await getUserNotificationAccess(
		db,
		userId,
		channelId,
	);
	if (!contact || !channelWhere) {
		throw new Error("Notification account not found.");
	}

	const channel = await db.noteChannels.findFirst({
		where: channelWhere,
		select: {
			id: true,
			emailSupport: true,
			inAppSupport: true,
			whatsappSupport: true,
			assignedUsers: {
				where: {
					notePadContactId: contact.id,
				},
				select: {
					id: true,
					emailEnabled: true,
					inAppEnabled: true,
					whatsappEnabled: true,
				},
			},
		},
	});
	if (!channel) {
		throw new Error("Notification channel not found.");
	}

	const existing = channel.assignedUsers[0];
	const data = {
		noteChannelId: channel.id,
		notePadContactId: contact.id,
		emailEnabled:
			supportedPreference(preferences.emailEnabled, channel.emailSupport) ??
			resolvePreference(existing?.emailEnabled, channel.emailSupport),
		inAppEnabled:
			supportedPreference(preferences.inAppEnabled, channel.inAppSupport) ??
			resolvePreference(existing?.inAppEnabled, channel.inAppSupport),
		whatsappEnabled:
			supportedPreference(preferences.whatsappEnabled, channel.whatsappSupport) ??
			resolvePreference(existing?.whatsappEnabled, channel.whatsappSupport),
	};

	if (existing) {
		return db.assignedUserNoteChannel.update({
			where: {
				id: existing.id,
			},
			data,
		});
	}

	return db.assignedUserNoteChannel.create({
		data,
	});
}
