import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-delivery-confirmation";
import {
  sendStorefrontDeliveryConfirmationEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-delivery-confirmation-email" as TaskName;

export const sendStorefrontDeliveryConfirmationEmail = schemaTask({
  id,
  schema: sendStorefrontDeliveryConfirmationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Your GND Millwork Order #${props.orderId} has been delivered!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Delivery confirmation email sent",
      errorLog: "Delivery confirmation email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
