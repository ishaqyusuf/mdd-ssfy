import { whereEmployees } from "@api/prisma-where";
import { composeQueryData } from "@gnd/utils/query-response";
import type {
  EmployeeFormSchema,
  EmployeesQueryParams,
  GetEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { hash } from "bcrypt-ts";
import { consoleLog, padStart } from "@gnd/utils";
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
  consoleLog("employee query where", where);
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
