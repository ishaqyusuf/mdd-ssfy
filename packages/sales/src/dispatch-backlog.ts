import type { Prisma } from "@gnd/db";

export function buildSalesDispatchBacklogWhere(
	deliveryModes: readonly string[] = ["delivery", "pickup"],
): Prisma.SalesOrdersWhereInput {
	return {
		deletedAt: null,
		type: "order",
		deliveryOption: { in: [...deliveryModes] },
		deliveredAt: null,
		deliveries: {
			none: {
				deletedAt: null,
				status: { notIn: ["cancelled"] },
			},
		},
	};
}
