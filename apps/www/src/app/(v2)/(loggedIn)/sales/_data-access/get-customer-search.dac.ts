"use server";

import { serverSession } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export async function _getCustomerSearchList() {
    const auth = await serverSession();
    const isDealer = auth.role.name == "Dealer";

    let items = (
        await prisma.addressBooks.findMany({
            // take: 5,
            distinct: ["name", "address1", "phoneNo"],
            where: isDealer
                ? {
                      customer: {
                          auth: {
                              id: auth.user.id,
                          },
                      },
                  }
                : undefined,
            include: {
                customer: {
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
        })
    ).map((item) => {
        return {
            ...item,
            businessName: item.customer?.businessName,
            search: [item.name, item.phoneNo, item.address1]
                .filter(Boolean)
                .join(" "),
        };
    });
    return {
        items: items.filter(
            (item, index) =>
                items.findIndex(
                    (i) => i.search?.toLowerCase() == item.search?.toLowerCase()
                ) == index
        ),
    };
}
