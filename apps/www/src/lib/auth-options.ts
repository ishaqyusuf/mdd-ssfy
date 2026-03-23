import { loginAction } from "@/app-deps/(v1)/_actions/auth";
import { PrismaClient, type Roles, type Users } from "@/db";
import type { ICan } from "@/types/auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { DefaultSession, NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const prisma = new PrismaClient();

function normalizeCan(can?: ICan | null): ICan {
	return (can ?? {}) as ICan;
}

async function isValidSessionRecord(
	sessionId?: string,
	userId?: Users["id"] | null,
) {
	if (!sessionId || !userId) {
		return false;
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
		},
	});

	return Boolean(session);
}

declare module "next-auth" {
	interface User {
		user: Users;
		can: ICan;
		role: Roles;
		sessionId?: string;
	}
	interface Session extends DefaultSession {
		// user: {
		user: Users;
		can: ICan;
		role: Roles;
	}
}
declare module "next-auth/jwt" {
	/** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
	interface JWT {
		user: Users;
		can: ICan;
		role: Roles;
		sessionId?: string;
	}
}
export const authOptions: NextAuthOptions = {
	session: {
		strategy: "jwt",
		// strategy: "database",
	},

	pages: {
		signIn: "/login",
		error: "/login?error=login+failed",
	},
	jwt: {
		secret: process.env.JWT_SECRET,
		maxAge: 15 * 24 * 30 * 60,
	},
	adapter: PrismaAdapter(prisma),
	secret: process.env.NEXTAUTH_SECRET,
	callbacks: {
		jwt: async ({ token, user: cred }) => {
			if (cred) {
				const { role, can, user, sessionId } = cred;
				token.user = user;
				token.can = normalizeCan(can);
				token.role = role;
				token.sessionId = sessionId;
			}
			if (!token.sessionId) return null;
			const hasValidSession = await isValidSessionRecord(
				token.sessionId,
				token.user?.id,
			);
			if (!hasValidSession) {
				return null;
			}
			token.can = normalizeCan(token.can);
			return token;
		},
		session({ session, token }) {
			if (session.user) {
				session.user = token.user;
				session.role = token.role;
				session.can = normalizeCan(token.can);
			}
			return session;
		},
	},
	providers: [
		CredentialsProvider({
			name: "Sign in",
			credentials: {
				token: {},

				email: {
					label: "Email",
					type: "email",
					placeholder: "example@example.com",
				},
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials) {
					return null;
				}
				const login = await loginAction(credentials);
				if (!login) {
					return null;
				}
				return login;
			},
		}),
	],
};
