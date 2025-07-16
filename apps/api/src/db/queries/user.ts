import type {
  EmployeeFormSchema,
  LoginByTokenSchema,
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
