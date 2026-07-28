import "./instrument";

import { db } from "@gnd/db";
import { appendDevLogEntryToFile } from "@gnd/dev-logger/file-sink";
import { trpcServer } from "@hono/trpc-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { captureApiError, captureTrpcError } from "./observability/sentry";
import type { Context } from "./rest/types";
import { createTRPCContext } from "./trpc/init";
import { appRouter } from "./trpc/routers/_app";
import { storefrontAppRouter } from "./trpc/routers/storefront-app";

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
    "/api/storefront/trpc/*",
    cors({
      origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "x-request-id",
        "x-trpc-source",
      ],
      exposeHeaders: ["Content-Length"],
      credentials: true,
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
  "/api/storefront/trpc/*",
  trpcServer({
    router: storefrontAppRouter,
    createContext: createTRPCContext,
    endpoint: "/api/storefront/trpc",
    onError({ error, path, type }) {
      captureTrpcError({
        error,
        path,
        type,
        router: "storefront",
      });
    },
  }),
);
app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
    endpoint: "/api/trpc",
    onError({ error, path, type }) {
      captureTrpcError({
        error,
        path,
        type,
        router: "app",
      });
    },
  }),
);
app.get("/health", async (c) => {
  c.header("Cache-Control", "no-store");

  try {
    await db.users.count();

    return c.json({
      status: "ok",
      checks: {
        database: "ok",
      },
    });
  } catch (error) {
    captureApiError(
      error instanceof Error
        ? error
        : new Error("Database health check failed"),
      {
        method: c.req.method,
      },
    );

    return c.json(
      {
        status: "error",
        checks: {
          database: "unavailable",
        },
      },
      503,
    );
  }
});
app.get("/", (c) => {
  return c.json({ message: "Congrats! You've deployed Hono to Vercel" });
});

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return error.getResponse();
  }

  captureApiError(error, {
    method: c.req.method,
  });

  return c.json({ error: "Internal Server Error" }, 500);
});

export { app };
export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3014,
  fetch: app.fetch,
};
