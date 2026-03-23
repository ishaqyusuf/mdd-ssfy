import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@gnd/auth";
import { db } from "@gnd/db";
import { EmailService } from "@gnd/notifications/services/email-service";

function normalizeUrl(url: string | undefined, fallback: string) {
    if (!url) return fallback;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const baseUrl =
    process.env.NODE_ENV === "production"
        ? normalizeUrl(
              process.env.NEXT_PUBLIC_APP_URL,
              "https://www.gndprodesk.com",
          )
        : normalizeUrl(
              process.env.NEXT_PUBLIC_APP_URL,
              "http://localhost:4000",
          );

const productionUrl = normalizeUrl(
    process.env.NEXT_PUBLIC_ROOT_DOMAIN,
    "https://www.gndprodesk.com",
);

const emailService = new EmailService(db);

export const auth = initAuth({
    baseUrl,
    productionUrl,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: [baseUrl, productionUrl, "http://localhost:4000"],
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
