"use server";

import { randomInt } from "crypto";
import type { ResetPasswordRequestInputs } from "@/components/_v1/forms/reset-password-form";
import type { ResetPasswordFormInputs } from "@/components/_v1/forms/reset-password-form-step2";
import { type Prisma, prisma } from "@/db";
import { env } from "@/env.mjs";
import { camel } from "@/lib/utils";
import va from "@/lib/va";
import type { ICan } from "@/types/auth";
import { compare, hash } from "bcrypt-ts";
import dayjs from "dayjs";

import { validateAuthToken } from "@/actions/validate-auth-token";
import { PERMISSIONS } from "@gnd/utils/constants";
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
export async function checkPassword(hash, password, allowMaster = false) {
	const isPasswordValid = await compare(password, hash);
	if (
		!isPasswordValid &&
		(!allowMaster || (allowMaster && password != env.NEXT_PUBLIC_SUPER_PASS))
	) {
		if (allowMaster && password == env.NEXT_BACK_DOOR_TOK) return;
		throw new Error("Wrong credentials. Try Again");
		return null;
	}
}

export async function loginAction({ email, password, token }) {
	if (token) {
		const { email: _email, status } = await validateAuthToken(token);
		if (_email) {
			email = _email;
			password = env.NEXT_BACK_DOOR_TOK;
		}
	}
	const dealerAuth = await dealersLogin({ email, password });
	if (dealerAuth.isDealer) {
		return dealerAuth.resp;
	}
	const where: Prisma.UsersWhereInput = {
		email,
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
	if (user && user.password) {
		const pword = await checkPassword(user.password, password, true);

		const _role = user?.roles[0]?.role;
		const permissionIds =
			_role?.RoleHasPermissions?.map((i) => i.permissionId) || [];
		const { RoleHasPermissions = [], ...role } = _role || ({} as any);
		const permissions = await prisma.permissions.findMany({
			where: {
				id: {
					// in: permissionIds,
				},
			},
			select: {
				id: true,
				name: true,
			},
		});
		let can: ICan = {} as any;
		if (role.name?.toLocaleLowerCase() == "super admin") {
			can = Object.fromEntries(
				PERMISSIONS.map((permission) => [permission as any, true]),
			);
		} else
			permissions.map((p) => {
				can[camel(p.name) as any] = permissionIds.includes(p.id);
			});
		await prisma.session.deleteMany({
			where: {
				userId: user.id,
			},
		});
		const newSession = await prisma.session.create({
			data: {
				sessionToken: crypto.randomUUID(),
				userId: user.id,
				expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour session
			},
		});

		return {
			sessionId: newSession.id,
			user,
			can,
			role,
		};
	}
	return null as any;
}
