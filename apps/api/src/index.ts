import "./instrument";

import { randomUUID } from "node:crypto";
import { db } from "@gnd/db";
import type { DevLogEntry } from "@gnd/dev-logger";
import { classifyError } from "@gnd/errors";
import { trpcServer } from "@hono/trpc-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { captureApiError, captureTrpcError } from "./observability/sentry";
import { getRestErrorResponse } from "./rest/error-response";
import type { Context } from "./rest/types";
import { createTRPCContext } from "./trpc/init";
import { appRouter } from "./trpc/routers/_app";
import { storefrontAppRouter } from "./trpc/routers/storefront-app";

const app = new OpenAPIHono<Context>(); //.basePath("/api");

app.use(secureHeaders());
app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") || randomUUID();
  c.set("requestId", requestId);
  c.header("x-request-id", requestId);
  await next();
});
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
        "x-request-id",
        "x-tenant-domain",
        "x-tenant-session-term-id",
        "x-user-timezone",
        "x-user-country",
      ],
      exposeHeaders: ["Content-Length", "x-request-id"],
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
      exposeHeaders: ["Content-Length", "x-request-id"],
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
      allowHeaders: [
        "Authorization",
        "Content-Type",
        "x-app-authorization",
        "x-request-id",
      ],
      exposeHeaders: ["Content-Length", "x-request-id"],
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
    const { appendDevLogEntryToFile } = await import(
      "@gnd/dev-logger/file-sink"
    );
    await appendDevLogEntryToFile(body.entry as DevLogEntry);
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
    onError({ ctx, error, path, type }) {
      captureTrpcError({
        error,
        path,
        requestId: ctx?.requestId,
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
    onError({ ctx, error, path, type }) {
      captureTrpcError({
        error,
        path,
        requestId: ctx?.requestId,
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
        requestId: c.get("requestId"),
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
  const classified = classifyError(error);
  captureApiError(classified, {
    method: c.req.method,
    requestId: c.get("requestId"),
  });

  const response = getRestErrorResponse(classified);
  return c.json(response.body, response.status);
});

export { app };
export default {
  port: process.env.PORT ? Number.parseInt(process.env.PORT) : 3014,
  fetch: app.fetch,
};
