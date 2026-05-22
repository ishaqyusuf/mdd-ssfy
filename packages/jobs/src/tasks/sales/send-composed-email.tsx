import { composeEmailTemplate } from "@gnd/email/emails/composed-email";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";

import { sendComposedEmailSchema } from "../../schema";
import { sendEmail } from "../../utils/resend";

export const sendComposedEmail = schemaTask({
  id: "send-composed-email",
  schema: sendComposedEmailSchema,
  maxDuration: 300,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    if (props.from.email === "gndsiteaction@gndprodesk.com") {
      logger.info("Skipping email sending for site action notification", {
        to: props.to,
        subject: props.subject,
      });
      return;
    }
    await sendEmail({
      subject: props.subject || props.preview,
      from: `${props.from.name} <${props.from.email}>`,
      to: props.to,
      content: composeEmailTemplate({
        emailStack: props.data as Parameters<
          typeof composeEmailTemplate
        >[0]["emailStack"],
        preview: props.preview,
      }),
      task: {
        id: "send-composed-email",
        payload: props,
      },
      successLog: "Composed email sent",
      errorLog: "Composed email failed to send",
    });

    logger.info("Composed email sent", {
      to: props.to,
      subject: props.subject,
    });
  },
});
