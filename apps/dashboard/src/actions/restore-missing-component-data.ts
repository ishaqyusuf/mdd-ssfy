"use server";

import { prisma } from "@/db";
import { invalidateSalesDocumentReadiness } from "@gnd/sales/document-readiness";

export async function restoreMissingComponentData(itemId, hptId) {
    if (!itemId) throw new Error("Item not found");
    if (!hptId) throw new Error("Invalid restore. hpt required");
	const hpt = await prisma.housePackageTools.findFirst({
		where: { id: hptId, orderItemId: itemId, deletedAt: null },
		select: { salesOrderId: true },
	});
	if (!hpt?.salesOrderId) throw new Error("Sales package not found");
    const salesDoors = await prisma.dykeSalesDoors.updateMany({
        where: {
            deletedAt: {},
            housePackageToolId: hptId,
			salesOrderId: hpt.salesOrderId,
        },
        data: {
            deletedAt: null,
        },
    });
	if (salesDoors.count) {
		await invalidateSalesDocumentReadiness(prisma, {
			salesOrderId: hpt.salesOrderId,
		});
		return `${salesDoors.count} restored.`;
	}
    else throw new Error("No restore found");
}
