"use server";

import { sendMessage } from "@/app/(v1)/_actions/email";
import { prisma } from "@/db";
import { isProdClient } from "@/lib/is-prod";
import { EmailTriggerEventType } from "../../mail-grid/templates/events";

interface DealerEmailProps {
    emailId?: number;
    data?: any;
    body: string;
    subject: string;
    from?: string;
    to: string;
}
export async function dealerEmail(data: DealerEmailProps) {
    let from = isProdClient
        ? data.from || `Pablo From GND Millwork<noreply@gndprodesk.com>`
        : `Ishaq Yusuf From GND Millwork<ishaqyusuf@gndprodesk.com>`;
    await sendMessage({
        subject: data.subject,
        body: data.body,
        from,
        to: data.to,
        type: "Dealers",
    } as any);
}
export async function signupSuccess(id) {
    const auth = await prisma.dealerAuth.findUniqueOrThrow({
        where: { id },
    });
    await dealerEmail({
        subject: "Signup successful",
        body: `Your dealership request has been submitted successfully. We will review and get back to you`,
        to: auth.email,
    });
    //
}
export async function _dispatchSalesEmailEvent(id, ev: EmailTriggerEventType) {
    const sale = await prisma.salesOrders.findFirst({
        where: { id },
        include: {
            billingAddress: true,
            shippingAddress: true,
            customer: {
                include: {
                    auth: {
                        include: {
                            dealer: true,
                        },
                    },
                },
            },
        },
    });
    const ctx = {
        dealer: sale.customer?.auth?.id,
        evaluating: sale.status == "Evaluating",
    };
    switch (ev) {
        case "QUOTE_CREATED":
        case "SALES_CREATED":
            break;
        case "SALES_EVALUATED":
        case "QUOTE_EVALUATED":
            // await dealerEmail({
            //     body: `Hello ${sale.customer.businessName}! your ${sale.type} with # ${sale.orderId} has been evaluated and approved. your estimated total is $${sale.grandTotal}.\n for more information login to your dealership account.`,
            //     subject: `${sale.type} evaluation #${sale.orderId}`,
            //     to: sale.customer.email,
            // });
            await dealerEmail({
                body: `Hello ${
                    sale.customer.businessName || sale.customer.name
                }! Your ${sale.type} with order number ${
                    sale.orderId
                } has been evaluated and approved. Your estimated total is $${
                    sale.grandTotal
                }. For more information, please log in to your dealership account.`,
                subject: `${sale.type} Evaluation - Order #${sale.orderId}`,
                to: sale.customer.email,
            });
            break;
    }
}

export async function _processEmail(data, event: EmailTriggerEventType) {}
