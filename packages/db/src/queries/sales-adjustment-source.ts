import { createHash } from "node:crypto";
import type { TransactionClient } from "../index";

/** Binds reconciliation approval to the persisted graph, including child-only edits. */
export async function getSalesAdjustmentSourceFingerprint(
	db: Pick<TransactionClient, "salesOrders">,
	salesOrderId: number,
) {
	const source = await db.salesOrders.findUnique({
		where: { id: salesOrderId },
		select: {
			updatedAt: true,
			meta: true,
			subTotal: true,
			tax: true,
			grandTotal: true,
			amountDue: true,
			customerId: true,
			extraCosts: { orderBy: { id: "asc" } },
			taxes: { orderBy: { id: "asc" } },
			payments: { orderBy: { id: "asc" } },
			items: {
				orderBy: { id: "asc" },
				include: {
					formSteps: { orderBy: { id: "asc" } },
					shelfItems: { orderBy: { id: "asc" } },
					housePackageTool: { include: { doors: { orderBy: { id: "asc" } } } },
					assignments: { orderBy: { id: "asc" } },
					itemDeliveries: { orderBy: { id: "asc" } },
				},
			},
		},
	});
	return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}
