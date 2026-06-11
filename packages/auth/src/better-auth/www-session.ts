import { type Roles, type Users, db } from "@gnd/db";
import { generatePermissions } from "@gnd/utils/constants";
import {
  type ICan,
  getUserSpecificPermissions,
  mergePermissionRecords,
} from "../utils";

export const STANDARD_WEB_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;
export const REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const WEB_AUTH_SESSION_MAX_AGE_SECONDS =
  REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS;
export const STANDARD_WEB_SESSION_REFRESH_WINDOW_SECONDS = 60 * 60;
export const REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_SECONDS = 60 * 60 * 24;

export type WebActiveSessionInfo = {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  expires: Date | null;
};

export type WebAppSession = {
  user: Users;
  can: ICan;
  role: Roles | null;
  activeSession?: WebActiveSessionInfo | null;
  rememberMe?: boolean;
};

export type WebMobileAuthSession = WebAppSession & {
  sessionId: string;
  token: string;
};

type BetterAuthSessionLike = {
  session?: {
    createdAt?: Date;
    expiresAt?: Date | null;
    id?: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  } | null;
  user?: {
    id?: string;
  } | null;
} | null;

export function toMobileAuthSession(
  token: string,
  session: WebAppSession,
): WebMobileAuthSession | null {
  const sessionId = session.activeSession?.id;
  if (!sessionId) return null;

  return {
    ...session,
    sessionId,
    token,
  };
}

async function buildPermissions(user: Users & { roles: Array<any> }) {
  const _role = user.roles[0]?.role;
  const rolePermissions = await db.permissions.findMany({
    where: {
      id: {
        in: (_role?.RoleHasPermissions ?? []).map((item) => item.permissionId),
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
  const role = _role
    ? (({ RoleHasPermissions: _permissions, ...rest }) => rest)(_role)
    : null;

  return {
    can,
    role: role as Roles | null,
  };
}

export async function getLegacyUserByAuthUserId(authUserId: string) {
  const authUser = await db.webAuthUser.findUnique({
    where: { id: authUserId },
    select: { legacyUserId: true },
  });

  if (!authUser) return null;

  return db.users.findFirst({
    where: {
      id: authUser.legacyUserId,
      accessRevokedAt: null,
      deletedAt: null,
    },
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
}

export async function buildWebAppSession(
  authSession: BetterAuthSessionLike,
): Promise<WebAppSession | null> {
  if (!authSession?.session?.id || !authSession.user?.id) {
    return null;
  }

  const user = await getLegacyUserByAuthUserId(authSession.user.id);
  if (!user) {
    await db.webAuthSession.deleteMany({
      where: { id: authSession.session.id },
    });
    return null;
  }

  const { can, role } = await buildPermissions(user);
  const activeSession = {
    id: authSession.session.id,
    ipAddress: authSession.session.ipAddress ?? null,
    userAgent: authSession.session.userAgent ?? null,
    expires: authSession.session.expiresAt ?? null,
  } satisfies WebActiveSessionInfo;
  const createdAt = authSession.session.createdAt?.getTime?.() ?? Date.now();
  const expiresAt =
    authSession.session.expiresAt?.getTime?.() ??
    createdAt + STANDARD_WEB_SESSION_MAX_AGE_SECONDS * 1000;
  const rememberMe =
    expiresAt - createdAt > STANDARD_WEB_SESSION_MAX_AGE_SECONDS * 1000;

  return {
    user,
    can,
    role,
    activeSession,
    rememberMe,
  };
}

export async function buildWebAppSessionByToken(
  token: string,
): Promise<WebMobileAuthSession | null> {
  const session = await db.webAuthSession.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.webAuthSession.deleteMany({
      where: { id: session.id },
    });
    return null;
  }

  const appSession = await buildWebAppSession({
    session,
    user: session.user,
  });

  return appSession ? toMobileAuthSession(token, appSession) : null;
}
