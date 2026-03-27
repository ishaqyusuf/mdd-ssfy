import type {
  LoginByTokenSchema,
  UpdateUserProfileSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { checkPassword, loginAction } from "@gnd/auth/utils";
import { Notifications } from "@gnd/notifications";
import { camel, consoleLog } from "@gnd/utils";
import {
  type ICan,
  allPermissions,
  generatePermissions,
} from "@gnd/utils/constants";
import { noteTag, saveNote } from "@gnd/utils/note";
import { hashPassword } from "@gnd/utils/crypto";
import {
  isInsuranceDocumentTitle,
  parseInsuranceDocumentMeta,
} from "@gnd/utils/insurance-documents";
import { TRPCError } from "@trpc/server";
import z from "zod";

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
      expiresAt:
        (parseInsuranceDocumentMeta(doc.meta).expiresAt as string | null) ??
        null,
      status:
        (parseInsuranceDocumentMeta(doc.meta).status as string | null) ??
        (isInsuranceDocumentTitle(doc.title) ? "pending" : null),
      approvedAt:
        (parseInsuranceDocumentMeta(doc.meta).approvedAt as string | null) ??
        null,
      rejectedAt:
        (parseInsuranceDocumentMeta(doc.meta).rejectedAt as string | null) ??
        null,
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
    userId?: number | null;
    title: string;
    url: string;
    description?: string | null;
    expiresAt?: string | null;
  },
) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to upload documents.",
    });
  }

  const targetUserId = data.userId ?? ctx.userId;
  const actingOnAnotherUser = targetUserId !== ctx.userId;
  const authUser = await getAuthUser(ctx);

  if (actingOnAnotherUser) {
    const session = await auth(ctx);
    const canManageEmployeeDocuments = session.can?.editEmployeeDocument;

    if (!canManageEmployeeDocuments) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "You do not have permission to upload documents for employees.",
      });
    }
  }

  const targetUser = actingOnAnotherUser
    ? await ctx.db.users.findFirstOrThrow({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
        },
      })
    : authUser;

  const docMeta: Record<string, unknown> = {};
  if (data.expiresAt) {
    docMeta.expiresAt = data.expiresAt;
  }

  if (isInsuranceDocumentTitle(data.title)) {
    docMeta.status = "pending";
    docMeta.approvedAt = null;
    docMeta.approvedBy = null;
    docMeta.rejectedAt = null;
    docMeta.rejectedBy = null;
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

  const createdDocument = await ctx.db.userDocuments.create({
    data: {
      title: data.title,
      description: data.description,
      url: data.url,
      userId: targetUserId,
      meta: docMeta,
    },
    select: {
      id: true,
      title: true,
      url: true,
      description: true,
      meta: true,
    },
  });

  if (isInsuranceDocumentTitle(data.title)) {
    const notifications = new Notifications(ctx.db);
    await notifications.create(
      "employee_document_review",
      {
        documentId: createdDocument.id,
        userId: targetUserId,
        userName: targetUser.name ?? "Employee",
        documentTitle: createdDocument.title || data.title,
        documentUrl: createdDocument.url,
        description: createdDocument.description,
        expiresAt:
          (typeof createdDocument.meta === "object" &&
          createdDocument.meta &&
          !Array.isArray(createdDocument.meta)
            ? ((createdDocument.meta as Record<string, unknown>).expiresAt as
                | string
                | null
                | undefined)
            : null) ?? null,
      },
      {
        author: {
          id: ctx.userId,
          role: "employee",
        },
      },
    );
  }

  return {
    id: createdDocument.id,
    title: createdDocument.title,
    url: createdDocument.url,
    meta: createdDocument.meta,
  };
}

export async function getDocumentReview(ctx: TRPCContext, id: number) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to review documents.",
    });
  }

  const document = await ctx.db.userDocuments.findFirstOrThrow({
    where: { id, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      createdAt: true,
      meta: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          meta: true,
        },
      },
    },
  });
  const meta = parseInsuranceDocumentMeta(document.meta);
  const userMeta = parseMeta(document.user?.meta);

  return {
    id: document.id,
    title: document.title,
    description: document.description,
    url: meta.url || document.url,
    expiresAt: meta.expiresAt ?? null,
    status: meta.status ?? "pending",
    approvedAt: meta.approvedAt ?? null,
    rejectedAt: meta.rejectedAt ?? null,
    createdAt: document.createdAt,
    user: {
      id: document.user?.id ?? 0,
      name: document.user?.name ?? "Unknown employee",
      email: document.user?.email ?? "",
      avatarUrl:
        typeof userMeta.avatarUrl === "string" ? userMeta.avatarUrl : null,
    },
  };
}

export async function saveDocumentReviewNote(
  ctx: TRPCContext,
  data: {
    documentId: number;
    userId: number;
    title: string;
    note: string;
  },
) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to add notes.",
    });
  }

  return saveNote(
    ctx.db,
    {
      headline: data.title,
      subject: "Document review note",
      note: data.note,
      type: "activity",
      status: "public",
      tags: [
        noteTag("channel", "employee_document_review"),
        noteTag("documentId", data.documentId),
        noteTag("userId", data.userId),
      ],
    },
    ctx.userId,
  );
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
  const can = await userPermissions(ctx, user?.role?.id);
  return {
    ...user,
    can,
  };
}
async function userPermissions(ctx: TRPCContext, roleId) {
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
  const permissions = role.RoleHasPermissions.flatMap((a) => a.permission);
  const can = generatePermissions(role?.name, permissions);
  console.log({ can });
  return can;
}
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
