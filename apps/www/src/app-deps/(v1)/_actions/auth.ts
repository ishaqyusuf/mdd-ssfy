"use server";

import { createHash, randomBytes } from "crypto";
import type { ResetPasswordRequestInputs } from "@/components/_v1/forms/reset-password-form";
import type { ResetPasswordFormInputs } from "@/components/_v1/forms/reset-password-form-step2";
import { prisma } from "@/db";
import va from "@/lib/va";
import { getActiveWebLegacyUserWhere } from "@gnd/auth/better-auth/www";
import { hashPassword } from "better-auth/crypto";
import dayjs from "dayjs";

import { EmailService } from "@gnd/notifications/services/email-service";

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

function getSafeCallbackUrl(value?: string | null) {
    if (!value?.startsWith("/") || value.startsWith("//")) {
        return "/";
    }

    return value;
}

function getLoginLinkUrl(token: string, callbackUrl?: string | null) {
    const loginUrl = new URL("/login", getPasswordResetBaseUrl());
    loginUrl.searchParams.set("token", token);
    loginUrl.searchParams.set("return_to", getSafeCallbackUrl(callbackUrl));

    return loginUrl.toString();
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

export async function sendEmailLoginLink({
    callbackUrl,
    email,
}: {
    callbackUrl?: string | null;
    email: string;
}) {
    const user = await prisma.users.findFirst({
        where: getActiveWebLegacyUserWhere(email),
        select: {
            email: true,
            id: true,
            name: true,
        },
    });

    if (!user?.email) {
        va.track("Email Link Login");
        return { ok: true };
    }

    const token = await prisma.emailTokenLogin.create({
        data: {
            userId: user.id,
        },
        select: {
            id: true,
        },
    });

    try {
        const emailService = new EmailService(prisma);
        await emailService.sendTransactional({
            to: user.email,
            subject: "Your GND login link",
            template: "login-link-email",
            data: {
                customerName: user.name ?? "there",
                loginLink: getLoginLinkUrl(token.id, callbackUrl),
            },
        });
    } catch (error) {
        console.error("Failed to send login link email:", error);
        throw new Error("Unable to send login link. Please try again.");
    }

    va.track("Email Link Login");
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
                gte: dayjs()
                    .subtract(RESET_PASSWORD_EXPIRY_HOURS, "hour")
                    .toDate(),
            },
            deletedAt: null,
            token: tokenHash,
            usedAt: null,
        },
    });
    if (!tok) {
        throw new Error("This password reset link is invalid or has expired.");
    }
    const user = await prisma.users.findFirst({
        where: {
            email: tok.email,
            accessRevokedAt: null,
            OR: [{ type: null }, { type: { in: ["EMPLOYEE", "MANAGER"] } }],
        },
    });
    if (!user?.email) {
        throw new Error("This password reset link is invalid or has expired.");
    }
    const authUser = await prisma.webAuthUser.upsert({
        where: {
            legacyUserId: user.id,
        },
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
    const password = await hashPassword(confirmPassword);

    await prisma.$transaction([
        prisma.webAuthAccount.upsert({
            where: {
                providerId_accountId: {
                    providerId: "credential",
                    accountId: authUser.id,
                },
            },
            create: {
                id: crypto.randomUUID(),
                accountId: authUser.id,
                providerId: "credential",
                userId: authUser.id,
                password,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            update: {
                password,
                updatedAt: new Date(),
            },
        }),
        prisma.users.update({
            where: {
                id: user.id,
            },
            data: {
                password: null,
            },
        }),
        prisma.passwordResets.update({
            where: {
                id: tok.id,
            },
            data: {
                usedAt: new Date(),
            },
        }),
        prisma.webAuthSession.deleteMany({
            where: {
                userId: authUser.id,
            },
        }),
    ]);
}
export async function dealersLogin({ email, password }) {
    void email;
    void password;

    return {
        isDealer: false,
        resp: null,
    };
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
    void email;
    void password;
    void token;
    void rememberMe;
    void sessionMeta;

    throw new Error("www login has moved to Better Auth.");
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
