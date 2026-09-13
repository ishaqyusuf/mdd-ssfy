import { createHash } from "node:crypto";
import { USER_PERMISSION_MODEL_TYPE_ALIASES } from "@gnd/auth/utils";

export const SALES_REQUEST_PERMISSION_AUTHORITY_SCHEMA_VERSION = 1 as const;

type RevisionValue = Date | string | null;

type PermissionRow = {
	id: number;
	name: string;
	updatedAt: RevisionValue;
	deletedAt: RevisionValue;
};

type RoleGrantRow = {
	permissionId: number;
	deletedAt: RevisionValue;
	permission: PermissionRow;
};

type UserRoleRow = {
	roleId: number;
	organizationId: number;
	deletedAt: RevisionValue;
	role: {
		id: number;
		name: string;
		updatedAt: RevisionValue;
		deletedAt: RevisionValue;
		RoleHasPermissions: RoleGrantRow[];
	};
};

type UserRow = {
	id: number;
	updatedAt: RevisionValue;
	deletedAt: RevisionValue;
	accessRevokedAt: RevisionValue;
	roles: UserRoleRow[];
};

type DirectGrantRow = {
	permissionId: number;
	modelType: string;
	modelId: bigint;
	deletedAt: RevisionValue;
	permissions: PermissionRow;
};

export type SalesRequestPermissionAuthorityDatabase = {
	users: {
		findMany: (args: {
			where: {
				id: number;
				deletedAt: null;
				accessRevokedAt: null;
			};
			select: Record<string, unknown>;
			take: 2;
		}) => Promise<UserRow[]>;
	};
	modelHasPermissions: {
		findMany: (args: {
			where: {
				modelId: bigint;
				modelType: { in: string[] };
				deletedAt: null;
				permissions: { deletedAt: null };
			};
			select: Record<string, unknown>;
		}) => Promise<DirectGrantRow[]>;
	};
};

export type SalesRequestPermissionAuthorityIssueCode =
	| "actor-invalid"
	| "surface-invalid"
	| "actor-not-found"
	| "actor-ambiguous"
	| "actor-stale"
	| "permission-evidence-stale"
	| "permission-denied";

export type SalesRequestPermissionAuthorityResult =
	| {
			ok: true;
			issues: [];
			authority: {
				schemaVersion: typeof SALES_REQUEST_PERMISSION_AUTHORITY_SCHEMA_VERSION;
				actorUserId: number;
				surface: "order" | "quote";
				allowed: true;
				grant: "super-admin" | "editOrders";
				revision: string;
			};
	  }
	| {
			ok: false;
			issues: Array<{ code: SalesRequestPermissionAuthorityIssueCode }>;
			authority: null;
	  };

function positiveInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function issue(code: SalesRequestPermissionAuthorityIssueCode) {
	return { code } as const;
}

function canonicalTimestamp(value: RevisionValue) {
	if (value instanceof Date) return value.toISOString();
	return value;
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return typeof value === "bigint"
			? JSON.stringify(value.toString())
			: (JSON.stringify(value) ?? "null");
	}
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
		.join(",")}}`;
}

function revisionFor(value: unknown) {
	return `pa1:${createHash("sha256")
		.update("gnd:sales-request-permission-authority:v1\0")
		.update(stableJson(value))
		.digest("hex")}`;
}

function permissionValid(permission: PermissionRow) {
	return (
		positiveInteger(permission.id) &&
		typeof permission.name === "string" &&
		permission.name.trim() === permission.name &&
		permission.name.length > 0 &&
		permission.deletedAt == null
	);
}

/** Resolve the exact current actor permission used by native request generation. */
export async function resolveSalesRequestPermissionAuthority(input: {
	db: SalesRequestPermissionAuthorityDatabase;
	actorUserId: number;
	surface: "order" | "quote";
}): Promise<SalesRequestPermissionAuthorityResult> {
	if (!positiveInteger(input.actorUserId)) {
		return { ok: false, issues: [issue("actor-invalid")], authority: null };
	}
	if (input.surface !== "order" && input.surface !== "quote") {
		return { ok: false, issues: [issue("surface-invalid")], authority: null };
	}

	const [users, directGrants] = await Promise.all([
		input.db.users.findMany({
			where: {
				id: input.actorUserId,
				deletedAt: null,
				accessRevokedAt: null,
			},
			select: {
				id: true,
				updatedAt: true,
				deletedAt: true,
				accessRevokedAt: true,
				roles: {
					where: { deletedAt: null },
					select: {
						roleId: true,
						organizationId: true,
						deletedAt: true,
						role: {
							select: {
								id: true,
								name: true,
								updatedAt: true,
								deletedAt: true,
								RoleHasPermissions: {
									where: { deletedAt: null },
									select: {
										permissionId: true,
										deletedAt: true,
										permission: {
											select: {
												id: true,
												name: true,
												updatedAt: true,
												deletedAt: true,
											},
										},
									},
								},
							},
						},
					},
				},
			},
			take: 2,
		}),
		input.db.modelHasPermissions.findMany({
			where: {
				modelId: BigInt(input.actorUserId),
				modelType: { in: [...USER_PERMISSION_MODEL_TYPE_ALIASES] },
				deletedAt: null,
				permissions: { deletedAt: null },
			},
			select: {
				permissionId: true,
				modelType: true,
				modelId: true,
				deletedAt: true,
				permissions: {
					select: {
						id: true,
						name: true,
						updatedAt: true,
						deletedAt: true,
					},
				},
			},
		}),
	]);

	if (users.length === 0) {
		return { ok: false, issues: [issue("actor-not-found")], authority: null };
	}
	if (users.length !== 1) {
		return { ok: false, issues: [issue("actor-ambiguous")], authority: null };
	}
	const user = users[0];
	if (
		!user ||
		user.id !== input.actorUserId ||
		user.deletedAt != null ||
		user.accessRevokedAt != null
	) {
		return { ok: false, issues: [issue("actor-stale")], authority: null };
	}

	let evidenceStale = false;
	const roleEvidence = user.roles.map((membership) => {
		if (
			membershipInvalid(membership) ||
			membership.role.RoleHasPermissions.some(
				(grant) =>
					grant.deletedAt != null ||
					grant.permissionId !== grant.permission.id ||
					!permissionValid(grant.permission),
			)
		) {
			evidenceStale = true;
		}
		return {
			roleId: membership.roleId,
			organizationId: membership.organizationId,
			name: membership.role.name,
			updatedAt: canonicalTimestamp(membership.role.updatedAt),
			permissions: membership.role.RoleHasPermissions.map((grant) => ({
				id: grant.permission.id,
				name: grant.permission.name,
				updatedAt: canonicalTimestamp(grant.permission.updatedAt),
			})),
		};
	});
	const directEvidence = directGrants.map((grant) => {
		if (
			grant.deletedAt != null ||
			grant.modelId !== BigInt(input.actorUserId) ||
			!USER_PERMISSION_MODEL_TYPE_ALIASES.includes(
				grant.modelType as (typeof USER_PERMISSION_MODEL_TYPE_ALIASES)[number],
			) ||
			grant.permissionId !== grant.permissions.id ||
			!permissionValid(grant.permissions)
		) {
			evidenceStale = true;
		}
		return {
			permissionId: grant.permissionId,
			modelType: grant.modelType,
			name: grant.permissions.name,
			updatedAt: canonicalTimestamp(grant.permissions.updatedAt),
		};
	});
	if (evidenceStale) {
		return {
			ok: false,
			issues: [issue("permission-evidence-stale")],
			authority: null,
		};
	}

	const superAdmin = roleEvidence.some(
		(role) => role.name.trim().toLowerCase() === "super admin",
	);
	const editOrders = [
		...roleEvidence.flatMap((role) => role.permissions),
		...directEvidence,
	].some((permission) => permission.name === "editOrders");
	const grant = superAdmin ? "super-admin" : editOrders ? "editOrders" : null;
	if (!grant) {
		return { ok: false, issues: [issue("permission-denied")], authority: null };
	}
	const revision = revisionFor({
		schemaVersion: SALES_REQUEST_PERMISSION_AUTHORITY_SCHEMA_VERSION,
		actorUserId: user.id,
		surface: input.surface,
		userUpdatedAt: canonicalTimestamp(user.updatedAt),
		roles: roleEvidence.sort((left, right) =>
			stableJson(left).localeCompare(stableJson(right)),
		),
		direct: directEvidence.sort((left, right) =>
			stableJson(left).localeCompare(stableJson(right)),
		),
	});
	return {
		ok: true,
		issues: [],
		authority: {
			schemaVersion: SALES_REQUEST_PERMISSION_AUTHORITY_SCHEMA_VERSION,
			actorUserId: user.id,
			surface: input.surface,
			allowed: true,
			grant,
			revision,
		},
	};
}

function membershipInvalid(membership: UserRoleRow) {
	return (
		!positiveInteger(membership.roleId) ||
		!positiveInteger(membership.organizationId) ||
		membership.deletedAt != null ||
		membership.role.id !== membership.roleId ||
		membership.role.deletedAt != null ||
		typeof membership.role.name !== "string" ||
		membership.role.name.trim().length === 0
	);
}
