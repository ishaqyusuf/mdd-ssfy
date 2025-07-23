"use server";

import { AddressBookMeta } from "@/app/(clean-code)/(sales)/types";
import { prisma } from "@/db";
import { AsyncFnType } from "@/types";
import { Tags } from "@/utils/constants";
import { unstable_cache } from "next/cache";

export type CustomersListData = AsyncFnType<typeof getCustomersAction>[number];
export const getCustomersAction = async (q) => {
    return unstable_cache(
        async (q) => {
            const contains = !q ? undefined : { contains: q };
            const customers = await prisma.customers.findMany({
                take: q ? 15 : 5,
                distinct: ["name"],
                where: !q
                    ? undefined
                    : {
                          OR: [
                              {
                                  name: contains,
                              },
                              {
                                  phoneNo: contains,
                              },
                              {
                                  email: contains,
                              },
                              {
                                  address: contains,
                              },
                          ],
                      },
                select: {
                    id: true,
                    name: true,
                    businessName: true,
                    phoneNo: true,
                    email: true,
                    address: true,
                    profile: {
                        select: {
                            title: true,
                        },
                    },
                    taxProfiles: {
                        select: {
                            tax: true,
                        },
                    },
                    addressBooks: {
                        where: {
                            AND: [
                                {
                                    OR: [
                                        {
                                            isPrimary: true,
                                        },
                                        {
                                            AND: [
                                                {
                                                    isPrimary: false,
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    address1: contains,
                                    address2: contains,
                                },
                            ],
                        },
                        select: {
                            id: true,
                            meta: true,
                            billingOrders: {
                                take: 1,
                                orderBy: {
                                    createdAt: "desc",
                                },
                                where: {
                                    taxes: {
                                        some: {
                                            deletedAt: null,
                                        },
                                    },
                                },
                                select: {
                                    salesProfile: true,

                                    taxes: {
                                        take: 1,
                                        select: {
                                            taxConfig: {
                                                select: {
                                                    title: true,
                                                    taxCode: true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });
            return customers.map((customer) => {
                const [address] = customer?.addressBooks;
                const addressMeta = address?.meta as any as AddressBookMeta;
                const [taxProfile] = customer?.taxProfiles;
                return {
                    customerId: customer?.id,
                    name: customer?.name,
                    address: customer?.address,
                    phone: customer?.phoneNo,
                    addressId: address?.id,
                    taxName: taxProfile?.tax?.title,
                    profileName: customer?.profile?.title,
                    email: customer.email,
                    zipCode: addressMeta?.zip_code,
                };
            });
        },
        [Tags.salesCustomers],
        {
            tags: [Tags.salesCustomers],
        }
    )(q);
};
