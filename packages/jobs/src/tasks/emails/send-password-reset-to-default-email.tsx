import { getAppUrl } from "@gnd/utils/envs";
import { passwordResetToDefaultSchema, TaskName } from "@jobs/schema";
import { sendEmail } from "@jobs/utils/resend";
import { schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import PasswordResetPasswordToDefaultEmail from "@gnd/email/emails/password-reset-to-default-email";

const baseAppUrl = getAppUrl();
const id = "send-password-reset-to-default-email" as TaskName;

export const sendPasswordResetToDefaultEmail = schemaTask({
  id,
  schema: passwordResetToDefaultSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const userId = props.id;
    const usr = await db.users.findFirst({
      where: {
        id: userId,
      },
      select: {
        name: true,
        id: true,
        email: true,
      },
    });
    if (!usr) throw new Error("Unknown user");

    const loginLink = `${baseAppUrl}/login`;

    await sendEmail({
      subject: `Your GND Millwork Password Has Been Reset`,
      from: `GND Millwork <noreply@gndprodesk.com>`,
      to: usr.email!,
      content: (
        <PasswordResetPasswordToDefaultEmail
          customerName={usr?.name!}
          loginLink={loginLink!}
        />
      ),
      successLog: "Password reset to default email sent",
      errorLog: "Password reset to default email failed to send",
      task: {
        id,
        payload: props,
      },
    });
  },
});
