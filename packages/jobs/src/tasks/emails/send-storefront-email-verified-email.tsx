import { getStoreUrl } from "@gnd/utils/envs";
import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-email-verified";
import {
  sendStorefrontEmailVerifiedEmailSchema,
  TaskName,
} from "@jobs/schema";

const baseAppUrl = getStoreUrl();
const id = "send-storefront-email-verified-email" as TaskName;

export const sendStorefrontEmailVerifiedEmail = schemaTask({
  id,
  schema: sendStorefrontEmailVerifiedEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, name } = props;
    await sendEmail({
      subject: `Email Verified`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent name={name} storeUrl={`${baseAppUrl}/shop`} />,
      successLog: "Email verified email sent",
      errorLog: "Email verified email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
