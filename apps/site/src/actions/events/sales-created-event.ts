"use server";

import { salesEventData } from ".";
import {
    composeStackLine,
    composeText,
    mailComposer,
} from "@/utils/email-composer";
import { user } from "@/app/(v1)/_actions/utils";

export async function salesCreatedEvent(id) {
    const data = await salesEventData(id);
    const auth = await user();
    const mc = mailComposer;
    return {
        stack: composeStackLine([
            composeText(`New ${data.type} created.`),
            mc.table(
                [],
                [
                    mc.tableRow(
                        mc.text(`${data.type} #`),
                        mc.text(`${data.orderId}`)
                    ),
                    mc.tableRow(
                        mc.text(`Sales Rep:`),
                        mc.text(`${data.salesRep?.name}`)
                    ),
                ]
            ),
        ]),
        preview: `New ${data.type} created by ${auth?.name}`,
        subject: `New ${data.type} created by ${auth?.name}`,
    };
}
