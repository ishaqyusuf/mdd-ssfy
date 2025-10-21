import { Resend } from "resend";
import { render } from "@gnd/email/render";
import { getRecipient } from "@gnd/utils/envs";
import { nanoid } from "nanoid";
// import { logger } from "@trigger.dev/core";

export const resend = new Resend(process.env.RESEND_API_KEY!);
type FromEmails =
  | "GND Payment <pay@gndprodesk.com>"
  | "GND Millwork <noreply@gndprodesk.com>";
interface SendEmailProps {
  subject: string;
  from: FromEmails;
  to: string | string[];
  content: any;
  successLog?: string;
  errorLog?: string;
  task: {
    id: string;
    payload: any;
  };
}
export async function sendEmail({
  subject,
  from,
  to,
  content,
  errorLog,
  successLog,
}: SendEmailProps) {
  const toEmail = getRecipient(to!);
  const response = await resend.emails.send({
    subject,
    from,
    to: toEmail,
    headers: {
      "X-Entity-Ref-ID": nanoid(),
    },
    html: render(content),
  });
  if (response.error) {
    // logger.error(errorLog || "email failed to send", {
    //   error: response.error,
    //   customerEmail: toEmail,
    // });
    throw new Error(errorLog || "email failed to send");
  }
  // logger.info(successLog || "email sent");
}
