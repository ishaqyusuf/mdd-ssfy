import { createHash, randomBytes } from "crypto";
import { type Prisma, type Users, db } from "@gnd/db";
import { compare } from "bcrypt-ts";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  APIError,
  createAuthEndpoint,
  createAuthMiddleware,
} from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { parseUserOutput } from "better-auth/db";
import { nextCookies } from "better-auth/next-js";
import * as z from "zod";
import { isNewLoginDevice, normalizeLoginDevice } from "../new-device-login";
import {
  isMasterPassword,
  validateAuthToken,
} from "../utils";
import {
  REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_SECONDS,
  WEB_AUTH_SESSION_MAX_AGE_SECONDS,
  buildWebAppSession,
  buildWebAppSessionByToken,
  getLegacyUserByAuthUserId,
  toMobileAuthSession,
} from "./www-session";

export {
  REMEMBER_ME_WEB_SESSION_MAX_AGE_SECONDS,
  REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_SECONDS,
  STANDARD_WEB_SESSION_MAX_AGE_SECONDS,
  STANDARD_WEB_SESSION_REFRESH_WINDOW_SECONDS,
  WEB_AUTH_SESSION_MAX_AGE_SECONDS,
  buildWebAppSession,
  buildWebAppSessionByToken,
  toMobileAuthSession,
  type WebActiveSessionInfo,
  type WebAppSession,
  type WebMobileAuthSession,
} from "./www-session";

const PASSWORD_MIGRATION_TOKEN_EXPIRES_IN_SECONDS = 60 * 15;
const CREDENTIAL_PROVIDER_ID = "credential";
const PASSWORD_MIGRATION_IDENTIFIER_PREFIX = "www-password-migration:";
const RESET_PASSWORD_EXPIRY_HOURS = 1;
const GOOGLE_PROVIDER_ID = "google";

export type WebNewDeviceLoginAlertInput = {
  sessionId: string;
  userId: number;
  accountName: string | null;
  accountEmail: string;
  appSurface: "www";
  deviceLabel: string;
  deviceKey: string;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: string;
};

export type WebMasterPasswordLoginAlertInput = {
  sessionId: string;
  userId: number;
  accountName: string | null;
  accountEmail: string;
  appSurface: "www";
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: string;
};

let webNewDeviceLoginAlertHandler:
  | ((input: WebNewDeviceLoginAlertInput) => Promise<void> | void)
  | null = null;
let webMasterPasswordLoginAlertHandler:
  | ((input: WebMasterPasswordLoginAlertInput) => Promise<void> | void)
  | null = null;

export function setWebNewDeviceLoginAlertHandler(
  handler: typeof webNewDeviceLoginAlertHandler,
) {
  webNewDeviceLoginAlertHandler = handler;
}

export function setWebMasterPasswordLoginAlertHandler(
  handler: typeof webMasterPasswordLoginAlertHandler,
) {
  webMasterPasswordLoginAlertHandler = handler;
}

function runWebNewDeviceLoginAlert(input: WebNewDeviceLoginAlertInput) {
  Promise.resolve(webNewDeviceLoginAlertHandler?.(input)).catch((error) => {
    console.error("Failed to run web new device login hook:", error);
  });
}

function runWebMasterPasswordLoginAlert(
  input: WebMasterPasswordLoginAlertInput,
) {
  Promise.resolve(webMasterPasswordLoginAlertHandler?.(input)).catch((error) => {
    console.error("Failed to run web master password login hook:", error);
  });
}

function getWebBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

function getTrustedOrigins() {
  const localAppPort =
    process.env.PORTLESS_APP_PORT || process.env.PORT || "3000";
  const localOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    `http://localhost:${localAppPort}`,
    `http://127.0.0.1:${localAppPort}`,
  ];

  return Array.from(
    new Set(
      [
        getWebBaseUrl(),
        ...localOrigins,
        process.env.PORTLESS_URL,
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.BETTER_AUTH_TRUSTED_ORIGINS,
      ]
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim().replace(/\/$/, ""))
        .filter(Boolean),
    ),
  );
}

function getWebGoogleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    disableImplicitSignUp: true,
    prompt: "select_account" as const,
    mapProfileToUser(profile: {
      email?: string | null;
      email_verified?: boolean;
      name?: string | null;
      picture?: string | null;
    }) {
      return {
        email: profile.email?.toLowerCase() ?? null,
        emailVerified: Boolean(profile.email_verified),
        image: profile.picture ?? undefined,
        name: profile.name ?? undefined,
      };
    },
  };
}

function normalizeRememberMe(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function getBearerToken(headers?: Headers | null) {
  const authorization = headers?.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isGoogleAuthPath(path?: string | null) {
  return (
    path?.includes("/callback/google") || path?.includes("/sign-in/social")
  );
}

function getVerifiedSocialEmail(input: {
  email?: unknown;
  emailVerified?: unknown;
}) {
  if (typeof input.email !== "string" || !input.email.trim()) return null;
  if (input.emailVerified !== true) return null;

  return normalizeEmail(input.email);
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getActiveWebLegacyUserWhere(email: string) {
  return {
    email: email.trim(),
    accessRevokedAt: null,
    deletedAt: null,
    OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
  } satisfies Prisma.UsersWhereInput;
}

async function findLegacyUser(input: {
  email?: string | null;
  token?: string | null;
}) {
  let email = input.email?.trim();
  let tokenAuthenticated = false;

  if (input.token) {
    const { email: tokenEmail } = await validateAuthToken(db, input.token);
    if (!tokenEmail) return null;
    email = tokenEmail;
    tokenAuthenticated = true;
  }

  if (!email) return null;

  const user = await db.users.findFirst({
    where: getActiveWebLegacyUserWhere(email),
    include: {
      roles: {
        include: {
          role: {
            include: {
              RoleHasPermissions: true,
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  return {
    user,
    tokenAuthenticated,
  };
}

async function upsertWebAuthUser(user: Users) {
  return db.webAuthUser.upsert({
    where: { legacyUserId: user.id },
    create: {
      id: crypto.randomUUID(),
      legacyUserId: user.id,
      name: user.name || user.email,
      email: user.email.toLowerCase(),
      emailVerified: Boolean(user.emailVerifiedAt),
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      name: user.name || user.email,
      email: user.email.toLowerCase(),
      emailVerified: Boolean(user.emailVerifiedAt),
      updatedAt: new Date(),
    },
  });
}

function buildWebAuthUserDataFromLegacyUser(
  user: Users,
  input?: {
    image?: unknown;
    name?: unknown;
  },
) {
  return {
    legacyUserId: user.id,
    name:
      user.name ||
      (typeof input?.name === "string" && input.name.trim()
        ? input.name
        : user.email),
    email: normalizeEmail(user.email),
    emailVerified: true,
    image: typeof input?.image === "string" ? input.image : null,
  };
}

async function findCredentialAccount(authUserId: string) {
  return db.webAuthAccount.findFirst({
    where: {
      userId: authUserId,
      providerId: CREDENTIAL_PROVIDER_ID,
    },
  });
}

async function ensureCredentialAccount(authUserId: string) {
  return db.webAuthAccount.upsert({
    where: {
      providerId_accountId: {
        providerId: CREDENTIAL_PROVIDER_ID,
        accountId: authUserId,
      },
    },
    create: {
      id: crypto.randomUUID(),
      accountId: authUserId,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: authUserId,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      updatedAt: new Date(),
    },
  });
}

async function ensureWebSocialCredentialAccount(authUserId: string) {
  await ensureCredentialAccount(authUserId);
}

function upsertCredentialPassword(authUserId: string, password: string) {
  return db.webAuthAccount.upsert({
    where: {
      providerId_accountId: {
        providerId: CREDENTIAL_PROVIDER_ID,
        accountId: authUserId,
      },
    },
    create: {
      id: crypto.randomUUID(),
      accountId: authUserId,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: authUserId,
      password,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    update: {
      password,
      updatedAt: new Date(),
    },
  });
}

async function createPasswordMigrationToken(authUserId: string) {
  await db.webAuthVerification.deleteMany({
    where: {
      identifier: {
        startsWith: PASSWORD_MIGRATION_IDENTIFIER_PREFIX,
      },
      value: authUserId,
    },
  });

  const token = randomBytes(32).toString("base64url");
  await db.webAuthVerification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: `${PASSWORD_MIGRATION_IDENTIFIER_PREFIX}${token}`,
      value: authUserId,
      expiresAt: new Date(
        Date.now() + PASSWORD_MIGRATION_TOKEN_EXPIRES_IN_SECONDS * 1000,
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return token;
}

type WebCredentialAccountLike = {
  password?: string | null;
} | null;

type WebLegacyCredentialDecision =
  | {
      authenticated: true;
      masterPasswordAuthenticated: boolean;
      requiresPasswordMigration?: false;
    }
  | {
      authenticated: false;
      masterPasswordAuthenticated: false;
      requiresPasswordMigration?: false;
    }
  | {
      authenticated: false;
      masterPasswordAuthenticated: false;
      requiresPasswordMigration: true;
      url: string;
    };

export async function resolveWebLegacyCredentialSignIn(input: {
  authUserId: string;
  callbackURL?: string;
  clearLegacyPassword: (userId: number) => Promise<unknown>;
  compareLegacyPassword?: (password: string, hash: string) => Promise<boolean>;
  createPasswordMigrationToken: (authUserId: string) => Promise<string>;
  credentialAccount?: WebCredentialAccountLike;
  ensureCredentialAccount: (authUserId: string) => Promise<unknown>;
  legacyPasswordHash?: string | null;
  legacyUserId: number;
  masterPasswordMatches?: (password: string) => boolean;
  password: string;
  tokenAuthenticated: boolean;
  verifyCredentialPassword: (input: {
    hash: string;
    password: string;
  }) => Promise<boolean>;
}): Promise<WebLegacyCredentialDecision> {
  const compareLegacyPassword = input.compareLegacyPassword ?? compare;
  const masterPasswordAuthenticated =
    !!input.password && (input.masterPasswordMatches ?? isMasterPassword)(
      input.password,
    );

  if (masterPasswordAuthenticated) {
    await input.ensureCredentialAccount(input.authUserId);
    return {
      authenticated: true,
      masterPasswordAuthenticated: true,
    };
  }

  let authenticated = input.tokenAuthenticated;

  if (!authenticated && input.legacyPasswordHash && input.password) {
    const legacyPasswordMatches = await compareLegacyPassword(
      input.password,
      input.legacyPasswordHash,
    );
    if (legacyPasswordMatches && !input.credentialAccount?.password) {
      await input.ensureCredentialAccount(input.authUserId);
      const token = await input.createPasswordMigrationToken(input.authUserId);
      const url = `/login/create-password?token=${encodeURIComponent(token)}&callbackUrl=${encodeURIComponent(input.callbackURL || "/")}`;

      return {
        authenticated: false,
        masterPasswordAuthenticated: false,
        requiresPasswordMigration: true,
        url,
      };
    }
    if (legacyPasswordMatches && input.credentialAccount?.password) {
      await input.clearLegacyPassword(input.legacyUserId);
    }
    authenticated = legacyPasswordMatches;
  }

  if (
    !authenticated &&
    input.credentialAccount?.password &&
    input.password
  ) {
    authenticated = await input.verifyCredentialPassword({
      hash: input.credentialAccount.password,
      password: input.password,
    });
  }

  if (authenticated) {
    return {
      authenticated: true,
      masterPasswordAuthenticated: false,
    };
  }

  return {
    authenticated: false,
    masterPasswordAuthenticated: false,
  };
}

function auditWebMasterPasswordSignIn(input: {
  accountEmail: string;
  ipAddress: string | null;
  sessionId: string;
  userAgent: string | null;
  userId: number;
}) {
  console.info("[auth] web master password login", {
    accountEmail: input.accountEmail,
    appSurface: "www",
    event: "web_master_password_login",
    ipAddress: input.ipAddress,
    loginAt: new Date().toISOString(),
    sessionId: input.sessionId,
    userAgent: input.userAgent,
    userId: input.userId,
  });
}

function webCredentialsPlugin(): BetterAuthPlugin {
  return {
    id: "web-legacy-credentials",
    endpoints: {
      webLegacySignIn: createAuthEndpoint(
        "/www-legacy-sign-in",
        {
          method: "POST",
          body: z.object({
            callbackURL: z.string().optional(),
            email: z.string().email().optional(),
            password: z.string().optional(),
            rememberMe: z.union([z.boolean(), z.string()]).optional(),
            token: z.string().optional(),
          }),
        },
        async (ctx) => {
          const legacyLogin = await findLegacyUser(ctx.body);
          if (!legacyLogin) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password.",
            });
          }

          const { tokenAuthenticated, user } = legacyLogin;
          const authUser = await upsertWebAuthUser(user);
          const credentialAccount = await findCredentialAccount(authUser.id);
          const password =
            typeof ctx.body.password === "string" ? ctx.body.password : "";
          const authDecision = await resolveWebLegacyCredentialSignIn({
            authUserId: authUser.id,
            callbackURL: ctx.body.callbackURL,
            clearLegacyPassword: (legacyUserId) =>
              db.users.update({
                where: { id: legacyUserId },
                data: { password: null },
              }),
            createPasswordMigrationToken,
            credentialAccount,
            ensureCredentialAccount,
            legacyPasswordHash: user.password,
            legacyUserId: user.id,
            password,
            tokenAuthenticated,
            verifyCredentialPassword: (input) =>
              ctx.context.password.verify(input),
          });

          if (authDecision.requiresPasswordMigration) {
            return ctx.json({
              redirect: true,
              requiresPasswordMigration: true,
              url: authDecision.url,
            });
          }

          if (!authDecision.authenticated) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password.",
            });
          }

          const previousSessions = await db.webAuthSession.findMany({
            where: { userId: authUser.id },
            select: {
              id: true,
              userAgent: true,
            },
          });
          const shouldSendNewDeviceAlert = isNewLoginDevice(
            ctx.headers?.get("user-agent") ?? null,
            previousSessions,
          );
          const rememberMe = normalizeRememberMe(ctx.body.rememberMe);
          const session = await ctx.context.internalAdapter.createSession(
            authUser.id,
            !rememberMe,
          );

          if (!session) {
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session.",
            });
          }

          await setSessionCookie(
            ctx,
            {
              session,
              user: authUser,
            },
            !rememberMe,
          );

          const loginAt = new Date().toISOString();

          if (authDecision.masterPasswordAuthenticated) {
            auditWebMasterPasswordSignIn({
              sessionId: session.id,
              userId: user.id,
              accountEmail: user.email,
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
            });

            runWebMasterPasswordLoginAlert({
              sessionId: session.id,
              userId: user.id,
              accountName: user.name,
              accountEmail: user.email,
              appSurface: "www",
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
              loginAt,
            });
          } else if (shouldSendNewDeviceAlert) {
            const device = normalizeLoginDevice(session.userAgent);
            runWebNewDeviceLoginAlert({
              sessionId: session.id,
              userId: user.id,
              accountName: user.name,
              accountEmail: user.email,
              appSurface: "www",
              deviceLabel: device.label,
              deviceKey: device.key,
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
              loginAt,
            });
          }

          if (ctx.body.callbackURL) {
            ctx.setHeader("Location", ctx.body.callbackURL);
          }

          return ctx.json({
            redirect: !!ctx.body.callbackURL,
            token: session.token,
            url: ctx.body.callbackURL,
            user: parseUserOutput(ctx.context.options, authUser),
          });
        },
      ),
      webMobileSignIn: createAuthEndpoint(
        "/www-mobile-sign-in",
        {
          method: "POST",
          body: z.object({
            callbackURL: z.string().optional(),
            email: z.string().email().optional(),
            password: z.string().optional(),
            rememberMe: z.union([z.boolean(), z.string()]).optional(),
            token: z.string().optional(),
          }),
        },
        async (ctx) => {
          const legacyLogin = await findLegacyUser(ctx.body);
          if (!legacyLogin) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password.",
            });
          }

          const { tokenAuthenticated, user } = legacyLogin;
          const authUser = await upsertWebAuthUser(user);
          const credentialAccount = await findCredentialAccount(authUser.id);
          const password =
            typeof ctx.body.password === "string" ? ctx.body.password : "";
          const authDecision = await resolveWebLegacyCredentialSignIn({
            authUserId: authUser.id,
            callbackURL: ctx.body.callbackURL,
            clearLegacyPassword: (legacyUserId) =>
              db.users.update({
                where: { id: legacyUserId },
                data: { password: null },
              }),
            createPasswordMigrationToken,
            credentialAccount,
            ensureCredentialAccount,
            legacyPasswordHash: user.password,
            legacyUserId: user.id,
            password,
            tokenAuthenticated,
            verifyCredentialPassword: (input) =>
              ctx.context.password.verify(input),
          });

          if (authDecision.requiresPasswordMigration) {
            return ctx.json({
              redirect: false,
              requiresPasswordMigration: true,
              url: authDecision.url,
            });
          }

          if (!authDecision.authenticated) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid email or password.",
            });
          }

          const previousSessions = await db.webAuthSession.findMany({
            where: { userId: authUser.id },
            select: {
              id: true,
              userAgent: true,
            },
          });
          const shouldSendNewDeviceAlert = isNewLoginDevice(
            ctx.headers?.get("user-agent") ?? null,
            previousSessions,
          );
          const rememberMe = normalizeRememberMe(ctx.body.rememberMe);
          const session = await ctx.context.internalAdapter.createSession(
            authUser.id,
            !rememberMe,
          );

          if (!session) {
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session.",
            });
          }

          const loginAt = new Date().toISOString();

          if (authDecision.masterPasswordAuthenticated) {
            auditWebMasterPasswordSignIn({
              sessionId: session.id,
              userId: user.id,
              accountEmail: user.email,
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
            });

            runWebMasterPasswordLoginAlert({
              sessionId: session.id,
              userId: user.id,
              accountName: user.name,
              accountEmail: user.email,
              appSurface: "www",
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
              loginAt,
            });
          } else if (shouldSendNewDeviceAlert) {
            const device = normalizeLoginDevice(session.userAgent);
            runWebNewDeviceLoginAlert({
              sessionId: session.id,
              userId: user.id,
              accountName: user.name,
              accountEmail: user.email,
              appSurface: "www",
              deviceLabel: device.label,
              deviceKey: device.key,
              ipAddress: session.ipAddress ?? null,
              userAgent: session.userAgent ?? null,
              loginAt,
            });
          }

          const appSession = await buildWebAppSession({
            session,
            user: authUser,
          } as WebAuthSession);
          const mobileSession = appSession
            ? toMobileAuthSession(session.token, appSession)
            : null;

          if (!mobileSession) {
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session.",
            });
          }

          return ctx.json(mobileSession);
        },
      ),
      webMobileSession: createAuthEndpoint(
        "/www-mobile-session",
        {
          method: "GET",
        },
        async (ctx) => {
          const token = getBearerToken(ctx.headers);
          const session = token
            ? await buildWebAppSessionByToken(token)
            : null;

          if (!session) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid session.",
            });
          }

          return ctx.json(session);
        },
      ),
      webMobileSignOut: createAuthEndpoint(
        "/www-mobile-sign-out",
        {
          method: "POST",
        },
        async (ctx) => {
          const token = getBearerToken(ctx.headers);
          if (token) {
            await db.webAuthSession.deleteMany({
              where: { token },
            });
          }

          return ctx.json({ status: true });
        },
      ),
      webCompletePasswordMigration: createAuthEndpoint(
        "/www-complete-password-migration",
        {
          method: "POST",
          body: z.object({
            callbackURL: z.string().optional(),
            password: z.string().min(6).max(100),
            token: z.string().min(20),
          }),
        },
        async (ctx) => {
          const identifier = `${PASSWORD_MIGRATION_IDENTIFIER_PREFIX}${ctx.body.token}`;
          const verification = await db.webAuthVerification.findFirst({
            where: {
              identifier,
              expiresAt: {
                gt: new Date(),
              },
            },
          });

          if (!verification) {
            throw new APIError("BAD_REQUEST", {
              message: "This password setup link is invalid or has expired.",
            });
          }

          const authUser = await db.webAuthUser.findUnique({
            where: {
              id: verification.value,
            },
            include: {
              legacyUser: true,
            },
          });

          if (!authUser?.legacyUser || authUser.legacyUser.accessRevokedAt) {
            throw new APIError("UNAUTHORIZED", {
              message: "Invalid account.",
            });
          }

          const hashedPassword = await ctx.context.password.hash(
            ctx.body.password,
          );
          await db.$transaction([
            upsertCredentialPassword(authUser.id, hashedPassword),
            db.users.update({
              where: {
                id: authUser.legacyUserId,
              },
              data: {
                password: null,
              },
            }),
            db.webAuthVerification.delete({
              where: {
                id: verification.id,
              },
            }),
          ]);

          const session = await ctx.context.internalAdapter.createSession(
            authUser.id,
            false,
          );

          if (!session) {
            throw new APIError("UNAUTHORIZED", {
              message: "Failed to create session.",
            });
          }

          await setSessionCookie(ctx, {
            session,
            user: authUser,
          });

          return ctx.json({
            redirect: true,
            token: session.token,
            url: ctx.body.callbackURL || "/",
            user: parseUserOutput(ctx.context.options, authUser),
          });
        },
      ),
      webResetPassword: createAuthEndpoint(
        "/www-reset-password",
        {
          method: "POST",
          body: z.object({
            password: z.string().min(6).max(100),
            token: z.string().min(20),
          }),
        },
        async (ctx) => {
          const reset = await db.passwordResets.findFirst({
            where: {
              createdAt: {
                gte: new Date(
                  Date.now() - RESET_PASSWORD_EXPIRY_HOURS * 60 * 60 * 1000,
                ),
              },
              deletedAt: null,
              token: hashResetToken(ctx.body.token),
              usedAt: null,
            },
          });

          if (!reset) {
            throw new APIError("BAD_REQUEST", {
              message: "This password reset link is invalid or has expired.",
            });
          }

          const legacyLogin = await findLegacyUser({ email: reset.email });
          if (!legacyLogin) {
            throw new APIError("BAD_REQUEST", {
              message: "This password reset link is invalid or has expired.",
            });
          }

          const authUser = await upsertWebAuthUser(legacyLogin.user);
          const hashedPassword = await ctx.context.password.hash(
            ctx.body.password,
          );

          await db.$transaction([
            upsertCredentialPassword(authUser.id, hashedPassword),
            db.users.update({
              where: {
                id: legacyLogin.user.id,
              },
              data: {
                password: null,
              },
            }),
            db.passwordResets.update({
              where: {
                id: reset.id,
              },
              data: {
                usedAt: new Date(),
              },
            }),
            db.webAuthSession.deleteMany({
              where: {
                userId: authUser.id,
              },
            }),
          ]);

          return ctx.json({ status: true });
        },
      ),
    },
  };
}

const webGoogleProvider = getWebGoogleProvider();

export const webAuth = betterAuth({
  appName: "GND Workspace",
  baseURL: getWebBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(db as never, {
    provider: "mysql",
  }),
  advanced: {
    cookiePrefix: "gnd-www-auth",
  },
  user: {
    modelName: "WebAuthUser",
    additionalFields: {
      legacyUserId: {
        type: "number",
        required: true,
        input: false,
      },
    },
  },
  session: {
    modelName: "WebAuthSession",
    expiresIn: WEB_AUTH_SESSION_MAX_AGE_SECONDS,
    updateAge: REMEMBER_ME_WEB_SESSION_REFRESH_WINDOW_SECONDS,
  },
  account: {
    modelName: "WebAuthAccount",
    accountLinking: {
      requireLocalEmailVerified: false,
      trustedProviders: [GOOGLE_PROVIDER_ID],
    },
  },
  verification: {
    modelName: "WebAuthVerification",
  },
  ...(webGoogleProvider
    ? {
        socialProviders: {
          google: webGoogleProvider,
        },
      }
    : {}),
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.includes("/callback/google")) return;

      const newSession = ctx.context.newSession as
        | {
            session?: {
              id?: string;
              ipAddress?: string | null;
              userAgent?: string | null;
            };
            user?: {
              id?: string;
              email?: string | null;
              name?: string | null;
            };
          }
        | undefined;
      const session = newSession?.session;
      const authUser = newSession?.user;

      if (!session?.id || !authUser?.id || !authUser.email) return;

      const legacyUser = await getLegacyUserByAuthUserId(authUser.id);
      if (!legacyUser) {
        await db.webAuthSession.deleteMany({
          where: { id: session.id },
        });
        return;
      }

      const previousSessions = await db.webAuthSession.findMany({
        where: {
          userId: authUser.id,
          id: {
            not: session.id,
          },
        },
        select: {
          id: true,
          userAgent: true,
        },
      });
      if (
        !isNewLoginDevice(
          session.userAgent ?? ctx.headers?.get("user-agent") ?? null,
          previousSessions,
        )
      ) {
        return;
      }

      const device = normalizeLoginDevice(session.userAgent);
      runWebNewDeviceLoginAlert({
        sessionId: session.id,
        userId: legacyUser.id,
        accountName: legacyUser.name,
        accountEmail: legacyUser.email,
        appSurface: "www",
        deviceLabel: device.label,
        deviceKey: device.key,
        ipAddress: session.ipAddress ?? null,
        userAgent: session.userAgent ?? null,
        loginAt: new Date().toISOString(),
      });
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (!isGoogleAuthPath(context?.path)) return;

          const email = getVerifiedSocialEmail(user);
          if (!email) return false;

          const legacyLogin = await findLegacyUser({ email });
          if (!legacyLogin) return false;

          return {
            data: buildWebAuthUserDataFromLegacyUser(legacyLogin.user, user),
          };
        },
      },
    },
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== GOOGLE_PROVIDER_ID) return;

          await ensureWebSocialCredentialAccount(account.userId);
        },
      },
    },
  },
  plugins: [webCredentialsPlugin(), nextCookies()],
});

export type WebAuthSession = typeof webAuth.$Infer.Session;

export async function getWebAuthSession(headers: Headers) {
  const authSession = await webAuth.api.getSession({
    headers,
  });

  return buildWebAppSession(authSession);
}
