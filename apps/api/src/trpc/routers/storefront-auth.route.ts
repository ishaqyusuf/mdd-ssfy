import { createHash, randomBytes } from "node:crypto";
import {
	storefrontCreatePasswordSchema,
	storefrontRequestPasswordResetSchema,
	storefrontResendVerificationSchema,
	storefrontResetPasswordSchema,
	storefrontSignupSchema,
	storefrontVerificationTokenSchema,
} from "@api/schemas/storefront-auth";
import { requireStorefrontRateLimit } from "@api/utils/storefront-rate-limit";
import { EmailService } from "@gnd/notifications/services/email-service";
import { hashPassword } from "@gnd/utils/crypto";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { createTRPCRouter, publicProcedure } from "../init";

function verificationUrl(token: string) {
	const baseUrl =
		process.env.NEXT_PUBLIC_APP_URL ||
		process.env.STOREFRONT_APP_URL ||
		"http://localhost:3018";
	return `${baseUrl.replace(/\/$/, "")}/verify?token=${encodeURIComponent(token)}`;
}

async function queueVerificationEmail(input: {
	email: string;
	name: string;
	token: string;
	welcome?: boolean;
}) {
	if (input.welcome) {
		await tasks.trigger("send-storefront-welcome-email", {
			email: input.email,
			name: input.name,
		});
	}
	await tasks.trigger("send-storefront-signup-validate-email", {
		email: input.email,
		name: input.name,
		validationLink: verificationUrl(input.token),
	});
}

export const storefrontAuthRouter = createTRPCRouter({
	signup: publicProcedure
		.input(storefrontSignupSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "signup",
				identity: input.email,
				limit: 5,
				windowSeconds: 60 * 60,
			});
			const existing = await ctx.db.users.findFirst({
				where: {
					OR: [{ email: input.email }, { phoneNo: input.phoneNo }],
					deletedAt: null,
				},
				include: { customer: true },
			});
			const displayName =
				input.accountType === "business" ? input.businessName! : input.name!;

			if (
				existing?.type === "CUSTOMER" &&
				!existing.emailVerifiedAt &&
				existing.email === input.email
			) {
				const token = nanoid(48);
				await ctx.db.users.update({
					where: { id: existing.id },
					data: { verificationToken: token },
				});
				await queueVerificationEmail({
					email: input.email,
					name: existing.name || existing.customer?.name || displayName,
					token,
				});
			} else if (!existing) {
				const token = nanoid(48);
				await ctx.db.users.create({
					data: {
						name: displayName,
						email: input.email,
						phoneNo: input.phoneNo,
						emailVerifiedAt: null,
						type: "CUSTOMER",
						verificationToken: token,
						customer: {
							create: {
								businessName:
									input.accountType === "business" ? input.businessName : null,
								name: input.accountType === "individual" ? input.name : null,
								phoneNo: input.phoneNo,
								email: input.email,
								meta: {
									accountType: input.accountType,
									termsAcceptedAt: new Date().toISOString(),
								},
							},
						},
					},
				});
				await queueVerificationEmail({
					email: input.email,
					name: displayName,
					token,
					welcome: true,
				});
			}

			return {
				submitted: true,
				email: input.email,
				name: displayName,
			};
		}),

	resendVerification: publicProcedure
		.input(storefrontResendVerificationSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "resend-verification",
				identity: input.email,
				limit: 3,
				windowSeconds: 60 * 60,
			});
			const user = await ctx.db.users.findFirst({
				where: {
					email: input.email,
					type: "CUSTOMER",
					emailVerifiedAt: null,
					deletedAt: null,
					accessRevokedAt: null,
				},
				include: { customer: true },
			});
			if (user) {
				const token = nanoid(48);
				await ctx.db.users.update({
					where: { id: user.id },
					data: { verificationToken: token },
				});
				await queueVerificationEmail({
					email: user.email,
					name: user.name || user.customer?.name || "Customer",
					token,
				});
			}
			return { submitted: true };
		}),

	verifyEmail: publicProcedure
		.input(storefrontVerificationTokenSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "verify-email",
				identity: input.token,
				limit: 10,
				windowSeconds: 60 * 60,
			});
			const user = await ctx.db.users.findFirst({
				where: {
					verificationToken: input.token,
					type: "CUSTOMER",
					deletedAt: null,
					accessRevokedAt: null,
				},
				include: { customer: true },
			});
			if (!user) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This verification link is invalid or has expired.",
				});
			}
			if (!user.emailVerifiedAt) {
				await ctx.db.users.update({
					where: { id: user.id },
					data: { emailVerifiedAt: new Date() },
				});
				await tasks.trigger("send-storefront-email-verified-email", {
					email: user.email,
					name: user.name || user.customer?.name || "Customer",
				});
			}
			return {
				email: user.email,
				name: user.name || user.customer?.name || "Customer",
			};
		}),

	createPassword: publicProcedure
		.input(storefrontCreatePasswordSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "create-password",
				identity: input.token,
				limit: 5,
				windowSeconds: 60 * 60,
			});
			const user = await ctx.db.users.findFirst({
				where: {
					verificationToken: input.token,
					type: "CUSTOMER",
					emailVerifiedAt: { not: null },
					deletedAt: null,
					accessRevokedAt: null,
				},
				include: { customer: true },
			});
			if (!user) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This verification link is invalid or has expired.",
				});
			}
			await ctx.db.users.update({
				where: { id: user.id },
				data: {
					password: await hashPassword(input.password),
					verificationToken: null,
				},
			});
			await tasks.trigger("send-storefront-password-created-email", {
				email: user.email,
				name: user.name || user.customer?.name || "Customer",
			});
			return { complete: true };
		}),

	requestPasswordReset: publicProcedure
		.input(storefrontRequestPasswordResetSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "password-reset-request",
				identity: input.email,
				limit: 5,
				windowSeconds: 60 * 60,
			});
			const user = await ctx.db.users.findFirst({
				where: {
					email: input.email,
					type: "CUSTOMER",
					deletedAt: null,
					accessRevokedAt: null,
				},
				select: { id: true, name: true, email: true },
			});
			if (user?.email) {
				const token = randomBytes(32).toString("base64url");
				const tokenHash = createHash("sha256").update(token).digest("hex");
				await ctx.db.$transaction([
					ctx.db.storefrontPasswordResetToken.updateMany({
						where: { userId: user.id, consumedAt: null },
						data: { consumedAt: new Date() },
					}),
					ctx.db.storefrontPasswordResetToken.create({
						data: {
							userId: user.id,
							tokenHash,
							expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
							requestHash: ctx.ipAddress
								? createHash("sha256").update(ctx.ipAddress).digest("hex")
								: null,
						},
					}),
				]);
				const siteUrl = (
					process.env.STOREFRONT_APP_URL ||
					process.env.NEXT_PUBLIC_APP_URL ||
					"http://localhost:3018"
				).replace(/\/$/, "");
				await new EmailService(ctx.db)
					.sendTransactional({
						to: user.email,
						subject: "Reset your GND Millwork password",
						template: "password-reset-request",
						data: {
							name: user.name || "Customer",
							resetLink: `${siteUrl}/reset-password?token=${encodeURIComponent(token)}`,
						},
					})
					.catch(() => undefined);
			}
			return {
				submitted: true,
				message:
					"If a customer account matches that email, a reset link has been sent.",
			};
		}),

	resetPassword: publicProcedure
		.input(storefrontResetPasswordSchema)
		.mutation(async ({ ctx, input }) => {
			await requireStorefrontRateLimit({
				ctx,
				action: "password-reset-consume",
				identity: ctx.ipAddress,
				limit: 10,
				windowSeconds: 60 * 60,
			});
			const tokenHash = createHash("sha256").update(input.token).digest("hex");
			const reset = await ctx.db.storefrontPasswordResetToken.findUnique({
				where: { tokenHash },
			});
			if (
				!reset ||
				reset.consumedAt ||
				reset.expiresAt.getTime() <= Date.now()
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This password reset link is invalid or expired.",
				});
			}
			await ctx.db.$transaction(async (tx) => {
				const consumed = await tx.storefrontPasswordResetToken.updateMany({
					where: {
						id: reset.id,
						consumedAt: null,
						expiresAt: { gt: new Date() },
					},
					data: { consumedAt: new Date() },
				});
				if (consumed.count !== 1) {
					throw new TRPCError({
						code: "CONFLICT",
						message: "This password reset link has already been used.",
					});
				}
				await tx.users.update({
					where: { id: reset.userId },
					data: { password: await hashPassword(input.password) },
				});
				await tx.session.updateMany({
					where: { userId: reset.userId, deletedAt: null },
					data: { deletedAt: new Date() },
				});
			});
			const user = await ctx.db.users.findUnique({
				where: { id: reset.userId },
				select: { email: true, name: true },
			});
			if (user?.email) {
				await tasks
					.trigger("send-storefront-password-reset-completed-email", {
						email: user.email,
						name: user.name || "Customer",
					})
					.catch(() => undefined);
			}
			return { complete: true };
		}),
});
