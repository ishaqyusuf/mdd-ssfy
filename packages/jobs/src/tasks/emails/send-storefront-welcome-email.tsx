import { getAppUrl } from "@gnd/utils/envs";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-welcome-email";
import { db } from "@gnd/db";
import { sendStorefrontWelcomeEmailSchema } from "@jobs/schema";

const baseAppUrl = getAppUrl();
export const sendStorefrontWelcomeEmail = schemaTask({
  id: "send-storefront-welcome-email",
  schema: sendStorefrontWelcomeEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const { email, name } = props;

    const response = await resend.emails.send({
      subject: `Welcome to GND Millwork!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev ? ["ishaqyusuf024@gmail.com"] : email,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(
        <MailComponent
          customerName={name}
          shopLink={`${baseAppUrl}/shop`}
        />
      ),
    });

    if (response.error) {
      logger.error("Welcome email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Welcome email failed to send");
    }

    logger.info("Welcome email sent");
  },
});
