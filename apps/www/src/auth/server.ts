import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { initAuth } from "@gnd/auth";
import { Resend } from "resend";
import { render } from "@gnd/email/render";
import LoginEmail from "@gnd/email/emails/login-link-email";
import StorefrontPasswordResetRequest from "@gnd/email/emails/storefront-password-reset-request";

const baseUrl =
    process.env.NODE_ENV === "production"
        ? `https://${process.env.NEXT_PUBLIC_APP_URL}`
        : // : env.VERCEL_ENV === "preview"
          //   ? `https://${env.VERCEL_URL}`
          "http://daarulhadith.localhost:2200";

const resend = new Resend(process.env.RESEND_API_KEY!);
const fromEmail = "GND Millwork <noreply@gndprodesk.com>";

async function sendEmail({
    to,
    subject,
    html,
}: {
    to: string;
    subject: string;
    html: string;
}) {
    const recipient =
        process.env.NODE_ENV === "production"
            ? to
            : (process.env.TEST_EMAIL ?? to);
    await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject,
        html,
    });
}

export const auth = initAuth({
    baseUrl,
    productionUrl: `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    secret: process.env.BETTER_AUTH_SECRET,
    emailHandlers: {
        async sendMagicLink({ email, url }) {
            const html = await render(
                LoginEmail({
                    customerName: email,
                    loginLink: url,
                    revokeLink: url,
                }),
            );
            await sendEmail({
                to: email,
                subject: "Your GND Millwork login link",
                html,
            });
        },
        async sendResetPassword({ user, url }) {
            const html = await render(
                StorefrontPasswordResetRequest({
                    name: user.name || user.email,
                    resetLink: url,
                }),
            );
            await sendEmail({
                to: user.email,
                subject: "Reset your GND Millwork password",
                html,
            });
        },
    },
});
// "⌄" U+2304 Down Arrowhead Unicode Character
export type Session = typeof auth.$Infer.Session;
export const getSession = cache(async () =>
    auth.api.getSession({ headers: await headers() })
);
