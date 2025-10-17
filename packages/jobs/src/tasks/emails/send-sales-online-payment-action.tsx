import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import SalesRepPaymentNotificationEmail from "@gnd/email/emails/sales-online-payment-action";
import { salesPaymentNotificationEmailSchema, TaskName } from "@jobs/schema";

const id = "sales-online-payment-action-notification" as TaskName;

export const sendSalesPaymentNotificationEmail = schemaTask({
  id,
  schema: salesPaymentNotificationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { ordersNo, email } = props;

    await sendEmail({
      subject: `Payment Received - Order${
        ordersNo?.length > 0 ? "s" : ""
      } #${ordersNo.join(", ")}`,
      from: `GND Payment <pay@gndprodesk.com>`,
      to: email!,
      content: <SalesRepPaymentNotificationEmail {...props} />,
      successLog: "Sales payment notification email sent",
      errorLog: "Sales payment notification email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
