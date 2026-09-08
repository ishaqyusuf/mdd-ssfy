import type { Prisma } from "@gnd/db";

export function dispatchSortField(
	field: string,
	direction: string,
): Prisma.OrderDeliveryOrderByWithRelationInput[] | undefined {
	if (field !== "orderDate") return undefined;
	const order = direction === "asc" ? "asc" : "desc";
	return [{ order: { createdAt: order } }, { id: order }];
}
