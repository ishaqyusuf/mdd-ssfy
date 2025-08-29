import { getAppUrl, getStoreUrl } from "@gnd/utils/envs";
import { sendEmail } from "@jobs/utils/resend";

import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-welcome-email";
import { sendStorefrontWelcomeEmailSchema, TaskName } from "@jobs/schema";

const baseAppUrl = getStoreUrl();
const id = "send-storefront-welcome-email" as TaskName;
export const sendStorefrontWelcomeEmail = schemaTask({
  id,
  schema: sendStorefrontWelcomeEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, name } = props;
    await sendEmail({
      subject: `Welcome to GND Millwork!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent name={name} storeUrl={`${baseAppUrl}/shop`} />,
      successLog: "Welcome email failed to send",
      errorLog: "Welcome email sent",
      task: {
        id,
        payload: props,
      },
    });
  },
});
