"use server";

import { user } from "@/app/(v1)/_actions/utils";
import {
    composeStackLine,
    composeText,
    mailComposer,
} from "@/utils/email-composer";

import { salesEventData } from ".";

export async function salesUpdatedEvent(id) {
    const data = await salesEventData(id);
    const auth = await user();
    const mc = mailComposer;
    return {
        stack: composeStackLine([
            composeText(`${data.type} updated.`),
            mc.table(
                [],
                [
                    mc.tableRow(
                        mc.text(`${data.type} #`),
                        mc.text(`${data.orderId}`),
                    ),
                    mc.tableRow(
                        mc.text(`Sales Rep:`),
                        mc.text(`${data.salesRep?.name}`),
                    ),
                ],
            ),
        ]),
        preview: `${data.type} updated by ${auth?.name}`,
        subject: `${data.type} updated by ${auth?.name}`,
    };
}
