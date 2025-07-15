import { getAppUrl } from "@gnd/utils/envs";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/login-link-email";
import { db } from "@gnd/db";
import { sendLoginEmailSchema } from "@jobs/schema";

const baseAppUrl = getAppUrl();
export const sendLoginEmail = schemaTask({
  id: "send-login-email" as TaskName,
  schema: sendLoginEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const email = props.email;
    const usr = await db.users.findFirst({
      where: {
        email,
      },
      select: {
        name: true,
        id: true,
      },
    });
    if (!usr) throw new Error("Unknown user");
    const tok = await db.emailTokenLogin.create({
      data: {
        userId: usr.id,
      },
    });
    const loginLink = `https://${baseAppUrl}/login?token=${tok.id}`;
    const reportLink = `https://${baseAppUrl}/report-link?token=${tok.id}`;
    const response = await resend.emails.send({
      subject: `Your GND Millwork Login Link`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev
        ? [
            "ishaqyusuf024@gmail.com",
            // "pcruz321@gmail.com"
          ]
        : email!,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: render(
        <MailComponent
          customerName={usr?.name!}
          revokeLink={reportLink}
          loginLink={loginLink!}
        />,
      ),
    });

    if (response.error) {
      logger.error("Login email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Login email failed to send");
    }

    logger.info("Login email sent");
  },
});
