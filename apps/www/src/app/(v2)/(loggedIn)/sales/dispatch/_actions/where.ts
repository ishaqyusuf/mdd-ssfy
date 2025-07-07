import { Prisma } from "@/db";

export function whereDispatchSalesOrders(query) {
    const where: Prisma.OrderDeliveryWhereInput = {
        deliveryMode: query.type,
    };
    return where;
}
