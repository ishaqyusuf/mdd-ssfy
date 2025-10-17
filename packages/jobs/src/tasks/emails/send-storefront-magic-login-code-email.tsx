import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-magic-login-code";
import {
  sendStorefrontMagicLoginCodeEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-magic-login-code-email" as TaskName;

export const sendStorefrontMagicLoginCodeEmail = schemaTask({
  id,
  schema: sendStorefrontMagicLoginCodeEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, code } = props;

    await sendEmail({
      subject: `Your Magic Login Code`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent validationCode={code} />,
      successLog: "Magic login code email sent",
      errorLog: "Magic login code email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
