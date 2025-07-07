"use server";

import { unstable_cache } from "next/cache";
import { Prisma, prisma } from "@/db";
import { Tags } from "@/utils/constants";

import { getCustomerFormAction } from "../get-customer-form";

interface Props {
    phoneNo?;
    name?;
    email?;
    businessName?: string;
}

export async function findExistingCustomers(props: Props) {
    return await unstable_cache(
        async (props: Props) => {
            const where: Prisma.CustomersWhereInput[] = [];
            const { email, name, businessName, phoneNo } = props;
            if (email)
                where.push({
                    email: { contains: email },
                });
            if (name)
                where.push({
                    name: { contains: name },
                });
            if (phoneNo)
                where.push({
                    phoneNo: { contains: phoneNo },
                });
            if (businessName)
                where.push({ businessName: { contains: businessName } });
            if (!where.length) throw new Error("Customer not searchable");

            const customers = await prisma.customers.findMany({
                where:
                    where.length == 1
                        ? where[0]
                        : {
                              OR: where,
                          },
                select: {
                    name: true,
                    businessName: true,
                    phoneNo: true,
                    address: true,
                    email: true,
                    _count: {
                        select: {
                            salesOrders: true,
                        },
                    },
                },
            });
            if (!customers.length) throw new Error("No matching customer");

            return customers;
        },
        [Tags.salesCustomers],
        {
            tags: [Tags.salesCustomers],
        },
    )(props);
}
