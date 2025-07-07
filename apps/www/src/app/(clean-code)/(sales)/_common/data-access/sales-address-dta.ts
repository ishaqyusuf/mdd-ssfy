import { prisma } from "@/db";
import { AddressBookMeta } from "../../types";
import { notDeleted } from "../utils/db-utils";
import { AsyncFnType } from "@/app/(clean-code)/type";

export type SearchAddressType = AsyncFnType<typeof searchAddressDta>[number];
export async function searchAddressDta(q = null) {
    const items = await prisma.addressBooks.findMany({
        take: q ? 15 : 5,
        distinct: ["name", "phoneNo"],
        where: !q
            ? undefined
            : {
                  OR: [{ name: { contains: q } }, { phoneNo: { contains: q } }],
                  customerId: {
                      not: null,
                  },
              },
        select: {
            customer: {
                select: {
                    businessName: true,
                    customerTypeId: true,
                    profile: true,
                },
            },
            name: true,
            address1: true,
            id: true,
            phoneNo: true,
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
    });
    return items.map((s) => {
        const { billingOrders, ...rest } = s;
        const bo = billingOrders?.[0];
        const taxProfile = bo?.taxes?.[0]?.taxConfig;
        return {
            ...rest,
            phoneAddress: [s.phoneNo, s.address1]?.filter(Boolean).join("   "),
            isBusiness: s.customer?.businessName != null,
            taxProfile,
            salesProfile: s.customer?.profile
                ? {
                      id: s.customer.profile.id,
                      name: s.customer.profile.title,
                  }
                : {
                      id: bo?.salesProfile?.id,
                      name: bo?.salesProfile?.title,
                  },
        };
    });
}

export async function getAddressFormDta(id) {
    const address = await prisma.addressBooks.findUnique({
        where: {
            id,
        },
        include: {
            customer: true,
        },
    });
    return {
        ...address,
        meta: address.meta as any as AddressBookMeta,
    };
}
export async function connectedSalesCountDta(id, exceptId?) {
    const count = await prisma.salesOrders.count({
        where: {
            id: exceptId ? { not: exceptId } : undefined,
            OR: [
                {
                    billingAddressId: id,
                },
                {
                    shippingAddressId: id,
                },
            ],
        },
    });
    return count;
}
