import { prisma } from "@/db";
import { assertLegacySalesFormWritable } from "@gnd/sales/sales-form/application/approved-adjustment-projection";

export type LoadLegacySalesOrderMeta = (orderId: number) => Promise<unknown>;

const loadLegacySalesOrderMeta: LoadLegacySalesOrderMeta = async (orderId) => {
	const order = await prisma.salesOrders.findUnique({
		where: { id: orderId },
		select: { meta: true },
	});
	return order?.meta ?? null;
};

export async function assertLegacySalesOrderWritable(
	orderId: number | null | undefined,
	loadMeta: LoadLegacySalesOrderMeta = loadLegacySalesOrderMeta,
) {
	if (!orderId) return null;
	const currentMeta = await loadMeta(orderId);
	assertLegacySalesFormWritable(currentMeta);
	return currentMeta;
}
