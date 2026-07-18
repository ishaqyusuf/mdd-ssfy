import { randomBytes } from "node:crypto";
import { getAppUrl } from "@gnd/utils/envs";
import type { Db, Prisma } from "..";

const GENERATED_SLUG_BYTES = 5;
const MAX_GENERATED_ATTEMPTS = 8;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
	"admin",
	"api",
	"app",
	"create",
	"edit",
	"login",
	"new",
	"settings",
	"signin",
]);

export type CreateShortLinkInput = {
	targetUrl: string;
	slug?: string | null;
	title?: string | null;
	sourceType?: string | null;
	sourceId?: string | null;
	expiresAt?: Date | string | null;
	createdById?: number | null;
	active?: boolean;
	meta?: Prisma.InputJsonValue | null;
};

export type UpdateShortLinkInput = {
	id: string;
	targetUrl?: string;
	slug?: string | null;
	title?: string | null;
	sourceType?: string | null;
	sourceId?: string | null;
	expiresAt?: Date | string | null;
	active?: boolean;
	meta?: Prisma.InputJsonValue | null;
};

export type ListShortLinksInput = {
	q?: string | null;
	size?: number | null;
	page?: number | null;
	cursor?: string | null;
	sort?: string[] | null;
	includeInactive?: boolean | null;
};

function trimSlashes(value: string) {
	return value.replace(/\/+$/, "");
}

function toDate(value?: Date | string | null) {
	if (!value) return null;
	if (value instanceof Date) return value;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		throw new Error("Invalid short link expiry date.");
	}
	return parsed;
}

function isUniqueConstraintError(error: unknown) {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === "P2002"
	);
}

export function normalizeShortLinkSlug(value: string) {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/['"]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");

	if (!normalized) {
		throw new Error("Short link slug is required.");
	}
	if (normalized.length > 80) {
		throw new Error("Short link slug must be 80 characters or fewer.");
	}
	if (!SLUG_PATTERN.test(normalized)) {
		throw new Error(
			"Short link slug can only contain letters, numbers, and hyphens.",
		);
	}
	if (RESERVED_SLUGS.has(normalized)) {
		throw new Error(
			`"${normalized}" is reserved and cannot be used as a short link.`,
		);
	}

	return normalized;
}

export function generateShortLinkSlug() {
	return randomBytes(GENERATED_SLUG_BYTES).toString("hex");
}

export function buildShortUrl(slug: string, baseUrl = getAppUrl()) {
	return `${trimSlashes(baseUrl)}/sh/${encodeURIComponent(slug)}`;
}

export function isShortLinkExpired(expiresAt?: Date | string | null) {
	const expiry = toDate(expiresAt);
	return !!expiry && expiry.getTime() <= Date.now();
}

function validateTargetUrl(targetUrl: string) {
	const url = new URL(targetUrl);
	if (!["http:", "https:"].includes(url.protocol)) {
		throw new Error("Short link target must be an http or https URL.");
	}
	return url.toString();
}

export async function createShortLink(db: Db, input: CreateShortLinkInput) {
	const targetUrl = validateTargetUrl(input.targetUrl);
	const customSlug = input.slug ? normalizeShortLinkSlug(input.slug) : null;
	const attempts = customSlug ? 1 : MAX_GENERATED_ATTEMPTS;

	for (let attempt = 0; attempt < attempts; attempt += 1) {
		const slug = customSlug ?? generateShortLinkSlug();
		try {
			return await db.shortLink.create({
				data: {
					slug,
					targetUrl,
					title: input.title?.trim() || null,
					sourceType: input.sourceType?.trim() || null,
					sourceId: input.sourceId?.trim() || null,
					expiresAt: toDate(input.expiresAt),
					createdById: input.createdById ?? null,
					active: input.active ?? true,
					meta: input.meta ?? undefined,
				},
			});
		} catch (error) {
			if (!isUniqueConstraintError(error) || customSlug) {
				throw error;
			}
		}
	}

	throw new Error("Unable to create a unique short link slug.");
}

export async function updateShortLink(db: Db, input: UpdateShortLinkInput) {
	const data: Prisma.ShortLinkUpdateInput = {};

	if (input.targetUrl !== undefined) {
		data.targetUrl = validateTargetUrl(input.targetUrl);
	}
	if (input.slug !== undefined) {
		data.slug = input.slug ? normalizeShortLinkSlug(input.slug) : undefined;
	}
	if (input.title !== undefined) {
		data.title = input.title?.trim() || null;
	}
	if (input.sourceType !== undefined) {
		data.sourceType = input.sourceType?.trim() || null;
	}
	if (input.sourceId !== undefined) {
		data.sourceId = input.sourceId?.trim() || null;
	}
	if (input.expiresAt !== undefined) {
		data.expiresAt = toDate(input.expiresAt);
	}
	if (input.active !== undefined) {
		data.active = input.active;
	}
	if (input.meta !== undefined) {
		data.meta = input.meta ?? undefined;
	}

	return db.shortLink.update({
		where: {
			id: input.id,
		},
		data,
	});
}

export async function deactivateShortLink(db: Db, id: string) {
	return db.shortLink.update({
		where: { id },
		data: {
			active: false,
		},
	});
}

export async function deleteShortLink(db: Db, id: string) {
	return db.shortLink.update({
		where: { id },
		data: {
			active: false,
			deletedAt: new Date(),
		},
	});
}

export async function listShortLinks(db: Db, input: ListShortLinksInput = {}) {
	const size = Math.min(Math.max(Number(input.size || 50), 1), 200);
	const page = Math.max(Number(input.page || 1), 1);
	const cursor = Math.max(Number(input.cursor || 0), 0);
	const skip = input.cursor ? cursor : (page - 1) * size;
	const q = input.q?.trim();
	const where: Prisma.ShortLinkWhereInput = {
		...(input.includeInactive ? {} : { deletedAt: null }),
		...(q
			? {
					OR: [
						{ slug: { contains: q } },
						{ targetUrl: { contains: q } },
						{ title: { contains: q } },
						{ sourceType: { contains: q } },
						{ sourceId: { contains: q } },
					],
				}
			: {}),
	};

	const [data, total] = await Promise.all([
		db.shortLink.findMany({
			where,
			orderBy: getShortLinkOrderBy(input.sort),
			skip,
			take: size,
		}),
		db.shortLink.count({ where }),
	]);
	const nextCursor = skip + size;

	return {
		data,
		meta: {
			page,
			size,
			total,
			pageCount: Math.ceil(total / size),
			cursor: nextCursor < total ? String(nextCursor) : null,
		},
	};
}

function getShortLinkOrderBy(
	sortValues?: string[] | null,
): Prisma.ShortLinkOrderByWithRelationInput[] {
	const fallback: Prisma.ShortLinkOrderByWithRelationInput[] = [
		{ createdAt: "desc" },
	];
	const values = sortValues?.filter(Boolean);
	if (!values?.length) return fallback;

	const orderBy: Prisma.ShortLinkOrderByWithRelationInput[] = [];
	for (const value of values) {
		const [field, rawDirection] = value.split(".");
		const direction: Prisma.SortOrder =
			rawDirection === "asc" ? "asc" : "desc";

		switch (field) {
			case "slug":
			case "shortLink":
				orderBy.push({ slug: direction });
				break;
			case "targetUrl":
			case "target":
				orderBy.push({ targetUrl: direction });
				break;
			case "clickCount":
			case "clicks":
				orderBy.push({ clickCount: direction });
				break;
			case "lastClickedAt":
			case "lastClick":
				orderBy.push({ lastClickedAt: direction });
				break;
			case "expiresAt":
			case "expiry":
				orderBy.push({ expiresAt: direction });
				break;
			case "active":
			case "status":
				orderBy.push({ active: direction });
				break;
			case "createdAt":
				orderBy.push({ createdAt: direction });
				break;
		}
	}

	return orderBy.length ? orderBy : fallback;
}

export async function getActiveShortLinkBySlug(db: Db, slug: string) {
	let normalizedSlug: string;
	try {
		normalizedSlug = normalizeShortLinkSlug(slug);
	} catch {
		return null;
	}
	const link = await db.shortLink.findFirst({
		where: {
			slug: normalizedSlug,
			active: true,
			deletedAt: null,
		},
	});

	if (!link || isShortLinkExpired(link.expiresAt)) return null;
	return link;
}

export async function recordShortLinkClick(db: Db, id: string) {
	return db.shortLink.update({
		where: { id },
		data: {
			clickCount: {
				increment: 1,
			},
			lastClickedAt: new Date(),
		},
	});
}

export async function resolveShortLinkTargetAndRecordClick(
	db: Db,
	slug: string,
) {
	const link = await getActiveShortLinkBySlug(db, slug);
	if (!link) return null;

	await recordShortLinkClick(db, link.id);
	return link.targetUrl;
}

export async function findOrCreateShortLinkForTarget(
	db: Db,
	input: CreateShortLinkInput,
) {
	if (input.sourceType?.trim() && input.sourceId?.trim()) {
		const existing = await db.shortLink.findFirst({
			where: {
				sourceType: input.sourceType.trim(),
				sourceId: input.sourceId.trim(),
				active: true,
				deletedAt: null,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		if (existing && !isShortLinkExpired(existing.expiresAt)) {
			return existing;
		}
	}

	return createShortLink(db, input);
}
