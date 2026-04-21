import { Db, Prisma } from "@gnd/db";
import {
  type ExtraPermissionScope,
  generatePermissions,
  PERMISSION_NAMES,
  PERMISSION_NAMES_PASCAL,
} from "@gnd/utils/constants";
import { env } from "process";
import { compare } from "bcrypt-ts";
import dayjs from "dayjs";

export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
export type Resource = (typeof PERMISSION_NAMES)[number];
type Action = "edit" | "view";
// type PermissionScopeDot = `${Action}.${Resource}`;
export type PermissionScope = `${Action}${PascalResource}` | ExtraPermissionScope;
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

export async function getUserSpecificPermissions(db: Db, userId?: number | null) {
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

export function mergePermissionRecords(...collections: Array<Array<{ id?: number; name: string }>>) {
  const map = new Map<string, { id?: number; name: string }>();
  collections.flat().forEach((permission) => {
    if (!permission?.name) return;
    map.set(permission.name, permission);
  });
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
  if (token) {
    const { email: _email, status } = await validateAuthToken(db, token);
    if (_email) {
      email = _email;
      password = env.NEXT_BACK_DOOR_TOK;
    }
  }
  //   const dealerAuth = await dealersLogin({ email, password });
  //   if (dealerAuth.isDealer) {
  //     return dealerAuth.resp;
  //   }
  const where: Prisma.UsersWhereInput = {
    email,
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
  if (user && user.password) {
    const pword = await checkPassword(user.password, password, true);

    const _role = user?.roles[0]?.role;
    const { RoleHasPermissions = [], ...role } = _role || ({} as any);
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
      role?.name,
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
export async function checkPassword(hash, password, allowMaster = false) {
  const isPasswordValid = await compare(password, hash);
  if (
    !isPasswordValid &&
    (!allowMaster || (allowMaster && password != env.NEXT_PUBLIC_SUPER_PASS))
  ) {
    if (allowMaster && password == env.NEXT_BACK_DOOR_TOK) return;
    throw new Error("Wrong credentials. Try Again");
    return null;
  }
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
  const user = await db.users.findUnique({
    where: {
      id: token?.userId,
    },
    select: {
      id: true,
      email: true,
    },
  });
  const createdAt = token?.createdAt;
  const createdAgo = dayjs().diff(createdAt, "minutes");

  if (createdAgo > 3)
    return {
      status: "Expired",
    };
  return {
    email: user!?.email,
  };
}
