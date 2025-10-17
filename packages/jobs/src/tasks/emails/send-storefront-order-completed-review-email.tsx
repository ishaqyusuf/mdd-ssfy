import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-order-completed-review";
import {
  sendStorefrontOrderCompletedReviewEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-order-completed-review-email" as TaskName;

export const sendStorefrontOrderCompletedReviewEmail = schemaTask({
  id,
  schema: sendStorefrontOrderCompletedReviewEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `How was your experience with GND Millwork?`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Order completed review email sent",
      errorLog: "Order completed review email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
