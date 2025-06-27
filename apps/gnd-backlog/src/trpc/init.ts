import { TRPCError, initTRPC } from "@trpc/server";
import type { Context } from "hono";
import superjson from "superjson";

import { withAuthPermission } from "./middleware/auth-permission";

type TRPCContext = {
  // session: Session | null;
  // supabase: SupabaseClient;
  // db: Database;
  // geo: ReturnType<typeof getGeoContext>;
  teamId?: string;
};

export const createTRPCContext = async (
  _: unknown,
  c: Context,
): Promise<TRPCContext> => {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  // const session = await verifyAccessToken(accessToken);
  // const supabase = await createClient(accessToken);
  // const db = await connectDb();
  // const geo = getGeoContext(c.req);

  return {
    // session,
    // supabase,
    // db,
    // geo,
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

const withPrimaryDbMiddleware = t.middleware(async (opts) => {
  return withAuthPermission({
    ctx: opts.ctx,
    // type: opts.type,
    next: opts.next,
  });
});

const withTeamPermissionMiddleware = t.middleware(async (opts) => {
  return withAuthPermission({
    ctx: opts.ctx,
    next: opts.next,
  });
});

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);

export const protectedProcedure = t.procedure
  .use(withTeamPermissionMiddleware) // NOTE: This is needed to ensure that the teamId is set in the context
  .use(withPrimaryDbMiddleware)
  .use(async (opts) => {
    const { teamId } = opts.ctx;

    // if (!session) {
    //   throw new TRPCError({ code: "UNAUTHORIZED" });
    // }

    return opts.next({
      ctx: {
        teamId,
        // session,
      },
    });
  });
