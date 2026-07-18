import type {
	ClearMasterPasswordLoginAuditsInput,
	ListMasterPasswordLoginAuditsInput,
} from "@api/schemas/master-password-login-audits";
import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { TRPCError } from "@trpc/server";

const auditSelect = {
	id: true,
	targetUserId: true,
	targetUserName: true,
	targetUserEmail: true,
	appSurface: true,
	platform: true,
	ipAddress: true,
	countryCode: true,
	browser: true,
	userAgent: true,
	sessionId: true,
	loginAt: true,
	clearedAt: true,
	clearedBySuperAdminId: true,
	createdAt: true,
	updatedAt: true,
	targetUser: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
	clearedBySuperAdmin: {
		select: {
			id: true,
			name: true,
			email: true,
		},
	},
} satisfies Prisma.MasterPasswordLoginAuditSelect;

async function requireActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized",
		});
	}

	const actor = await ctx.db.users.findFirst({
		where: {
			id: ctx.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: {
			id: true,
			name: true,
			email: true,
			roles: {
				where: {
					deletedAt: null,
				},
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

	if (!actor) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "Unauthorized",
		});
	}

	return actor;
}

async function requireSuperAdmin(ctx: TRPCContext) {
	const actor = await requireActor(ctx);
	const role = actor.roles?.[0]?.role?.name;

	if (role?.toLowerCase() !== "super admin") {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can access master password login audits.",
		});
	}

	return actor;
}

function buildAuditWhere(
	input: Pick<
		ListMasterPasswordLoginAuditsInput,
		"includeCleared" | "platform" | "q"
	>,
) {
	const where: Prisma.MasterPasswordLoginAuditWhereInput = {
		deletedAt: null,
	};

	if (!input.includeCleared) {
		where.clearedAt = null;
	}

	if (input.platform) {
		where.platform = input.platform;
	}

	const query = input.q?.trim();
	if (query) {
		where.OR = [
			{ targetUserName: { contains: query } },
			{ targetUserEmail: { contains: query } },
			{ ipAddress: { contains: query } },
			{ countryCode: { contains: query } },
			{ browser: { contains: query } },
			{ userAgent: { contains: query } },
			{ sessionId: { contains: query } },
		];
	}

	return where;
}

export async function listMasterPasswordLoginAudits(
	ctx: TRPCContext,
	input: ListMasterPasswordLoginAuditsInput = {},
) {
	await requireSuperAdmin(ctx);

	const page = Math.max(1, input.page || 1);
	const size = Math.min(100, Math.max(1, input.size || 25));
	const where = buildAuditWhere(input);

	const [rows, total] = await Promise.all([
		ctx.db.masterPasswordLoginAudit.findMany({
			where,
			orderBy: {
				loginAt: "desc",
			},
			take: size,
			skip: (page - 1) * size,
			select: auditSelect,
		}),
		ctx.db.masterPasswordLoginAudit.count({
			where,
		}),
	]);

	return {
		rows,
		total,
		page,
		size,
		pageCount: Math.max(1, Math.ceil(total / size)),
	};
}

export async function clearMasterPasswordLoginAudits(
	ctx: TRPCContext,
	input: ClearMasterPasswordLoginAuditsInput,
) {
	const actor = await requireSuperAdmin(ctx);
	const where = buildAuditWhere({
		q: input.q,
		platform: input.platform,
		includeCleared: false,
	});

	if (input.ids?.length) {
		where.id = {
			in: input.ids,
		};
	}

	return ctx.db.masterPasswordLoginAudit.updateMany({
		where,
		data: {
			clearedAt: new Date(),
			clearedBySuperAdminId: actor.id,
		},
	});
}
