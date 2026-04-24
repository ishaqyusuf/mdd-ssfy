import { loginAction } from "@/app-deps/(v1)/_actions/auth";
import { PrismaClient, type Roles, type Users } from "@/db";
import {
	buildWebSessionExpiry,
	getWebSessionRefreshWindowMs,
	normalizeRememberMe,
	WEB_AUTH_SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth-session-policy";
import type { ICan } from "@/types/auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const prisma = new PrismaClient();

type ActiveSessionInfo = {
	id: string;
	ipAddress: string | null;
	userAgent: string | null;
	expires: Date | null;
};

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

function isPrivateLocalHostname(hostname: string) {
	if (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname.endsWith(".localhost") ||
		hostname.endsWith(".local")
	) {
		return true;
	}

	if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
		return true;
	}

	if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
		return true;
	}

	const private172Match = hostname.match(
		/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/,
	);
	if (private172Match) {
		const secondOctet = Number(private172Match[1]);
		return secondOctet >= 16 && secondOctet <= 31;
	}

	return false;
}

function getAllowedDevRedirectOrigins() {
	const configuredOrigins =
		process.env.NEXTAUTH_ALLOWED_DEV_ORIGINS?.split(",")
			.map((origin) => origin.trim())
			.filter(Boolean) ?? [];

	return configuredOrigins;
}

function isAllowedDevRedirect(url: URL) {
	if (process.env.NODE_ENV === "production") {
		return false;
	}

	if (getAllowedDevRedirectOrigins().includes(url.origin)) {
		return true;
	}

	return url.protocol === "http:" && isPrivateLocalHostname(url.hostname);
}

async function getValidSessionRecord(
	sessionId?: string,
	userId?: Users["id"] | null,
	rememberMe?: boolean,
) {
	if (!sessionId || !userId) {
		return null;
	}

	const session = await prisma.session.findFirst({
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
		session.expires.getTime() - Date.now() <=
			getWebSessionRefreshWindowMs(rememberMe)
			? buildWebSessionExpiry({ rememberMe })
			: session.expires;

	if (nextExpiry && session.expires?.getTime() !== nextExpiry.getTime()) {
		await prisma.session.update({
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
		rememberMe?: boolean;
	}
	interface Session extends DefaultSession {
		// user: {
		user: Users;
		can: ICan;
		role: Roles;
		activeSession?: ActiveSessionInfo | null;
		rememberMe?: boolean;
	}
}
declare module "next-auth/jwt" {
	/** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
	interface JWT {
		user: Users;
		can: ICan;
		role: Roles;
		sessionId?: string;
		activeSession?: ActiveSessionInfo | null;
		rememberMe?: boolean;
	}
}
export const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
		maxAge: WEB_AUTH_SESSION_MAX_AGE_SECONDS,
	},

	pages: {
		signIn: "/login/v2",
		error: "/login/v2?error=login+failed",
	},
	jwt: {
		secret: process.env.JWT_SECRET,
		maxAge: WEB_AUTH_SESSION_MAX_AGE_SECONDS,
	},
	adapter: PrismaAdapter(prisma),
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		async redirect({ url, baseUrl }) {
			if (url.startsWith("/")) {
				return url;
			}

			try {
				const parsedUrl = new URL(url);
				if (parsedUrl.origin === baseUrl || isAllowedDevRedirect(parsedUrl)) {
					return url;
				}
			} catch {
				return baseUrl;
			}

			return baseUrl;
		},
		jwt: async ({ token, user: cred }) => {
			if (cred) {
				const { role, can, user, sessionId, activeSession, rememberMe } = cred;
				token.user = user;
				token.can = normalizeCan(can);
				token.role = role;
				token.sessionId = sessionId;
				token.activeSession = activeSession ?? null;
				token.rememberMe = rememberMe ?? false;
			}
			if (!token.sessionId) return null;
			const activeSession = await getValidSessionRecord(
				token.sessionId,
				token.user?.id,
				token.rememberMe ?? false,
			);
			if (!activeSession) {
				return null;
			}
			token.can = normalizeCan(token.can);
			token.activeSession = activeSession;
			token.rememberMe = token.rememberMe ?? false;
			return token;
		},
		session({ session, token }) {
			if (session.user) {
				session.user = token.user;
				session.role = token.role;
				session.can = normalizeCan(token.can);
				session.activeSession = token.activeSession ?? null;
				session.rememberMe = token.rememberMe ?? false;
			}
			return session;
		},
	},
	providers: [
		CredentialsProvider({
			name: "Sign in",
			credentials: {
				token: {},
				rememberMe: {},

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
				const login = await loginAction({
					...credentials,
					rememberMe: normalizeRememberMe(credentials.rememberMe),
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
