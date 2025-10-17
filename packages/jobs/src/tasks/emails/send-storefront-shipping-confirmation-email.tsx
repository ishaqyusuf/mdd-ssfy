import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-shipping-confirmation";
import {
  sendStorefrontShippingConfirmationEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-shipping-confirmation-email" as TaskName;

export const sendStorefrontShippingConfirmationEmail = schemaTask({
  id,
  schema: sendStorefrontShippingConfirmationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Your GND Millwork Order #${props.orderId} has shipped!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Shipping confirmation email sent",
      errorLog: "Shipping confirmation email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
