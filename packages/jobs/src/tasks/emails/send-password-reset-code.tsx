import { getAppUrl } from "@gnd/utils/envs";
import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { sendPasswordResetCodeSchema, TaskName } from "@jobs/schema";
import MailComponent from "@gnd/email/emails/storefront-password-reset-request";
import { db } from "@gnd/db";
import { generateRandomNumber } from "@gnd/utils";

const baseAppUrl = getAppUrl();
const id = "send-password-reset-code" as TaskName;

export const sendPasswordResetCode = schemaTask({
  id,
  schema: sendPasswordResetCodeSchema,
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

    const token = String(generateRandomNumber(5));
    await db.passwordResets.create({
      data: {
        email,
        token,
      },
    });

    const resetLink = `${baseAppUrl}/password-reset?token=${token}`;

    await sendEmail({
      subject: `Your GND Millwork Password Reset Link`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: email,
      content: <MailComponent name={usr?.name!} resetLink={resetLink} />,
      successLog: "Password reset email sent",
      errorLog: "Password reset email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
