import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/sales-email";
import { sendGndSalesEmailSchema, TaskName } from "@jobs/schema";

const id = "send-gnd-sales-email" as TaskName;

export const sendGndSalesEmail = schemaTask({
  id,
  schema: sendGndSalesEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { email, ...rest } = props;
    const { isQuote, sales } = rest;

    await sendEmail({
      subject: `You've Received ${isQuote ? "a quote" : "an Invoice"} from GND Millwork`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent {...rest} sales={sales.map(s => ({...s, date: new Date(s.date)}))} />,
      successLog: "GND sales email sent",
      errorLog: "GND sales email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
