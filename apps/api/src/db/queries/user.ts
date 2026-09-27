import type {
  LoginByTokenSchema,
  UpdateUserProfileSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { deleteEmployeeDocumentBlob } from "@api/utils/employee-document-storage";
import { getActiveCompanyMemberWhere } from "@gnd/auth/company-member";
import {
  checkPassword,
  getUserSpecificPermissions,
  loginAction,
  mergePermissionRecords,
} from "@gnd/auth/utils";
import {
  EMPLOYEE_DOCUMENT_KIND,
  EMPLOYEE_DOCUMENT_OWNER_TYPE,
  EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
  employeeDocumentAccessPath,
  isPrivateEmployeeDocumentMeta,
  parseEmployeeStoredDocumentId,
} from "@gnd/documents";
import { Notifications } from "@gnd/notifications";
import { camel, consoleLog } from "@gnd/utils";
import {
  type ICan,
  allPermissions,
  generatePermissions,
} from "@gnd/utils/constants";
import { hashPassword } from "@gnd/utils/crypto";
import {
  isInsuranceDocumentTitle,
  parseInsuranceDocumentMeta,
} from "@gnd/utils/insurance-documents";
import { noteTag, saveNote } from "@gnd/utils/note";
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

function requireAuthUserId(ctx: TRPCContext) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return ctx.userId;
}

async function requireActiveEmployeeDocumentActor(ctx: TRPCContext) {
  const userId = requireAuthUserId(ctx);
  const actor = await ctx.db.users.findFirst({
    where: getActiveCompanyMemberWhere({ id: userId }),
    select: { id: true },
  });
  if (!actor) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "An active employee account is required.",
    });
  }
  return actor.id;
}

export async function getAuthUser(ctx: TRPCContext) {
  const userId = requireAuthUserId(ctx);
  const user = await ctx.db.users.findFirstOrThrow({
    where: {
      id: userId,
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
              name: true,
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
      url: employeeDocumentAccessPath(doc.id),
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
    url?: string | null;
    description?: string | null;
    expiresAt?: string | null;
    storedDocumentId?: string | null;
  },
) {
  const actorUserId = await requireActiveEmployeeDocumentActor(ctx);

  const targetUserId = data.userId ?? actorUserId;
  const actingOnAnotherUser = targetUserId !== actorUserId;
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
        where: getActiveCompanyMemberWhere({ id: targetUserId }),
        select: {
          id: true,
          name: true,
        },
      })
    : authUser;

  const existingDocument = data.id
    ? await ctx.db.userDocuments.findFirstOrThrow({
        where: {
          id: data.id,
          userId: targetUserId,
          deletedAt: null,
        },
        select: { id: true, meta: true },
      })
    : null;
  const existingMeta = parseMeta(existingDocument?.meta);
  const existingStoredDocumentId = parseEmployeeStoredDocumentId(existingMeta);
  if (
    existingDocument &&
    data.storedDocumentId &&
    data.storedDocumentId !== existingStoredDocumentId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Employee document file replacement is not supported here.",
    });
  }
  const storedDocumentId = data.storedDocumentId ?? existingStoredDocumentId;
  if (!storedDocumentId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Upload the document file before saving its details.",
    });
  }
  const storedDocument = await ctx.db.storedDocument.findFirst({
    where: {
      id: storedDocumentId,
      ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
      ownerId: String(targetUserId),
      kind: EMPLOYEE_DOCUMENT_KIND,
      visibility: EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
      status: "ready",
      deletedAt: null,
    },
    select: { id: true, provider: true, meta: true },
  });
  if (
    !storedDocument ||
    storedDocument.provider !== "vercel-blob" ||
    !isPrivateEmployeeDocumentMeta(storedDocument.meta)
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "The private uploaded document asset is unavailable.",
    });
  }

  const docMeta: Record<string, unknown> = {
    ...existingMeta,
    storedDocumentId,
    expiresAt: data.expiresAt || null,
  };

  if (isInsuranceDocumentTitle(data.title)) {
    docMeta.status = "pending";
    docMeta.approvedAt = null;
    docMeta.approvedBy = null;
    docMeta.rejectedAt = null;
    docMeta.rejectedBy = null;
  }

  if (existingDocument) {
    const canonicalDocumentUrl = employeeDocumentAccessPath(
      existingDocument.id,
    );
    return ctx.db.userDocuments.update({
      where: {
        id: existingDocument.id,
        userId: targetUserId,
        deletedAt: null,
      },
      data: {
        title: data.title,
        description: data.description,
        url: canonicalDocumentUrl,
        meta: docMeta,
      },
      select: { id: true, title: true, url: true, meta: true },
    });
  }

  const createdDocument = await ctx.db.$transaction(async (tx) => {
    const created = await tx.userDocuments.create({
      data: {
        title: data.title,
        description: data.description,
        url: "employee-document://pending",
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
    return tx.userDocuments.update({
      where: { id: created.id },
      data: { url: employeeDocumentAccessPath(created.id) },
      select: {
        id: true,
        title: true,
        url: true,
        description: true,
        meta: true,
      },
    });
  });

  let notificationQueued = true;
  if (isInsuranceDocumentTitle(data.title)) {
    try {
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
            id: actorUserId,
            role: "employee",
          },
        },
      );
    } catch (error) {
      notificationQueued = false;
      console.error(
        "Employee document saved, but its review notification failed.",
        error,
      );
    }
  }

  return {
    id: createdDocument.id,
    title: createdDocument.title,
    url: createdDocument.url,
    meta: createdDocument.meta,
    notificationQueued,
  };
}

export async function getDocumentReview(ctx: TRPCContext, id: number) {
  const actorUserId = await requireActiveEmployeeDocumentActor(ctx);
  const session = await auth(ctx);
  const document = await ctx.db.userDocuments.findFirstOrThrow({
    where: {
      id,
      deletedAt: null,
      user: { is: getActiveCompanyMemberWhere() },
    },
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
  if (
    document.user?.id !== actorUserId &&
    !session.can.viewEmployeeDocument &&
    !session.can.editEmployeeDocument
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Document not found.",
    });
  }
  const meta = parseInsuranceDocumentMeta(document.meta);
  const userMeta = parseMeta(document.user?.meta);

  return {
    id: document.id,
    title: document.title,
    description: document.description,
    url: employeeDocumentAccessPath(document.id),
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
  const actorUserId = await requireActiveEmployeeDocumentActor(ctx);
  const session = await auth(ctx);
  if (!session.can.editEmployeeDocument) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to review employee documents.",
    });
  }

  const document = await ctx.db.userDocuments.findFirstOrThrow({
    where: {
      id: data.documentId,
      deletedAt: null,
      user: { is: getActiveCompanyMemberWhere() },
    },
    select: { id: true, title: true, userId: true },
  });

  return saveNote(
    ctx.db,
    {
      headline: document.title || "Employee document",
      subject: "Document review note",
      note: data.note,
      type: "activity",
      status: "public",
      tags: [
        noteTag("channel", "employee_document_review"),
        noteTag("documentId", document.id),
        noteTag("userId", document.userId),
      ],
    },
    actorUserId,
  );
}

export async function deleteUserDocument(
  ctx: TRPCContext,
  id: number,
  deleteBlob: (pathname: string) => Promise<void> = deleteEmployeeDocumentBlob,
) {
  const actorUserId = await requireActiveEmployeeDocumentActor(ctx);
  const document = await ctx.db.userDocuments.findFirstOrThrow({
    where: { id, userId: actorUserId, deletedAt: null },
    select: { meta: true },
  });
  const meta = parseMeta(document.meta);
  const storedDocumentId =
    typeof meta.storedDocumentId === "string" ? meta.storedDocumentId : null;
  const deletedAt = new Date();

  const storedDocument = storedDocumentId
    ? await ctx.db.storedDocument.findFirst({
        where: {
          id: storedDocumentId,
          ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
          ownerId: String(actorUserId),
          kind: EMPLOYEE_DOCUMENT_KIND,
          deletedAt: null,
        },
        select: {
          id: true,
          pathname: true,
          provider: true,
          visibility: true,
          meta: true,
        },
      })
    : null;

  const privateStoredDocument =
    storedDocument?.provider === "vercel-blob" &&
    storedDocument.visibility === EMPLOYEE_DOCUMENT_PRIVATE_ACCESS &&
    isPrivateEmployeeDocumentMeta(storedDocument.meta);

  await ctx.db.$transaction(async (tx) => {
    await tx.userDocuments.update({
      where: { id, userId: actorUserId },
      data: { deletedAt },
    });
    if (storedDocumentId) {
      const result = await tx.storedDocument.updateMany({
        where: {
          id: storedDocumentId,
          ownerType: EMPLOYEE_DOCUMENT_OWNER_TYPE,
          ownerId: String(actorUserId),
          kind: EMPLOYEE_DOCUMENT_KIND,
          deletedAt: null,
        },
        data: {
          status: "deleted",
          isCurrent: false,
          deletedAt,
          ...(privateStoredDocument
            ? {
                meta: {
                  ...parseMeta(storedDocument.meta),
                  cleanupStatus: "retry_required",
                  cleanupUpdatedAt: deletedAt.toISOString(),
                },
              }
            : {}),
        },
      });
      if (privateStoredDocument && result.count !== 1) {
        throw new Error("Private employee document changed during deletion.");
      }
    }
  });

  let cleanupPending = false;
  if (privateStoredDocument) {
    try {
      await deleteBlob(storedDocument.pathname);
      await ctx.db.storedDocument.update({
        where: { id: storedDocument.id },
        data: {
          meta: {
            ...parseMeta(storedDocument.meta),
            cleanupStatus: "completed",
            cleanupUpdatedAt: new Date().toISOString(),
          },
        },
      });
    } catch {
      cleanupPending = true;
    }
  }
  return { success: true, cleanupPending };
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
  const userId = ctx.userId;
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
  const specificPermissions = await getUserSpecificPermissions(ctx.db, userId);
  const can = generatePermissions(
    role?.name,
    mergePermissionRecords(permissions, specificPermissions),
  );

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
