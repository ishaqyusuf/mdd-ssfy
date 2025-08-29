import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-order-confirmation";
import { sendStorefrontOrderConfirmationEmailSchema } from "@jobs/schema";

export const sendStorefrontOrderConfirmationEmail = schemaTask({
  id: "send-storefront-order-confirmation-email",
  schema: sendStorefrontOrderConfirmationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const { email, ...rest } = props;

    const response = await resend.emails.send({
      subject: `Your GND Millwork Order #${props.orderId}`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: isDev ? ["ishaqyusuf024@gmail.com"] : email,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(<MailComponent {...rest} />),
    });

    if (response.error) {
      logger.error("Order confirmation email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Order confirmation email failed to send");
    }

    logger.info("Order confirmation email sent");
  },
});
