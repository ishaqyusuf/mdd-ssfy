import type { Context } from "hono";
import { db, type Database } from "@gnd/db";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { withAuthPermission } from "./middleware/auth-permission";

export type TRPCContext = {
  //   session: Session | null;
  //   supabase: SupabaseClient;
  db: Database;
  userId?;
  //   geo: ReturnType<typeof getGeoContext>;
  //   teamId?: string;
};
export const createTRPCContext = async (
  _: unknown,
  c: Context,
): Promise<TRPCContext> => {
  const header = c.req.header();
  const auth = header["authorization"] ?? "";
  const accessToken = auth?.split(" ")[1];

  const [tok, userId] = auth?.split("|");

  return {
    db,
    userId: Number(userId),
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
// const withTeamPermissionMiddleware = t.middleware(async (opts) => {
//   return withTeamPermission({
//     ctx: opts.ctx,
//     next: opts.next,
//   });
// });

export const publicProcedure = t.procedure.use(withPrimaryDbMiddleware);
