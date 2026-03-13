import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "./rest/types";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/routers/_app";
import { createTRPCContext } from "./trpc/init";
import { appendDevLogEntryToFile } from "@gnd/dev-logger/file-sink";
const app = new OpenAPIHono<Context>(); //.basePath("/api");

app.use(secureHeaders());
if (process.env.NODE_ENV === "development")
  app.use(
    "/api/trpc/*",
    cors({
      origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "accept-language",
        "x-guest-id",
        "x-trpc-source",
        "x-app-authorization",
        "x-tenant-domain",
        "x-tenant-session-term-id",
        "x-user-timezone",
        "x-user-country",
      ],
      exposeHeaders: ["Content-Length"],
      maxAge: 86400,
    }),
  );
if (process.env.NODE_ENV === "development")
  app.use(
    "/api/dev-logger",
    cors({
      origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [],
      allowMethods: ["POST", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "x-app-authorization"],
      exposeHeaders: ["Content-Length"],
      maxAge: 86400,
    }),
  );
app.post("/api/dev-logger", async (c) => {
  const isDev = process.env.NODE_ENV === "development";
  const enabled =
    String(process.env.EXPO_PUBLIC_DEBUG_LOGGER ?? "1").toLowerCase() !==
    "false";
  if (!isDev || !enabled) {
    return c.json({ ok: true, skipped: true });
  }
  try {
    const body = (await c.req.json()) as { entry?: unknown };
    if (!body?.entry || typeof body.entry !== "object") {
      return c.json({ ok: false, error: "INVALID_ENTRY" }, 400);
    }
    await appendDevLogEntryToFile(body.entry as any);
    return c.json({ ok: true, skipped: false });
  } catch {
    return c.json({ ok: false, error: "WRITE_FAILED" }, 500);
  }
});
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
    endpoint: "/api/trpc",
  }),
);
app.get("/", (c) => {
  return c.json({ message: "Congrats! You've deployed Hono to Vercel" });
});

export { app };
export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3000,
  fetch: app.fetch,
};
