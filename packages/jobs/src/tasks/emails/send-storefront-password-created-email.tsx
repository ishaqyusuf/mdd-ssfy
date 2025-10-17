import { getStoreUrl } from "@gnd/utils/envs";
import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-password-created";
import {
  sendStorefrontPasswordCreatedEmailSchema,
  TaskName,
} from "@jobs/schema";

const baseAppUrl = getStoreUrl();
const id = "send-storefront-password-created-email" as TaskName;

export const sendStorefrontPasswordCreatedEmail = schemaTask({
  id,
  schema: sendStorefrontPasswordCreatedEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, name } = props;
    await sendEmail({
      subject: `Password Created`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent name={name} storeUrl={`${baseAppUrl}/shop`} />,
      successLog: "Password created email sent",
      errorLog: "Password created email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
