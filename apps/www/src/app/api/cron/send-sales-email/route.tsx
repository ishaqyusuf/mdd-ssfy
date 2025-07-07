import { prisma } from "@/db";
import { env } from "@/env.mjs";
import { resend } from "@/lib/resend";
import { render } from "@react-email/render";
import { nanoid } from "nanoid";
import QueryString from "qs";

import { composeSalesEmail } from "@gnd/email/emails/invoice";

export async function POST(request: Request) {
    const body = await request.json();
    const { salesId } = body;
    const sales = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id: Number(salesId),
        },
        select: {
            slug: true,
            id: true,
            type: true,
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
    });
    let customerEmail: any =
        sales.customer?.email || sales.billingAddress?.email;
    env.NODE_ENV == "development" &&
        (customerEmail = ["ishaqyusuf024@gmail.com", "pcruz321@gmail.com"]);
    if (!customerEmail) throw new Error("Customer has no valid email");
    const salesRepEmail = sales.salesRep.email || undefined;
    const customerName =
        sales.customer?.businessName ||
        sales.customer?.name ||
        sales.billingAddress?.name;
    const salesRep = sales.salesRep?.name;
    const response = await resend.emails.send({
        from: `GND Millwork <${salesRepEmail?.split("@")[0]}@gndprodesk.com>`,
        to: customerEmail,
        reply_to: salesRepEmail,
        headers: {
            "X-Entity-Ref-ID": nanoid(),
        },
        subject: `${salesRep} sent you and invoice`,
        html: await render(
            composeSalesEmail({
                type: sales.type as any,
                customerName,
                link: `https://gndprodesk.com/api/pdf/download?${QueryString.stringify(
                    {
                        id: sales.id,
                        slugs: sales.slug,
                        mode: sales.type,
                        preview: false,
                    },
                )}`,
                salesRep,
            }),
        ),
    });
    if (response.error) throw new Error(`Unable to send email`);

    return new Response();
}
