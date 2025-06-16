import type { Context } from "hono";
import { prisma, type Database } from "@school-clerk/db";
import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { withPrimaryReadAfterWrite } from "./middleware/primary-read-after-write";

export type TRPCContext = {
  //   session: Session | null;
  //   supabase: SupabaseClient;
  db: Database;
  profile: {
    sessionId?;
    schoolId?;
    termId?;
  };
  //   geo: ReturnType<typeof getGeoContext>;
  //   teamId?: string;
};
export const createTRPCContext = async (
  _: unknown,
  c: Context,
): Promise<TRPCContext> => {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  // const session = await verifyAccessToken(accessToken);
  const [termId, sessionId, schoolId] = (
    c.req.header()["x-tenant-session-term-id"] ?? ""
  )?.split("|");
  const db = prisma;
  return {
    db,
    profile: {
      termId,
      sessionId,
      schoolId,
    },
  };
};

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
const withPrimaryDbMiddleware = t.middleware(async (opts) => {
  return withPrimaryReadAfterWrite({
    ctx: opts.ctx,
    type: opts.type,
    next: opts.next,
  });
});
// const withTeamPermissionMiddleware = t.middleware(async (opts) => {
//   return withTeamPermission({
//     ctx: opts.ctx,
//     next: opts.next,
//   });
// });

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);
