import type { Db } from "@gnd/db";

import { getSaleInformation } from "../../sales-control/get-sale-information";
import type { ProductionV2DetailQuery } from "../contracts";
import {
	buildProductionItemMaterialStatus,
	loadProductionMaterialStatuses,
} from "./production-materials";
import { isActiveReportedSubmission } from "../../production-submission-review/policy";
import { evaluateSalesPipelineCommand } from "../../sales-pipeline-commands";
import { projectSalesPipelineForAudience } from "../../sales-pipeline";
import { getSalesPipelineSnapshots } from "../../sales-pipeline-order";
import { observeSalesPipelineReadProjection } from "../../sales-pipeline-rollout";

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
	const operationalSalesItemIds = Array.from(
		new Set(data.order.assignments.map((assignment) => assignment.itemId)),
	);
	const materialProjection = await loadProductionMaterialStatuses(db, {
		salesOrderId: data.order.id,
		completeOrder: true,
		exactSalesItemIds: operationalSalesItemIds,
	});
	const materials = materialProjection.materials;
	const canonicalSnapshot = (
		await getSalesPipelineSnapshots(db, [data.order.id])
	).get(data.order.id);
	const selectedSnapshot = canonicalSnapshot
		? observeSalesPipelineReadProjection(canonicalSnapshot, {
				surface:
					query.scope === "worker"
						? "production.worker.detail"
						: "production.admin.detail",
			})
		: null;
	const pipeline = selectedSnapshot
		? projectSalesPipelineForAudience(
				selectedSnapshot,
				query.scope === "worker" ? "worker" : "internal",
			)
		: null;
	const assignmentDecision = selectedSnapshot
		? evaluateSalesPipelineCommand(selectedSnapshot, {
				action: "production.assign",
				authorized: query.scope === "admin",
			})
		: null;
	const submissionDecision = selectedSnapshot
		? evaluateSalesPipelineCommand(selectedSnapshot, {
				action: "production.submit",
				authorized: query.scope === "worker",
			})
		: null;

	const items = data.items
		.map((item) => {
			const assignments = data.order.assignments.filter(
				(assignment) => assignment.salesItemControlUid === item.controlUid,
			);
			const itemMaterials = materials.filter(
				(material) => material.salesItemId === item.itemId,
			);
			const hasOperationalProduction = assignments.length > 0;
			const configuredProduction = item.itemConfig?.production;
			const materialStatus = buildProductionItemMaterialStatus({
				salesOrderId: data.order.id,
				salesItemId: item.itemId,
				configuredProduction,
				productionItemDimension: item.dim,
				hasOperationalProduction,
				reviewPending: assignments.some((assignment) =>
					assignment.submissions.some(
						(submission) => submission.materialReview?.status === "PENDING",
					),
				),
				projectionState: materialProjection.state,
				materials: itemMaterials,
			});
			return {
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
				materials: itemMaterials,
				materialStatus,
				assignments: assignments.map((assignment) => ({
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
					submissions: assignment.submissions
						.filter(isActiveReportedSubmission)
						.map((submission) => ({
							id: submission.id,
							createdAt: submission.createdAt,
							note: submission.note,
							submittedBy: submission.submittedBy?.name || null,
							materialReview: submission.materialReview
								? {
										id: submission.materialReview.id,
										status: submission.materialReview.status,
										reason: submission.materialReview.classificationReason,
									}
								: null,
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
			};
		})
		.filter((item) =>
			query.scope === "worker" ? (item.assignments?.length || 0) > 0 : true,
		);

	return {
		orderId: data.order.orderId,
		salesId: data.order.id,
		customer:
			data.order.customer?.name || data.order.customer?.businessName || null,
		materialsState: materialProjection.state,
		pipeline,
		pipelineRevision: pipeline?.revision ?? null,
		items,
		actions: {
			canQuickAssign: assignmentDecision?.status === "ready",
			canSubmitProduction: submissionDecision?.status === "ready",
			canDeleteSubmission: query.scope === "admin",
			assignmentReasons: assignmentDecision?.reasons ?? [],
			submissionReasons: submissionDecision?.reasons ?? [],
		},
	};
}
