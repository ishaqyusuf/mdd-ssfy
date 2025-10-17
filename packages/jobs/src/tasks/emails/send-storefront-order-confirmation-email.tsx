import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-order-confirmation";
import {
  sendStorefrontOrderConfirmationEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-order-confirmation-email" as TaskName;

export const sendStorefrontOrderConfirmationEmail = schemaTask({
  id,
  schema: sendStorefrontOrderConfirmationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Your GND Millwork Order #${props.orderId}`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Order confirmation email sent",
      errorLog: "Order confirmation email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
