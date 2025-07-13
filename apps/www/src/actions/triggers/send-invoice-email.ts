"use server";

import { SalesMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { env } from "@/env.mjs";
import { getBaseUrl } from "@/envs";
import { resend } from "@/lib/resend";
import { formatCurrency } from "@/lib/use-number";
import { sum } from "@/lib/utils";
import { createNoteAction } from "@/modules/notes/actions/create-note-action";
import { whereSales } from "@/utils/db/where.sales";
import { composePaymentOrderIdsParam } from "@/utils/format-payment-params";
import { render } from "@react-email/render";
import { nanoid } from "nanoid";
import QueryString from "qs";

import { composeSalesEmail } from "@gnd/email/emails/invoice";

interface Props {
    ids;
    orderIds;
    withPayment;
}
export const __sendInvoiceEmailTrigger = async ({
    ids: _ids,
    orderIds,
    withPayment,
}: Props) => {
    const where = whereSales({
        "order.no": orderIds,
        id: _ids?.split(",")?.map((a) => Number(a))?.[0],
    });
    const __sales = (
        await prisma.salesOrders.findMany({
            where,
            select: {
                slug: true,
                id: true,
                type: true,
                amountDue: true,
                meta: true,
                grandTotal: true,
                orderId: true,
                salesRep: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                customer: {
                    select: {
                        email: true,
                        name: true,
                        businessName: true,
                    },
                },
                billingAddress: {
                    select: {
                        email: true,
                        name: true,
                    },
                },
            },
        })
    ).map((s) => ({
        ...s,
        meta: s.meta as any as SalesMeta,
    }));

    const noEmail = __sales
        .filter((sales) => sales.customer?.email || sales.billingAddress?.email)
        ?.filter((a) => !a);
    if (noEmail.length) {
        if (__sales.length > 1)
            throw new Error("Some selected sales has no valid customer email");
        else throw new Error("Customer has no valid email");
    }
    return await Promise.all(
        __sales.map(async (sales) => {
            // let phoneNo = sales?.customer?.email
            let customerEmail: any =
                sales.customer?.email || sales.billingAddress?.email;
            let matchingSales = __sales.filter((a) => {
                const sEmail = a.customer?.email || a?.billingAddress?.email;
                return customerEmail == sEmail;
            });
            const isDev = env.NODE_ENV == "development";
            let emailSlug = customerEmail?.split("@")[0];
            if (matchingSales?.[0]?.id == sales.id) {
                if (!customerEmail)
                    throw new Error("Customer has no valid email");

                isDev &&
                    (customerEmail = [
                        "ishaqyusuf024@gmail.com",
                        "pcruz321@gmail.com",
                    ]);
                const salesRepEmail = sales.salesRep.email || undefined;
                const customerName =
                    sales.customer?.businessName ||
                    sales.customer?.name ||
                    sales.billingAddress?.name;
                const salesRep = sales.salesRep?.name;
                const isQuote = sales.type == "quote";
                const pendingAmountSales = matchingSales.filter(
                    (s) => s.amountDue > 0,
                );
                const totalDueAmount = sum(pendingAmountSales, "amountDue");
                let paymentLink =
                    totalDueAmount > 0
                        ? `${getBaseUrl()}/square-payment/${emailSlug}/${composePaymentOrderIdsParam(
                              pendingAmountSales.map((a) => a.slug),
                          )}`
                        : null;
                const props = {
                    from: `GND Millwork <${salesRepEmail?.split("@")[0]}@gndprodesk.com>`,
                    to: customerEmail,
                    reply_to: salesRepEmail,
                    headers: {
                        "X-Entity-Ref-ID": nanoid(),
                    },
                    subject: `${salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
                    html: await render(
                        composeSalesEmail({
                            salesList: isQuote
                                ? []
                                : matchingSales?.map((e) => ({
                                      amount: formatCurrency(e.grandTotal),
                                      orderId: e.orderId,
                                      po: e.meta?.po,
                                  })),
                            type: sales.type as any,
                            customerName,
                            paymentLink: withPayment ? paymentLink : null,
                            link: `${getBaseUrl()}/api/pdf/download?${QueryString.stringify(
                                {
                                    id: sales.id,
                                    slugs: matchingSales
                                        .map((s) => s.slug)
                                        .join(","),
                                    mode: sales.type,
                                    preview: false,
                                },
                            )}`,
                            salesRep,
                        }),
                    ),
                };
                const response = await resend.batch.send(
                    [
                        props,
                        isDev
                            ? null
                            : {
                                  ...props,
                                  to: "ishaqyusuf024@gmail.com",
                              },
                    ]?.filter((a) => a),
                );
                // await resend.emails.send({
                //     from: `GND Millwork <${
                //         salesRepEmail?.split("@")[0]
                //     }@gndprodesk.com>`,
                //     to: customerEmail,
                //     reply_to: salesRepEmail,
                //     headers: {
                //         "X-Entity-Ref-ID": nanoid(),
                //     },
                //     subject: `${salesRep} sent you ${
                //         isQuote ? "a quote" : "an invoice"
                //     }`,
                //     html: await render(
                //         composeSalesEmail({
                //             salesList: isQuote
                //                 ? []
                //                 : matchingSales?.map((e) => ({
                //                       amount: formatCurrency(e.grandTotal),
                //                       orderId: e.orderId,
                //                       po: e.meta?.po,
                //                   })),
                //             type: sales.type as any,
                //             customerName,
                //             paymentLink: withPayment ? paymentLink : null,
                //             link: `${getBaseUrl()}/api/pdf/download?${QueryString.stringify(
                //                 {
                //                     id: sales.id,
                //                     slugs: matchingSales
                //                         .map((s) => s.slug)
                //                         .join(","),
                //                     mode: sales.type,
                //                     preview: false,
                //                 },
                //             )}`,
                //             salesRep,
                //         }),
                //     ),
                // });
                // response.data.data.
                if (response.error) {
                    console.log(response.error);

                    throw new Error(`Unable to send email`, {
                        cause: response?.error?.message,
                    });
                }

                await Promise.all(
                    matchingSales?.map(async (s) => {
                        await createNoteAction({
                            note: isQuote
                                ? "Quote email sent"
                                : "Invoice email sent",
                            subject: "Email Notification",
                            headline: "",
                            status: "",
                            type: "email",
                            tags: [
                                {
                                    tagName: "salesId",
                                    tagValue: String(s.id),
                                },
                            ],
                        });
                    }),
                );
                return response;
            }
        }),
    );
};
