import { withDeleted } from "@/app/(clean-code)/_common/utils/db-utils";
import { user } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

export async function generateSalesId(type) {
    let orderId = null;
    while (!orderId) {
        const usr = (await user())?.name
            ?.split(" ")
            ?.filter(Boolean)
            .map((a) => a[0]?.toUpperCase())
            .join("");
        const count = await prisma.salesOrders.count({
            where: {
                deletedAt: {},
                // ...withDeleted,
                type,
            },
        });
        const oid = `${count?.toString()?.padStart(5, "0")}${usr}`;
        if (
            (await prisma.salesOrders.count({
                where: { type, orderId: oid },
            })) == 0
        ) {
            orderId = oid;
        }
    }
    return orderId;
}
