import type { Db, TransactionClient } from "@gnd/db";
import { syncInventoryProductionLifecycleForSale } from "@sales/exports";
import { lockAndAssertNoPendingPackingReports } from "@sales/packing-report-review";
import { resetSalesAction } from "@sales/sales-control/actions";

type CompletionSideEffect = (
	db: TransactionClient,
	salesOrderId: number,
) => Promise<unknown>;

const resetSalesInTransaction: CompletionSideEffect = (db, salesOrderId) =>
	resetSalesAction(db as never, salesOrderId);

const syncLifecycleInTransaction: CompletionSideEffect = (db, salesOrderId) =>
	syncInventoryProductionLifecycleForSale(db as never, salesOrderId);

export async function completeSalesDispatchBatch(
	db: Db,
	salesOrderId: number,
	dependencies: {
		resetSales?: CompletionSideEffect;
		syncLifecycle?: CompletionSideEffect;
	} = {},
) {
	return db.$transaction(
		async (tx) => {
			const order = await tx.salesOrders.findUnique({
				where: { id: salesOrderId },
				select: {
					deliveryOption: true,
					deliveries: {
						where: {
							deletedAt: null,
							status: { notIn: ["cancelled", "completed"] },
						},
						select: { id: true, status: true },
					},
				},
			});
			if (!order) throw new Error("Sales order was not found.");
			const dispatches = [...order.deliveries].sort((a, b) => a.id - b.id);
			for (const dispatch of dispatches) {
				await lockAndAssertNoPendingPackingReports(tx, {
					dispatchId: dispatch.id,
					salesOrderId,
				});
			}

			await tx.qtyControl.updateMany({
				where: {
					type: { in: ["prodCompleted", "dispatchCompleted"] },
					itemControl: { salesId: salesOrderId },
				},
				data: { autoComplete: true },
			});
			if (dispatches.length) {
				await tx.orderDelivery.updateMany({
					where: {
						id: { in: dispatches.map((dispatch) => dispatch.id) },
						salesOrderId,
						deletedAt: null,
					},
					data: { status: "completed" },
				});
			}
			await (dependencies.resetSales ?? resetSalesInTransaction)(
				tx,
				salesOrderId,
			);
			await (dependencies.syncLifecycle ?? syncLifecycleInTransaction)(
				tx,
				salesOrderId,
			);
			return order;
		},
		{ isolationLevel: "Serializable" },
	);
}
