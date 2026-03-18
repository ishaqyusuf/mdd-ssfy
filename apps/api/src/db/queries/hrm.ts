import { whereEmployees } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  EmployeeFormSchema,
  EmployeesQueryParams,
  GetEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { hash } from "bcrypt-ts";
import { padStart, formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
export async function getEmployees(
  ctx: TRPCContext,
  query: EmployeesQueryParams,
) {
  const { db } = ctx;
  // query.sort = query.sort || "name";
  query.size = 30;
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
      profile: user.employeeProfile,
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
  const { id, password: passwordString, ...formData } = data;
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
        },
      })
    : await ctx.db.users.create({
        data: {
          name: formData.name,
          email: formData.email!,
          phoneNo: formData.phoneNo,
          password,
        },
      });
  if (user?.id && formData.roleId) {
    await ctx.db.modelHasRoles.upsert({
      where: {
        roleId_modelId_organizationId: {
          roleId: formData.roleId,
          modelId: user.id,
          organizationId: formData.organizationId,
        },
      },
      create: {
        roleId: formData.roleId,
        modelId: user.id,
        organizationId: formData.organizationId,
      },
      update: {
        roleId: formData.roleId,
        modelId: user.id,
      },
    });
    await ctx.db.session.deleteMany({
      where: {
        userId: user.id,
      },
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

export async function getEmployeeOverview(ctx: TRPCContext, id: number) {
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

  const roles = user.roles.map((r) => r.role.name);

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
            completedAt: a.completedAt
              ? formatDate(a.completedAt)
              : undefined,
          })),
        }
      : undefined;

  return {
    user: {
      id: user.id,
      name: user.name || "",
      email: user.email || undefined,
      phone: user.phoneNo || undefined,
      roles,
      profile: user.employeeProfile?.name,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
    },
    analytics: {
      sales: salesAnalytics,
      contractor: contractorAnalytics,
      production: productionAnalytics,
    },
    records: user.documents.map((doc) => ({
      id: doc.id,
      type: "other" as const,
      title: doc.title || "Document",
      document: {
        id: String(doc.id),
        url: doc.url,
        filename: doc.title || undefined,
      },
      status: "approved" as const,
      createdAt: new Date().toISOString(),
    })),
    insuranceStatus: "missing" as const,
  };
}
