import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-password-reset-completed";
import {
  sendStorefrontPasswordResetCompletedEmailSchema,
  TaskName,
} from "@jobs/schema";

const id = "send-storefront-password-reset-completed-email" as TaskName;

export const sendStorefrontPasswordResetCompletedEmail = schemaTask({
  id,
  schema: sendStorefrontPasswordResetCompletedEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;

    await sendEmail({
      subject: `Your GND Millwork password has been successfully reset`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} />,
      successLog: "Password reset completed email sent",
      errorLog: "Password reset completed email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
