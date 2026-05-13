import type { Database } from "@gnd/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

const pageInput = z.object({
	page: z.string().min(1),
});

const tabInput = z.object({
	page: z.string().min(1),
	title: z.string().trim().min(1).max(80),
	query: z.string().trim().max(2000),
	setDefault: z.boolean().optional().default(false),
});

const updateTabInput = z.object({
	id: z.number().int().positive(),
	title: z.string().trim().min(1).max(80).optional(),
	query: z.string().trim().max(2000).optional(),
	setDefault: z.boolean().optional(),
});

const deleteTabInput = z.object({
	id: z.number().int().positive(),
});

export const pageTabsRouter = createTRPCRouter({
	list: protectedProcedure.input(pageInput).query(async ({ ctx, input }) => {
		const tabs = await ctx.db.pageTabs.findMany({
			where: {
				page: normalizePage(input.page),
				userId: ctx.userId,
				private: true,
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

		return tabs.map((tab) => toPageTab(tab));
	}),

	defaults: protectedProcedure.query(async ({ ctx }) => {
		const defaults = await ctx.db.pageTabIndex.findMany({
			where: {
				userId: ctx.userId,
				default: true,
				deletedAt: null,
				tab: {
					userId: ctx.userId,
					private: true,
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

			return ctx.db.$transaction(async (tx) => {
				if (input.setDefault) {
					await clearPageDefaults(tx, ctx.userId, page);
				}

				const count = await tx.pageTabs.count({
					where: {
						page,
						userId: ctx.userId,
						private: true,
						deletedAt: null,
					},
				});

				const tab = await tx.pageTabs.create({
					data: {
						page,
						query,
						title: input.title,
						private: true,
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

				return toPageTab(tab);
			});
		}),

	update: protectedProcedure
		.input(updateTabInput)
		.mutation(async ({ ctx, input }) => {
			return ctx.db.$transaction(async (tx) => {
				const existing = await tx.pageTabs.findFirst({
					where: {
						id: input.id,
						userId: ctx.userId,
						private: true,
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
				});

				if (!existing) {
					throw new Error("Page tab not found");
				}

				const page = normalizePage(existing.page);

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

				const tab = await tx.pageTabs.update({
					where: { id: input.id },
					data: {
						title: input.title,
						query:
							input.query === undefined
								? undefined
								: normalizeQuery(input.query),
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

				return toPageTab(tab);
			});
		}),

	delete: protectedProcedure
		.input(deleteTabInput)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.$transaction([
				ctx.db.pageTabIndex.updateMany({
					where: {
						tabId: input.id,
						userId: ctx.userId,
						deletedAt: null,
					},
					data: {
						deletedAt: new Date(),
						default: false,
					},
				}),
				ctx.db.pageTabs.updateMany({
					where: {
						id: input.id,
						userId: ctx.userId,
						private: true,
						deletedAt: null,
					},
					data: {
						deletedAt: new Date(),
					},
				}),
			]);

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
	tabIndices?: { id: string; tabIndex: number; default: boolean | null }[];
}) {
	const index = tab.tabIndices?.[0];

	return {
		id: tab.id,
		page: normalizePage(tab.page),
		title: tab.title,
		query: normalizeQuery(tab.query),
		default: Boolean(index?.default),
		index: index?.tabIndex ?? 0,
		indexId: index?.id,
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
				userId,
				private: true,
				deletedAt: null,
			},
		},
		data: {
			default: false,
		},
	});
}
