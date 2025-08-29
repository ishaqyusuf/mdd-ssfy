import { getAppUrl } from "@gnd/utils/envs";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-signup-validate-email";
import { sendStorefrontSignupValidateEmailSchema } from "@jobs/schema";

export const sendStorefrontSignupValidateEmail = schemaTask({
  id: "send-storefront-signup-validate-email",
  schema: sendStorefrontSignupValidateEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const { email, validationLink } = props;

    const response = await resend.emails.send({
      subject: `Validate Your Email Address`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev ? ["ishaqyusuf024@gmail.com"] : email,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(<MailComponent validationLink={validationLink} />),
    });

    if (response.error) {
      logger.error("Signup validation email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Signup validation email failed to send");
    }

    logger.info("Signup validation email sent");
  },
});
