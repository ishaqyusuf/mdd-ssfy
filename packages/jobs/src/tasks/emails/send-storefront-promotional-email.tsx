import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-promotional";
import { sendStorefrontPromotionalEmailSchema, TaskName } from "@jobs/schema";

const id = "send-storefront-promotional-email" as TaskName;

export const sendStorefrontPromotionalEmail = schemaTask({
  id,
  schema: sendStorefrontPromotionalEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Don't miss out on our latest promotion!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Promotional email sent",
      errorLog: "Promotional email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
