"use server";

import { resend } from "@/lib/resend";
import { processAttachments } from "./attachments";
import { transformEmail } from "./transform";
export interface EmailProps {
    subject;
    data;
    body;
    from;
    replyTo;
    to;
    attachments?: {
        url?: string;
        fileName?: string;
        folder?: string;
    }[];
    attachmentLink?: boolean;
}
export async function sendEmail(props: EmailProps) {
    const { subject, body } = transformEmail(props);
    const attachments = await processAttachments(props);
    const errors = attachments?.filter((a) => a.error);
    const hasError = errors?.length;
    console.log(hasError);
    if (hasError)
        return {
            props,
            error: errors?.map((e) => e.error).join("\n"), //"Unable to process attachment",
        };
    const to = toEmail(props.to);
    const html = `
            <div>${body}</div>
            <div>
            ${attachments.map((a) => {
                const href = `${a.cloudinary.downloadUrl}`;
                return `<div><a href="${href}">Download ${a.cloudinary.public_id}</a>
                </div>`;
            })}
            </div>
        `;
    const batchMail =
        to?.length > 1
            ? await resend.batch.send(
                  to?.map((t) => ({
                      to: t,
                      from: props.from,
                      html,
                      subject,
                      reply_to: props.replyTo,
                      //   attachments: attachments?.map((a) => ({
                      //       filename: a.cloudinary?.public_id,
                      //       content: a.pdf,
                      //   })),
                  }))
              )
            : await resend.emails.send({
                  from: props.from,
                  to: to[0],
                  // html: ReactEmail.,
                  // react:,
                  html,
                  subject,
                  reply_to: props.replyTo,

                  // attachments: attachments?.map((a) => ({
                  //     filename: a.cloudinary?.public_id?.split("/")[1],
                  //     content: a.pdf?.toString("base64"),
                  //     // encoding
                  // })),
              });

    return {
        // message: mail.data.id,
        // mail: mail,
        error: batchMail.error ? batchMail.error.message : null,
        success: !batchMail.error ? `Sent` : null,
        // success: "Attachment created",
        attachments,
    };
}
function toEmail(to) {
    // to = ["ishaqyusuf024@gmail.com", "pcruz321@gmail.com"];
    return [to, "ishaqyusuf024@gmail.com"];
}
