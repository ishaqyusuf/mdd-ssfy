import { user } from "@/app/(v1)/_actions/utils";
import { SalesPrinterProps } from "@/app/(v2)/printer/type";
import { prisma } from "@/db";
import { env } from "@/env.mjs";
import { UploadFolders } from "@/modules/cloudinary";
import QueryString from "qs";

type Attachables = {
    label: "sale invoice" | "payment receipts";
    url?: string;
    folder: UploadFolders;
    fileName;
};
export interface EmailData {
    type?: "sales";
    attachables?: Attachables[];
    email: string;
    fallbackEmail?: string;
    name: string;
    noEmail?: boolean;
}
export async function getSalesEmailDta(salesId): Promise<EmailData> {
    const sale = await prisma.salesOrders.findFirstOrThrow({
        where: {
            id: salesId,
        },
        select: {
            id: true,
            orderId: true,
            customer: {
                select: {
                    id: true,
                    email: true,
                    businessName: true,
                    name: true,
                },
            },
            billingAddress: {
                select: {
                    id: true,
                    email: true,
                },
            },
        },
    });
    const resp: EmailData = {
        attachables: _attachables(sale.orderId) as any,
        email: sale.customer?.email,
        fallbackEmail: sale.billingAddress?.email,
        name: sale.customer?.businessName || sale.customer?.name,
        noEmail: false,
    };
    resp.noEmail = !resp.email && !resp.fallbackEmail;
    return resp;
}
function _attachables(orderId): Attachables[] {
    return [
        {
            label: "sale invoice",
            url: `${
                env.NEXT_PUBLIC_APP_URL
            }/printer/sales?${QueryString.stringify({
                mode: "order",
                pdf: true,
                slugs: orderId,
            } as SalesPrinterProps)}`,
            fileName: `${orderId}.pdf`,
            folder: "sales-orders",
        },
    ];
}
export async function inboxDta(type: EmailData["type"], salesId) {
    const inbox = await prisma.inbox.findMany({
        where: {
            parentId: salesId,
            type,
        },
        orderBy: {
            createdAt: "desc",
        },
        include: {
            attachments: true,
        },
    });
    return inbox;
}
export async function userEmailProfileDta(type: EmailData["type"]) {
    const auth = await user();
    const userId = auth.id;

    return {
        from: `${auth.name} From GND Millwork<${
            auth.email?.split("@")[0]
        }@gndprodesk.com>`,
        replyTo: `${auth.email}`,
        subject: `Update about your order`,
    };
}
