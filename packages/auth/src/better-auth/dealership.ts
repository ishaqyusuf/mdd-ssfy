import { db } from "@gnd/db";
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
import { isMasterPassword } from "../utils";

export type DealerNewDeviceLoginAlertInput = {
	sessionId: string;
	userId: string;
	accountName: string | null;
	accountEmail: string;
	ipAddress: string | null;
	userAgent: string | null;
};

let dealerNewDeviceLoginAlertHandler:
	| ((input: DealerNewDeviceLoginAlertInput) => Promise<void> | void)
	| null = null;

export function setDealerNewDeviceLoginAlertHandler(
	handler: typeof dealerNewDeviceLoginAlertHandler,
) {
	dealerNewDeviceLoginAlertHandler = handler;
}

function runDealerNewDeviceLoginAlert(input: DealerNewDeviceLoginAlertInput) {
	Promise.resolve(dealerNewDeviceLoginAlertHandler?.(input)).catch((error) => {
		console.error("Failed to run dealer new device login hook:", error);
	});
}

function getDealershipBaseUrl() {
	if (process.env.NEXT_PUBLIC_DEALERSHIP_URL) {
		return process.env.NEXT_PUBLIC_DEALERSHIP_URL.replace(/\/$/, "");
	}

	if (
		process.env.VERCEL_ENV === "production" ||
		process.env.NODE_ENV === "production"
	) {
		return "https://dealers.gndprodesk.com";
	}

	if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
		return `https://${process.env.VERCEL_URL}`;
	}

	return "http://localhost:4200";
}

function getTrustedOrigins() {
	return Array.from(
		new Set(
			[
				getDealershipBaseUrl(),
				process.env.NEXT_PUBLIC_DEALERSHIP_URL,
				process.env.NEXT_PUBLIC_APP_URL,
				process.env.BETTER_AUTH_TRUSTED_ORIGINS,
			]
				.flatMap((value) => value?.split(",") ?? [])
				.map((value) => value.trim().replace(/\/$/, ""))
				.filter(Boolean),
		),
	);
}

function dealerMasterPasswordPlugin(): BetterAuthPlugin {
	return {
		id: "dealer-master-password",
		endpoints: {
			dealerMasterSignIn: createAuthEndpoint(
				"/dealer-master-sign-in",
				{
					method: "POST",
					body: z.object({
						callbackURL: z.string().optional(),
						email: z.string().email(),
						password: z.string().min(1),
					}),
				},
				async (ctx) => {
					if (!isMasterPassword(ctx.body.password)) {
						throw new APIError("UNAUTHORIZED", {
							message: "Invalid email or password.",
						});
					}

					const user = await ctx.context.internalAdapter.findUserByEmail(
						ctx.body.email,
					);
					if (!user?.user) {
						throw new APIError("UNAUTHORIZED", {
							message: "Invalid email or password.",
						});
					}

					const session = await ctx.context.internalAdapter.createSession(
						user.user.id,
					);
					if (!session) {
						throw new APIError("UNAUTHORIZED", {
							message: "Failed to create session.",
						});
					}

					await setSessionCookie(ctx, {
						session,
						user: user.user,
					});

					runDealerNewDeviceLoginAlert({
						sessionId: session.id,
						userId: session.userId,
						accountName: user.user.name ?? null,
						accountEmail: user.user.email,
						ipAddress: session.ipAddress ?? null,
						userAgent: session.userAgent ?? null,
					});

					if (ctx.body.callbackURL) {
						ctx.setHeader("Location", ctx.body.callbackURL);
					}

					return ctx.json({
						redirect: !!ctx.body.callbackURL,
						token: session.token,
						url: ctx.body.callbackURL,
						user: parseUserOutput(ctx.context.options, user.user),
					});
				},
			),
		},
	};
}

export const dealerAuth = betterAuth({
	appName: "GND Dealership",
	baseURL: getDealershipBaseUrl(),
	secret: process.env.BETTER_AUTH_SECRET,
	trustedOrigins: getTrustedOrigins(),
	database: prismaAdapter(db as never, {
		provider: "mysql",
	}),
	user: {
		modelName: "DealerAuthUser",
	},
	session: {
		modelName: "DealerAuthSession",
	},
	account: {
		modelName: "DealerAuthAccount",
	},
	verification: {
		modelName: "DealerAuthVerification",
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			if (!ctx.path.includes("/sign-in/email")) return;

			const newSession = ctx.context.newSession as
				| {
						session?: {
							id?: string;
							userId?: string;
							ipAddress?: string | null;
							userAgent?: string | null;
						};
						user?: {
							id?: string;
							name?: string | null;
							email?: string | null;
						};
				  }
				| undefined;
			const session = newSession?.session;
			const user = newSession?.user;

			if (!session?.id || !session.userId || !user?.email) return;

			const alertInput = {
				sessionId: session.id,
				userId: session.userId,
				accountName: user.name ?? null,
				accountEmail: user.email,
				ipAddress: session.ipAddress ?? null,
				userAgent: session.userAgent ?? null,
			} satisfies DealerNewDeviceLoginAlertInput;

			runDealerNewDeviceLoginAlert(alertInput);
		}),
	},
	plugins: [dealerMasterPasswordPlugin(), nextCookies()],
});

export type DealerAuthSession = typeof dealerAuth.$Infer.Session;

export async function getDealerAuthSession(headers: Headers) {
	return dealerAuth.api.getSession({
		headers,
	});
}
