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
            let addressId = input.id;

            const customerData = {
                name: input.name,
                phoneNo: input.phoneNo,
                phoneNo2: input.phoneNo2,
                email: input.email,
                address1: input.address1,
                // businessName: input.businessName,
                meta: {
                    // netTerm: input.netTerm,
                    zip_code: input.zip_code,
                } satisfies AddressBookMeta,
                customer: {
                    connect: {
                        id: input.customerId,
                    },
                },
            } satisfies Prisma.AddressBooksUpdateInput;
            if (input.id) {
                const address = await prisma.addressBooks.update({
                    where: {
                        id: input.id,
                    },
                    data: {
                        ...customerData,
                    },
                });
            } else {
                const address = await prisma.addressBooks.create({
                    data: {
                        ...customerData,
                    },
                });
                addressId = address.id;
            }

            revalidateTag(Tags.salesCustomers);
            return {
                customerId: input.customerId,
                addressId,
            };
        });
        return resp;
    });
