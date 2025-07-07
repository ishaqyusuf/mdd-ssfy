"use server";

import { env } from "@/env.mjs";
import { resend } from "@/lib/resend";
import { render } from "@react-email/components";
import { nanoid } from "nanoid";

import { _salesRepPaymentNotificationEmail } from "@gnd/email/emails/sales-rep-payment-notification";

export interface NotifySalesRepPayment {
    repName: string;
    customerName: string;
    amount: number;
    ordersNo: string[];
    email: string;
}
export const notifySalesRepPaymentSuccessAction = async (
    props: NotifySalesRepPayment,
) => {
    if (env.NODE_ENV == "development")
        props.email = ["ishaqyusuf024@gmail.com", "pcruz321@gmail.com"] as any;
    const { ordersNo } = props;
    const response = await resend.emails.send({
        from: `GND Payment <pay@gndprodesk.com>`,
        to: props.email,
        headers: {
            "X-Entity-Ref-ID": nanoid(),
        },
        subject: `Payment Received - Order${
            ordersNo?.length > 0 ? "s" : ""
        } #${ordersNo.join(", ")}`,
        html: await render(_salesRepPaymentNotificationEmail(props)),
    });
    console.log(response);
};
