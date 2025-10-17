import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-product-review";
import { sendStorefrontProductReviewEmailSchema, TaskName } from "@jobs/schema";

const id = "send-storefront-product-review-email" as TaskName;

export const sendStorefrontProductReviewEmail = schemaTask({
  id,
  schema: sendStorefrontProductReviewEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `We'd love to hear your feedback on your recent purchase`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Product review email sent",
      errorLog: "Product review email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
