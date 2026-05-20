"use server";

import { createHash, randomBytes } from "crypto";
import type { ResetPasswordRequestInputs } from "@/components/_v1/forms/reset-password-form";
import type { ResetPasswordFormInputs } from "@/components/_v1/forms/reset-password-form-step2";
import { type Prisma, prisma } from "@/db";
import va from "@/lib/va";
import { hash } from "bcrypt-ts";
import dayjs from "dayjs";

import { buildWebSessionExpiry } from "@/lib/auth-session-policy";
import {
	checkPassword,
	getUserSpecificPermissions,
	mergePermissionRecords,
	validateAuthToken,
} from "@gnd/auth/utils";
import {
	isNewLoginDevice,
	normalizeLoginDevice,
} from "@gnd/auth/new-device-login";
import { EmailService } from "@gnd/notifications/services/email-service";
import { generatePermissions } from "@gnd/utils/constants";
import { tasks } from "@trigger.dev/sdk/v3";

const RESET_PASSWORD_EXPIRY_HOURS = 1;

function hashResetToken(token: string) {
	return createHash("sha256").update(token).digest("hex");
}

function getPasswordResetBaseUrl() {
	return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
		/\/$/,
		"",
	);
}

export async function resetPasswordRequest({
	email,
}: ResetPasswordRequestInputs) {
	const user = await prisma.users.findFirst({
		where: {
			email,
		},
	});

	if (!user?.email) {
		va.track("Password Reset");
		return { ok: true };
	}

	await prisma.passwordResets.updateMany({
		where: {
			email,
			usedAt: null,
			deletedAt: null,
		},
		data: {
			usedAt: new Date(),
		},
	});

	const token = randomBytes(32).toString("base64url");
	const resetLink = `${getPasswordResetBaseUrl()}/login/reset-password?token=${encodeURIComponent(token)}`;

	await prisma.passwordResets.create({
		data: {
			email,
			createdAt: new Date(),
			token: hashResetToken(token),
		},
	});

	try {
		const emailService = new EmailService(prisma);
		await emailService.sendTransactional({
			to: user.email,
			subject: "Reset your GND password",
			template: "password-reset-request",
			data: {
				name: user.name ?? "there",
				resetLink,
			},
		});
	} catch (error) {
		console.error("Failed to send password reset email:", error);
	}

	va.track("Password Reset");
	return { ok: true };
}
export async function resetPassword({
	token,
	confirmPassword,
}: ResetPasswordFormInputs) {
	const tokenHash = hashResetToken(token);
	const tok = await prisma.passwordResets.findFirst({
		where: {
			createdAt: {
				gte: dayjs().subtract(RESET_PASSWORD_EXPIRY_HOURS, "hour").toDate(),
			},
			deletedAt: null,
			token: tokenHash,
			usedAt: null,
		},
	});
	if (!tok) {
		throw new Error("This password reset link is invalid or has expired.");
	}
	const password = await hash(confirmPassword, 10);
	const updateResult = await prisma.users.updateMany({
		where: {
			email: tok.email,
		},
		data: {
			password,
		},
	});
	if (updateResult.count === 0) {
		throw new Error("This password reset link is invalid or has expired.");
	}
	await prisma.passwordResets.update({
		where: {
			id: tok.id,
		},
		data: {
			usedAt: new Date(),
		},
	});
}
export async function dealersLogin({ email, password }) {
	const resp = {
		isDealer: false,
		resp: null,
	};
	const dealer = await prisma.dealerAuth.findFirst({
		where: {
			email,
		},
		include: {
			token: {
				where: {
					consumedAt: { not: null },
				},
			},
		},
	});
	if (dealer) {
		resp.isDealer = true;
		if (dealer.password) {
			const pword = await checkPassword(dealer.password, password, true);
			resp.resp = {
				user: dealer,
				role: {
					name: "Dealer",
				},
				can: {},
			} as any;
		}
	}
	return resp;
}

export async function loginAction({
	email,
	password,
	token,
	rememberMe,
	sessionMeta,
}: {
	email?;
	password?;
	token?;
	rememberMe?: boolean;
	sessionMeta?: {
		ipAddress?: string | null;
		userAgent?: string | null;
	};
}) {
	let tokenAuthenticated = false;
	if (token) {
		const { email: _email } = await validateAuthToken(prisma, token);
		if (_email) {
			email = _email;
			tokenAuthenticated = true;
		}
	}
	if (token && !tokenAuthenticated) return null;
	if (!tokenAuthenticated) {
		const dealerAuth = await dealersLogin({ email, password });
		if (dealerAuth.isDealer) {
			return dealerAuth.resp;
		}
	}
	const where: Prisma.UsersWhereInput = {
		email,
		accessRevokedAt: null,
	};

	const user = await prisma.users.findFirst({
		where,
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
	if (user) {
		if (!tokenAuthenticated) {
			if (!user.password) return null;
			await checkPassword(user.password, password, true);
		}

		const _role = user?.roles[0]?.role;
		const RoleHasPermissions = _role?.RoleHasPermissions ?? [];
		const role = _role
			? (({ RoleHasPermissions: _permissions, ...rest }) => rest)(_role)
			: undefined;
		const rolePermissions = await prisma.permissions.findMany({
			where: {
				id: {
					in: RoleHasPermissions.map((item) => item.permissionId),
				},
			},
			select: {
				id: true,
				name: true,
			},
		});
		const specificPermissions = await getUserSpecificPermissions(
			prisma,
			user.id,
		);
		const can = generatePermissions(
			_role?.name,
			mergePermissionRecords(rolePermissions, specificPermissions),
		);
		const previousSessions = await prisma.session.findMany({
			where: {
				userId: user.id,
				deletedAt: null,
			},
			select: {
				id: true,
				userAgent: true,
			},
		});
		const shouldSendNewDeviceAlert = isNewLoginDevice(
			sessionMeta?.userAgent,
			previousSessions,
		);
		const newSession = await prisma.session.create({
			data: {
				sessionToken: crypto.randomUUID(),
				userId: user.id,
				ipAddress: sessionMeta?.ipAddress ?? null,
				userAgent: sessionMeta?.userAgent ?? null,
				expires: buildWebSessionExpiry({ rememberMe }),
			},
		});

		if (shouldSendNewDeviceAlert) {
			const device = normalizeLoginDevice(sessionMeta?.userAgent);
			tasks
				.trigger("notification", {
					channel: "auth_new_device_login",
					author: {
						id: user.id,
						role: "employee",
					},
					recipients: null,
					payload: {
						accountName: user.name,
						accountEmail: user.email,
						appSurface: "www",
						deviceLabel: device.label,
						deviceKey: device.key,
						ipAddress: sessionMeta?.ipAddress ?? null,
						userAgent: sessionMeta?.userAgent ?? null,
						loginAt: new Date().toISOString(),
						supportEmail: "support@gndprodesk.com",
					},
				})
				.catch((error) => {
					console.error("Failed to queue new device login alert:", error);
				});
		}

		return {
			sessionId: newSession.id,
			rememberMe: !!rememberMe,
			activeSession: {
				id: newSession.id,
				ipAddress: newSession.ipAddress ?? null,
				userAgent: newSession.userAgent ?? null,
				expires: newSession.expires ?? null,
			},
			user,
			can,
			role,
		};
	}
	return null;
}

export async function createQuickLoginToken(email: string) {
	const user = await prisma.users.findFirst({
		where: {
			email,
			accessRevokedAt: null,
		},
		select: {
			id: true,
		},
	});
	if (!user) {
		throw new Error("User not found");
	}

	const token = await prisma.emailTokenLogin.create({
		data: {
			userId: user.id,
		},
		select: {
			id: true,
		},
	});

	return token.id;
}
