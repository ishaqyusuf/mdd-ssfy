import type { Context } from "hono";
import { db, type Database } from "@gnd/db";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { withAuthPermission } from "./middleware/auth-permission";
import { verify } from "jsonwebtoken";
import { consoleLog } from "@gnd/utils";
export type TRPCContext = {
  //   session: Session | null;
  //   supabase: SupabaseClient;
  db: Database;
  userId?: number;
  // guestId?: string;
  //   geo: ReturnType<typeof getGeoContext>;
  //   teamId?: string;
};
export const createTRPCContext = async (
  _: unknown,
  c: Context,
): Promise<TRPCContext> => {
  const header = c.req.header();
  const auth =
    (header["authorization"] ?? header["x-trpc-source"] === "app")
      ? header["x-app-authorization"]
      : "";
  consoleLog("TRPC CONTEXT HEADERS", {
    tprcSource: header["x-trpc-source"],
    // headers: Object.entries(header),
    auth,
  });
  let [token, userId] = auth?.split(" ")?.[1]?.split("|") || [];
  if (!userId && token) {
    // console.log({ token, jwt: process.env.JWT_SECRET });
    const payload = verify(token, process.env.JWT_SECRET!);
    console.log({ payload, jwt: process.env.JWT_SECRET });
    // console.log({ payload });
    userId = (payload as any).userId;
  }
  // console.log({ token, userId });
  // const [tok, userId] = auth?.split("|");
  // const guestId = header["x-guest-id"];

  return {
    db,
    userId: Number(userId),
    // guestId,
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

export const protectedProcedure = t.procedure
  .use(withPrimaryDbMiddleware)
  .use(async (opts) => {
    if (!opts?.ctx?.userId)
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    return opts.next({
      ctx: {
        db: opts.ctx.db,
      },
    });
  });
// export const protectedProcedure = t.procedure.use();
