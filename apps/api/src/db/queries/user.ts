import type {
  EmployeeFormSchema,
  UpdateUserProfileSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { saveEmployee } from "./hrm";

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
export async function updateUserProfileAction(
  ctx: TRPCContext,
  data: UpdateUserProfileSchema,
) {
  await saveEmployee(ctx, {
    id: ctx.userId,
    name: data.name,
    username: data.username,
  });
}
