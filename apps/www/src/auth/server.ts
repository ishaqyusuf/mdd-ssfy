import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@gnd/auth";
import { db } from "@gnd/db";
import { EmailService } from "@gnd/notifications/services/email-service";

const baseUrl =
    process.env.NODE_ENV === "production"
        ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
        : // : env.VERCEL_ENV === "preview"
          //   ? `https://${env.VERCEL_URL}`
          "http://daarulhadith.localhost:2200";

const emailService = new EmailService(db);

export const auth = initAuth({
    baseUrl,
    productionUrl: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    secret: process.env.BETTER_AUTH_SECRET,
    emailHandlers: {
        async sendMagicLink({ email, url }) {
            await emailService.sendTransactional({
                to: email,
                subject: "Your GND Millwork login link",
                template: "login-link-email",
                data: { customerName: email, loginLink: url, revokeLink: url },
            });
        },
        async sendResetPassword({ user, url }) {
            await emailService.sendTransactional({
                to: user.email,
                subject: "Reset your GND Millwork password",
                template: "password-reset-request",
                data: { name: user.name || user.email, resetLink: url },
            });
        },
    },
});
// "⌄" U+2304 Down Arrowhead Unicode Character
export type Session = typeof auth.$Infer.Session;
export const getSession = cache(async () =>
    auth.api.getSession({ headers: await headers() })
);
