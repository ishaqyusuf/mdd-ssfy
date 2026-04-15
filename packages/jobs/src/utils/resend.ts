import { render } from "@gnd/email/render";
import { getRecipient } from "@gnd/utils/envs";
import { nanoid } from "nanoid";
import { Resend } from "resend";
// import { logger } from "@trigger.dev/core";

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
	throw new Error("RESEND_API_KEY is not configured");
}
export const resend = new Resend(resendApiKey);
interface SendEmailProps {
	subject: string;
	from: string;
	to: string | string[];
	content: unknown;
	successLog?: string;
	errorLog?: string;
	task: {
		id: string;
		payload: unknown;
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
	const toEmail = getRecipient(to);
	const response = await resend.emails.send({
		subject,
		from,
		to: toEmail,
		headers: {
			"X-Entity-Ref-ID": nanoid(),
		},
		html: await render(content),
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
