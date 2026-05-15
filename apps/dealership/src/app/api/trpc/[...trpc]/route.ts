import { getDealerAuthSession } from "@gnd/auth/better-auth/dealership";
import { appRouter } from "@gnd/api/trpc/routers/_app";
import { db } from "@gnd/db";
import { getActiveDealerByAuthUserId } from "@gnd/db/queries";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: async () => {
      const session = await getDealerAuthSession(request.headers);
      const dealer = session?.user?.id
        ? await getActiveDealerByAuthUserId(db, session.user.id)
        : null;

      return {
        db,
        dealer,
        dealerAuthUserId: session?.user?.id,
      };
    },
  });
}

export { handler as GET, handler as POST };

export const dynamic = "force-dynamic";
