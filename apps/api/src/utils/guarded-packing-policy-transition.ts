import { reconcilePendingGuardedPackingDispatches } from "@api/db/queries/packing-reports";
import type { TRPCContext } from "@api/trpc/init";
import { sendDispatchLifecycleNotification } from "@api/utils/dispatch-lifecycle-notification";
import type { GuardedPackingPolicy } from "@gnd/settings";

type TransitionDependencies = {
	reconcile?: typeof reconcilePendingGuardedPackingDispatches;
	notify?: typeof sendDispatchLifecycleNotification;
};

const MAX_POLICY_TRANSITION_DISPATCHES = 100;

const emptyResult = {
	pendingDispatchCount: 0,
	readyDispatchCount: 0,
	notifiedDriverCount: 0,
	notificationFailureCount: 0,
};

export async function applyGuardedPackingPolicyTransition(
	ctx: { db: TRPCContext["db"]; actorUserId: number },
	input: { previous: GuardedPackingPolicy; next: GuardedPackingPolicy },
	dependencies: TransitionDependencies = {},
) {
	const relaxed =
		input.previous.reviewMode === "BLOCK_DELIVERY_UNTIL_APPROVED" &&
		input.next.reviewMode === "ALLOW_DELIVERY_WHILE_PENDING";
	if (!relaxed) return emptyResult;

	const pending = await ctx.db.salesPackingReport.findMany({
		where: { status: "PENDING" },
		distinct: ["orderDeliveryId"],
		orderBy: { orderDeliveryId: "asc" },
		take: MAX_POLICY_TRANSITION_DISPATCHES + 1,
		select: { orderDeliveryId: true },
	});
	if (pending.length > MAX_POLICY_TRANSITION_DISPATCHES) {
		throw new Error(
			`Delivery policy release is limited to ${MAX_POLICY_TRANSITION_DISPATCHES} pending dispatches at a time. Resolve some pending packing reviews and retry. The delivery policy was not changed.`,
		);
	}
	const dispatchIds = pending.map((report) => report.orderDeliveryId);
	const reconcile =
		dependencies.reconcile ?? reconcilePendingGuardedPackingDispatches;
	const reconciliation = await reconcile(ctx.db, dispatchIds);
	const readyIds = new Set(reconciliation.readyDispatchIds);
	const readyDeliveries = readyIds.size
		? await ctx.db.orderDelivery.findMany({
				where: { id: { in: [...readyIds] }, deletedAt: null },
				select: {
					id: true,
					driverId: true,
					dueDate: true,
					deliveryMode: true,
					order: { select: { orderId: true } },
				},
			})
		: [];
	const notify = dependencies.notify ?? sendDispatchLifecycleNotification;
	let notifiedDriverCount = 0;
	let notificationFailureCount = 0;

	for (const delivery of readyDeliveries) {
		if (!delivery.driverId) continue;
		const result = await notify(
			ctx.db,
			ctx.actorUserId,
			delivery.driverId,
			"sales_dispatch_approval_pending_released",
			{
				orderNo: delivery.order?.orderId || undefined,
				dispatchId: delivery.id,
				deliveryMode:
					delivery.deliveryMode === "pickup" ? "pickup" : "delivery",
				dueDate: delivery.dueDate || undefined,
				driverId: delivery.driverId,
			},
		);
		if (result.sent) notifiedDriverCount += 1;
		else notificationFailureCount += 1;
	}
	if (notificationFailureCount > 0) {
		throw new Error(
			`Unable to notify ${notificationFailureCount} assigned driver${notificationFailureCount === 1 ? "" : "s"} that the dispatch can continue. The delivery policy was not changed.`,
		);
	}

	return {
		pendingDispatchCount: pending.length,
		readyDispatchCount: readyIds.size,
		notifiedDriverCount,
		notificationFailureCount,
	};
}
