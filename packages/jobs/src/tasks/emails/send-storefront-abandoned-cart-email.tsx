import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-abandoned-cart";
import {
  sendStorefrontAbandonedCartEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-abandoned-cart-email" as TaskName;

export const sendStorefrontAbandonedCartEmail = schemaTask({
  id,
  schema: sendStorefrontAbandonedCartEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `You left items in your cart at GND Millwork`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Abandoned cart email sent",
      errorLog: "Abandoned cart email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
