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
