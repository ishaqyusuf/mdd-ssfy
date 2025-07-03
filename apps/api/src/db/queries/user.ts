import type { EmployeeFormSchema } from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";

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
    },
  });
  return user;
}
export async function saveEmployee(ctx: TRPCContext, data: EmployeeFormSchema) {
  const e = await ctx.db.users.create({
    data: {
      name: data.name,
      email: data.email,
      phoneNo: data.phoneNo,
      username: data.username,
    },
  });
}
export async function updateEmployeeRole(ctx: TRPCContext, userId: number) {}
