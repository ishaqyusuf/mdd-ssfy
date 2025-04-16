"use server";

import { unstable_cache } from "next/cache";
import { CustomerMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { salesAddressLines } from "@/utils/sales-utils";

interface Props {
    customerId?;
    shippingId?;
    billingId?;
}
export async function getSalesCustomerData({
    customerId,
    shippingId,
    billingId,
}: Props) {
    const cacheKeys = [
        `sales-customer-${customerId}-${shippingId}-${billingId}`,
        `customer-${customerId}`,
    ];
    const fn = async () => {
        const customer = await prisma.customers.findUnique({
            where: {
                id: customerId,
            },
            include: {
                taxProfiles: {
                    select: {
                        taxCode: true,
                        id: true,
                    },
                },
                profile: true,
                addressBooks: {
                    where: {
                        OR: [
                            {
                                isPrimary: true,
                            },
                            {
                                id: shippingId || undefined,
                            },
                            {
                                id: billingId || undefined,
                            },
                        ],
                    },
                },
            },
        });
        const billing = customer?.addressBooks?.find(
            (a) => a.id == billingId || a.isPrimary,
        );
        const shipping = customer?.addressBooks?.find(
            (a) => a.id == shippingId,
        );
        const customerMeta = customer?.meta as any as CustomerMeta;
        const [taxProfile] = customer?.taxProfiles;
        return {
            customerId: customer?.id,
            profileId: customer?.customerTypeId,
            customerData: [
                [customer?.name || customer?.businessName, customer?.phoneNo]
                    ?.filter(Boolean)
                    .join(", "),
                customer?.email,
            ].filter(Boolean),
            shippingId,
            billingId,
            netTerm: customerMeta?.netTerm,
            shipping: {
                id: shipping?.id,
                lines:
                    shipping?.id == billing?.id || !shipping?.id
                        ? ["same as billing"]
                        : salesAddressLines(shipping),
            },
            billing: {
                lines: salesAddressLines(billing, customer),
                id: billing?.id,
            },
            taxCode: taxProfile?.taxCode,
            taxProfileId: taxProfile?.id,
        };
    };
    // return fn();
    return unstable_cache(fn, cacheKeys, {
        tags: cacheKeys,
    })();
}
