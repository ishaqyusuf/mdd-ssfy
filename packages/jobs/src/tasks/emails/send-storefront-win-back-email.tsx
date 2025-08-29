import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-win-back";
import { sendStorefrontWinBackEmailSchema, TaskName } from "@jobs/schema";

const id = "send-storefront-win-back-email" as TaskName;

export const sendStorefrontWinBackEmail = schemaTask({
  id,
  schema: sendStorefrontWinBackEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `We miss you at GND Millwork!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Win-back email sent",
      errorLog: "Win-back email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
