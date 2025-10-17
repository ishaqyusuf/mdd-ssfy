import { getAppUrl } from "@gnd/utils/envs";
import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import MailComponent from "@gnd/email/emails/login-link-email";
import { db } from "@gnd/db";
import { sendLoginEmailSchema, TaskName } from "@jobs/schema";

const baseAppUrl = getAppUrl();
const id = "send-login-email" as TaskName;

export const sendLoginEmail = schemaTask({
  id,
  schema: sendLoginEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
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
    const loginLink = `${baseAppUrl}/login?token=${tok.id}`;
    const reportLink = `${baseAppUrl}/report/login-token?token=${tok.id}`;

    await sendEmail({
      subject: `Your GND Millwork Login Link`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: (
        <MailComponent
          customerName={usr?.name!}
          revokeLink={reportLink}
          loginLink={loginLink!}
        />
      ),
      successLog: "Login email sent",
      errorLog: "Login email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
