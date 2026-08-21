import crypto from "node:crypto";
import { getUserIdsWithPermission } from "@gnd/auth/utils";
import { db } from "@gnd/db";
import { captureVerifiedSquareTender } from "@gnd/sales/payment-system";
import {
	nextApplicationStatus,
	normalizeSquareRefundStatus,
} from "@gnd/sales/payment-system/refunds";
import { getSquareTenderPayment, listSquarePaymentRefunds } from "@gnd/square";
import { logger, schedules, task, tasks } from "@trigger.dev/sdk/v3";
import type { TaskName } from "../../schema";

function externalIdempotencyKey(providerRefundId: string) {
	return `gnd-ext-${crypto.createHash("sha256").update(providerRefundId).digest("hex")}`.slice(
		0,
		45,
	);
}

export async function reconcileSquareSalesRefunds() {
	const begin = new Date(Date.now() - 28 * 24 * 60 * 60 * 1_000).toISOString();
	const providerRefunds = await listSquarePaymentRefunds({
		updatedAtBeginTime: begin,
	});
	let imported = 0;
	let updated = 0;
	for (const providerRefund of providerRefunds) {
		const providerStatus = normalizeSquareRefundStatus(providerRefund.status);
		let tender = await db.squareTenderPayment.findUnique({
			where: { providerPaymentId: providerRefund.paymentId },
		});
		if (!tender) {
			const payment = await getSquareTenderPayment(providerRefund.paymentId);
			tender = await captureVerifiedSquareTender(db, {
				...payment,
				source: "reconciliation",
				verificationSource: "refund_reconciliation",
			});
		}
		const existing = await db.salesSquareRefund.findUnique({
			where: { providerRefundId: providerRefund.id },
			include: { allocations: { select: { id: true } } },
		});
		if (!existing) {
			const importedRefund = await db.salesSquareRefund.create({
				data: {
					tenderPaymentId: tender.id,
					origin: "external",
					providerStatus,
					applicationStatus: nextApplicationStatus({
						origin: "external",
						providerStatus,
						hasAllocations: false,
					}),
					providerRefundId: providerRefund.id,
					idempotencyKey: externalIdempotencyKey(providerRefund.id),
					amountCents: providerRefund.amountCents,
					principalCents: providerRefund.amountCents,
					reservedCents:
						providerStatus === "completed" ? 0 : providerRefund.amountCents,
					currency: providerRefund.currency,
					reason: providerRefund.reason || "External Square refund",
					providerCreatedAt: providerRefund.createdAt,
					completedAt: providerStatus === "completed" ? new Date() : null,
					meta: { reviewRequired: true, reconciliationWindowDays: 28 },
					transitions: {
						create: {
							providerStatus,
							applicationStatus: nextApplicationStatus({
								origin: "external",
								providerStatus,
								hasAllocations: false,
							}),
							source: "reconciliation",
							message: "External Square refund imported for Finance review.",
						},
					},
				},
			});
			const financeRecipients = await getUserIdsWithPermission(
				db,
				"edit refund square",
			);
			if (financeRecipients.size)
				await db.notifications.createMany({
					data: Array.from(financeRecipients).map((userId) => ({
						type: "square-refund-review",
						fromUserId: 1,
						userId,
						message:
							"An external Square refund needs order allocation in Sales Finance.",
						alert: true,
						link: "/sales-book/finance?tab=review",
						meta: {
							refundId: importedRefund.id,
							providerRefundId: providerRefund.id,
						},
					})),
				});
			imported += 1;
			continue;
		}
		const applicationStatus = nextApplicationStatus({
			origin: existing.origin,
			providerStatus,
			hasAllocations: existing.allocations.length > 0,
			currentApplicationStatus: existing.applicationStatus,
		});
		await db.salesSquareRefund.update({
			where: { id: existing.id },
			data: {
				providerStatus,
				applicationStatus,
				completedAt:
					providerStatus === "completed"
						? existing.completedAt || new Date()
						: null,
				reservedCents: providerStatus === "pending" ? existing.amountCents : 0,
				version: { increment: 1 },
			},
		});
		updated += 1;
		if (
			providerStatus === "completed" &&
			applicationStatus === "ready_to_apply"
		) {
			await tasks.trigger("process-square-sales-refund", {
				refundId: existing.id,
			});
		}
	}
	const pending = await db.salesSquareRefund.findMany({
		where: {
			providerStatus: "pending",
			createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1_000) },
		},
	});
	for (const refund of pending) {
		const ageMs = Date.now() - refund.createdAt.getTime();
		const escalationLevel =
			ageMs >= 14 * 24 * 60 * 60 * 1_000
				? "critical_14d"
				: ageMs >= 7 * 24 * 60 * 60 * 1_000
					? "repeat_7d"
					: "pending_24h";
		const meta =
			refund.meta &&
			typeof refund.meta === "object" &&
			!Array.isArray(refund.meta)
				? (refund.meta as Record<string, unknown>)
				: {};
		if (meta.pendingEscalationLevel === escalationLevel) continue;
		const recipients = await getUserIdsWithPermission(db, "edit refund square");
		if (refund.initiatedById) recipients.add(refund.initiatedById);
		if (recipients.size) {
			await db.notifications.createMany({
				data: Array.from(recipients).map((userId) => ({
					type: "square-refund-pending",
					fromUserId: refund.initiatedById || 1,
					userId,
					message:
						escalationLevel === "critical_14d"
							? "Square refund has remained pending for 14 days. Contact Square Support."
							: escalationLevel === "repeat_7d"
								? "Square refund has remained pending for 7 days and needs follow-up."
								: "Square refund has remained pending for more than 24 hours.",
					alert: true,
					link: "/sales-book/finance?tab=review",
					meta: { refundId: refund.id, escalationLevel },
				})),
			});
		}
		await db.salesSquareRefund.update({
			where: { id: refund.id },
			data: { meta: { ...meta, pendingEscalationLevel: escalationLevel } },
		});
	}
	logger.info("Square refund reconciliation completed", {
		providerCount: providerRefunds.length,
		imported,
		updated,
		pendingEscalations: pending.length,
	});
	return { providerCount: providerRefunds.length, imported, updated };
}

export const reconcileSquareSalesRefundsTask = task({
	id: "reconcile-square-sales-refunds" as TaskName,
	maxDuration: 180,
	run: reconcileSquareSalesRefunds,
});

export const squareSalesRefundReconciliationSchedule = schedules.task({
	id: "square-sales-refund-reconciliation-schedule",
	cron: "17 * * * *",
	maxDuration: 180,
	run: reconcileSquareSalesRefunds,
});
