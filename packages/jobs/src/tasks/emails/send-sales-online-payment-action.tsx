import { getAppUrl } from "@gnd/utils/envs";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import SalesRepPaymentNotificationEmail from "@gnd/email/emails/sales-online-payment-action";
import { db } from "@gnd/db";
import { salesPaymentNotificationEmailSchema, TaskName } from "@jobs/schema";

const baseAppUrl = getAppUrl();
export const sendSalesPaymentNotificationEmail = schemaTask({
  id: "sales-online-payment-action-notification" as TaskName,
  schema: salesPaymentNotificationEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { ordersNo } = props;
    const isDev = process.env.NODE_ENV === "development";
    const email = props.email;
    const usr = await db.users.findFirst({
      where: {
        email,
      },
      select: {
        name: true,
        id: true,
      },
    });
    if (!usr) throw new Error("Unknown user");
    const tok = await db.emailTokenLogin.create({
      data: {
        userId: usr.id,
      },
    });
    // const loginLink = `${baseAppUrl}/login?token=${tok.id}`;
    // const reportLink = `${baseAppUrl}/report/login-token?token=${tok.id}`;
    const response = await resend.emails.send({
      subject: `Payment Received - Order${
        ordersNo?.length > 0 ? "s" : ""
      } #${ordersNo.join(", ")}`,
      from: `GND Payment <pay@gndprodesk.com>`,
      to: isDev
        ? [
            "ishaqyusuf024@gmail.com",
            // "pcruz321@gmail.com"
          ]
        : email!,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
      },
      html: await render(<SalesRepPaymentNotificationEmail {...props} />),
    });

    if (response.error) {
      logger.error("Login email failed to send", {
        error: response.error,
        customerEmail: email,
      });
      throw new Error("Login email failed to send");
    }

    logger.info("Login email sent");
  },
});
