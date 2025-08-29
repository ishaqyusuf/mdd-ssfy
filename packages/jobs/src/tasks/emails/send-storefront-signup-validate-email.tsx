import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/storefront-signup-validate-email";
import {
  sendStorefrontSignupValidateEmailSchema,
  TaskName,
} from "@jobs/schema";
import { db } from "@gnd/db";

const id = "send-storefront-signup-validate-email" as TaskName;

export const sendStorefrontSignupValidateEmail = schemaTask({
  id,
  schema: sendStorefrontSignupValidateEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, name, validationLink } = props;
    const user = await db.users.findFirst({
      where: {
        email,
        verificationToken: {
          not: null,
        },
      },
    });
    await sendEmail({
      subject: `Validate Your Email Address`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: (
        <MailComponent
          name={name}
          validationLink={`${validationLink}?token=${user?.verificationToken}`}
        />
      ),
      successLog: "Signup validation email sent",
      errorLog: "Signup validation email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
