import type { Db } from "@gnd/db";

const SUPER_ADMIN_ROLE = "Super Admin";

const activeUserWhere = {
	deletedAt: null,
	accessRevokedAt: null,
} as const;

export type SalesHandoffActorScope =
	| { kind: "REPRESENTATIVE"; actorUserId: number }
	| { kind: "SUPER_ADMIN"; actorUserId: number; organizationIds: number[] };

export async function getSalesHandoffActorScope(
	db: Db,
	actorUserId: number,
): Promise<SalesHandoffActorScope> {
	const actor = await db.users.findFirst({
		where: { id: actorUserId, ...activeUserWhere },
		select: {
			id: true,
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
				select: { organizationId: true, role: { select: { name: true } } },
			},
		},
	});
	if (!actor) throw new Error("Sales handoff actor is not active.");
	const organizationIds = Array.from(
		new Set(
			actor.roles
				.filter((assignment) => assignment.role.name === SUPER_ADMIN_ROLE)
				.map((assignment) => assignment.organizationId),
		),
	).sort((left, right) => left - right);
	return organizationIds.length
		? { kind: "SUPER_ADMIN", actorUserId, organizationIds }
		: { kind: "REPRESENTATIVE", actorUserId };
}

export async function resolveSalesHandoffOrganizationScope(
	db: Db,
	input: {
		orderOrganizationId?: number | null;
		responsibleRepId?: number | null;
	},
) {
	if (input.orderOrganizationId != null) {
		return {
			organizationId: input.orderOrganizationId,
			source: "ORDER" as const,
		};
	}
	if (input.responsibleRepId == null) {
		return { organizationId: null, source: "MISSING" as const };
	}
	const rep = await db.users.findFirst({
		where: { id: input.responsibleRepId, ...activeUserWhere },
		select: {
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
				select: { organizationId: true },
			},
		},
	});
	const organizations = Array.from(
		new Set(rep?.roles.map((assignment) => assignment.organizationId) ?? []),
	);
	return organizations.length === 1
		? {
				organizationId: organizations[0] ?? null,
				source: "REPRESENTATIVE" as const,
			}
		: {
				organizationId: null,
				source: organizations.length
					? ("AMBIGUOUS" as const)
					: ("MISSING" as const),
			};
}

export async function getActiveSalesHandoffSuperAdmins(
	db: Db,
	organizationId: number,
) {
	return db.users.findMany({
		where: {
			...activeUserWhere,
			roles: {
				some: {
					organizationId,
					deletedAt: null,
					role: { name: SUPER_ADMIN_ROLE, deletedAt: null },
				},
			},
		},
		select: { id: true, name: true, email: true },
		orderBy: { id: "asc" },
	});
}
