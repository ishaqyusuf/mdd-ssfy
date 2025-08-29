import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-hot-deals";
import { sendStorefrontHotDealsEmailSchema, TaskName } from "@jobs/schema";

const id = "send-storefront-hot-deals-email" as TaskName;

export const sendStorefrontHotDealsEmail = schemaTask({
  id,
  schema: sendStorefrontHotDealsEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Hot deals you don't want to miss!`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Hot deals email sent",
      errorLog: "Hot deals email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
