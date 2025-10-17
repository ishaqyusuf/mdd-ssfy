import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-order-cancellation";
import {
  sendStorefrontOrderCancellationEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-order-cancellation-email" as TaskName;

export const sendStorefrontOrderCancellationEmail = schemaTask({
  id,
  schema: sendStorefrontOrderCancellationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Your GND Millwork Order #${props.orderId} has been cancelled`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Order cancellation email sent",
      errorLog: "Order cancellation email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
