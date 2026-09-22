import { db } from "@gnd/db";
import { getWebAuthSession, webAuth } from "@gnd/auth/better-auth/www";
import { z } from "zod";
import {
  authorizeConnectedExtension,
  ConnectionDenied,
  issueConnectionCode,
  listConnectedExtensions,
  redeemConnectionCode,
  revokeConnectedExtension,
} from "../services/messaging/connection-service";
import { consumeRedemptionAttempt } from "../services/messaging/redemption-limit";
import {
  createMessagingConnection,
  createMessagingConnectionInput,
  readConnectedConfiguration,
  updateMessagingConnection,
  updateMessagingConnectionInput,
} from "../services/messaging/connection-config";

const issueInput = z.object({ connectionId: z.string().min(1).max(191), password: z.string().min(1).max(1024) });
const exchangeInput = z.object({ code: z.string().regex(/^\d{12}$/), label: z.string().max(100), extensionVersion: z.string().max(50) });
const connectionInput = z.object({ connectionId: z.string().min(1).max(191) });

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 4096) throw new Error("invalid_body");
  const raw = await request.text();
  if (raw.length > 4096) throw new Error("invalid_body");
  return JSON.parse(raw) as unknown;
}

function dashboardOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = process.env.NEXT_PUBLIC_APP_URL;
  return Boolean(origin && allowed && origin === new URL(allowed).origin);
}

async function actor(request: Request) {
  if (!dashboardOrigin(request)) throw new ConnectionDenied("not_authorized");
  const session = await getWebAuthSession(request.headers);
  const id = Number(session?.user?.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ConnectionDenied("not_authorized");
  return id;
}

function bearer(request: Request) {
  const match = /^Bearer (gnd_msg_[A-Za-z0-9_-]+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new ConnectionDenied("revoked");
  return match[1]!;
}

export async function handleMessagingConnection(request: Request): Promise<Response> {
  const action = new URL(request.url).pathname.split("/").at(-1);
  try {
    if (request.method === "POST" && action === "issue") {
      const actorId = await actor(request);
      const parsed = issueInput.parse(await body(request));
      // Better Auth checks the actual credential account and sensitive web
      // session. Social-only accounts fail closed until a fresh-auth flow exists.
      await webAuth.api.verifyPassword({ headers: request.headers, body: { password: parsed.password } });
      return response(await issueConnectionCode({ db, verifiedActorId: actorId, connectionId: parsed.connectionId }));
    }
    if (request.method === "POST" && action === "exchange") {
      const limit = await consumeRedemptionAttempt(request.headers);
      if (limit !== "allowed") return response({ error: limit === "limited" ? "RATE_LIMITED" : "UNAVAILABLE" }, limit === "limited" ? 429 : 503);
      const parsed = exchangeInput.parse(await body(request));
      return response(await redeemConnectionCode({ db, ...parsed }));
    }
    if (request.method === "POST" && action === "disconnect") {
      const parsed = connectionInput.parse(await body(request));
      const authorized = await authorizeConnectedExtension({ db, credential: bearer(request), connectionId: parsed.connectionId, allowDisabled: true });
      await revokeConnectedExtension({ db, actorId: authorized.employeeId, connectionId: parsed.connectionId, connectedExtensionId: authorized.connectedExtensionId });
      return response({ disconnected: true });
    }
    if (request.method === "POST" && action === "revoke") {
      const actorId = await actor(request);
      const parsed = connectionInput.extend({ connectedExtensionId: z.string().min(1).max(191) }).parse(await body(request));
      return response(await revokeConnectedExtension({ db, actorId, ...parsed }));
    }
    if (request.method === "POST" && action === "list") {
      const actorId = await actor(request);
      const parsed = connectionInput.parse(await body(request));
      return response(await listConnectedExtensions({ db, actorId, connectionId: parsed.connectionId }));
    }
    if (request.method === "POST" && action === "create") {
      const actorId = await actor(request);
      const parsed = createMessagingConnectionInput.parse(await body(request));
      return response(await createMessagingConnection({ db, actorId, value: parsed }));
    }
    if (request.method === "POST" && action === "update") {
      const actorId = await actor(request);
      const parsed = updateMessagingConnectionInput.parse(await body(request));
      return response(await updateMessagingConnection({ db, actorId, value: parsed }));
    }
    if (request.method === "POST" && action === "status") {
      const parsed = connectionInput.parse(await body(request));
      const authorized = await authorizeConnectedExtension({ db, credential: bearer(request), connectionId: parsed.connectionId, allowDisabled: true });
      const configuration = await readConnectedConfiguration({ db, connectionId: parsed.connectionId });
      if (!configuration) throw new ConnectionDenied("revoked");
      return response({ connectedExtensionId: authorized.connectedExtensionId, connectionId: parsed.connectionId, configuration });
    }
    return response({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    if (error instanceof ConnectionDenied) return response({ error: "UNAUTHORIZED" }, 401);
    if (error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "invalid_body")) return response({ error: "INVALID_REQUEST" }, 400);
    if (action === "issue") return response({ error: "CONFIRMATION_FAILED" }, 403);
    return response({ error: "UNAVAILABLE" }, 503);
  }
}
