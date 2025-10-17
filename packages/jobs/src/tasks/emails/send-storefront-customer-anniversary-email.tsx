import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-customer-anniversary";
import {
  sendStorefrontCustomerAnniversaryEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-customer-anniversary-email" as TaskName;

export const sendStorefrontCustomerAnniversaryEmail = schemaTask({
  id,
  schema: sendStorefrontCustomerAnniversaryEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Happy Anniversary from GND Millwork!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Customer anniversary email sent",
      errorLog: "Customer anniversary email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
