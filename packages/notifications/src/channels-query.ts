import type { Db, Prisma } from "@gnd/db";
import {
	type ChannelName,
	channelNames,
	channelsConfig,
	priorityStrings,
} from "./channels";
import type { GetNotificationChannelsSchema } from "./schemas";

import { composeQuery, composeQueryData } from "@gnd/utils/query-response";

function isBuiltInChannel(channelName: string): channelName is ChannelName {
	return channelNames.includes(channelName as ChannelName);
}

async function getChannelSyncPlan(db: Db) {
	const channels = await db.noteChannels.findMany({
		select: {
			channelName: true,
			deletedAt: true,
		},
		orderBy: {
			channelName: "asc",
		},
	});

	const activeChannels = channels.filter((c) => !c.deletedAt);
	const newChannels = channelNames.filter(
		(cn) => !activeChannels.some((c) => c.channelName === cn),
	);
	const channelsToCreate = newChannels.filter(
		(cn) => !channels.some((c) => c.channelName === cn),
	);
	const channelsToRestore = newChannels.filter((cn) =>
		channels.some((c) => c.channelName === cn && !!c.deletedAt),
	);

	return {
		channelsToCreate,
		channelsToRestore,
		shouldUpdate: channelsToCreate.length > 0 || channelsToRestore.length > 0,
	};
}

export async function syncChannels(db: Db) {
	const syncPlan = await getChannelSyncPlan(db);

	if (syncPlan.channelsToRestore.length) {
		await db.noteChannels.updateMany({
			where: {
				channelName: {
					in: syncPlan.channelsToRestore,
				},
			},
			data: {
				deletedAt: null,
			},
		});
	}

	if (syncPlan.channelsToCreate.length) {
		await db.noteChannels.createMany({
			data: syncPlan.channelsToCreate.map((cn) => ({
				channelName: cn,
				priority: channelsConfig[cn]?.priority || 5,
			})),
			skipDuplicates: true,
		});
	}

	return {
		...syncPlan,
		updated:
			syncPlan.channelsToCreate.length + syncPlan.channelsToRestore.length,
	};
}

export async function getChannels(
	db: Db,
	query: GetNotificationChannelsSchema,
) {
	const syncPlan =
		!query.id && !query.name && !query.q ? await getChannelSyncPlan(db) : null;

	const { response, searchMeta, where } = await composeQueryData(
		query,
		whereNotificationChannels(query),
		db.noteChannels,
	);

	const pagedChannels = await db.noteChannels.findMany({
		where,
		orderBy: {
			channelName: "asc",
		},
		skip: searchMeta.skip,
		take: searchMeta.take,
		select: {
			id: true,
			channelName: true,
			priority: true,
			textSupport: true,
			emailSupport: true,
			whatsappSupport: true,
			assignedUsers: {
				select: {
					id: true,
					contact: {
						select: {
							profileId: true,
						},
					},
				},
			},
			inAppSupport: true,
			noteChannelRoles: {
				select: {
					role: {
						select: {
							name: true,
							id: true,
						},
					},
				},
			},
			deletedAt: true,
		},
	});

	const result = response(
		pagedChannels.map((c) => {
			const config =
				channelsConfig[c.channelName as keyof typeof channelsConfig];
			return {
				id: c.id,
				priority: priorityStrings[(c.priority || 1) - 1] || "Low",
				name: c.channelName,
				deletable: !isBuiltInChannel(c.channelName),
				title:
					config?.name ||
					c.channelName.split("_").join(" ").toLocaleUpperCase(),
				description: config?.description,
				category: config?.category,
				// status: config?.published ? "Published" : "Draft",
				published: !!config?.published,
				textSupport: c.textSupport,
				emailSupport: c.emailSupport,
				whatsappSupport: c.whatsappSupport,
				inAppSupport: c.inAppSupport,
				roles: c.noteChannelRoles
					.map((ncr) => ncr.role?.name)
					.filter((r): r is string => !!r),
				subscriberIds:
					c.assignedUsers
						?.map((uc) => uc.contact?.profileId)
						.filter((id): id is number => !!id) || [],
			};
		}),
	);

	return {
		...result,
		meta: {
			...result.meta,
			staticUpdateChecker: !!syncPlan?.shouldUpdate,
		},
	};
}
function whereNotificationChannels(query: GetNotificationChannelsSchema) {
	const where: Prisma.NoteChannelsWhereInput[] = [];
	for (const [k, v] of Object.entries(query)) {
		if (!v) continue;
		switch (k as keyof GetNotificationChannelsSchema) {
			case "name":
			case "q":
				where.push({
					channelName: {
						contains: String(v),
					},
				});
				break;
			case "id":
				where.push({
					id: Number(v),
				});
				break;
		}
	}
	return composeQuery(where);
}
