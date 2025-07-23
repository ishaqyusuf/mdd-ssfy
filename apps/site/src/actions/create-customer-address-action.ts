"use server";

import { revalidateTag } from "next/cache";
import { AddressBookMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma, Prisma } from "@/db";
import { Tags } from "@/utils/constants";

import { actionClient } from "./safe-action";
import { createCustomerSchema } from "./schema";

export const createCustomerAddressAction = actionClient
    .schema(createCustomerSchema)
    .metadata({
        name: "create-customer-address",
        track: {},
    })
    .action(async ({ parsedInput: { ...input } }) => {
        const resp = await prisma.$transaction(async (tx: typeof prisma) => {
            let addressId = input.addressId;
            let customerId = input.customerId || input.id;
            const customerData = {
                name: input.name,
                phoneNo: input.phoneNo,
                phoneNo2: input.phoneNo2,
                email: input.email,
                address1: input.address1,
                city: input.city,
                state: input.state,
                country: input.country,
                address2: input.address2,
                // businessName: input.businessName,
                meta: {
                    // netTerm: input.netTerm,
                    zip_code: input.zip_code,
                } satisfies AddressBookMeta,
                customer: {
                    connect: {
                        id: customerId,
                    },
                },
            } satisfies Prisma.AddressBooksUpdateInput;
            if (addressId) {
                const ordersOnAddress = await tx?.salesOrders.count({
                    where: {
                        OR: [
                            {
                                shippingAddressId: addressId,
                            },
                            {
                                billingAddressId: addressId,
                            },
                        ],
                    },
                });
                if (ordersOnAddress > 0) addressId = null;
            }
            if (addressId) {
                const address = await tx.addressBooks.update({
                    where: {
                        id: addressId,
                    },
                    data: {
                        ...customerData,
                    },
                });
            } else {
                const address = await tx.addressBooks.create({
                    data: {
                        ...customerData,
                    },
                });
                addressId = address.id;
            }

            revalidateTag(Tags.salesCustomers);
            revalidateTag(`customer-${customerId}`);
            return {
                customerId,
                addressId,
            };
        });
        return resp;
    });
