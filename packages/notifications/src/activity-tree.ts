import type { Db, NoteStatus } from "@gnd/db";
import { channelNames } from "./channels";

export type ActivityTagFilter = {
	tagName: string;
	tagValue: unknown;
};

export type GetActivityTreeQuery = {
	contactIds?: number[];
	status?: NoteStatus[];
	tagFilters?: ActivityTagFilter[];
	tagFilterMode?: "all" | "any";
	pageSize?: number;
	includeChildren?: boolean;
	maxDepth?: number;
};

export type ActivityTreeNode = {
	id: number;
	createdAt: Date | null;
	subject: string | null;
	headline: string | null;
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
	channels?: string[];
	tagName?: string;
	q?: string;
	limitPerTag?: number;
	maxRows?: number;
};

function serializeTagValue(value: unknown): string {
	if (value === undefined) return "null";
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}

function deserializeTagValue(value: unknown): unknown {
	if (typeof value !== "string") return value;
	if (value === "undefined") return undefined;

	try {
		return JSON.parse(value);
	} catch {
		if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
		if (value === "true") return true;
		if (value === "false") return false;
		return value;
	}
}

function mapActivity(row: {
	id: number;
	createdAt: Date | null;
	subject: string | null;
	headline: string | null;
	note: string | null;
	senderContact: { id: number; name: string | null } | null;
	recipients: { status: NoteStatus | null; notePadContactId: number }[];
	tags: { tagName: string; tagValue: string }[];
}): ActivityTreeNode {
	return {
		id: row.id,
		createdAt: row.createdAt ?? null,
		subject: row.subject ?? null,
		headline: row.headline ?? null,
		note: row.note ?? null,
		senderContactId: row.senderContact?.id ?? null,
		senderContactName: row.senderContact?.name ?? null,
		receipt: row.recipients?.[0] ?? null,
		tags: row.tags.reduce(
			(acc, tag) => {
				acc[tag.tagName] = deserializeTagValue(tag.tagValue);
				return acc;
			},
			{} as Record<string, unknown>,
		),
		children: [],
	};
}

function buildTagWhereClause(
	tagFilters: ActivityTagFilter[] | undefined,
	tagFilterMode: "all" | "any",
) {
	if (!tagFilters?.length) return undefined;

	const clauses = tagFilters.map((filter) => ({
		tags: {
			some: {
				tagName: filter.tagName,
				tagValue: serializeTagValue(filter.tagValue),
			},
		},
	}));

	return tagFilterMode === "any" ? { OR: clauses } : { AND: clauses };
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

	return db.notePad.findMany({
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
}

export async function getActivityTree(db: Db, query: GetActivityTreeQuery) {
	const tagFilterMode = query.tagFilterMode ?? "all";
	const pageSize = query.pageSize ?? 50;
	const includeChildren = query.includeChildren ?? true;
	const maxDepth = query.maxDepth ?? 4;

	const recipientsWhere = createRecipientsWhere(query);
	const tagWhere = buildTagWhereClause(query.tagFilters, tagFilterMode);
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

	const rootIds = rootRows.map((row) => row.id);
	const nodes = new Map<number, ActivityTreeNode>(
		rootRows.map((row) => [row.id, mapActivity(row)]),
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
	const tagWhere = buildTagWhereClause(query.tagFilters, tagFilterMode);
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
