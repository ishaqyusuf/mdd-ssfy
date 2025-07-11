import type {
  EmployeeFormSchema,
  EmployeesQueryParams,
  GetEmployeeFormDataSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { hash } from "bcrypt-ts";

export async function getEmployees(
  ctx: TRPCContext,
  data: EmployeesQueryParams,
) {
  const users = await ctx.db.users.findMany({
    where: {},
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
  return {
    data: users,
  };
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
