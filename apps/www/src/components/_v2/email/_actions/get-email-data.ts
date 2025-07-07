"use server";

import { prisma } from "@/db";
import { EmailTypes } from "../types";
import { getLeafDotPaths } from "@/lib/utils";
import { user } from "@/app/(v1)/_actions/utils";

export async function getEmailData(id, type: EmailTypes) {
    let data: any = null;
    const suggestions: any[] = [];
    switch (type) {
        case "sales":
            const addressSelect = {
                address1: true,
                city: true,
                state: true,
                country: true,
                email: true,
                name: true,
                phoneNo2: true,
                phoneNo: true,
                // meta: true,
            };
            let resp = await prisma.salesOrders.findFirst({
                where: {
                    id,
                },
                select: {
                    amountDue: true,
                    grandTotal: true,
                    // meta: true,
                    slug: true,
                    orderId: true,
                    status: true,
                    prodStatus: true,
                    invoiceStatus: true,
                    billingAddress: {
                        select: addressSelect,
                    },
                    shippingAddress: {
                        select: addressSelect,
                    },
                    customer: {
                        select: {
                            address: true,
                            email: true,
                            phoneNo: true,
                            phoneNo2: true,
                            businessName: true,
                            name: true,
                        },
                    },
                },
            });
            if (resp) {
                const dots = getLeafDotPaths(resp);
                // console.log(resp.customer);
                suggestions.push(...dots);
                data = { ...resp };
            }
            break;
        case "quote":
            let _resp = await prisma.salesOrders.findFirst({
                where: {
                    id,
                },
                select: {
                    amountDue: true,
                    grandTotal: true,
                    // meta: true,
                    orderId: true,
                    status: true,
                    customer: {
                        select: {
                            address: true,
                            email: true,
                            phoneNo: true,
                            phoneNo2: true,
                            businessName: true,
                            name: true,
                        },
                    },
                },
            });
            if (_resp) {
                const dots = getLeafDotPaths(_resp);
                // console.log(resp.customer);
                suggestions.push(...dots);
                data = { ..._resp };
            }
            break;
    }
    const auth = await user();
    return {
        data,
        from: `${auth.name} From GND Millwork<${
            auth.email?.split("@")?.[0]
        }@gndprodesk.com>`,
        suggestions,
    };
}
