import { whereEmployees } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  EmployeeFormSchema,
  EmployeesQueryParams,
  GetEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { hash } from "bcrypt-ts";
import { formatMoney, padStart } from "@gnd/utils";
import {
  USER_PERMISSION_MODEL_TYPE,
  USER_PERMISSION_MODEL_TYPE_ALIASES,
  getUserSpecificPermissions,
} from "@gnd/auth/utils";
import { formatDate } from "@gnd/utils/dayjs";
import {
  getInsuranceRequirement,
  isInsuranceDocumentTitle,
  parseInsuranceDocumentMeta,
} from "@gnd/utils/insurance-documents";

const EMPLOYEE_SPECIFIC_PERMISSION_NAMES = ["submit custom job"] as const;

async function ensureEmployeeSpecificPermissions(ctx: TRPCContext) {
  const existing = await ctx.db.permissions.findMany({
    where: {
      name: {
        in: [...EMPLOYEE_SPECIFIC_PERMISSION_NAMES],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });
  const existingNames = new Set(existing.map((permission) => permission.name));
  const missing = EMPLOYEE_SPECIFIC_PERMISSION_NAMES.filter(
    (name) => !existingNames.has(name),
  );

  if (missing.length) {
    await ctx.db.permissions.createMany({
      data: missing.map((name) => ({ name })),
    });
  }

  return ctx.db.permissions.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}

function formatPermissionLabel(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getEmployeePermissionOptions(ctx: TRPCContext) {
  const permissions = await ensureEmployeeSpecificPermissions(ctx);
  const grouped = new Map<
    string,
    {
      key: string;
      viewPermissionId?: number;
      editPermissionId?: number;
    }
  >();

  permissions.forEach((permission) => {
    const normalizedName = permission.name.toLowerCase();
    const baseName = normalizedName
      .replace(/^edit /, "")
      .replace(/^view /, "")
      .replace(/^review /, "");
    const current = grouped.get(baseName) ?? {
      key: baseName,
    };

    if (normalizedName.startsWith("view ")) {
      current.viewPermissionId = permission.id;
    } else if (normalizedName.startsWith("edit ")) {
      current.editPermissionId = permission.id;
    } else {
      current.viewPermissionId = permission.id;
    }

    grouped.set(baseName, current);
  });

  return Array.from(grouped.values()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
}

export async function getEmployees(
  ctx: TRPCContext,
  query: EmployeesQueryParams,
) {
  const { db } = ctx;
  // query.sort = query.sort || "name";
  // query.size = 30;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereEmployees(query),
    // {},
    db.users,
  );
  const data = await ctx.db.users.findMany({
    where,
    ...searchMeta,
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      documents: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          title: true,
          url: true,
          meta: true,
          createdAt: true,
        },
      },
      employeeProfile: true,
      username: true,
      roles: {
        select: {
          roleId: true,
          organization: true,
          role: {
            select: {
              RoleHasPermissions: {
                select: {
                  permission: {},
                },
              },
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });
  const userPermissionCounts = data.length
    ? await ctx.db.modelHasPermissions.groupBy({
        by: ["modelId"],
        where: {
          deletedAt: null,
          modelId: {
            in: data.map((user) => BigInt(user.id)),
          },
          modelType: {
            in: [...USER_PERMISSION_MODEL_TYPE_ALIASES],
          },
        },
        _count: {
          permissionId: true,
        },
      })
    : [];
  const specificPermissionCountByUserId = new Map(
    userPermissionCounts.map((item) => [
      Number(item.modelId),
      item._count.permissionId,
    ]),
  );
  return await response(
    data.map((user) => ({
      uid: `GND-${formatDate(user.createdAt!, `YYMM`)}-${padStart(
        String(user.id),
        3,
        "0",
      )}`,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user?.roles?.[0]?.role?.name,
      org: user.roles?.[0]?.organization,
      date: formatDate(user.createdAt),
      documents: user.documents,
      profile: user.employeeProfile,
      specificPermissionCount:
        specificPermissionCountByUserId.get(user.id) ?? 0,
      username: user.username,
    })),
  );
}
export async function getEmployeesList(
  ctx: TRPCContext,
  query: EmployeesQueryParams,
) {
  const resp = await getEmployees(ctx, query);
  return resp.data;
}
export async function saveEmployee(ctx: TRPCContext, data: EmployeeFormSchema) {
  const { id, password: passwordString, permissionIds, ...formData } = data;
  const password = await hashPassword(passwordString);
  const user = id
    ? await ctx.db.users.update({
        where: {
          id,
        },
        data: {
          name: formData.name,
          email: formData.email,
          phoneNo: formData.phoneNo,
          employeeProfileId: formData.profileId ?? null,
        },
      })
    : await ctx.db.users.create({
        data: {
          name: formData.name,
          email: formData.email!,
          phoneNo: formData.phoneNo,
          password,
          employeeProfileId: formData.profileId ?? null,
        },
      });
  await ensureEmployeeSpecificPermissions(ctx);
  if (user?.id && formData.roleId) {
    await ctx.db.modelHasRoles.deleteMany({
      where: {
        modelId: user.id,
      },
    });
    await ctx.db.modelHasRoles.create({
      data: {
        roleId: formData.roleId,
        modelId: user.id,
        organizationId: formData.organizationId,
      },
    });
    await ctx.db.session.deleteMany({
      where: {
        userId: user.id,
      },
    });
  }
  await ctx.db.modelHasPermissions.deleteMany({
    where: {
      modelId: BigInt(user.id),
      modelType: {
        in: [...USER_PERMISSION_MODEL_TYPE_ALIASES],
      },
    },
  });
  if (permissionIds.length) {
    await ctx.db.modelHasPermissions.createMany({
      data: Array.from(new Set(permissionIds)).map((permissionId) => ({
        permissionId,
        modelId: BigInt(user.id),
        modelType: USER_PERMISSION_MODEL_TYPE,
      })),
    });
  }
}
async function hashPassword(pwrd) {
  return await hash(pwrd, 10);
}
export async function getEmployeeFormData(
  ctx: TRPCContext,
  { id }: GetEmployeeFormDataSchema,
): Promise<EmployeeFormSchema> {
  await ensureEmployeeSpecificPermissions(ctx);
  const employee = await ctx.db.users.findUniqueOrThrow({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNo: true,
      username: true,
      employeeProfileId: true,
      roles: {
        select: {
          organizationId: true,
          roleId: true,
        },
      },
    },
  });
  const specificPermissions = await ctx.db.modelHasPermissions.findMany({
    where: {
      deletedAt: null,
      modelId: BigInt(id),
      modelType: {
        in: [...USER_PERMISSION_MODEL_TYPE_ALIASES],
      },
    },
    select: {
      permissionId: true,
    },
  });
  return {
    id: employee.id,
    name: employee.name as any,
    profileId: employee.employeeProfileId,
    email: employee.email,
    phoneNo: employee.phoneNo,
    username: employee.username,
    roleId: employee?.roles?.[0]?.roleId!,
    organizationId: employee?.roles?.[0]?.organizationId!,
    password: undefined as any,
    permissionIds: specificPermissions.map((permission) => permission.permissionId),
  };
}
export async function resetEmployeePassword(ctx: TRPCContext, userId) {
  const user = await ctx.db.users.update({
    where: {
      id: userId,
    },
    data: {
      password: await hashPassword(process.env.DEFAULT_COMPANY_PASSWORD),
    },
  });

  return user;
}

export async function deleteEmployee(ctx: TRPCContext, userId: number) {
  await ctx.db.users.update({
    where: {
      id: userId,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  await ctx.db.session.deleteMany({
    where: {
      userId,
    },
  });
}

export async function getEmployeeOverview(ctx: TRPCContext, id: number) {
  await ensureEmployeeSpecificPermissions(ctx);
  const user = await ctx.db.users.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNo: true,
      createdAt: true,
      employeeProfile: { select: { name: true } },
      roles: {
        select: {
          role: { select: { name: true } },
        },
      },
      documents: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          userId: true,
          meta: true,
          createdAt: true,
        },
        orderBy: { id: "desc" },
      },
      // Sales analytics
      reppedProductions: {
        where: { deletedAt: null },
        select: {
          id: true,
          orderId: true,
          grandTotal: true,
          createdAt: true,
        },
        orderBy: { id: "desc" },
      },
      commissions: {
        where: { deletedAt: null },
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
      // Contractor analytics
      jobs: {
        where: { deletedAt: null },
        select: {
          id: true,
          title: true,
          status: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { id: "desc" },
      },
      payments: {
        where: { deletedAt: null },
        select: {
          id: true,
          amount: true,
        },
      },
      // Production analytics
      orderItemAssignments: {
        select: {
          id: true,
          qtyAssigned: true,
          qtyCompleted: true,
          completedAt: true,
          item: {
            select: {
              description: true,
            },
          },
        },
        orderBy: { id: "desc" },
      },
    },
  });
  const specificPermissions = await getUserSpecificPermissions(ctx.db, user.id);

  const roles = user.roles.map((r) => r.role.name);
  const insuranceRequirement = getInsuranceRequirement(user.documents);

  // Sales analytics — only if user has sales orders
  const salesAnalytics =
    user.reppedProductions.length > 0
      ? {
          totalOrders: user.reppedProductions.length,
          totalRevenue: formatMoney(
            user.reppedProductions.reduce(
              (sum, o) => sum + (Number(o.grandTotal) || 0),
              0,
            ),
          ),
          totalCommission: formatMoney(
            user.commissions.reduce((sum, c) => sum + (c.amount || 0), 0),
          ),
          pendingCommission: formatMoney(
            user.commissions
              .filter((c) => c.status === "pending")
              .reduce((sum, c) => sum + (c.amount || 0), 0),
          ),
          recentOrders: user.reppedProductions.slice(0, 5).map((o) => ({
            id: o.id,
            salesNo: o.orderId,
            total: formatMoney(Number(o.grandTotal) || 0),
            date: formatDate(o.createdAt),
          })),
        }
      : undefined;

  // Contractor analytics — only if user has jobs
  const contractorAnalytics =
    user.jobs.length > 0
      ? {
          totalJobs: user.jobs.length,
          completedJobs: user.jobs.filter(
            (j) => j.status === "completed" || j.status === "approved",
          ).length,
          pendingJobs: user.jobs.filter((j) => j.status === "pending").length,
          totalEarnings: formatMoney(
            user.payments.reduce((sum, p) => sum + (p.amount || 0), 0),
          ),
          pendingPayout: formatMoney(
            user.jobs
              .filter((j) => j.status === "pending" || j.status === "approved")
              .reduce((sum, j) => sum + (j.amount || 0), 0),
          ),
          recentJobs: user.jobs.slice(0, 5).map((j) => ({
            id: j.id,
            title: j.title || "Untitled",
            status: j.status,
            date: formatDate(j.createdAt),
          })),
        }
      : undefined;

  // Production analytics — only if user has assignments
  const productionAnalytics =
    user.orderItemAssignments.length > 0
      ? {
          totalAssignments: user.orderItemAssignments.length,
          completedAssignments: user.orderItemAssignments.filter(
            (a) => a.completedAt,
          ).length,
          pendingAssignments: user.orderItemAssignments.filter(
            (a) => !a.completedAt,
          ).length,
          totalItemsProduced: user.orderItemAssignments.reduce(
            (sum, a) => sum + (a.qtyCompleted || 0),
            0,
          ),
          recentAssignments: user.orderItemAssignments.slice(0, 5).map((a) => ({
            id: a.id,
            item: a.item?.description || "Unknown",
            qty: a.qtyAssigned || 0,
            completedAt: a.completedAt ? formatDate(a.completedAt) : undefined,
          })),
        }
      : undefined;

  const records = user.documents.map((doc) => {
    const meta = parseInsuranceDocumentMeta(doc.meta);
    const isInsuranceDocument = isInsuranceDocumentTitle(doc.title);

    return {
      id: doc.id,
      type: isInsuranceDocument ? ("insurance" as const) : ("other" as const),
      title: doc.title || "Document",
      document: {
        id: String(doc.id),
        url: (meta.url as string | null | undefined) || doc.url,
        filename: doc.title || undefined,
      },
      expiresAt: meta.expiresAt ?? undefined,
      status: (meta.status ??
        (isInsuranceDocument ? "pending" : "approved")) as
        | "pending"
        | "approved"
        | "rejected",
      approvedAt: meta.approvedAt ?? undefined,
      notes: doc.description || undefined,
      createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
    };
  });

  return {
    user: {
      id: user.id,
      name: user.name || "",
      email: user.email || undefined,
      phone: user.phoneNo || undefined,
      roles,
      profile: user.employeeProfile?.name,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      specificPermissionCount: specificPermissions.length,
    },
    analytics: {
      sales: salesAnalytics,
      contractor: contractorAnalytics,
      production: productionAnalytics,
    },
    records,
    insuranceStatus: insuranceRequirement.state,
    specificPermissions: specificPermissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
      label: formatPermissionLabel(permission.name),
      enabled: true,
    })),
  };
}
