import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "./rest/types";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/routers/_app";
import { createTRPCContext } from "./trpc/init";
import { handle } from "hono/vercel";
// import { appRouter } from "./trpc/routers/_app";
// import { createTRPCContext } from "./trpc/init";

const app = new OpenAPIHono<Context>();
// const app = new Hono<Context>();

app.use(secureHeaders());

app.use(
  "/trpc/*",
  cors({
    origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "accept-language",
      "x-trpc-source",
      "x-tenant-domain",
      "x-tenant-session-term-id",
      "x-user-timezone",
      "x-user-country",
    ],
    exposeHeaders: ["Content-Length"],
    maxAge: 86400,
  }),
);
app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }),
);
export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
  fetch: app.fetch,
};
const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const PUT = handler;
export const OPTIONS = handler;
