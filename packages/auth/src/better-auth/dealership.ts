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
import { magicLink } from "better-auth/plugins";
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

export type DealerMasterPasswordLoginAlertInput = {
	sessionId: string;
	userId: string;
	accountName: string | null;
	accountEmail: string;
	appSurface: "dealership";
	ipAddress: string | null;
	userAgent: string | null;
	loginAt: string;
};

export type DealerAuthEmailInput = {
	accountName: string | null;
	accountEmail: string;
	url: string;
	expiresInSeconds: number;
};

let dealerNewDeviceLoginAlertHandler:
	| ((input: DealerNewDeviceLoginAlertInput) => Promise<void> | void)
	| null = null;
let dealerMasterPasswordLoginAlertHandler:
	| ((input: DealerMasterPasswordLoginAlertInput) => Promise<void> | void)
	| null = null;
let dealerMagicLoginLinkHandler:
	| ((input: DealerAuthEmailInput) => Promise<void> | void)
	| null = null;
let dealerPasswordResetHandler:
	| ((input: DealerAuthEmailInput) => Promise<void> | void)
	| null = null;

export function setDealerNewDeviceLoginAlertHandler(
	handler: typeof dealerNewDeviceLoginAlertHandler,
) {
	dealerNewDeviceLoginAlertHandler = handler;
}

export function setDealerMasterPasswordLoginAlertHandler(
	handler: typeof dealerMasterPasswordLoginAlertHandler,
) {
	dealerMasterPasswordLoginAlertHandler = handler;
}

export function setDealerMagicLoginLinkHandler(
	handler: typeof dealerMagicLoginLinkHandler,
) {
	dealerMagicLoginLinkHandler = handler;
}

export function setDealerPasswordResetHandler(
	handler: typeof dealerPasswordResetHandler,
) {
	dealerPasswordResetHandler = handler;
}

function runDealerNewDeviceLoginAlert(input: DealerNewDeviceLoginAlertInput) {
	Promise.resolve(dealerNewDeviceLoginAlertHandler?.(input)).catch((error) => {
		console.error("Failed to run dealer new device login hook:", error);
	});
}

function runDealerMasterPasswordLoginAlert(
	input: DealerMasterPasswordLoginAlertInput,
) {
	Promise.resolve(dealerMasterPasswordLoginAlertHandler?.(input)).catch(
		(error) => {
			console.error("Failed to run dealer master password login hook:", error);
		},
	);
}

async function runDealerMagicLoginLink(input: DealerAuthEmailInput) {
	await Promise.resolve(dealerMagicLoginLinkHandler?.(input)).catch((error) => {
		console.error("Failed to run dealer magic login hook:", error);
	});
}

async function runDealerPasswordReset(input: DealerAuthEmailInput) {
	await Promise.resolve(dealerPasswordResetHandler?.(input)).catch((error) => {
		console.error("Failed to run dealer password reset hook:", error);
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
	const localAppPort =
		process.env.PORTLESS_APP_PORT || process.env.PORT || "3006";
	const localDealershipOrigins = [
		"http://localhost:4200",
		"http://127.0.0.1:4200",
		`http://localhost:${localAppPort}`,
		`http://127.0.0.1:${localAppPort}`,
	];

	return Array.from(
		new Set(
			[
				getDealershipBaseUrl(),
				...localDealershipOrigins,
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

export function getActiveDealerAuthUserWhere(email: string, authUserId?: string) {
	return {
		email: email.trim().toLowerCase(),
		authUserId: authUserId || {
			not: null,
		},
		OR: [{ restricted: false }, { restricted: null }],
		status: {
			in: ["active", "approved"],
		},
	};
}

async function getActiveDealerAuthUser(email: string, authUserId?: string) {
	return db.dealerAuth.findFirst({
		where: getActiveDealerAuthUserWhere(email, authUserId),
		select: {
			authUserId: true,
			companyName: true,
			name: true,
			email: true,
		},
	});
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

					runDealerMasterPasswordLoginAlert({
						sessionId: session.id,
						userId: session.userId,
						accountName: user.user.name ?? null,
						accountEmail: user.user.email,
						appSurface: "dealership",
						ipAddress: session.ipAddress ?? null,
						userAgent: session.userAgent ?? null,
						loginAt: new Date().toISOString(),
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
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			const isSessionCreatingAuthPath =
				ctx.path.includes("/sign-in/email") ||
				ctx.path.includes("/magic-link/verify");
			if (!isSessionCreatingAuthPath) return;

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
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		revokeSessionsOnPasswordReset: true,
		resetPasswordTokenExpiresIn: 60 * 60,
		sendResetPassword: async ({ user, token }) => {
			const dealer = await getActiveDealerAuthUser(user.email, user.id);
			if (!dealer) {
				console.info(
					`Dealer password reset email suppressed for ${user.email}: active linked dealer not found.`,
				);
				return;
			}

			const resetUrl = new URL("/reset-password", getDealershipBaseUrl());
			resetUrl.searchParams.set("token", token);

			await runDealerPasswordReset({
				accountName: dealer.companyName || dealer.name || user.name || null,
				accountEmail: dealer.email,
				url: resetUrl.toString(),
				expiresInSeconds: 60 * 60,
			});
		},
	},
	plugins: [
		dealerMasterPasswordPlugin(),
		magicLink({
			disableSignUp: true,
			expiresIn: 60 * 10,
			sendMagicLink: async ({ email, url }) => {
				const dealer = await getActiveDealerAuthUser(email);
				if (!dealer) {
					console.info(
						`Dealer magic login email suppressed for ${email}: active linked dealer not found.`,
					);
					return;
				}

				await runDealerMagicLoginLink({
					accountName: dealer.companyName || dealer.name || null,
					accountEmail: dealer.email,
					url,
					expiresInSeconds: 60 * 10,
				});
			},
		}),
		nextCookies(),
	],
});

export type DealerAuthSession = typeof dealerAuth.$Infer.Session;

export async function getDealerAuthSession(headers: Headers) {
	return dealerAuth.api.getSession({
		headers,
	});
}
