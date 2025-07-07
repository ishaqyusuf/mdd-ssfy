import { prisma } from "@/db";

export type DealerRequestType =
    | "evaluation"
    | "move_to_order"
    | "move_to_quotation";
export async function createDealerRequest(salesId, request: DealerRequestType) {
    await prisma.salesOrders.update({
        where: {
            id: salesId,
        },
        data: {
            requests: {
                create: {
                    request,
                    status: "pending",
                },
            },
        },
    });
}
