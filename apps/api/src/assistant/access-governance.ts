import {
	ASSISTANT_ACCESS_PERMISSION,
	USER_PERMISSION_MODEL_TYPE,
	USER_PERMISSION_MODEL_TYPE_ALIASES,
	getAssistantPermissionSource,
} from "@gnd/auth/utils";
import type { Database } from "@gnd/db";
import type { AssistantAccessState } from "@gnd/db/queries";
import { z } from "zod";

export const assistantDirectPermissionSchema = z
	.object({
		userId: z.number().int().positive(),
		enabled: z.boolean(),
	})
	.strict();

export type { AssistantAccessState };

export class AssistantAccessDisabledError extends Error {
	readonly code = "FORBIDDEN";
	constructor() {
		super("Assistant access is disabled");
		this.name = "AssistantAccessDisabledError";
	}
}

export async function getAssistantAccessState(
	db: Database,
	userId: number,
): Promise<AssistantAccessState> {
	const { enabled } = await getAssistantPermissionSource(db, userId);
	return {
		enabled,
		status: enabled ? "enabled" : "disabled",
		expiresAt: null,
		version: 0,
	};
}

async function ensureAssistantPermission(db: Database) {
	const existing = await db.permissions.findFirst({
		where: { name: ASSISTANT_ACCESS_PERMISSION, deletedAt: null },
		select: { id: true },
	});
	if (existing) return existing.id;
	const created = await db.permissions.create({
		data: { name: ASSISTANT_ACCESS_PERMISSION },
		select: { id: true },
	});
	return created.id;
}

export async function setAssistantDirectPermission(
	db: Database,
	input: z.infer<typeof assistantDirectPermissionSchema>,
) {
	const user = await db.users.findFirst({
		where: { id: input.userId, deletedAt: null, accessRevokedAt: null },
		select: { id: true },
	});
	if (!user) throw new Error("Employee not found or access revoked");
	const permissionId = await ensureAssistantPermission(db);
	if (input.enabled) {
		await db.modelHasPermissions.upsert({
			where: {
				permissionId_modelId_modelType: {
					permissionId,
					modelId: BigInt(input.userId),
					modelType: USER_PERMISSION_MODEL_TYPE,
				},
			},
			update: { deletedAt: null },
			create: {
				permissionId,
				modelId: BigInt(input.userId),
				modelType: USER_PERMISSION_MODEL_TYPE,
			},
		});
	} else {
		await db.modelHasPermissions.deleteMany({
			where: {
				permissionId,
				modelId: BigInt(input.userId),
				modelType: { in: [...USER_PERMISSION_MODEL_TYPE_ALIASES] },
			},
		});
	}
	return getAssistantPermissionSource(db, input.userId);
}

export async function listAssistantPermissions(
	db: Database,
	input: { search?: string; take: number },
) {
	const search = input.search?.trim();
	const users = await db.users.findMany({
		where: {
			deletedAt: null,
			...(search
				? {
						OR: [
							{ name: { contains: search } },
							{ email: { contains: search } },
						],
					}
				: {}),
		},
		take: input.take,
		orderBy: [{ name: "asc" }, { id: "asc" }],
		select: {
			id: true,
			name: true,
			email: true,
			accessRevokedAt: true,
			roles: {
				where: {
					deletedAt: null,
					organization: { deletedAt: null },
					role: { deletedAt: null },
				},
				select: {
					role: {
						select: {
							name: true,
							RoleHasPermissions: {
								where: {
									deletedAt: null,
									permission: {
										name: ASSISTANT_ACCESS_PERMISSION,
										deletedAt: null,
									},
								},
								select: { permissionId: true },
							},
						},
					},
				},
			},
		},
	});
	const direct = users.length
		? await db.modelHasPermissions.findMany({
				where: {
					modelId: { in: users.map((user) => BigInt(user.id)) },
					modelType: { in: [...USER_PERMISSION_MODEL_TYPE_ALIASES] },
					deletedAt: null,
					permissions: { name: ASSISTANT_ACCESS_PERMISSION, deletedAt: null },
				},
				select: { modelId: true },
			})
		: [];
	const directlyGrantedIds = new Set(
		direct.map(({ modelId }) => Number(modelId)),
	);
	return users.map(({ roles, ...user }) => {
		const superAdmin = roles.some(
			({ role }) => role.name.toLowerCase() === "super admin",
		);
		const inherited = roles.some(
			({ role }) => role.RoleHasPermissions.length > 0,
		);
		const directlyGranted = directlyGrantedIds.has(user.id);
		return {
			...user,
			superAdmin,
			inherited,
			directlyGranted,
			enabled:
				!user.accessRevokedAt && (superAdmin || inherited || directlyGranted),
		};
	});
}
