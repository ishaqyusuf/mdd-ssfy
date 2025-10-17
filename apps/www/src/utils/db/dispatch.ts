import { Prisma } from "@/db";

export const DispatchListInclude = {
    order: {
        include: {
            customer: {
                select: {
                    name: true,
                    businessName: true,
                    address: true,
                },
            },
            shippingAddress: {
                select: {
                    address1: true,
                },
            },
            salesRep: {
                select: {
                    name: true,
                },
            },
        },
    },
} satisfies Prisma.OrderDeliveryInclude;
