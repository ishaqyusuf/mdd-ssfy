import { getAppUrl } from "@gnd/utils/envs";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-magic-login-code";
import { sendStorefrontMagicLoginCodeEmailSchema } from "@jobs/schema";

export const sendStorefrontMagicLoginCodeEmail = schemaTask({
  id: "send-storefront-magic-login-code-email",
  schema: sendStorefrontMagicLoginCodeEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const { email, code } = props;

    const response = await resend.emails.send({
      subject: `Your Magic Login Code`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev ? ["ishaqyusuf024@gmail.com"] : email,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(<MailComponent validationCode={code} />),
    });

    if (response.error) {
      logger.error("Magic login code email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Magic login code email failed to send");
    }

    logger.info("Magic login code email sent");
  },
});
