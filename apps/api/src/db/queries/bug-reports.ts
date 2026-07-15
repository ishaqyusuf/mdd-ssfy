import {
  BUG_REPORT_MAX_DURATION_MS,
  BUG_REPORT_MAX_UPLOAD_SIZE_BYTES,
  type addBugReportFollowUpSchema,
  type createBugReportSchema,
  type listBugReportsSchema,
  type updateBugReportStatusSchema,
} from "@api/schemas/bug-reports";
import type { TRPCContext } from "@api/trpc/init";
import {
  getUserSpecificPermissions,
  mergePermissionRecords,
} from "@gnd/auth/utils";
import { generatePermissions } from "@gnd/utils/constants";
import { TRPCError } from "@trpc/server";
import type { z } from "zod";

type BugReportStatus =
  | "NEW"
  | "IN_REVIEW"
  | "IN_PROGRESS"
  | "NEEDS_INFO"
  | "FIXED"
  | "CLOSED";

const BUG_REPORT_DOCUMENT_KIND = "bug_report_recording";
const BUG_REPORT_OWNER_TYPE = "bug_report";
const BUG_REPORT_UPLOAD_PREFIX = "bug-reports/";

function cleanBlobPathname(value: string) {
  return value.replace(/^\/+/, "");
}

function assertBugReportUpload(input: z.infer<typeof createBugReportSchema>) {
  const pathname = cleanBlobPathname(input.upload.pathname);
  const contentType = input.upload.contentType || "video/webm";

  if (!pathname.startsWith(BUG_REPORT_UPLOAD_PREFIX)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bug report recording path is invalid.",
    });
  }

  if (
    input.upload.size > BUG_REPORT_MAX_UPLOAD_SIZE_BYTES ||
    input.durationMs > BUG_REPORT_MAX_DURATION_MS
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bug report recording is too large or too long.",
    });
  }

  if (
    !contentType.startsWith("video/") &&
    contentType !== "application/octet-stream"
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bug report recording must be a video file.",
    });
  }

  return {
    pathname,
    contentType,
  };
}

async function requireActor(ctx: TRPCContext) {
  if (!ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
  }

  const user = await ctx.db.users.findFirst({
    where: {
      id: ctx.userId,
      deletedAt: null,
      accessRevokedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              name: true,
              RoleHasPermissions: {
                where: {
                  deletedAt: null,
                },
                select: {
                  permission: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
  }

  const role = user.roles[0]?.role;
  const rolePermissions = role?.RoleHasPermissions.map(
    (item) => item.permission,
  ) ?? [];
  const specificPermissions = await getUserSpecificPermissions(ctx.db, user.id);
  const can = generatePermissions(
    role?.name,
    mergePermissionRecords(rolePermissions, specificPermissions),
  );
  const isSuperAdmin = role?.name?.toLowerCase() === "super admin";

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    roleTitle: role?.name ?? null,
    can,
    isSuperAdmin,
  };
}

async function requireSubmitAccess(ctx: TRPCContext) {
  const actor = await requireActor(ctx);

  if (!actor.can.submitBugReport) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Bug reporting is not enabled for your account.",
    });
  }

  return actor;
}

async function requireSuperAdmin(ctx: TRPCContext) {
  const actor = await requireActor(ctx);

  if (!actor.isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Super Admin can manage all bug reports.",
    });
  }

  return actor;
}

async function hydrateReports(ctx: TRPCContext, reports: any[]) {
  const documentIds = Array.from(
    new Set(
      reports
        .map((report) => report.recordingDocumentId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const userIds = Array.from(
    new Set(
      reports.flatMap((report) => [
        report.createdById,
        report.statusUpdatedById,
      ]),
    ),
  ).filter((id): id is number => Number.isFinite(id));

  const [documents, users] = await Promise.all([
    documentIds.length
      ? ctx.db.storedDocument.findMany({
          where: {
            id: {
              in: documentIds,
            },
            deletedAt: null,
          },
          select: {
            id: true,
            url: true,
            pathname: true,
            filename: true,
            mimeType: true,
            size: true,
            visibility: true,
          },
        })
      : [],
    userIds.length
      ? ctx.db.users.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [],
  ]);

  const documentById = new Map(
    documents.map((document) => [document.id, document] as const),
  );
  const userById = new Map(users.map((user) => [user.id, user] as const));

  return reports.map((report) => {
    const recording = report.recordingDocumentId
      ? documentById.get(report.recordingDocumentId)
      : null;
    const createdBy = userById.get(report.createdById) ?? null;
    const statusUpdatedBy = report.statusUpdatedById
      ? userById.get(report.statusUpdatedById)
      : null;

    return {
      id: report.id,
      status: report.status as BugReportStatus,
      description: report.description,
      currentUrl: report.currentUrl,
      userAgent: report.userAgent,
      source: report.source,
      durationMs: report.durationMs,
      microphoneEnabled: report.microphoneEnabled,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      statusUpdatedAt: report.statusUpdatedAt,
      followUpCount: report._count?.followUps ?? 0,
      recording: recording
        ? {
            id: recording.id,
            url: recording.url,
            pathname: recording.pathname,
            filename: recording.filename,
            mimeType: recording.mimeType,
            size: recording.size,
            visibility: recording.visibility,
          }
        : null,
      createdBy: createdBy
        ? {
            id: createdBy.id,
            name: createdBy.name,
            email: createdBy.email,
          }
        : null,
      statusUpdatedBy: statusUpdatedBy
        ? {
            id: statusUpdatedBy.id,
            name: statusUpdatedBy.name,
            email: statusUpdatedBy.email,
          }
        : null,
    };
  });
}

export async function createBugReport(
  ctx: TRPCContext,
  input: z.infer<typeof createBugReportSchema>,
) {
  const actor = await requireSubmitAccess(ctx);
  const upload = assertBugReportUpload(input);
  const description = input.description?.trim() || null;

  const report = await ctx.db.$transaction(async (tx) => {
    const createdReport = await tx.bugReport.create({
      data: {
        createdById: actor.user.id,
        description,
        currentUrl: input.currentUrl || null,
        userAgent: input.userAgent || null,
        durationMs: input.durationMs,
        microphoneEnabled: input.microphoneEnabled,
        source: "web",
      },
    });
    const document = await tx.storedDocument.create({
      data: {
        kind: BUG_REPORT_DOCUMENT_KIND,
        ownerType: BUG_REPORT_OWNER_TYPE,
        ownerId: createdReport.id,
        provider: "vercel-blob",
        pathname: upload.pathname,
        url: input.upload.url,
        filename: input.upload.filename || `${createdReport.id}.webm`,
        mimeType: upload.contentType,
        extension: upload.pathname.split(".").pop()?.toLowerCase() || "webm",
        size: input.upload.size,
        visibility: "private",
        status: "ready",
        uploadedBy: actor.user.id,
        title: "Bug report recording",
        description,
        meta: {
          durationMs: input.durationMs,
          microphoneEnabled: input.microphoneEnabled,
          currentUrl: input.currentUrl || null,
          userAgent: input.userAgent || null,
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    return tx.bugReport.update({
      where: {
        id: createdReport.id,
      },
      data: {
        recordingDocumentId: document.id,
      },
      include: {
        _count: {
          select: {
            followUps: true,
          },
        },
      },
    });
  });

  const [hydrated] = await hydrateReports(ctx, [report]);
  return hydrated;
}

export async function getMyBugReports(ctx: TRPCContext) {
  const actor = await requireActor(ctx);
  const reports = await ctx.db.bugReport.findMany({
    where: {
      createdById: actor.user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          followUps: true,
        },
      },
    },
  });

  return hydrateReports(ctx, reports);
}

export async function getAllBugReports(
  ctx: TRPCContext,
  input?: z.infer<typeof listBugReportsSchema>,
) {
  await requireSuperAdmin(ctx);
  const reports = await ctx.db.bugReport.findMany({
    where: {
      deletedAt: null,
      status: input?.status,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      _count: {
        select: {
          followUps: true,
        },
      },
    },
  });

  return hydrateReports(ctx, reports);
}

export async function getBugReportById(ctx: TRPCContext, id: string) {
  const actor = await requireActor(ctx);
  const report = await ctx.db.bugReport.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      followUps: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          followUps: true,
        },
      },
    },
  });

  if (!report) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Bug report not found.",
    });
  }

  if (!actor.isSuperAdmin && report.createdById !== actor.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only view your own bug reports.",
    });
  }

  const [hydrated] = await hydrateReports(ctx, [report]);
  const authorIds = Array.from(
    new Set(report.followUps.map((followUp) => followUp.authorId)),
  );
  const authors = authorIds.length
    ? await ctx.db.users.findMany({
        where: {
          id: {
            in: authorIds,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })
    : [];
  const authorById = new Map(authors.map((author) => [author.id, author]));

  return {
    ...hydrated,
    followUps: report.followUps.map((followUp) => {
      const author = authorById.get(followUp.authorId) ?? null;
      return {
        id: followUp.id,
        body: followUp.body,
        createdAt: followUp.createdAt,
        author: author
          ? {
              id: author.id,
              name: author.name,
              email: author.email,
            }
          : null,
      };
    }),
  };
}

export async function addBugReportFollowUp(
  ctx: TRPCContext,
  input: z.infer<typeof addBugReportFollowUpSchema>,
) {
  const actor = await requireActor(ctx);
  const report = await ctx.db.bugReport.findFirst({
    where: {
      id: input.bugReportId,
      deletedAt: null,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  if (!report) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Bug report not found.",
    });
  }

  if (!actor.isSuperAdmin && report.createdById !== actor.user.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only add follow-ups to your own bug reports.",
    });
  }

  return ctx.db.bugReportFollowUp.create({
    data: {
      bugReportId: report.id,
      authorId: actor.user.id,
      body: input.body.trim(),
    },
  });
}

export async function updateBugReportStatus(
  ctx: TRPCContext,
  input: z.infer<typeof updateBugReportStatusSchema>,
) {
  const actor = await requireSuperAdmin(ctx);
  const existingReport = await ctx.db.bugReport.findFirst({
    where: {
      id: input.bugReportId,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!existingReport) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Bug report not found.",
    });
  }

  const report = await ctx.db.bugReport.update({
    where: {
      id: existingReport.id,
    },
    data: {
      status: input.status,
      statusUpdatedAt: new Date(),
      statusUpdatedById: actor.user.id,
    },
    include: {
      _count: {
        select: {
          followUps: true,
        },
      },
    },
  });

  const [hydrated] = await hydrateReports(ctx, [report]);
  return hydrated;
}
