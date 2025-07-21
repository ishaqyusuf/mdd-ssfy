import { whereEmployees } from "@api/prisma-where";
import { composeQueryData } from "@api/query-response";
import type {
  EmployeeFormSchema,
  EmployeesQueryParams,
  GetEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { hash } from "bcrypt-ts";

export async function getEmployees(
  ctx: TRPCContext,
  query: EmployeesQueryParams,
) {
  const { db } = ctx;
  const { response, searchMeta, where } = await composeQueryData(
    query,
    whereEmployees(query),
    db.users,
  );
  const data = await ctx.db.users.findMany({
    where,

    ...searchMeta,
    select: {
      id: true,
      name: true,
      email: true,
      roles: {
        select: {
          roleId: true,
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
      id: user.id,
      name: user.name,
      email: user.email,
      role: user?.roles?.[0]?.role?.name,
    })),
  );
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
        roleId_modelId: {
          roleId: formData.roleId,
          modelId: user.id,
        },
      },
      create: {
        roleId: formData.roleId,
        modelId: user.id,
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
    roleId: employee?.roles?.[0]?.roleId,
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
