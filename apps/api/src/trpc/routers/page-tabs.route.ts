import {
	getOrdersCount,
	getOrdersSchema,
} from "@api/db/queries/sales-orders-v2";
import {
	getUnitInvoicesCount,
	getUnitInvoicesSchema,
} from "@api/db/queries/unit-invoices";
import type { Database } from "@gnd/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const pageInput = z.object({
	page: z.string().min(1),
	includeInactive: z.boolean().optional().default(false),
});

const tabInput = z.object({
	page: z.string().min(1),
	title: z.string().trim().min(1).max(80),
	query: z.string().trim().max(2000),
	setDefault: z.boolean().optional().default(false),
	visibility: z.enum(["private", "public"]).optional().default("private"),
});

const updateTabInput = z.object({
	id: z.number().int().positive(),
	title: z.string().trim().min(1).max(80).optional(),
	query: z.string().trim().max(2000).optional(),
	setDefault: z.boolean().optional(),
	visibility: z.enum(["private", "public"]).optional(),
	active: z.boolean().optional(),
	tabIndex: z.number().int().min(0).optional(),
});

const deleteTabInput = z.object({
	id: z.number().int().positive(),
});

const reorderTabsInput = z.object({
	page: z.string().min(1),
	ids: z.array(z.number().int().positive()),
});

export const pageTabsRouter = createTRPCRouter({
	list: protectedProcedure.input(pageInput).query(async ({ ctx, input }) => {
		const page = normalizePage(input.page);
		const isAdmin = await isSuperAdmin(ctx.db, ctx.userId);
		const tabs = await ctx.db.pageTabs.findMany({
			where: {
				page,
				OR: [
					{
						userId: ctx.userId,
						private: true,
					},
					{
						private: false,
					},
				],
				deletedAt: null,
			},
			include: {
				tabIndices: {
					where: {
						userId: ctx.userId,
						deletedAt: null,
					},
					take: 1,
				},
			},
			orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		});

		const visibleTabs = tabs
			.filter((tab) =>
				input.includeInactive
					? isPageTabActive(tab) || canManageTab(tab, ctx.userId, isAdmin)
					: isPageTabActive(tab),
			)
			.sort((left, right) => {
				const leftIndex = left.tabIndices[0]?.tabIndex ?? Number.MAX_SAFE_INTEGER;
				const rightIndex =
					right.tabIndices[0]?.tabIndex ?? Number.MAX_SAFE_INTEGER;
				if (leftIndex !== rightIndex) return leftIndex - rightIndex;

				const leftCreatedAt = left.createdAt?.getTime?.() ?? 0;
				const rightCreatedAt = right.createdAt?.getTime?.() ?? 0;
				if (leftCreatedAt !== rightCreatedAt) {
					return leftCreatedAt - rightCreatedAt;
				}

				return left.id - right.id;
			});

		return Promise.all(
			visibleTabs.map(async (tab) =>
				toPageTab(tab, {
					count: await getPageTabCount(ctx, page, tab.query),
					canManage: canManageTab(tab, ctx.userId, isAdmin),
				}),
			),
		);
	}),

	defaults: protectedProcedure.query(async ({ ctx }) => {
		const defaults = await ctx.db.pageTabIndex.findMany({
			where: {
				userId: ctx.userId,
				default: true,
				deletedAt: null,
				tab: {
					OR: [
						{
							userId: ctx.userId,
							private: true,
						},
						{
							private: false,
						},
					],
					deletedAt: null,
				},
			},
			include: {
				tab: true,
			},
		});

		return Object.fromEntries(
			defaults.map((entry) => {
				const page = normalizePage(entry.tab.page);
				const query = normalizeQuery(entry.tab.query);

				return [page, query ? `${page}?${query}` : page];
			}),
		);
	}),

	create: protectedProcedure
		.input(tabInput)
		.mutation(async ({ ctx, input }) => {
			const page = normalizePage(input.page);
			const query = normalizeQuery(input.query);
			const isPublic = input.visibility === "public";
			if (isPublic && !(await isSuperAdmin(ctx.db, ctx.userId))) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "Only Super Admin can create general page tabs.",
				});
			}

			return ctx.db.$transaction(async (tx) => {
				if (input.setDefault) {
					await clearPageDefaults(tx, ctx.userId, page);
				}

				const count = await tx.pageTabs.count({
					where: {
						page,
						OR: [
							{
								userId: ctx.userId,
								private: true,
							},
							{
								private: false,
							},
						],
						deletedAt: null,
					},
				});

				const tab = await tx.pageTabs.create({
					data: {
						page,
						query,
						title: input.title,
						private: !isPublic,
						userId: ctx.userId,
						tabIndices: {
							create: {
								userId: ctx.userId,
								tabIndex: count,
								default: input.setDefault,
							},
						},
					},
					include: {
						tabIndices: {
							where: {
								userId: ctx.userId,
								deletedAt: null,
							},
							take: 1,
						},
					},
				});

				return toPageTab(tab, {
					canManage: true,
					count: await getPageTabCount(ctx, page, query),
				});
			});
		}),

	update: protectedProcedure
		.input(updateTabInput)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.$transaction(async (tx) => {
				const existing = await tx.pageTabs.findFirst({
					where: {
						id: input.id,
						deletedAt: null,
						OR: [
							{
								userId: ctx.userId,
								private: true,
							},
							{
								private: false,
							},
						],
					},
					include: {
						tabIndices: {
							where: {
								userId: ctx.userId,
								deletedAt: null,
							},
							take: 1,
						},
					},
				});

				if (!existing) {
					throw new Error("Page tab not found");
				}

				const page = normalizePage(existing.page);
				const isAdmin = await isSuperAdmin(ctx.db, ctx.userId);
				const canManage = canManageTab(existing, ctx.userId, isAdmin);
				const changesManagedFields =
					input.title !== undefined ||
					input.query !== undefined ||
					input.visibility !== undefined ||
					input.active !== undefined;

				if (changesManagedFields && !canManage) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You can use this page tab but cannot manage it.",
					});
				}
				if (input.visibility === "public" && !isAdmin) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "Only Super Admin can create general page tabs.",
					});
				}

				if (input.setDefault !== undefined) {
					if (input.setDefault) {
						await clearPageDefaults(tx, ctx.userId, page);
					}

					const index = existing.tabIndices[0];
					if (index) {
						await tx.pageTabIndex.update({
							where: { id: index.id },
							data: { default: input.setDefault },
						});
					} else {
						await tx.pageTabIndex.create({
							data: {
								tabId: existing.id,
								userId: ctx.userId,
								tabIndex: 0,
								default: input.setDefault,
							},
						});
					}
				}
				if (input.tabIndex !== undefined) {
					const index = existing.tabIndices[0];
					if (index) {
						await tx.pageTabIndex.update({
							where: { id: index.id },
							data: { tabIndex: input.tabIndex },
						});
					} else {
						await tx.pageTabIndex.create({
							data: {
								tabId: existing.id,
								userId: ctx.userId,
								tabIndex: input.tabIndex,
								default: false,
							},
						});
					}
				}
				if (input.active === false) {
					await tx.pageTabIndex.updateMany({
						where: {
							tabId: input.id,
							deletedAt: null,
						},
						data: {
							default: false,
						},
					});
				}

				const tab = changesManagedFields
					? await tx.pageTabs.update({
							where: { id: input.id },
							data: {
								title: input.title,
								query:
									input.query === undefined
										? undefined
										: normalizeQuery(input.query),
								private:
									input.visibility === undefined
										? undefined
										: input.visibility === "private",
								meta:
									input.active === undefined
										? undefined
										: mergeTabMeta(existing.meta, { active: input.active }),
							},
							include: {
								tabIndices: {
									where: {
										userId: ctx.userId,
										deletedAt: null,
									},
									take: 1,
								},
							},
						})
					: await tx.pageTabs.findFirstOrThrow({
							where: { id: input.id },
							include: {
								tabIndices: {
									where: {
										userId: ctx.userId,
										deletedAt: null,
									},
									take: 1,
								},
							},
						});

				return toPageTab(tab, {
					canManage,
					count: await getPageTabCount(ctx, page, tab.query),
				});
			});
		}),

	delete: protectedProcedure
		.input(deleteTabInput)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.$transaction(async (tx) => {
				const existing = await tx.pageTabs.findFirst({
					where: {
						id: input.id,
						deletedAt: null,
					},
				});

				if (!existing) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Page tab not found",
					});
				}

				const isAdmin = await isSuperAdmin(ctx.db, ctx.userId);
				if (!canManageTab(existing, ctx.userId, isAdmin)) {
					throw new TRPCError({
						code: "FORBIDDEN",
						message: "You can use this page tab but cannot delete it.",
					});
				}

				await tx.pageTabIndex.updateMany({
					where: {
						tabId: input.id,
						deletedAt: null,
					},
					data: {
						deletedAt: new Date(),
						default: false,
					},
				});
				await tx.pageTabs.update({
					where: { id: input.id },
					data: { deletedAt: new Date() },
				});
			});

			return { ok: true };
		}),

	reorder: protectedProcedure
		.input(reorderTabsInput)
		.mutation(async ({ ctx, input }) => {
			const page = normalizePage(input.page);
			const tabs = await ctx.db.pageTabs.findMany({
				where: {
					page,
					id: {
						in: input.ids,
					},
					deletedAt: null,
					OR: [
						{
							userId: ctx.userId,
							private: true,
						},
						{
							private: false,
						},
					],
				},
				include: {
					tabIndices: {
						where: {
							userId: ctx.userId,
							deletedAt: null,
						},
						take: 1,
					},
				},
			});
			const tabById = new Map(tabs.map((tab) => [tab.id, tab]));

			await ctx.db.$transaction(async (tx) => {
				for (const [tabIndex, id] of input.ids.entries()) {
					const tab = tabById.get(id);
					if (!tab) continue;

					const index = tab.tabIndices[0];
					if (index) {
						await tx.pageTabIndex.update({
							where: { id: index.id },
							data: { tabIndex },
						});
					} else {
						await tx.pageTabIndex.create({
							data: {
								tabId: tab.id,
								userId: ctx.userId,
								tabIndex,
								default: false,
							},
						});
					}
				}
			});

			return { ok: true };
		}),
});

function normalizePage(page: string) {
	const [path] = page.split("?");
	if (!path) return "/";
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function normalizeQuery(query: string) {
	const source = query.startsWith("?") ? query.slice(1) : query;
	const params = new URLSearchParams(source);
	params.delete("_page");
	params.delete("cursor");
	params.delete("size");

	return Array.from(params.entries())
		.filter(([, value]) => value !== "")
		.sort(([left], [right]) => left.localeCompare(right))
		.reduce((next, [key, value]) => {
			next.append(key, value);
			return next;
		}, new URLSearchParams())
		.toString();
}

function toPageTab(tab: {
	id: number;
	page: string;
	title: string;
	query: string;
	userId: number;
	private: boolean | null;
	meta?: unknown;
	tabIndices?: { id: string; tabIndex: number; default: boolean | null }[];
}, options: { canManage: boolean; count?: number | null }) {
	const index = tab.tabIndices?.[0];

	return {
		id: tab.id,
		page: normalizePage(tab.page),
		title: tab.title,
		query: normalizeQuery(tab.query),
		visibility: tab.private === false ? "public" : "private",
		canManage: options.canManage,
		count: options.count ?? undefined,
		default: Boolean(index?.default),
		active: isPageTabActive(tab),
		index: index?.tabIndex ?? 0,
		indexId: index?.id,
	};
}

function isPageTabActive(tab: { meta?: unknown }) {
	const meta = tab.meta;
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return true;

	return (meta as { active?: unknown }).active !== false;
}

function mergeTabMeta(
	meta: unknown,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return patch;

	return {
		...(meta as Record<string, unknown>),
		...patch,
	};
}

async function clearPageDefaults(
	tx: Pick<Database, "pageTabIndex">,
	userId: number,
	page: string,
) {
	await tx.pageTabIndex.updateMany({
		where: {
			userId,
			default: true,
			deletedAt: null,
			tab: {
				page,
				OR: [
					{
						userId,
						private: true,
					},
					{
						private: false,
					},
				],
				deletedAt: null,
			},
		},
		data: {
			default: false,
		},
	});
}

function canManageTab(
	tab: { userId: number; private: boolean | null },
	userId: number,
	isAdmin: boolean,
) {
	return tab.userId === userId || (tab.private === false && isAdmin);
}

async function isSuperAdmin(db: Database, userId: number) {
	const user = await db.users.findUnique({
		where: { id: userId },
		select: {
			roles: {
				select: {
					role: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	return (
		user?.roles?.some(
			(entry) => entry.role?.name?.toLowerCase() === "super admin",
		) ?? false
	);
}

async function getPageTabCount(
	ctx: { db: Database; userId: number },
	page: string,
	query: string,
) {
	const input = queryToInput(query);

	try {
		switch (normalizePage(page)) {
			case "/sales-book/orders":
				return getOrdersCount(ctx, getOrdersSchema.parse(input));
			case "/community/unit-invoices":
				return getUnitInvoicesCount(ctx, getUnitInvoicesSchema.parse(input));
			default:
				return null;
		}
	} catch {
		return null;
	}
}

function queryToInput(query: string) {
	const params = new URLSearchParams(
		query.startsWith("?") ? query.slice(1) : query,
	);
	const input: Record<string, unknown> = {};

	for (const key of new Set(params.keys())) {
		const values = params
			.getAll(key)
			.flatMap((value) =>
				key === "sort" || key === "dateRange" ? value.split(",") : [value],
			)
			.map((value) => value.trim())
			.filter(Boolean);

		if (!values.length) continue;
		input[key] = key === "sort" || key === "dateRange" ? values : values.at(-1);
	}

	return input;
}
