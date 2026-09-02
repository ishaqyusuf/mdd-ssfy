import type { SetSalesOrdersArchivedSchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";

type ArchiveSalesOrderDb = Pick<
	TRPCContext["db"],
	"salesOrders" | "salesHistory"
>;

type ArchiveSkipReason =
	| "missing"
	| "deleted"
	| "already_archived"
	| "already_active";

export type SetSalesOrdersArchivedResult = {
	changed: number[];
	skipped: Array<{ salesId: number; reason: ArchiveSkipReason }>;
};

export async function setSalesOrdersArchived(
	ctx: Pick<TRPCContext, "db" | "userId">,
	input: SetSalesOrdersArchivedSchema,
	actorName?: string | null,
): Promise<SetSalesOrdersArchivedResult> {
	const now = new Date();
	return ctx.db.$transaction(async (transaction) => {
		const db = transaction as ArchiveSalesOrderDb;
		const orders = await db.salesOrders.findMany({
			where: {
				id: { in: input.salesIds },
				type: "order",
			},
			select: {
				id: true,
				orderId: true,
				deletedAt: true,
				archivedAt: true,
			},
		});
		const ordersById = new Map(orders.map((order) => [order.id, order]));
		const changed: number[] = [];
		const skipped: SetSalesOrdersArchivedResult["skipped"] = [];

		for (const salesId of input.salesIds) {
			const order = ordersById.get(salesId);
			if (!order) {
				skipped.push({ salesId, reason: "missing" });
				continue;
			}
			if (order.deletedAt) {
				skipped.push({ salesId, reason: "deleted" });
				continue;
			}
			if (input.archived ? Boolean(order.archivedAt) : !order.archivedAt) {
				skipped.push({
					salesId,
					reason: input.archived ? "already_archived" : "already_active",
				});
				continue;
			}

			const update = await db.salesOrders.updateMany({
				where: {
					id: order.id,
					deletedAt: null,
					archivedAt: input.archived ? null : { not: null },
				},
				data: {
					archivedAt: input.archived ? now : null,
				},
			});
			if (!update.count) {
				skipped.push({
					salesId,
					reason: input.archived ? "already_archived" : "already_active",
				});
				continue;
			}

			changed.push(order.id);
			await db.salesHistory.create({
				data: {
					salesId: order.id,
					name: input.archived
						? "Sales order archived"
						: "Sales order restored",
					authorName: actorName || "System",
					data: {
						type: input.archived
							? "sales_order_archived"
							: "sales_order_restored",
						orderId: order.orderId,
						triggeredByUserId: ctx.userId ?? null,
						archivedAt: input.archived ? now.toISOString() : null,
					},
				},
			});
		}

		return { changed, skipped };
	});
}
