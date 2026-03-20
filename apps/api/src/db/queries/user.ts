import type {
  LoginByTokenSchema,
  UpdateUserProfileSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { camel } from "@gnd/utils";
import { allPermissions, type ICan } from "@gnd/utils/constants";
import z from "zod";
import { loginAction, checkPassword } from "@gnd/auth/utils";
import { hashPassword } from "@gnd/utils/crypto";
import { TRPCError } from "@trpc/server";

// ─── Meta helpers ───────────────────────────────────────────

type UserMeta = Record<string, unknown>;

function parseMeta(raw: unknown): UserMeta {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as UserMeta;
  }
  return {};
}

export async function getAuthUser(ctx: TRPCContext) {
  const user = await ctx.db.users.findFirstOrThrow({
    where: {
      id: ctx.userId,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phoneNo: true,
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  const { roles, ...userData } = user;
  const role = roles?.[0]?.role;
  return {
    ...userData,
    role,
  };
}

export async function getProfile(ctx: TRPCContext) {
  const user = await ctx.db.users.findFirstOrThrow({
    where: { id: ctx.userId },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      phoneNo: true,
      meta: true,
      documents: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          meta: true,
          createdAt: true,
        },
      },
    },
  });

  const meta = parseMeta(user.meta);
  return {
    ...user,
    avatarUrl: meta.avatarUrl as string | null,
    notificationPreferences: (meta.notificationPreferences ?? {
      emailNotifications: true,
      smsNotifications: false,
      orderUpdates: true,
      dispatchAlerts: true,
      paymentAlerts: true,
      systemAnnouncements: true,
    }) as {
      emailNotifications: boolean;
      smsNotifications: boolean;
      orderUpdates: boolean;
      dispatchAlerts: boolean;
      paymentAlerts: boolean;
      systemAnnouncements: boolean;
    },
    documents: user.documents.map((doc) => ({
      ...doc,
      expiresAt: (parseMeta(doc.meta).expiresAt as string | null) ?? null,
    })),
  };
}

export async function updateProfile(
  ctx: TRPCContext,
  data: {
    name: string;
    username?: string | null;
    phoneNo?: string | null;
    avatarUrl?: string | null;
  },
) {
  const existing = await ctx.db.users.findFirstOrThrow({
    where: { id: ctx.userId },
    select: { meta: true },
  });
  const meta = parseMeta(existing.meta);
  if (data.avatarUrl !== undefined) {
    meta.avatarUrl = data.avatarUrl;
  }

  return ctx.db.users.update({
    where: { id: ctx.userId },
    data: {
      name: data.name,
      username: data.username,
      phoneNo: data.phoneNo,
      meta,
    },
    select: { id: true, name: true, username: true, phoneNo: true },
  });
}

export async function changePassword(
  ctx: TRPCContext,
  data: { currentPassword: string; newPassword: string },
) {
  const user = await ctx.db.users.findFirstOrThrow({
    where: { id: ctx.userId },
    select: { id: true, password: true },
  });

  if (!user.password) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No password set for this account.",
    });
  }

  await checkPassword(user.password, data.currentPassword);

  const hashed = await hashPassword(data.newPassword);
  await ctx.db.users.update({
    where: { id: ctx.userId },
    data: { password: hashed },
  });

  return { success: true };
}

export async function saveUserDocument(
  ctx: TRPCContext,
  data: {
    id?: number | null;
    title: string;
    url: string;
    description?: string | null;
    expiresAt?: string | null;
  },
) {
  const docMeta: Record<string, any> = {};
  if (data.expiresAt) {
    docMeta.expiresAt = data.expiresAt;
  }

  if (data.id) {
    return ctx.db.userDocuments.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        url: data.url,
        meta: docMeta,
      },
      select: { id: true, title: true, url: true, meta: true },
    });
  }

  return ctx.db.userDocuments.create({
    data: {
      title: data.title,
      description: data.description,
      url: data.url,
      userId: ctx.userId!,
      meta: docMeta,
    },
    select: { id: true, title: true, url: true, meta: true },
  });
}

export async function deleteUserDocument(ctx: TRPCContext, id: number) {
  await ctx.db.userDocuments.update({
    where: { id, userId: ctx.userId },
    data: { deletedAt: new Date() },
  });
  return { success: true };
}

export async function updateNotificationPreferences(
  ctx: TRPCContext,
  preferences: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    orderUpdates: boolean;
    dispatchAlerts: boolean;
    paymentAlerts: boolean;
    systemAnnouncements: boolean;
  },
) {
  const existing = await ctx.db.users.findFirstOrThrow({
    where: { id: ctx.userId },
    select: { meta: true },
  });
  const meta = parseMeta(existing.meta);
  meta.notificationPreferences = preferences;

  await ctx.db.users.update({
    where: { id: ctx.userId },
    data: { meta },
  });
  return { success: true };
}

export async function updateUserProfileAction(
  ctx: TRPCContext,
  data: UpdateUserProfileSchema,
) {
  // await saveEmployee(ctx, {
  //   id: ctx.userId,
  //   name: data.name,
  //   username: data.username,
  //   // email: ctx.db.
  // });
}

export async function getLoginByToken(
  ctx: TRPCContext,
  data: LoginByTokenSchema,
) {
  const token = await ctx.db.emailTokenLogin.findFirst({
    where: {
      id: data.token,
    },
    select: {
      id: true,
      createdAt: true,
      userId: true,
    },
  });
  const user = await ctx.db.users.findUnique({
    where: {
      id: token?.userId,
    },
    select: {
      id: true,
      email: true,
    },
  });
  return {
    email: user?.email,
  };
}
export async function getLoggedInDevices(ctx: TRPCContext) {
  const { db } = ctx;

  return db.session.findMany({
    where: {
      userId: ctx.userId,
      expires: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      sessionToken: true,
      expires: true,
    },
  });
}

/*
auth: publicProcedure
      .input(authSchema)
      .mutation(async (props) => {
        return auth(props.ctx, props.input);
      }),
*/

export async function auth(ctx: TRPCContext) {
  const { db } = ctx;
  const user = await getAuthUser(ctx);
  const can = await userPermissions(ctx, user!?.role!?.id);
  return {
    ...user,
    can,
  };
}
async function userPermissions(ctx: TRPCContext, roleId) {
  // const _role = user?.roles[0]?.role;
  // const permissionIds =
  //   _role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
  // const { RoleHasPermissions = [], ...role } = _role || ({} as any);

  const role = await ctx.db.roles.findFirstOrThrow({
    where: {
      id: roleId,
    },
    select: {
      name: true,
      RoleHasPermissions: {
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const permissions = role.RoleHasPermissions.map((a) => a.permission).flat();

  let can: ICan = {} as any;
  if (role.name?.toLocaleLowerCase() == "super admin") {
    can = Object.fromEntries(allPermissions()?.map((p) => [p as any, true]));
  } else
    permissions.map((p) => {
      can[camel(p.name) as any] = true;
    });
  return can;
}

/*

*/
export const loginSchema = z.object({
  email: z.string(),
  password: z.string(),
});
export type LoginSchema = z.infer<typeof loginSchema>;

export async function login(ctx: TRPCContext, query: LoginSchema) {
  const { db } = ctx;
  const data = await loginAction(db, {
    ...query,
  });

  return data;
}
