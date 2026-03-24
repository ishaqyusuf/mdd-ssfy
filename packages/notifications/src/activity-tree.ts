import type { Db, NoteStatus } from "@gnd/db";
import type { NoteTagNames } from "@gnd/utils/constants";
import { channelNames } from "./channels";
import type {
	DispatchPackingDelayTags,
	EmployeeDocumentReviewTags,
	JobApprovedTags,
	JobAssignedTags,
	JobDeletedTags,
	JobPaymentSentTags,
	JobRejectedTags,
	JobReviewRequestedTags,
	JobSubmittedTags,
	JobTaskConfiguredTags,
	JobTaskConfigureRequestTags,
	SalesCheckoutSuccessTags,
	SalesDispatchAssignedTags,
	SalesDispatchCancelledTags,
	SalesDispatchCompletedTags,
	SalesDispatchDateUpdatedTags,
	SalesDispatchDuplicateAlertTags,
	SalesDispatchInProgressTags,
	SalesDispatchInfoTags,
	SalesDispatchPackedTags,
	SalesDispatchPackingResetTags,
	SalesDispatchQueuedTags,
	SalesDispatchTripCanceledTags,
	SalesDispatchUnassignedTags,
	SalesEmailReminderTags,
	SalesInfoTags,
	SalesItemInfoTags,
	SalesMarkedAsProductionCompletedTags,
	SalesPaymentRecordedTags,
	SalesPaymentRefundedTags,
	SalesReminderScheduleAdminNotificationTags,
	SalesRequestPackingTags,
	SimpleSalesEmailReminderTags,
} from "./schemas";
import {
	deserializeTagValue,
	mergeTagRows,
	serializeTagValue,
} from "./tag-values";

type KeysOfUnion<T> = T extends T ? keyof T : never;

type KnownNotificationActivityTags =
	| DispatchPackingDelayTags
	| EmployeeDocumentReviewTags
	| JobApprovedTags
	| JobAssignedTags
	| JobDeletedTags
	| JobPaymentSentTags
	| JobRejectedTags
	| JobReviewRequestedTags
	| JobSubmittedTags
	| JobTaskConfiguredTags
	| JobTaskConfigureRequestTags
	| SalesCheckoutSuccessTags
	| SalesDispatchAssignedTags
	| SalesDispatchCancelledTags
	| SalesDispatchCompletedTags
	| SalesDispatchDateUpdatedTags
	| SalesDispatchDuplicateAlertTags
	| SalesDispatchInProgressTags
	| SalesDispatchInfoTags
	| SalesDispatchPackedTags
	| SalesDispatchPackingResetTags
	| SalesDispatchQueuedTags
	| SalesDispatchTripCanceledTags
	| SalesDispatchUnassignedTags
	| SalesEmailReminderTags
	| SalesInfoTags
	| SalesItemInfoTags
	| SalesMarkedAsProductionCompletedTags
	| SalesPaymentRecordedTags
	| SalesPaymentRefundedTags
	| SalesReminderScheduleAdminNotificationTags
	| SalesRequestPackingTags
	| SimpleSalesEmailReminderTags;

export type ActivityTagName =
	| NoteTagNames
	| Extract<KeysOfUnion<KnownNotificationActivityTags>, string>;

export type ActivityTagFilter =
	| {
			tagName: ActivityTagName;
			tagValue: unknown;
	  }
	| {
			tagName: ActivityTagName;
			tagValues: unknown[];
	  }
	| {
			tagNames: ActivityTagName[];
			tagValue: unknown;
	  }
	| {
			tagNames: ActivityTagName[];
			tagValues: unknown[];
	  };

export type ActivityTagFilterNode =
	| ActivityTagFilter
	| {
			op: "and" | "or";
			filters: ActivityTagFilterNode[];
	  };

export type GetActivityTreeQuery = {
	contactIds?: number[];
	status?: NoteStatus[];
	tagFilters?: ActivityTagFilter[];
	tagFilterMode?: "all" | "any";
	filter?: ActivityTagFilterNode;
	pageSize?: number;
	includeChildren?: boolean;
	maxDepth?: number;
};

export type ActivityTreeNode = {
	id: number;
	createdAt: Date | null;
	subject: string | null;
	headline: string | null;
	description: string | null;
	note: string | null;
	senderContactId: number | null;
	senderContactName: string | null;
	receipt?: {
		status?: NoteStatus | null;
		notePadContactId?: number | null;
	} | null;
	tags: Record<string, unknown>;
	children: ActivityTreeNode[];
};

export type ActivityTagSuggestion = {
	tagName: string;
	values: unknown[];
};

export type GetActivityTagSuggestionsQuery = {
	contactIds?: number[];
	status?: NoteStatus[];
	tagFilters?: ActivityTagFilter[];
	tagFilterMode?: "all" | "any";
	filter?: ActivityTagFilterNode;
	channels?: string[];
	tagName?: string;
	q?: string;
	limitPerTag?: number;
	maxRows?: number;
};

export function activityTag(tagName: ActivityTagName, tagValue: unknown) {
	return { tagName, tagValue } as const;
}

export function activityTagIn(tagName: ActivityTagName, tagValues: unknown[]) {
	return { tagName, tagValues } as const;
}

export function activityAnyTag(
	tagNames: ActivityTagName[],
	tagValue: unknown,
) {
	return { tagNames, tagValue } as const;
}

export function activityAnyTagIn(
	tagNames: ActivityTagName[],
	tagValues: unknown[],
) {
	return { tagNames, tagValues } as const;
}

export function activityAnd(filters: ActivityTagFilterNode[]) {
	return { op: "and", filters } as const;
}

export function activityOr(filters: ActivityTagFilterNode[]) {
	return { op: "or", filters } as const;
}

function mapActivity(row: {
	id: number;
	createdAt: Date | null;
	subject: string | null;
	headline: string | null;
	note: string | null;
	senderContact: {
		id: number;
		name: string | null;
		role: "employee" | "customer" | null;
		profileId: number | null;
	} | null;
	recipients: { status: NoteStatus | null; notePadContactId: number }[];
	tags: { tagName: string; tagValue: string }[];
	senderContactName?: string | null;
}): ActivityTreeNode {
	const tags = mergeTagRows(row.tags);
	const descriptionFromTag =
		typeof tags.description === "string" ? tags.description : null;
	const tagAuthorName =
		typeof tags.authorContactName === "string"
			? tags.authorContactName
			: typeof tags.authorName === "string"
				? tags.authorName
				: typeof tags.author === "string"
					? tags.author
					: typeof tags.requestedByName === "string"
						? tags.requestedByName
						: null;

	return {
		id: row.id,
		createdAt: row.createdAt ?? null,
		subject: row.subject ?? null,
		headline: row.headline ?? null,
		description: descriptionFromTag,
		note: row.note ?? null,
		senderContactId: row.senderContact?.id ?? null,
		senderContactName:
			row.senderContactName ?? row.senderContact?.name ?? tagAuthorName,
		receipt: row.recipients?.[0] ?? null,
		tags,
		children: [],
	};
}

type ActivityRow = {
	id: number;
	createdAt: Date | null;
	subject: string | null;
	headline: string | null;
	note: string | null;
	senderContact: {
		id: number;
		name: string | null;
		role: "employee" | "customer" | null;
		profileId: number | null;
	} | null;
	recipients: { status: NoteStatus | null; notePadContactId: number }[];
	tags: { tagName: string; tagValue: string }[];
};

async function attachSenderNames(db: Db, rows: ActivityRow[]) {
	const employeeIds = Array.from(
		new Set(
			rows
				.map((row) =>
					row.senderContact?.role === "employee"
						? row.senderContact.profileId
						: null,
				)
				.filter((id): id is number => typeof id === "number"),
		),
	);
	const customerIds = Array.from(
		new Set(
			rows
				.map((row) =>
					row.senderContact?.role === "customer"
						? row.senderContact.profileId
						: null,
				)
				.filter((id): id is number => typeof id === "number"),
		),
	);

	const [employees, customers] = await Promise.all([
		employeeIds.length
			? db.users.findMany({
					where: { id: { in: employeeIds }, deletedAt: null },
					select: { id: true, name: true },
				})
			: Promise.resolve([]),
		customerIds.length
			? db.customers.findMany({
					where: { id: { in: customerIds }, deletedAt: null },
					select: { id: true, name: true, businessName: true },
				})
			: Promise.resolve([]),
	]);

	const employeeNameMap = new Map<number, string | null>(
		employees.map(
			(employee): [number, string | null] => [employee.id, employee.name],
		),
	);
	const customerNameMap = new Map<number, string | null>(
		customers.map(
			(customer): [number, string | null] => [
				customer.id,
				customer.businessName || customer.name,
			],
		),
	);

	return rows.map((row) => {
		const sender = row.senderContact;
		let senderContactName = sender?.name ?? null;

		if (sender?.role === "employee" && sender.profileId) {
			senderContactName =
				employeeNameMap.get(sender.profileId) || senderContactName;
		}
		if (sender?.role === "customer" && sender.profileId) {
			senderContactName =
				customerNameMap.get(sender.profileId) || senderContactName;
		}

		return {
			...row,
			senderContactName,
		};
	});
}

function isGroupFilter(
	filter: ActivityTagFilterNode,
): filter is Extract<ActivityTagFilterNode, { op: "and" | "or" }> {
	return "op" in filter;
}

function buildSingleTagClause(tagName: ActivityTagName, tagValue: unknown) {
	return {
		tags: {
			some: {
				tagName,
				tagValue: serializeTagValue(tagValue),
			},
		},
	};
}

function buildSingleTagInClause(
	tagName: ActivityTagName,
	tagValues: unknown[],
) {
	return {
		tags: {
			some: {
				tagName,
				tagValue: {
					in: tagValues.map((value) => serializeTagValue(value)),
				},
			},
		},
	};
}

function buildLeafTagWhereClause(filter: ActivityTagFilter) {
	if ("tagName" in filter && "tagValue" in filter) {
		return buildSingleTagClause(filter.tagName, filter.tagValue);
	}

	if ("tagName" in filter && "tagValues" in filter) {
		return buildSingleTagInClause(filter.tagName, filter.tagValues);
	}

	if ("tagNames" in filter && "tagValue" in filter) {
		return {
			OR: filter.tagNames.map((tagName) =>
				buildSingleTagClause(tagName, filter.tagValue),
			),
		};
	}

	return {
		OR: filter.tagNames.map((tagName) =>
			buildSingleTagInClause(tagName, filter.tagValues),
		),
	};
}

function buildTagWhereClause(
	filter?: ActivityTagFilterNode,
	tagFilters?: ActivityTagFilter[],
	tagFilterMode: "all" | "any" = "all",
) {
	const normalizedFilter =
		filter ??
		(tagFilters?.length
			? {
					op: tagFilterMode === "any" ? "or" : "and",
					filters: tagFilters,
				}
			: undefined);

	if (!normalizedFilter) return undefined;

	if (!isGroupFilter(normalizedFilter)) {
		return buildLeafTagWhereClause(normalizedFilter);
	}

	const clauses = normalizedFilter.filters
		.map((child) => buildTagWhereClause(child))
		.filter(Boolean);

	if (!clauses.length) return undefined;

	return normalizedFilter.op === "or" ? { OR: clauses } : { AND: clauses };
}

function buildChannelTagWhere(channels?: string[]) {
	const values = (channels?.length ? channels : [...channelNames]).map((name) =>
		serializeTagValue(name),
	);
	return {
		tags: {
			some: {
				tagName: "channel",
				tagValue: {
					in: values,
				},
			},
		},
	};
}

function createRecipientsWhere(query: GetActivityTreeQuery) {
	if (!query.contactIds?.length && !query.status?.length) return undefined;

	return {
		some: {
			...(query.contactIds?.length
				? {
						notePadContactId: {
							in: query.contactIds,
						},
					}
				: {}),
			...(query.status?.length ? { status: { in: query.status } } : {}),
		},
	};
}

async function fetchActivitiesByIds(
	db: Db,
	ids: number[],
	query: GetActivityTreeQuery,
) {
	if (!ids.length) return [];

	const recipientsWhere = query.contactIds?.length
		? {
				notePadContactId: {
					in: query.contactIds,
				},
				...(query.status?.length ? { status: { in: query.status } } : {}),
			}
		: {
				...(query.status?.length ? { status: { in: query.status } } : {}),
			};

	const rows = await db.notePad.findMany({
		where: {
			id: { in: ids },
		},
		select: {
			id: true,
			createdAt: true,
			subject: true,
			headline: true,
			note: true,
			senderContact: {
				select: {
					id: true,
					name: true,
					role: true,
					profileId: true,
				},
			},
			tags: {
				select: {
					tagName: true,
					tagValue: true,
				},
			},
			recipients: {
				where: recipientsWhere,
				select: {
					status: true,
					notePadContactId: true,
				},
			},
		},
	});

	return attachSenderNames(db, rows);
}

export async function getActivityTree(db: Db, query: GetActivityTreeQuery) {
	const tagFilterMode = query.tagFilterMode ?? "all";
	const pageSize = query.pageSize ?? 50;
	const includeChildren = query.includeChildren ?? true;
	const maxDepth = query.maxDepth ?? 4;

	const recipientsWhere = createRecipientsWhere(query);
	const tagWhere = buildTagWhereClause(
		query.filter,
		query.tagFilters,
		tagFilterMode,
	);
	const channelWhere = buildChannelTagWhere();

	const rootRows = await db.notePad.findMany({
		where: {
			...channelWhere,
			...(recipientsWhere ? { recipients: recipientsWhere } : {}),
			...(tagWhere || {}),
		},
		orderBy: {
			createdAt: "desc",
		},
		take: pageSize,
		select: {
			id: true,
			createdAt: true,
			subject: true,
			headline: true,
			note: true,
			senderContact: {
				select: {
					id: true,
					name: true,
					role: true,
					profileId: true,
				},
			},
			tags: {
				select: {
					tagName: true,
					tagValue: true,
				},
			},
			recipients: {
				where: query.contactIds?.length
					? {
							notePadContactId: {
								in: query.contactIds,
							},
							...(query.status?.length
								? { status: { in: query.status } }
								: {}),
						}
					: {
							...(query.status?.length
								? { status: { in: query.status } }
								: {}),
						},
				select: {
					status: true,
					notePadContactId: true,
				},
			},
		},
	});
	const rootRowsWithNames = await attachSenderNames(db, rootRows);

	const rootIds = rootRowsWithNames.map((row) => row.id);
	const nodes = new Map<number, ActivityTreeNode>(
		rootRowsWithNames.map((row) => [row.id, mapActivity(row)]),
	);

	if (!includeChildren || !rootIds.length) {
		return {
			data: rootIds.map((id) => nodes.get(id)!).filter(Boolean),
		};
	}

	const links: Array<{ parentId: number; childId: number }> = [];
	const visited = new Set<number>(rootIds);
	let frontier = [...rootIds];
	let depth = 0;

	while (frontier.length && depth < maxDepth) {
		const commentLinks = await db.noteComments.findMany({
			where: {
				notePadId: { in: frontier },
				commentNotePadId: { not: null },
			},
			select: {
				notePadId: true,
				commentNotePadId: true,
			},
		});

		if (!commentLinks.length) break;

		for (const row of commentLinks) {
			if (!row.notePadId || !row.commentNotePadId) continue;
			links.push({
				parentId: row.notePadId,
				childId: row.commentNotePadId,
			});
		}

		const nextIds = Array.from(
			new Set(
				commentLinks
					.map((row) => row.commentNotePadId)
					.filter((id): id is number => !!id),
			),
		);
		const unseenIds = nextIds.filter((id) => !visited.has(id));

		if (unseenIds.length) {
			const childRows = await fetchActivitiesByIds(db, unseenIds, query);
			for (const row of childRows) {
				nodes.set(row.id, mapActivity(row));
				visited.add(row.id);
			}
		}

		frontier = nextIds;
		depth += 1;
	}

	for (const link of links) {
		const parent = nodes.get(link.parentId);
		const child = nodes.get(link.childId);
		if (!parent || !child) continue;
		if (parent.children.some((existing) => existing.id === child.id)) continue;
		parent.children.push(child);
	}

	return {
		data: rootIds.map((id) => nodes.get(id)!).filter(Boolean),
	};
}

export async function getActivityTagSuggestions(
	db: Db,
	query: GetActivityTagSuggestionsQuery,
) {
	const tagFilterMode = query.tagFilterMode ?? "all";
	const limitPerTag = query.limitPerTag ?? 20;
	const maxRows = query.maxRows ?? 3000;
	const q = query.q?.trim();

	const recipientsWhere = createRecipientsWhere(query);
	const tagWhere = buildTagWhereClause(
		query.filter,
		query.tagFilters,
		tagFilterMode,
	);
	const channelWhere = buildChannelTagWhere(query.channels);

	const rows = await db.noteTags.findMany({
		where: {
			...(query.tagName ? { tagName: query.tagName } : {}),
			...(q
				? {
						OR: [
							{
								tagName: {
									contains: q,
								},
							},
							{
								tagValue: {
									contains: q,
								},
							},
						],
					}
				: {}),
			notePad: {
				is: {
					...channelWhere,
					...(recipientsWhere ? { recipients: recipientsWhere } : {}),
					...(tagWhere || {}),
				},
			},
		},
		select: {
			tagName: true,
			tagValue: true,
		},
		orderBy: [{ tagName: "asc" }, { tagValue: "asc" }],
		distinct: ["tagName", "tagValue"],
		take: maxRows,
	});

	const map = new Map<string, unknown[]>();
	for (const row of rows) {
		const bucket = map.get(row.tagName) ?? [];
		if (bucket.length >= limitPerTag) continue;
		bucket.push(deserializeTagValue(row.tagValue));
		map.set(row.tagName, bucket);
	}

	const data: ActivityTagSuggestion[] = Array.from(map.entries()).map(
		([tagName, values]) => ({
			tagName,
			values,
		}),
	);

	return { data };
}
