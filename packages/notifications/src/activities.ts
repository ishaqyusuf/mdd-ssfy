import type { ContactRole, Db, NoteStatus } from "@gnd/db";
import type { UserData } from "./base";
import {
	getSubscriberAccount,
	getSubscribersAccount,
} from "./channel-subscribers";
import type { CreateActivityInput } from "./schemas";
import { explodeTagEntries, mergeTagRows } from "./tag-values";

export type CreateNoteInput = Omit<CreateActivityInput, "tags"> & {
	tags: {
		tagName: string;
		tagValue: string;
	}[];
};

function collectDocumentIds(tags: Record<string, unknown>) {
	const values = [tags.documentId, tags.documentIds].flatMap((value) =>
		Array.isArray(value) ? value : value === undefined ? [] : [value],
	);
	return Array.from(
		new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
	);
}

function normalizeDocument(document: {
	id: string;
	title: string | null;
	description: string | null;
	filename: string | null;
	url: string | null;
	pathname: string;
	mimeType: string | null;
	extension: string | null;
	size: number | null;
	createdAt: Date | null;
}) {
	return {
		id: document.id,
		title: document.title || document.filename || "Untitled document",
		description: document.description,
		filename: document.filename,
		url: document.url,
		pathname: document.pathname,
		mimeType: document.mimeType,
		extension: document.extension,
		size: document.size,
		createdAt: document.createdAt,
	};
}

// const activityTypes = ["sales_checkout_success"] as const;
const activityStatus = [] as const;
// type CreateActivityParams = {
//   //   teamId: string;
//   userId?: number;
//   type: (typeof activityTypes)[number];
//   source: "system" | "user";
//   // status?: (typeof activityStatus)[number];
//   priority?: number;
//   groupId?: string;
//   tags: Record<string, any>;
// };
export async function createNote(
	db: Db,
	data: CreateNoteInput,
	authId: number,
) {
	const authorId = (await getSubscribersAccount(db, [authId]))?.[0]?.id;
	const tags = Object.fromEntries(
		data.tags.map((t) => [t.tagName, t.tagValue]),
	);
	return createActivity(
		db,
		{
			...data,
			tags,
		},
		authorId,
	);
}
export async function createActivity(
	db: Db,
	params: CreateActivityInput,
	authorId?: number,
	recipientIds?: number[],
) {
	const tags = {
		...params.tags,
		channel: params.type,
		source: params.source,
		// priority: params.priority,
		// sendEmail: params.sendEmail,
	};

	const activity = await db.notePad.create({
		data: {
			subject: params.subject,
			headline: params.headline,
			color: params.color,
			note: params.note,
			senderContact: {
				connect: {
					id: authorId,
				},
			},
			recipients: !recipientIds?.length
				? undefined
				: {
						createMany: {
							data: recipientIds.map((notePadContactId) => ({
								notePadContactId,
								status: "unread",
							})),
						},
						// connect: recipientIds?.map((contactId) => ({
						//   id: contactId,
						// })),
					},
			tags: {
				createMany: {
					data: explodeTagEntries(tags),
				},
			},
		},
	});
	return activity;
}

export async function appendActivityTags(
	db: Db,
	notePadId: number,
	tags: Record<string, unknown>,
) {
	const entries = explodeTagEntries(tags);
	if (!entries.length) {
		return db.notePad.findUnique({
			where: { id: notePadId },
			include: { tags: true },
		});
	}

	const existing = await db.noteTags.findMany({
		where: {
			notePadId,
			deletedAt: null,
			OR: entries.map((entry) => ({
				tagName: entry.tagName,
				tagValue: entry.tagValue,
			})),
		},
		select: {
			tagName: true,
			tagValue: true,
		},
	});

	const existingKeys = new Set(
		existing.map((entry) => `${entry.tagName}::${entry.tagValue}`),
	);
	const createData = entries
		.filter((entry) => !existingKeys.has(`${entry.tagName}::${entry.tagValue}`))
		.map((entry) => ({
			...entry,
			notePadId,
		}));

	if (createData.length) {
		await db.noteTags.createMany({
			data: createData,
		});
	}

	return db.notePad.findUnique({
		where: { id: notePadId },
		include: { tags: true },
	});
}
export type GetActivitiesParams = {
	contactIds: number[];
	status?: NoteStatus[];
	pageSize?: number;
	cursor?: string | null;
	type?: string | null;
	types?: string[] | null;
};

export type ActivityTypeSummary = {
	type: string;
	title: string;
	count: number;
	latestAt: Date | null;
};

function normalizeActivityType(type?: string | null) {
	const trimmed = type?.trim();
	const normalized =
		trimmed?.startsWith('"') && trimmed.endsWith('"')
			? (() => {
					try {
						const parsed = JSON.parse(trimmed);
						return typeof parsed === "string" ? parsed.trim() : trimmed;
					} catch {
						return trimmed;
					}
				})()
			: trimmed;
	return normalized || null;
}

function activityTypeTagValues(values: string[]) {
	return Array.from(
		new Set(values.flatMap((value) => [value, JSON.stringify(value)])),
	);
}

function parseActivityType(
	tags: Record<string, unknown>,
	allowedTypes?: string[] | null,
) {
	const channel = typeof tags.channel === "string" ? tags.channel : null;
	const type = typeof tags.type === "string" ? tags.type : null;
	const normalizedAllowedTypes = allowedTypes
		?.map((item) => normalizeActivityType(item))
		.filter((item): item is string => !!item);

	if (normalizedAllowedTypes?.length) {
		const normalizedChannel = normalizeActivityType(channel);
		if (
			normalizedChannel &&
			normalizedAllowedTypes.includes(normalizedChannel)
		) {
			return normalizedChannel;
		}

		const normalizedType = normalizeActivityType(type);
		if (normalizedType && normalizedAllowedTypes.includes(normalizedType)) {
			return normalizedType;
		}
	}

	return normalizeActivityType(type) ?? normalizeActivityType(channel);
}

export function formatActivityTypeTitle(type: string) {
	return type
		.split(/[_\-\s]+/)
		.filter(Boolean)
		.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
		.join(" ");
}

function getActivityRecipientWhere(contactIds: number[], status?: NoteStatus[]) {
	return {
		deletedAt: null,
		notePadContactId: {
			in: contactIds,
		},
		...(status?.length ? { status: { in: status } } : {}),
	};
}

function getActivityTypeWhere(type?: string | null, types?: string[] | null) {
	const normalizedType = normalizeActivityType(type);
	const normalizedTypes = types
		?.map((item) => normalizeActivityType(item))
		.filter((item): item is string => !!item);
	const rawTypeValues = normalizedType
		? normalizedTypes
			? normalizedTypes.includes(normalizedType)
				? [normalizedType]
				: []
			: [normalizedType]
		: normalizedTypes;

	if (!rawTypeValues?.length) {
		return {};
	}
	const typeValues = activityTypeTagValues(rawTypeValues);

	return {
		tags: {
			some: {
				deletedAt: null,
				OR: [
					{ tagName: "type", tagValue: { in: typeValues } },
					{ tagName: "channel", tagValue: { in: typeValues } },
				],
			},
		},
	};
}

function isActivityTypeDisabled(type?: string | null, types?: string[] | null) {
	const normalizedType = normalizeActivityType(type);
	const normalizedTypes = types
		?.map((item) => normalizeActivityType(item))
		.filter((item): item is string => !!item);

	return (
		!!normalizedTypes &&
		(normalizedTypes.length === 0 ||
			(!!normalizedType && !normalizedTypes.includes(normalizedType)))
	);
}

function getActivitiesWhere(
	params: Pick<GetActivitiesParams, "contactIds" | "status" | "type" | "types">,
) {
	return {
		deletedAt: null,
		recipients: {
			some: getActivityRecipientWhere(params.contactIds, params.status),
		},
		...getActivityTypeWhere(params.type, params.types),
	};
}

export async function getActivties(db: Db, params: GetActivitiesParams) {
	const pageSize = Math.max(1, Math.min(params.pageSize ?? 20, 100));
	const offset = Math.max(0, Number(params.cursor ?? 0) || 0);
	if (isActivityTypeDisabled(params.type, params.types)) {
		return {
			data: [],
			meta: {
				count: 0,
				size: pageSize,
				cursor: null,
			},
		};
	}

	const where = getActivitiesWhere(params);

	const [activities, count] = await Promise.all([
		db.notePad.findMany({
			where,
			orderBy: {
				createdAt: "desc",
			},
			skip: offset,
			take: pageSize,
			select: {
				id: true,
				createdAt: true,
				subject: true,
				headline: true,
				color: true,
				note: true,
				senderContact: {
					select: {
						id: true,
						// name: true,
						// email: true,
					},
				},
				tags: {
					where: {
						deletedAt: null,
					},
					select: {
						tagName: true,
						tagValue: true,
					},
				},
				recipients: {
					where: {
						deletedAt: null,
						notePadContactId: {
							in: params.contactIds,
						},
					},
					select: {
						status: true,
						notePadContactId: true,
					},
				},
			},
		}),
		db.notePad.count({ where }),
	]);

	const mergedActivities = activities.map(
		({ tags, recipients, ...activity }) => ({
			...activity,
			receipt: recipients[0],
			tags: mergeTagRows(tags),
		}),
	);

	const allDocumentIds = Array.from(
		new Set(
			mergedActivities.flatMap((activity) => collectDocumentIds(activity.tags)),
		),
	);

	const documents =
		allDocumentIds.length === 0
			? []
			: await db.storedDocument.findMany({
					where: {
						id: {
							in: allDocumentIds,
						},
						deletedAt: null,
					},
					select: {
						id: true,
						title: true,
						description: true,
						filename: true,
						url: true,
						pathname: true,
						mimeType: true,
						extension: true,
						size: true,
						createdAt: true,
					},
				});

	const documentsById = new Map(
		documents.map((document) => [document.id, normalizeDocument(document)]),
	);

	return {
		data: mergedActivities.map((activity) => {
			const documentIds = collectDocumentIds(activity.tags);
			return {
				...activity,
				documents: documentIds
					.map((id) => documentsById.get(id))
					.filter(Boolean),
			};
		}),
		meta: {
			count,
			size: pageSize,
			cursor:
				offset + activities.length < count
					? String(offset + activities.length)
					: null,
		},
	};
}

export async function getActivityCount(
	db: Db,
	params: Pick<GetActivitiesParams, "contactIds" | "status" | "type" | "types">,
) {
	if (isActivityTypeDisabled(params.type, params.types)) {
		return 0;
	}

	return db.notePad.count({
		where: getActivitiesWhere(params),
	});
}

export async function getActivityTypeSummaries(
	db: Db,
	params: Pick<GetActivitiesParams, "contactIds" | "status" | "types">,
): Promise<ActivityTypeSummary[]> {
	if (params.types && params.types.length === 0) {
		return [];
	}

	const activities = await db.notePad.findMany({
		where: {
			deletedAt: null,
			recipients: {
				some: getActivityRecipientWhere(params.contactIds, params.status),
			},
			...getActivityTypeWhere(null, params.types),
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			createdAt: true,
			tags: {
				where: {
					deletedAt: null,
					tagName: {
						in: ["type", "channel"],
					},
				},
				select: {
					tagName: true,
					tagValue: true,
				},
			},
		},
	});

	const summariesByType = new Map<string, ActivityTypeSummary>();

	for (const activity of activities) {
		const type = parseActivityType(mergeTagRows(activity.tags), params.types);
		if (!type) continue;

		const summary = summariesByType.get(type);
		if (summary) {
			summary.count += 1;
			continue;
		}

		summariesByType.set(type, {
			type,
			title: formatActivityTypeTitle(type),
			count: 1,
			latestAt: activity.createdAt,
		});
	}

	return Array.from(summariesByType.values()).sort((a, b) => {
		const aTime = a.latestAt?.getTime() ?? 0;
		const bTime = b.latestAt?.getTime() ?? 0;
		return bTime - aTime;
	});
}

type ContactLookupInput = {
	id?: number;
	email?: string | null;
	name?: string | null;
	phoneNo?: string | null;
};

export const getContactsByUserIds = async (
	db: Db,
	userIdType: ContactRole,
	userIds: number[],
) => {
	const isCustomer = userIdType === "customer";
	const recipients = isCustomer
		? (
				await db.customers.findMany({
					where: {
						id: {
							in: userIds,
						},
					},
					select: {
						id: true,
						email: true,
						name: true,
						phoneNo: true,
						businessName: true,
					},
				})
			)?.map(({ id, email, name, phoneNo, businessName }) => ({
				id,
				email,
				name: businessName || name,
				phoneNo,
			}))
		: await db.users.findMany({
				where: {
					id: {
						in: userIds,
					},
				},
				select: {
					id: true,
					email: true,
					name: true,
					phoneNo: true,
				},
			});
	return await Promise.all(
		recipients.map(async (recipient) => {
			const contact = await getContact(db, recipient);
			return contact;
		}),
	);
};
export const getContactIdsByUserIds = async (
	db: Db,
	// isCustomer: boolean,
	userIdType: ContactRole,
	userIds: number[],
) => {
	const contacts = await getContactsByUserIds(db, userIdType, userIds);
	return contacts.map((contact) => contact.id);
};
export const getContact = async (
	db: Db,
	{ email, name, phoneNo, id }: ContactLookupInput,
	role: ContactRole = "employee",
): Promise<UserData> => {
	if (!id) {
		throw new Error("Contact profile id is required");
	}

	return (await getSubscriberAccount(db, id, role)) as UserData;
};
export const getContactId = async (
	db: Db,
	{ email, name, phoneNo }: { email: string; name?: string; phoneNo?: string },
) => {
	return (await getContact(db, { email, name, phoneNo }))?.id;
};

export async function updateActivityStatus(
	db: Db,
	activityId: number,
	status: NoteStatus,
	notePadContactId: number,
) {
	return db.noteRecipients.updateMany({
		where: {
			notePadId: activityId,
			notePadContactId,
			deletedAt: null,
		},
		data: {
			status,
		},
	});
}
export async function updateAllActivitiesStatus(
	db: Db,
	input: {
		notePadContactId: number;
		status: NoteStatus;
		fromStatus?: NoteStatus[];
	},
) {
	return db.noteRecipients.updateMany({
		where: {
			notePadContactId: input.notePadContactId,
			deletedAt: null,
			...(input.fromStatus?.length
				? {
						status: {
							in: input.fromStatus,
						},
					}
				: {}),
		},
		data: {
			status: input.status,
		},
	});
}

export type UpdateActivityMetadataParams = {
	activityId: string;
	//   teamId: string;
	metadata: Record<string, unknown>;
};
export async function updateActivityMetadata(
	db: Db,
	params: UpdateActivityMetadataParams,
) {
	return true;
}

export async function shouldSendNotification(
	db: Db,
	contactId: number,
	notificationType: string,
	channel: "email" | "inbox" | "in_app",
) {
	return true;
}
export async function getChannelSubcribers(
	db: Db,
	channelName: string,
): Promise<UserData[]> {
	const channel = await db.noteChannels.findFirst({
		where: {
			channelName,
		},
		select: {
			assignedUsers: {
				select: {
					id: true,
					contact: {
						select: {
							id: true,
							// email: true,
							// name: true,
							profileId: true,
						},
					},
				},
			},
			noteChannelRoles: {
				select: {
					role: {
						select: {
							id: true,
						},
					},
				},
			},
		},
	});
	// get all users in roles that have access to the channel.
	const users = await db.users.findMany({
		where: {
			roles: {
				some: {
					roleId: {
						in: (
							channel?.noteChannelRoles.map((ncr) => ncr.role?.id) || []
						).filter((id): id is number => !!id),
					},
				},
			},
		},
		select: {
			id: true,
			email: true,
			name: true,
			phoneNo: true,
		},
	});
	const contacts = [
		...(channel?.assignedUsers.map((au) => au.contact) || []),
		...(await db.notePadContacts.findMany({
			where: {
				profileId: {
					in: users.map((u) => u.id),
				},
				role: "employee",
			},
			select: {
				id: true,
				// email: true,
				// name: true,
				profileId: true,
			},
		})),
	];
	const usersWithNoContact = users.filter(
		(user) => !contacts.some((contact) => contact?.profileId === user.id),
	);
	const contactsFromUsersWithNoContact = await Promise.all(
		usersWithNoContact.map(async (user) => {
			return await getContact(
				db,
				{
					email: user.email,
					name: user.name ?? user.email,
					id: user.id,
					phoneNo: user.phoneNo ?? undefined,
				},
				"employee",
			);
		}),
	);
	return [...contacts, ...contactsFromUsersWithNoContact].filter(
		Boolean,
	) as UserData[];
}
