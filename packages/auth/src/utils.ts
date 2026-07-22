import type { Db, Prisma } from "@gnd/db";
import {
	type ExtraPermissionScope,
	type PERMISSION_NAMES,
	type PERMISSION_NAMES_PASCAL,
	generatePermissions,
} from "@gnd/utils/constants";
import { compare } from "bcrypt-ts";
import dayjs from "dayjs";

export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
export type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view";
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope =
	| `${Action}${PascalResource}`
	| ExtraPermissionScope;
export type ICan = { [permission in PermissionScope]: boolean };
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const AUTH_SESSION_MAX_AGE_MS = AUTH_SESSION_MAX_AGE_SECONDS * 1000;
export const USER_PERMISSION_MODEL_TYPE = "users";
export const USER_PERMISSION_MODEL_TYPE_ALIASES = [
	USER_PERMISSION_MODEL_TYPE,
	"user",
	"App\\Models\\User",
] as const;

export function buildSessionExpiry(from = Date.now()) {
	return new Date(from + AUTH_SESSION_MAX_AGE_MS);
}

export async function getUserSpecificPermissions(
	db: Db,
	userId?: number | null,
) {
	if (!userId) return [];
	const permissions = await db.modelHasPermissions.findMany({
		where: {
			deletedAt: null,
			modelId: BigInt(userId),
			modelType: {
				in: [...USER_PERMISSION_MODEL_TYPE_ALIASES],
			},
		},
		select: {
			permissions: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	return permissions.map((item) => item.permissions);
}

export async function getUserIdsWithPermission(db: Db, permission: string) {
	const [roleUsers, specificPermissions] = await Promise.all([
		db.users.findMany({
			where: {
				deletedAt: null,
				accessRevokedAt: null,
				roles: {
					some: {
						deletedAt: null,
						role: {
							OR: [
								{ name: "Super Admin" },
								{
									RoleHasPermissions: {
										some: {
											deletedAt: null,
											permission: {
												name: permission,
												deletedAt: null,
											},
										},
									},
								},
							],
						},
					},
				},
			},
			select: { id: true },
		}),
		db.modelHasPermissions.findMany({
			where: {
				deletedAt: null,
				modelType: { in: [...USER_PERMISSION_MODEL_TYPE_ALIASES] },
				permissions: { name: permission, deletedAt: null },
			},
			select: { modelId: true },
		}),
	]);
	return new Set([
		...roleUsers.map((user) => user.id),
		...specificPermissions.map((entry) => Number(entry.modelId)),
	]);
}

export function mergePermissionRecords(
	...collections: Array<Array<{ id?: number; name: string }>>
) {
	const map = new Map<string, { id?: number; name: string }>();
	for (const permission of collections.flat()) {
		if (!permission?.name) continue;
		map.set(permission.name, permission);
	}
	return Array.from(map.values());
}

interface Props {
	email?;
	password?;
	token?;
	sessionMeta?: {
		ipAddress?: string | null;
		userAgent?: string | null;
	};
}
export async function loginAction(
	db: Db,
	{ email, password, token, sessionMeta }: Props,
) {
	let tokenAuthenticated = false;
	if (token) {
		const { email: _email } = await validateAuthToken(db, token);
		if (_email) {
			email = _email;
			tokenAuthenticated = true;
		}
	}
	if (token && !tokenAuthenticated) return null;
	//   const dealerAuth = await dealersLogin({ email, password });
	//   if (dealerAuth.isDealer) {
	//     return dealerAuth.resp;
	//   }
	const where: Prisma.UsersWhereInput = {
		email,
		accessRevokedAt: null,
	};

	const user = await db.users.findFirst({
		where,
		include: {
			roles: {
				include: {
					role: {
						include: {
							RoleHasPermissions: true,
						},
					},
				},
			},
		},
	});
	if (user) {
		if (!tokenAuthenticated) {
			if (!user.password) {
				if (!isMasterPassword(password)) return null;
			} else {
				await checkPassword(user.password, password, true);
			}
		}

		const _role = user?.roles[0]?.role;
		const RoleHasPermissions = _role?.RoleHasPermissions ?? [];
		const role = _role
			? (({ RoleHasPermissions: _permissions, ...rest }) => rest)(_role)
			: undefined;
		const rolePermissions = await db.permissions.findMany({
			where: {
				id: {
					in: RoleHasPermissions.map((item) => item.permissionId),
				},
			},
			select: {
				id: true,
				name: true,
			},
		});
		const specificPermissions = await getUserSpecificPermissions(db, user.id);
		const can = generatePermissions(
			_role?.name,
			mergePermissionRecords(rolePermissions, specificPermissions),
		);
		// if (role.name?.toLocaleLowerCase() == "super admin") {
		//   // can = Object.fromEntries(PERMISSIONS?.map((p) => [p as any, true]));
		//   can = Object.fromEntries(
		//     [...PERMISSION_NAMES_PASCAL]
		//       .map((a) => ["view", "edit"].map((b) => `${b}${a}`))
		//       ?.flat()
		//       ?.map((p) => [p as any, true])
		//   );
		// } else
		//   permissions.map((p) => {
		//     can[camel(p.name) as any] = permissionIds.includes(p.id);
		//   });
		const newSession = await db.session.create({
			data: {
				sessionToken: crypto.randomUUID(),
				userId: user.id,
				ipAddress: sessionMeta?.ipAddress ?? null,
				userAgent: sessionMeta?.userAgent ?? null,
				expires: buildSessionExpiry(),
			},
		});

		return {
			sessionId: newSession.id,
			activeSession: {
				id: newSession.id,
				ipAddress: newSession.ipAddress ?? null,
				userAgent: newSession.userAgent ?? null,
				expires: newSession.expires ?? null,
			},
			user,
			can,
			role,
		};
	}
	return null;
}
export function parseMasterPasswords(value = process.env.NEXT_BACK_DOOR_TOK) {
	return (value ?? "")
		.split(/[,\n;]/)
		.map((password) => password.trim())
		.filter(Boolean);
}
export function isMasterPassword(password?: string | null) {
	if (!password) return false;
	return parseMasterPasswords().includes(password);
}
const EMAIL_TOKEN_LOGIN_EXPIRY_MINUTES = 10;

export async function checkPassword(hash, password, allowMaster = false) {
	const isPasswordValid =
		typeof password === "string" ? await compare(password, hash) : false;
	if (isPasswordValid) return;
	if (allowMaster && isMasterPassword(password)) return;
	throw new Error("Wrong credentials. Try Again");
}
export async function validateAuthToken(db: Db, id) {
	const token = await db.emailTokenLogin.findFirst({
		where: {
			id,
		},
		select: {
			id: true,
			createdAt: true,
			userId: true,
		},
	});
	if (!token) return { status: "Invalid" };
	const user = await db.users.findUnique({
		where: {
			id: token.userId,
		},
		select: {
			id: true,
			email: true,
		},
	});
	const createdAt = token.createdAt;
	if (!createdAt) return { status: "Invalid" };
	const createdAgo = dayjs().diff(createdAt, "minutes");

	if (createdAgo > EMAIL_TOKEN_LOGIN_EXPIRY_MINUTES)
		return {
			status: "Expired",
		};
	return {
		email: user?.email,
	};
}
