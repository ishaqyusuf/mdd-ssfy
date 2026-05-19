"use server";

import { randomInt } from "crypto";
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
import { generatePermissions } from "@gnd/utils/constants";
import { tasks } from "@trigger.dev/sdk/v3";
// import PasswordResetRequestEmail from "@/components/_v1/emails/password-reset-request-email";
import { _email } from "./_email";

export async function resetPasswordRequest({
	email,
}: ResetPasswordRequestInputs) {
	const user = await prisma.users.findFirst({
		where: {
			email,
		},
	});
	if (!user) return null;
	const token = randomInt(100000, 999999);
	const r = await prisma.passwordResets.create({
		data: {
			email,
			createdAt: new Date(),
			token: token.toString(),
		},
	});
	// await _email({
	//     user: user,
	//     from: FROM_EMAILS.ohno,
	//     react: PasswordResetRequestEmail({
	//         firstName: user?.name ?? undefined,
	//         token,
	//     }),
	//     subject: "Security Alert: Forgot Password OTP",
	// });
	va.track("Password Reset");
	// await resend.emails.send({
	//   from: "GND-Prodesk<ohno@gndprodesk.com>",
	//   // to: "ishaqyusuf024@gmail.com",
	//   to: user.email,
	//   subject: "Security Alert: Forgot Password OTP",
	//   react: PasswordResetRequestEmail({
	//     firstName: user?.name ?? undefined,
	//     token,
	//   }),
	// });
	return { id: user.id };
}
export async function resetPassword({
	code,
	confirmPassword,
}: ResetPasswordFormInputs) {
	const tok = await prisma.passwordResets.findFirst({
		where: {
			createdAt: {
				gte: dayjs().subtract(5, "minutes").toISOString(),
			},
			token: code,
		},
	});
	if (!tok) {
		throw new Error("Invalid or Expired Token");
	}
	const password = await hash(confirmPassword, 10);
	await prisma.users.updateMany({
		where: {
			email: tok.email,
		},
		data: {
			password,
		},
	});
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
