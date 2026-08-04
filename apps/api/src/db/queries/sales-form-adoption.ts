import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { TRPCError } from "@trpc/server";
import { endOfDay, startOfDay, subDays } from "date-fns";

export const SALES_FORM_PREFERENCE_EVENT_TYPE = "sales.form.preference";

export type SalesFormPreferenceMode = "NEW" | "LEGACY";
export type SalesFormPreferenceSource =
	| "legacy_prompt"
	| "form_switcher"
	| "admin"
	| "unknown";
export type SalesFormUsageInput = {
	surface: "new" | "legacy";
	type: "order" | "quote";
	mode: "create" | "edit";
};

function requireUserId(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Authentication is required.",
		});
	}
	return ctx.userId;
}

export async function getSalesFormPreference(ctx: TRPCContext) {
	const userId = requireUserId(ctx);
	return ctx.db.salesFormPreference.findUnique({
		where: { userId },
		select: {
			userId: true,
			mode: true,
			source: true,
			updatedAt: true,
		},
	});
}

export async function setSalesFormPreference(
	ctx: TRPCContext,
	input: {
		mode: SalesFormPreferenceMode;
		source: SalesFormPreferenceSource;
	},
) {
	const userId = requireUserId(ctx);
	const promptedAt = input.source === "legacy_prompt" ? new Date() : undefined;

	return ctx.db.$transaction(async (tx) => {
		const current = await tx.salesFormPreference.findUnique({
			where: { userId },
			select: { mode: true },
		});
		const preference = await tx.salesFormPreference.upsert({
			where: { userId },
			create: {
				userId,
				mode: input.mode,
				source: input.source,
				promptedAt: promptedAt ?? null,
			},
			update: {
				mode: input.mode,
				source: input.source,
				...(promptedAt ? { promptedAt } : {}),
			},
			select: {
				userId: true,
				mode: true,
				source: true,
				updatedAt: true,
			},
		});

		await tx.event.create({
			data: {
				type: SALES_FORM_PREFERENCE_EVENT_TYPE,
				userId,
				data: {
					action: "preference_set",
					previousMode: current?.mode ?? null,
					nextMode: input.mode,
					source: input.source,
				},
			},
		});

		return preference;
	});
}

export async function recordLegacySalesFormOnce(
	ctx: TRPCContext,
	input: {
		type: "order" | "quote";
		mode: "create" | "edit";
	},
) {
	const userId = requireUserId(ctx);
	return ctx.db.event.create({
		data: {
			type: SALES_FORM_PREFERENCE_EVENT_TYPE,
			userId,
			data: {
				action: "legacy_once",
				nextMode: null,
				source: "legacy_prompt",
				type: input.type,
				mode: input.mode,
			},
		},
		select: {
			id: true,
			createdAt: true,
		},
	});
}

export async function recordSalesFormUsage(
	ctx: TRPCContext,
	input: SalesFormUsageInput,
) {
	const userId = requireUserId(ctx);
	const basePath = input.surface === "new" ? "/sales-form" : "/sales-book";

	return ctx.db.pageView.create({
		data: {
			url: `${basePath}/${input.mode}-${input.type}`,
			group: `sales-form:${input.surface}:${input.type}:${input.mode}`,
			userId,
		},
		select: {
			id: true,
			createdAt: true,
		},
	});
}

async function requireSuperAdmin(ctx: TRPCContext) {
	const userId = requireUserId(ctx);
	const actor = await ctx.db.users.findFirst({
		where: {
			id: userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			id: true,
			roles: {
				where: { deletedAt: null },
				select: {
					role: {
						select: { name: true },
					},
				},
			},
		},
	});
	const isSuperAdmin = actor?.roles.some(
		(entry) => entry.role.name?.trim().toLowerCase() === "super admin",
	);
	if (!isSuperAdmin) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can manage sales form adoption.",
		});
	}
	return userId;
}

export async function resetLegacySalesFormPreferences(ctx: TRPCContext) {
	const actorUserId = await requireSuperAdmin(ctx);

	return ctx.db.$transaction(async (tx) => {
		const legacyPreferences = await tx.salesFormPreference.findMany({
			where: { mode: "LEGACY" },
			orderBy: { userId: "asc" },
			select: { userId: true },
		});
		let updatedCount = 0;

		for (const preference of legacyPreferences) {
			const updated = await tx.salesFormPreference.updateMany({
				where: {
					userId: preference.userId,
					mode: "LEGACY",
				},
				data: {
					mode: "NEW",
					source: "admin",
				},
			});
			if (!updated.count) continue;

			updatedCount += updated.count;
			await tx.event.create({
				data: {
					type: SALES_FORM_PREFERENCE_EVENT_TYPE,
					userId: preference.userId,
					data: {
						action: "preference_reset",
						previousMode: "LEGACY",
						nextMode: "NEW",
						source: "admin",
						actorUserId,
					},
				},
			});
		}

		return { updatedCount };
	});
}

const adoptionUserSelect = {
	id: true,
	name: true,
	email: true,
	roles: {
		where: { deletedAt: null },
		select: {
			role: {
				select: { name: true },
			},
		},
	},
} satisfies Prisma.UsersSelect;

export async function getSalesFormAdoption(
	ctx: TRPCContext,
	input: { days?: number } = {},
) {
	await requireSuperAdmin(ctx);
	const days = Math.min(90, Math.max(1, input.days ?? 30));
	const from = startOfDay(subDays(new Date(), days - 1));

	const [preferences, views, decisions] = await Promise.all([
		ctx.db.salesFormPreference.findMany({
			orderBy: [{ updatedAt: "desc" }, { userId: "asc" }],
			select: {
				userId: true,
				mode: true,
				source: true,
				updatedAt: true,
				user: { select: adoptionUserSelect },
			},
		}),
		ctx.db.pageView.findMany({
			where: {
				deletedAt: null,
				createdAt: { gte: from },
				group: { startsWith: "sales-form:" },
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			select: {
				group: true,
				userId: true,
				createdAt: true,
				Users: { select: adoptionUserSelect },
			},
		}),
		ctx.db.event.findMany({
			where: {
				deletedAt: null,
				type: SALES_FORM_PREFERENCE_EVENT_TYPE,
				createdAt: { gte: from },
			},
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: 100,
			select: {
				id: true,
				userId: true,
				data: true,
				createdAt: true,
				Users: { select: adoptionUserSelect },
			},
		}),
	]);

	const preferenceByUserId = new Map(
		preferences.map((preference) => [preference.userId, preference]),
	);
	const userRows = new Map<
		number,
		{
			userId: number;
			name: string | null;
			email: string;
			role: string | null;
			preference: "NEW" | "LEGACY" | null;
			preferenceUpdatedAt: Date | null;
			newViews: number;
			legacyViews: number;
			lastNewViewedAt: Date | null;
			lastLegacyViewedAt: Date | null;
		}
	>();

	const ensureUser = (
		user:
			| {
					id: number;
					name: string | null;
					email: string;
					roles: Array<{ role: { name: string } }>;
			  }
			| null
			| undefined,
	) => {
		if (!user) return null;
		const preference = preferenceByUserId.get(user.id);
		let row = userRows.get(user.id);
		if (!row) {
			row = {
				userId: user.id,
				name: user.name,
				email: user.email,
				role: user.roles[0]?.role.name ?? null,
				preference: preference?.mode ?? null,
				preferenceUpdatedAt: preference?.updatedAt ?? null,
				newViews: 0,
				legacyViews: 0,
				lastNewViewedAt: null,
				lastLegacyViewedAt: null,
			};
			userRows.set(user.id, row);
		}
		return row;
	};

	for (const preference of preferences) ensureUser(preference.user);
	for (const view of views) {
		const row = ensureUser(view.Users);
		if (!row) continue;
		const surface = view.group?.split(":")[1];
		if (surface === "new") {
			row.newViews += 1;
			row.lastNewViewedAt ??= view.createdAt;
		} else if (surface === "legacy") {
			row.legacyViews += 1;
			row.lastLegacyViewedAt ??= view.createdAt;
		}
	}

	const newViews = views.filter((view) =>
		view.group?.startsWith("sales-form:new:"),
	);
	const legacyViews = views.filter((view) =>
		view.group?.startsWith("sales-form:legacy:"),
	);
	const explicitNew = preferences.filter(
		(preference) => preference.mode === "NEW",
	).length;
	const explicitLegacy = preferences.filter(
		(preference) => preference.mode === "LEGACY",
	).length;

	return {
		period: {
			days,
			from,
			to: endOfDay(new Date()),
		},
		summary: {
			explicitNew,
			explicitLegacy,
			unconfiguredObserved: [...userRows.values()].filter(
				(row) => !row.preference,
			).length,
		},
		usage: {
			new: {
				views: newViews.length,
				uniqueUsers: new Set(
					newViews.map((view) => view.userId).filter(Boolean),
				).size,
			},
			legacy: {
				views: legacyViews.length,
				uniqueUsers: new Set(
					legacyViews.map((view) => view.userId).filter(Boolean),
				).size,
			},
		},
		users: [...userRows.values()].sort((left, right) => {
			const leftDate =
				left.preferenceUpdatedAt ??
				left.lastLegacyViewedAt ??
				left.lastNewViewedAt ??
				new Date(0);
			const rightDate =
				right.preferenceUpdatedAt ??
				right.lastLegacyViewedAt ??
				right.lastNewViewedAt ??
				new Date(0);
			return rightDate.getTime() - leftDate.getTime();
		}),
		recentDecisions: decisions.map((decision) => ({
			id: decision.id,
			userId: decision.userId,
			name: decision.Users?.name ?? null,
			email: decision.Users?.email ?? null,
			data: decision.data,
			createdAt: decision.createdAt,
		})),
	};
}
