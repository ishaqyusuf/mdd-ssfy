import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-order-status-update";
import {
  sendStorefrontOrderStatusUpdateEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-order-status-update-email" as TaskName;

export const sendStorefrontOrderStatusUpdateEmail = schemaTask({
  id,
  schema: sendStorefrontOrderStatusUpdateEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Update on your GND Millwork Order #${props.orderId}`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Order status update email sent",
      errorLog: "Order status update email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
