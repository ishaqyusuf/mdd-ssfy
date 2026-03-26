import type { Db } from "@gnd/db";

import { getSaleInformation } from "../../sales-control/get-sale-information";
import type { ProductionV2DetailQuery } from "../contracts";

export async function getProductionOrderDetailV2(
	db: Db,
	query: ProductionV2DetailQuery,
) {
	const resolvedAssignedToId =
		query.scope === "worker" ? query.workerId || undefined : undefined;
	const data = await getSaleInformation(db, {
		salesNo: query.salesNo,
		assignedToId: resolvedAssignedToId,
	});

	return {
		orderId: data.order.orderId,
		salesId: data.order.id,
		customer:
			data.order.customer?.name || data.order.customer?.businessName || null,
		items: data.items.map((item) => ({
			controlUid: item.controlUid,
			salesId: item.salesId,
			itemId: item.itemId,
			isProduction: !!item.itemConfig?.production,
			noteContext: {
				salesId: item.salesId,
				salesNo: data.order.orderId,
				itemId: item.itemId,
				// Production items are still keyed by controlUid in sales-control.
				// Until a numeric item control id is exposed, keep a stable item-level
				// notification identity by falling back to the sales item id here.
				itemControlId: item.itemId,
			},
			img: item.img,
			title: item.title,
			subtitle: item.subtitle,
			qty: item.qty,
			sectionTitle: item.sectionTitle,
			configs: item.configs?.filter((config) => !config.hidden) || [],
			hands: item.hands,
			analytics: item.analytics,
			itemConfig: item.itemConfig,
			deliverables: item.deliverables,
			assignments: data.order.assignments
				.filter(
					(assignment) => assignment.salesItemControlUid === item.controlUid,
				)
				.map((assignment) => ({
					id: assignment.id,
					assignedTo: assignment.assignedTo?.name || null,
					assignedToId: assignment.assignedTo?.id || null,
					dueDate: assignment.dueDate,
					createdAt: assignment.createdAt,
					qty: {
						qty: assignment.qtyAssigned,
						lh: assignment.lhQty,
						rh: assignment.rhQty,
					},
					submissions: assignment.submissions.map((submission) => ({
						id: submission.id,
						createdAt: submission.createdAt,
						note: submission.note,
						qty: {
							qty: submission.qty,
							lh: submission.lhQty,
							rh: submission.rhQty,
						},
						deliveredQty: data.order.deliveries
							.flatMap((delivery) => delivery.items)
							.filter(
								(deliveryItem) =>
									deliveryItem.orderProductionSubmissionId === submission.id,
							)
							.reduce(
								(total, deliveryItem) =>
									total +
									Number(
										deliveryItem.qty ||
											(deliveryItem.lhQty || 0) + (deliveryItem.rhQty || 0),
									),
								0,
							),
					})),
				})),
		})),
		actions: {
			canQuickAssign: query.scope === "admin",
			canSubmitProduction: query.scope === "worker",
			canDeleteSubmission: query.scope === "worker",
		},
	};
}
