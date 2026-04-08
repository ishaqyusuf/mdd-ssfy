import { db } from "@gnd/db";
import {
	type LegacyUpdateSalesControlAction,
	type UpdateSalesControl,
	cancelDispatchTask,
	clearPackingTask,
	createAssignmentsTask,
	deleteAssignmentsTasks,
	deleteSubmissionsTask,
	isControlWriteV2Enabled,
	markAsCompletedTask,
	packDispatchItemTask,
	resolveLegacyUpdateSalesControlAction,
	startDispatchTask,
	submitAllTask,
	submitDispatchTask,
	updateSubmissionsTask,
	updateSalesControlSchema,
} from "@gnd/sales";
import type { TaskName } from "../../schema";
import type { NotificationJobInput } from "@notifications/schemas";
import { NotificationService } from "@notifications/services/triggers";
import { schemaTask, tasks } from "@trigger.dev/sdk/v3";

type SalesControlActionHandler = (
	db: typeof db,
	input: UpdateSalesControl,
) => Promise<unknown>;

const actionMaps: Record<LegacyUpdateSalesControlAction, SalesControlActionHandler> = {
	submitAll: submitAllTask,
	packItems: packDispatchItemTask,
	clearPackings: clearPackingTask,
	cancelDispatch: cancelDispatchTask,
	startDispatch: startDispatchTask,
	submitDispatch: submitDispatchTask,
	createAssignments: createAssignmentsTask,
	updateSubmissions: updateSubmissionsTask,
	deleteSubmissions: deleteSubmissionsTask,
	deleteAssignments: deleteAssignmentsTasks,
	markAsCompleted: markAsCompletedTask,
};

function resolveLegacyActionCompat(
	input: UpdateSalesControl,
): LegacyUpdateSalesControlAction | null {
	const orderedActions: LegacyUpdateSalesControlAction[] = [
		"submitAll",
		"packItems",
		"clearPackings",
		"cancelDispatch",
		"startDispatch",
		"submitDispatch",
		"createAssignments",
		"updateSubmissions",
		"deleteSubmissions",
		"deleteAssignments",
		"markAsCompleted",
	];
	for (const action of orderedActions) {
		if (input[action]) return action;
	}
	return null;
}

function resolveActionHandler(input: UpdateSalesControl) {
	if (isControlWriteV2Enabled()) {
		const mapping = resolveLegacyUpdateSalesControlAction(input);

		return mapping ? actionMaps[mapping.action] : null;
	}
	const legacyAction = resolveLegacyActionCompat(input);
	return legacyAction ? actionMaps[legacyAction] : null;
}

async function sendDispatchPackedNotification(input: UpdateSalesControl) {
	if (!input.packItems?.dispatchId) return;
	const dispatchStatus = String(input.packItems.dispatchStatus || "");
	if (dispatchStatus === "completed" || dispatchStatus === "cancelled") return;

	const dispatch = await db.orderDelivery.findFirst({
		where: {
			id: input.packItems.dispatchId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});
	if (!dispatch) return;
	if (dispatch.status !== "packed") return;
	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	await notification.send("sales_dispatch_packed", {
		author: {
			id: input.meta.authorId,
			role: "employee",
		},
		payload: {
			orderNo: dispatch.order?.orderId || undefined,
			dispatchId: dispatch.id,
			deliveryMode: dispatch.deliveryMode || undefined,
			dueDate: dispatch.dueDate || undefined,
			driverId: dispatch.driverId || undefined,
		},
	} as any);
}

async function sendDispatchLifecycleNotification(input: UpdateSalesControl) {
	const dispatchId =
		input.startDispatch?.dispatchId || input.cancelDispatch?.dispatchId;
	if (!dispatchId) return;

	const dispatch = await db.orderDelivery.findFirst({
		where: {
			id: dispatchId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});
	if (!dispatch) return;

	const isStart = Boolean(input.startDispatch?.dispatchId);
	const isCancel = Boolean(input.cancelDispatch?.dispatchId);
	if (isStart && dispatch.status !== "in progress") return;
	if (isCancel && dispatch.status !== "cancelled") return;
	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	await notification.send(
		isStart ? "sales_dispatch_in_progress" : "sales_dispatch_trip_canceled",
		{
			author: {
				id: input.meta.authorId,
				role: "employee",
			},
			payload: {
				orderNo: dispatch.order?.orderId || undefined,
				dispatchId: dispatch.id,
				deliveryMode: dispatch.deliveryMode || undefined,
				dueDate: dispatch.dueDate || undefined,
				driverId: dispatch.driverId || undefined,
			},
		} as any,
	);
}

async function sendDispatchCompletedNotification(input: UpdateSalesControl) {
	const dispatchId = input.submitDispatch?.dispatchId;
	if (!dispatchId) return;

	const dispatch = await db.orderDelivery.findFirst({
		where: {
			id: dispatchId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			dueDate: true,
			deliveryMode: true,
			driverId: true,
			order: {
				select: {
					orderId: true,
				},
			},
		},
	});
	if (!dispatch) return;
	if (dispatch.status !== "completed") return;

	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	await notification.send("sales_dispatch_completed", {
		author: {
			id: input.meta.authorId,
			role: "employee",
		},
		payload: {
			orderNo: dispatch.order?.orderId || undefined,
			dispatchId: dispatch.id,
			deliveryMode: dispatch.deliveryMode || undefined,
			dueDate: dispatch.dueDate || undefined,
			driverId: dispatch.driverId || undefined,
			signature: input.submitDispatch?.signature || undefined,
			attachments: (input.submitDispatch?.attachments || [])
				.map((item) => String(item.pathname || "").trim())
				.filter(Boolean),
		},
	} as any);
}

async function sendProductionAssignedNotification(input: UpdateSalesControl) {
	const assignedToId = input.createAssignments?.assignedToId;
	if (!assignedToId) return;

	const order = await db.salesOrders.findFirst({
		where: {
			id: input.meta.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			orderId: true,
		},
	});
	if (!order) return;

	const assignedQty = (input.createAssignments?.selections || []).reduce(
		(total, selection) =>
			total +
			Number(
				selection.qty?.qty ||
					(selection.qty?.lh || 0) + (selection.qty?.rh || 0),
			),
		0,
	);

	const notification = new NotificationService(tasks, {
		db,
		userId: input.meta.authorId,
	});
	const payload = {
		author: {
			id: input.meta.authorId,
			role: "employee",
		},
		recipients: [
			{
				ids: [assignedToId],
				role: "employee",
			},
		],
		payload: {
			salesId: order.id,
			orderNo: order.orderId || undefined,
			assignedToId,
			assignedQty: assignedQty || undefined,
			itemCount: input.createAssignments?.selections?.length || undefined,
			dueDate: input.createAssignments?.dueDate || undefined,
		},
	} satisfies Omit<
		Extract<NotificationJobInput, { channel: "sales_production_assigned" }>,
		"channel"
	>;
	await notification.send("sales_production_assigned", payload);
}

export const updateSalesControl = schemaTask({
	id: "update-sales-control" as TaskName,
	schema: updateSalesControlSchema,
	maxDuration: 120,
	queue: {
		concurrencyLimit: 10,
	},
	run: async (input) => {
		const action = resolveActionHandler(input as UpdateSalesControl);
		if (action) {
			const response = await action(db, input);
			if (input.packItems) {
				await sendDispatchPackedNotification(input as UpdateSalesControl);
			}
			if (input.startDispatch || input.cancelDispatch) {
				await sendDispatchLifecycleNotification(input as UpdateSalesControl);
			}
			if (input.submitDispatch) {
				await sendDispatchCompletedNotification(input as UpdateSalesControl);
			}
			if (input.createAssignments) {
				await sendProductionAssignedNotification(
					input as UpdateSalesControl,
				);
			}
			return response;
		}
		throw new Error("Invalid action");
	},
});
