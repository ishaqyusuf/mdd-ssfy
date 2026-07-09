import type {
	SalesRepOptionsSchema,
	TransferSalesRepSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import {
	checkPassword,
	getUserSpecificPermissions,
	mergePermissionRecords,
} from "@gnd/auth/utils";
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
	...salesRepCandidateSelect,
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

	const roleName = primaryRoleNameFor(user as SalesRepCandidateUser);
	const specificPermissions = await getUserSpecificPermissions(ctx.db, user.id);
	const can = generatePermissions(
		roleName,
		mergePermissionRecords(
			rolePermissionsFor(user as SalesRepCandidateUser),
			specificPermissions,
		),
	);

	return {
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			password: user.password,
		},
		roleTitle: roleName,
		can,
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
	order: { salesRepId: number | null },
) {
	if (actor.can.editOrders) return;
	if (order.salesRepId === actor.user.id) return;

	throw new TRPCError({
		code: "FORBIDDEN",
		message: "You can only transfer orders assigned to you.",
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

	if (!actor.can.editOrders) {
		if (!input?.salesId) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Order id is required.",
			});
		}

		const order = await ctx.db.salesOrders.findFirst({
			where: {
				id: input.salesId,
				type: "order",
				deletedAt: null,
			},
			select: {
				salesRepId: true,
			},
		});

		if (!order) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Order not found.",
			});
		}

		assertCanTransferSalesRep(actor, order);
	}

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
		const order = await db.salesOrders.findFirst({
			where: {
				id: input.salesId,
				type: "order",
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

		if (!order) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: "Order not found.",
			});
		}

		assertCanTransferSalesRep(actor, order);

		const targetSalesRep = await findSalesRepCandidate(db, input.salesRepId);
		if (!targetSalesRep) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Select an active sales user.",
			});
		}

		const previousSalesRep = mapOrderSalesRep(order.salesRep, order.salesRepId);
		if (order.salesRepId === targetSalesRep.id) {
			return {
				changed: false,
				order: {
					id: order.id,
					orderId: order.orderId,
					slug: order.slug,
				},
				previousSalesRep,
				salesRep: targetSalesRep,
			};
		}

		await db.salesOrders.update({
			where: {
				id: order.id,
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
				salesId: order.id,
				name: "Sales rep transferred",
				authorName: actor.user.name || actor.user.email || "System",
				data: {
					type: "sales_rep_transfer",
					orderId: order.orderId,
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
				id: order.id,
				orderId: order.orderId,
				slug: order.slug,
			},
			previousSalesRep,
			salesRep: targetSalesRep,
		};
	});
}
