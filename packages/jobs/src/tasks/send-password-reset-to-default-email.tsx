import { getAppUrl } from "@gnd/utils/envs";
import { passwordResetToDefaultSchema, TaskName } from "@jobs/schema";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import PasswordResetPasswordToDefaultEmail from "@gnd/email/emails/password-reset-to-default-email";
const baseAppUrl = getAppUrl();
export const sendPasswordResetToDefaultEmail = schemaTask({
  id: "send-password-reset-to-default-email" as TaskName,
  schema: passwordResetToDefaultSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const id = props.id;
    const usr = await db.users.findFirst({
      where: {
        id,
      },
      select: {
        name: true,
        id: true,
        email: true,
      },
    });
    if (!usr) throw new Error("Unknown user");

    const loginLink = `https://${baseAppUrl}/login`;
    const response = await resend.emails.send({
      subject: `Your GND Millwork Password Has Been Reset`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev
        ? [
            "ishaqyusuf024@gmail.com",
            // "pcruz321@gmail.com"
          ]
        : usr.email!,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: render(
        <PasswordResetPasswordToDefaultEmail
          customerName={usr?.name!}
          loginLink={loginLink!}
        />,
      ),
    });

    if (response.error) {
      logger.error("Password reset email failed to send", {
        error: response.error,
        customerEmail: usr.email,
      });
      throw new Error("Password reset email failed to send");
    }
    logger.info("Password reset email sent");
  },
});
