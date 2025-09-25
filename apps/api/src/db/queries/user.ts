import type {
  LoginByTokenSchema,
  UpdateUserProfileSchema,
} from "@api/schemas/hrm";
import type { TRPCContext } from "@api/trpc/init";
import { camel } from "@gnd/utils";
import { allPermissions, type ICan } from "@gnd/utils/constants";

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
      roles: {
        where: {
          deletedAt: null,
        },
        select: {
          role: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  const { roles, ...userData } = user;
  const role = roles?.[0]?.role;
  return {
    ...userData,
    role,
  };
}
export async function updateUserProfileAction(
  ctx: TRPCContext,
  data: UpdateUserProfileSchema
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
  data: LoginByTokenSchema
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
export async function getLoggedInDevices(ctx: TRPCContext) {
  const { db } = ctx;

  return db.session.findMany({
    where: {
      userId: ctx.userId,
      expires: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      sessionToken: true,
      expires: true,
    },
  });
}

/*
auth: publicProcedure
      .input(authSchema)
      .mutation(async (props) => {
        return auth(props.ctx, props.input);
      }),
*/

export async function auth(ctx: TRPCContext) {
  const { db } = ctx;
  const user = await getAuthUser(ctx);
  const can = await userPermissions(ctx, user!?.role!?.id);
  return {
    ...user,
    can,
  };
}
async function userPermissions(ctx: TRPCContext, roleId) {
  // const _role = user?.roles[0]?.role;
  // const permissionIds =
  //   _role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
  // const { RoleHasPermissions = [], ...role } = _role || ({} as any);

  const role = await ctx.db.roles.findFirstOrThrow({
    where: {
      id: roleId,
    },
    select: {
      name: true,
      RoleHasPermissions: {
        select: {
          permission: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const permissions = role.RoleHasPermissions.map((a) => a.permission).flat();

  let can: ICan = {} as any;
  if (role.name?.toLocaleLowerCase() == "super admin") {
    can = Object.fromEntries(allPermissions()?.map((p) => [p as any, true]));
  } else
    permissions.map((p) => {
      can[camel(p.name) as any] = true;
    });
  return can;
}
