"use server";

import { _saveSalesAddress } from "@/app/(v2)/(loggedIn)/sales/_data-access/save-sales-address.dac";
import { prisma, Prisma } from "@/db";

import { _email } from "../../../_actions/_email";

export async function findAddressAction({ q }: { q: string }) {
    const _contains = {
        contains: q,
    };

    // const builder = queryBuilder()
    const where: Prisma.AddressBooksWhereInput = {
        OR: !q
            ? undefined
            : ([
                  {
                      name: _contains,
                  },
                  {
                      phoneNo: _contains,
                  },
              ] as any),
        customerId: {
            not: null,
        },
    };

    const items = await prisma.addressBooks.findMany({
        take: 5,
        distinct: ["name", "address1", "phoneNo"],
        where,
        // orderBy: {
        //   customerId: {

        //   }
        // },
        include: {
            customer: {
                // select: {
                //   id: true,
                // },
                include: {
                    profile: {
                        select: {
                            coefficient: true,
                            id: true,
                            title: true,
                        },
                    },
                },
            },
        },
    });
    // console.log(items);
    return {
        items: items.map((item) => {
            return {
                ...item,
                businessName: item.customer?.businessName,
                search: `${item.name} ${item.phoneNo} ${item.address1}`,
            };
        }),
    };
}
export const saveAddressAction = _saveSalesAddress; //createSafeAction(_saveSalesAddress);
