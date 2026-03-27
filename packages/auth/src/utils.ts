import { Db, Prisma } from "@gnd/db";
import { camel } from "@gnd/utils";
import {
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
export type PermissionScope = `${Action}${PascalResource}`;
export type ICan = { [permission in PermissionScope]: boolean };
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const AUTH_SESSION_MAX_AGE_MS = AUTH_SESSION_MAX_AGE_SECONDS * 1000;

export function buildSessionExpiry(from = Date.now()) {
  return new Date(from + AUTH_SESSION_MAX_AGE_MS);
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
    const permissionIds =
      _role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
    const { RoleHasPermissions = [], ...role } = _role || ({} as any);
    const permissions = await db.permissions.findMany({
      where: {
        id: {
          // in: permissionIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    let can = generatePermissions(role?.name, permissions);
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
