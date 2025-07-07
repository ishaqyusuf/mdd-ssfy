"use server";
import { EmailTriggerEventType } from "../templates/events";
import { emailTemplates, transformer } from "./templates";
import { resend } from "@/lib/resend";

export interface EmailEventProps {
    orderId?: string;
    customerName?: string;
    paymentLink?: string;
    email?: string;
}
export async function _event(e: EmailTriggerEventType, data: EmailEventProps) {
    let template = emailTemplates[e];
    if (!template)
        throw Error(`Action: ${e} has no attached event notification`);
    const mail = transformer(data, template);
    const _data = await resend.emails.send({
        // reply_to: u?.meta?.emailRespondTo || u?.email,
        from: mail.from || "Pablo From GNDMillwork <pcruz321@gndprodesk.com>",
        // from: "Pablo From GNDMillwork <pablo@gndprodesk.com>",
        to: mail.to,
        subject: mail.subject,
        html: mail.body,
        attachments: mail.attachments?.length ? mail.attachments : undefined,
    });
    if (_data.error?.message) throw new Error(_data.error?.message);
}
