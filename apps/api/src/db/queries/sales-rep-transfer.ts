import type {
	SalesRepOptionsSchema,
	TransferSalesRepSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import { checkPassword } from "@gnd/auth/utils";
import type { Prisma } from "@gnd/db";
import { getNameInitials } from "@gnd/utils";
import { generatePermissions } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";

const salesRepCandidateSelect = {
	id: true,
	name: true,
	email: true,
	username: true,
	roles: {
		where: {
			deletedAt: null,
		},
		select: {
			role: {
				select: {
					name: true,
					RoleHasPermissions: {
						where: {
							deletedAt: null,
						},
						select: {
							permission: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
				},
			},
		},
	},
} satisfies Prisma.UsersSelect;

const salesRepTransferActorSelect = {
	id: true,
	name: true,
	email: true,
	password: true,
} satisfies Prisma.UsersSelect;

type SalesRepCandidateUser = Prisma.UsersGetPayload<{
	select: typeof salesRepCandidateSelect;
}>;

type SalesRepDb = Pick<TRPCContext["db"], "users">;
type SalesRepTransferDb = Pick<
	TRPCContext["db"],
	"users" | "salesOrders" | "salesHistory"
>;

function roleNamesFor(user: SalesRepCandidateUser) {
	return user.roles
		.map((item) => item.role?.name)
		.filter((roleName): roleName is string => !!roleName);
}

function rolePermissionsFor(user: SalesRepCandidateUser) {
	return user.roles.flatMap(
		(item) =>
			item.role?.RoleHasPermissions.map(({ permission }) => permission) ?? [],
	);
}

function primaryRoleNameFor(user: SalesRepCandidateUser) {
	const roleNames = roleNamesFor(user);
	return (
		roleNames.find((roleName) => roleName.toLowerCase() === "super admin") ??
		roleNames[0] ??
		null
	);
}

function hasSalesRepTransferAccess(user: SalesRepCandidateUser) {
	const roleName = primaryRoleNameFor(user);
	const can = generatePermissions(roleName, rolePermissionsFor(user));
	return {
		can,
		isSuperAdmin: roleName?.toLowerCase() === "super admin",
	};
}

function isSalesRepCandidate(user: SalesRepCandidateUser) {
	const roleNames = roleNamesFor(user).map((roleName) =>
		roleName.toLowerCase(),
	);
	if (!roleNames.length) return false;
	if (
		roleNames.some(
			(roleName) =>
				roleName.includes("sales") || roleName.includes("super admin"),
		)
	) {
		return true;
	}

	const { can } = hasSalesRepTransferAccess(user);
	return !!(can.viewOrders || can.editOrders);
}

function mapSalesRepOption(user: SalesRepCandidateUser) {
	const name = user.name || user.username || user.email || `User #${user.id}`;
	return {
		id: user.id,
		name,
		email: user.email,
		initials: getNameInitials(name),
		roles: roleNamesFor(user),
	};
}

async function findSalesRepCandidate(db: SalesRepDb, salesRepId: number) {
	const user = await db.users.findFirst({
		where: {
			id: salesRepId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: salesRepCandidateSelect,
	});

	if (!user || !isSalesRepCandidate(user)) return null;
	return mapSalesRepOption(user);
}

async function loadSalesRepTransferActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	const user = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: salesRepTransferActorSelect,
	});

	if (!user) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be signed in.",
		});
	}

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			password: user.password,
		},
	};
}

async function requirePasswordConfirmedActor(
	ctx: TRPCContext,
	password: string,
) {
	const actor = await loadSalesRepTransferActor(ctx);

	if (!actor.user.password) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "No password set for this account.",
		});
	}

	try {
		await checkPassword(actor.user.password, password);
	} catch {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Password confirmation failed.",
		});
	}

	return actor;
}

function assertCanTransferSalesRep(
	actor: Awaited<ReturnType<typeof loadSalesRepTransferActor>>,
	sale: { salesRepId: number | null },
) {
	if (sale.salesRepId === actor.user.id) return;

	throw new TRPCError({
		code: "FORBIDDEN",
		message: "You can only transfer sales assigned to you.",
	});
}

function compactReason(reason: string | null | undefined) {
	const trimmed = reason?.trim();
	return trimmed ? trimmed : null;
}

function mapOrderSalesRep(
	salesRep:
		| {
				id: number;
				name: string | null;
				email: string | null;
		  }
		| null
		| undefined,
	salesRepId?: number | null,
) {
	if (!salesRep && !salesRepId) return null;
	const name = salesRep?.name || salesRep?.email || `User #${salesRepId}`;
	return {
		id: salesRep?.id ?? salesRepId ?? null,
		name,
		email: salesRep?.email ?? null,
		initials: getNameInitials(name),
	};
}

export async function getSalesRepTransferOptions(
	ctx: TRPCContext,
	input?: SalesRepOptionsSchema,
) {
	const actor = await loadSalesRepTransferActor(ctx);

	if (!input?.salesId) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Sale id is required.",
		});
	}

	const sale = await ctx.db.salesOrders.findFirst({
		where: {
			id: input.salesId,
			type: { in: ["order", "quote"] },
			deletedAt: null,
		},
		select: {
			salesRepId: true,
		},
	});

	if (!sale) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Sale not found.",
		});
	}

	assertCanTransferSalesRep(actor, sale);

	const users = await ctx.db.users.findMany({
		where: {
			deletedAt: null,
			accessRevokedAt: null,
			roles: {
				some: {
					deletedAt: null,
				},
			},
		},
		select: salesRepCandidateSelect,
		take: 250,
	});

	return users
		.filter(isSalesRepCandidate)
		.map(mapSalesRepOption)
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function transferSalesRep(
	ctx: TRPCContext,
	input: TransferSalesRepSchema,
) {
	const actor = await requirePasswordConfirmedActor(ctx, input.password);
	const reason = compactReason(input.reason);

	return ctx.db.$transaction(async (tx) => {
		const db = tx as SalesRepTransferDb;
		const sale = await db.salesOrders.findFirst({
			where: {
				id: input.salesId,
				type: { in: ["order", "quote"] },
				deletedAt: null,
			},
			select: {
				id: true,
				orderId: true,
				slug: true,
				salesRepId: true,
				salesRep: {
					select: {
						id: true,
						name: true,
						email: true,
					},
				},
			},
		});

		if (!sale) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Sale not found.",
			});
		}

		assertCanTransferSalesRep(actor, sale);

		const targetSalesRep = await findSalesRepCandidate(db, input.salesRepId);
		if (!targetSalesRep) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Select an active sales user.",
			});
		}

		const previousSalesRep = mapOrderSalesRep(sale.salesRep, sale.salesRepId);
		if (sale.salesRepId === targetSalesRep.id) {
			return {
				changed: false,
				order: {
					id: sale.id,
					orderId: sale.orderId,
					slug: sale.slug,
				},
				previousSalesRep,
				salesRep: targetSalesRep,
			};
		}

		await db.salesOrders.update({
			where: {
				id: sale.id,
			},
			data: {
				salesRepId: targetSalesRep.id,
			},
			select: {
				id: true,
			},
		});

		await db.salesHistory.create({
			data: {
				salesId: sale.id,
				name: "Sales rep transferred",
				authorName: actor.user.name || actor.user.email || "System",
				data: {
					type: "sales_rep_transfer",
					orderId: sale.orderId,
					previousSalesRep,
					nextSalesRep: targetSalesRep,
					reason,
					triggeredByUserId: actor.user.id,
					triggeredByUserName: actor.user.name || actor.user.email,
				},
			},
		});

		return {
			changed: true,
			order: {
				id: sale.id,
				orderId: sale.orderId,
				slug: sale.slug,
			},
			previousSalesRep,
			salesRep: targetSalesRep,
		};
	});
}
