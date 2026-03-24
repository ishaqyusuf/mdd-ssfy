import { type Roles, type Users, db } from "@gnd/db";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import {
	AUTH_SESSION_MAX_AGE_SECONDS,
	buildSessionExpiry,
	type ICan,
	loginAction,
} from "./utils";

type ActiveSessionInfo = {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	expires: Date | null;
};

const AUTH_SESSION_REFRESH_WINDOW_MS = 1000 * 60 * 60 * 24;

function normalizeCan(can?: ICan | null): ICan {
	return (can ?? {}) as ICan;
}

function getRequestIpAddress(
	headers: Headers | Record<string, string | string[] | undefined>,
) {
	const forwardedFor =
		headers instanceof Headers
			? headers.get("x-forwarded-for")
			: headers["x-forwarded-for"];
	const realIp =
		headers instanceof Headers
			? headers.get("x-real-ip")
			: headers["x-real-ip"];
	const value = Array.isArray(forwardedFor)
		? forwardedFor[0]
		: (forwardedFor ?? realIp);
	const normalizedValue = Array.isArray(value) ? value[0] : value;

	return normalizedValue?.split(",")[0]?.trim() || null;
}

function getRequestUserAgent(
	headers: Headers | Record<string, string | string[] | undefined>,
) {
	const userAgent =
		headers instanceof Headers
			? headers.get("user-agent")
			: headers["user-agent"];

	return Array.isArray(userAgent)
		? (userAgent[0] ?? null)
		: (userAgent ?? null);
}

async function getValidSessionRecord(
	sessionId?: string,
	userId?: Users["id"] | null,
) {
	if (!sessionId || !userId) {
		return null;
	}

	const session = await db.session.findFirst({
		where: {
			id: sessionId,
			userId,
			deletedAt: null,
			OR: [{ expires: null }, { expires: { gt: new Date() } }],
		},
		select: {
			id: true,
			ipAddress: true,
			userAgent: true,
			expires: true,
		},
	});

	if (!session) {
		return null;
	}

	const nextExpiry =
		session.expires &&
		session.expires.getTime() - Date.now() <= AUTH_SESSION_REFRESH_WINDOW_MS
			? buildSessionExpiry()
			: session.expires;

	if (nextExpiry && session.expires?.getTime() !== nextExpiry.getTime()) {
		await db.session.update({
			where: { id: session.id },
			data: { expires: nextExpiry },
		});
	}

	return {
		id: session.id,
		ipAddress: session.ipAddress ?? null,
		userAgent: session.userAgent ?? null,
		expires: nextExpiry ?? null,
	} satisfies ActiveSessionInfo;
}

declare module "next-auth" {
	interface User {
		user: Users;
		can: ICan;
		role: Roles;
		sessionId?: string;
		activeSession?: ActiveSessionInfo | null;
	}

	interface Session extends DefaultSession {
		user: Users;
		can: ICan;
		role: Roles;
		activeSession?: ActiveSessionInfo | null;
	}
}

declare module "next-auth/jwt" {
	interface JWT {
		user: Users;
		can: ICan;
		role: Roles;
		sessionId?: string;
		activeSession?: ActiveSessionInfo | null;
	}
}

export function nextAuthOptions(options: {
	secret: string | undefined;
}): NextAuthOptions {
	return {
		session: {
			strategy: "jwt",
			maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
		},
		pages: {
			signIn: "/login",
			error: "/login?error=login+failed",
		},
		jwt: {
			secret: process.env.JWT_SECRET,
			maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
		},
		adapter: PrismaAdapter(db),
		secret: options.secret,
		callbacks: {
			jwt: async ({ token, user: cred }) => {
				if (cred) {
					const { role, can, user, sessionId, activeSession } = cred;
					token.user = user;
					token.can = normalizeCan(can);
					token.role = role;
					token.sessionId = sessionId;
					token.activeSession = activeSession ?? null;
				}

				if (!token.sessionId) return null;
				const activeSession = await getValidSessionRecord(
					token.sessionId,
					token.user?.id,
				);
				if (!activeSession) {
					return null;
				}

				token.can = normalizeCan(token.can);
				token.activeSession = activeSession;

				return token;
			},
			session({ session, token }) {
				if (session.user) {
					session.user = token.user;
					session.role = token.role;
					session.can = normalizeCan(token.can);
					session.activeSession = token.activeSession ?? null;
				}

				return session;
			},
		},
		providers: [
			CredentialsProvider({
				name: "Sign in",
				credentials: {
					token: {},
					type: {},
					email: {
						label: "Email",
						type: "email",
						placeholder: "example@example.com",
					},
					password: { label: "Password", type: "password" },
				},
				async authorize(credentials, req) {
					if (!credentials) {
						return null;
					}

					const login = await loginAction(db, {
						email: credentials.email,
						password: credentials.password,
						token: credentials.token,
						sessionMeta: {
							ipAddress: getRequestIpAddress(req.headers),
							userAgent: getRequestUserAgent(req.headers),
						},
					});
					if (!login) {
						return null;
					}

					return login;
				},
			}),
		],
	};
}
