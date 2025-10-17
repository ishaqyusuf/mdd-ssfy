import { resend } from "@/lib/resend";
import { EmailTemplate } from "@/modules/email/emails/composed-email";
import { triggerIds } from "@/trigger/contants";
import { SendComposedEmailSchema } from "@/trigger/schema";

import { schemaTask } from "@trigger.dev/sdk/v3";
import { nanoid } from "nanoid";

export const sendComposedEmail = schemaTask({
    id: triggerIds.sendComposeEmail,
    schema: SendComposedEmailSchema,
    maxDuration: 300,
    queue: {
        concurrencyLimit: 10,
    },
    run: async ({ data, ...props }) => {
        // const response = await resend.emails.send({
        //     from: `${props.from.name} <${props.from.email}>`,
        //     to: props.to,
        //     subject: props.subject,
        //     headers: {
        //         "X-Entity-Ref-ID": nanoid(),
        //     },
        //     html: await render(
        //         <EmailTemplate emailStack={data} preview={props.preview} />,
        //     ),
        // });
    },
});
