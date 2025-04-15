"use server";

import { unstable_cache } from "next/cache";
import { AddressBookMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { AsyncFnType } from "@/types";
import { Tags } from "@/utils/constants";

export const getCustomerAddress = async (q, customerId) => {
    const fn = async (q) => {
        const contains = !q ? undefined : { contains: q };
        const addresses = await prisma.addressBooks.findMany({
            where: {
                customerId,
                OR: contains
                    ? [
                          {
                              address1: contains,
                          },
                          {
                              email: contains,
                          },
                          {
                              phoneNo: contains,
                          },
                      ]
                    : undefined,
            },
        });
        return addresses.map((address) => {
            const meta: AddressBookMeta = address?.meta as any;

            return {
                customerId: address?.customerId,
                name: address?.name,
                address: address?.address1,
                phone: address?.phoneNo,
                addressId: address?.id,
                state: address?.state,
                city: address?.city,
                email: address.email,
                zipCode: meta?.zip_code,
            };
        });
    };
    // return fn(q)
    return unstable_cache(fn, [Tags.salesCustomers, `customer-${customerId}`], {
        tags: [Tags.salesCustomers, `customer-${customerId}`],
    })(q);
};
