import { type Db, db } from "@gnd/db";
import { getActiveSalesHandoffSuperAdmins } from "@gnd/sales/sales-handoff";
import { createActivity } from "@notifications/activities";
import { getSubscriberAccount } from "@notifications/channel-subscribers";
import { logger, schedules } from "@trigger.dev/sdk/v3";

const SCAN_LIMIT = 50;
const CHANNEL = "sales_handoff_action_escalation" as const;

export function configuredSalesHandoffNotificationActorId(
	value = process.env.SALES_HANDOFF_NOTIFICATION_ACTOR_USER_ID,
) {
	const id = Number(value);
	if (!Number.isInteger(id) || id <= 0) {
		throw new Error(
			"SALES_HANDOFF_NOTIFICATION_ACTOR_USER_ID must identify the designated active system notification user.",
		);
	}
	return id;
}

export async function runSalesHandoffEscalationScan(
	database: Db,
	input: {
		now?: Date;
		actorUserId?: number;
		dependencies?: {
			getAdmins: typeof getActiveSalesHandoffSuperAdmins;
			getContact: typeof getSubscriberAccount;
			createActivity: typeof createActivity;
		};
	} = {},
) {
	const now = input.now ?? new Date();
	const actorUserId =
		input.actorUserId ?? configuredSalesHandoffNotificationActorId();
	const dependencies = input.dependencies ?? {
		getAdmins: getActiveSalesHandoffSuperAdmins,
		getContact: getSubscriberAccount,
		createActivity,
	};
	const actor = await database.users.findFirst({
		where: {
			id: actorUserId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true },
	});
	if (!actor) {
		throw new Error(
			"Configured Sales Handoff notification actor is not active.",
		);
	}
	const recipientOrganizations = await database.modelHasRoles.findMany({
		where: {
			deletedAt: null,
			role: { name: "Super Admin", deletedAt: null },
			user: { deletedAt: null, accessRevokedAt: null },
		},
		select: { organizationId: true },
		distinct: ["organizationId"],
	});
	const recipientOrganizationIds = recipientOrganizations.map(
		(assignment) => assignment.organizationId,
	);
	if (!recipientOrganizationIds.length) {
		logger.warn(
			"Sales Handoff escalation has no active recipient organizations",
		);
		return { scanned: 0, results: [] };
	}
	const candidates = await database.salesHandoffActionEpoch.findMany({
		where: {
			organizationId: { in: recipientOrganizationIds },
			resolvedAt: null,
			openKey: { not: null },
			escalatedAt: null,
			escalationDueAt: { lte: now },
		},
		select: { id: true },
		orderBy: [{ escalationDueAt: "asc" }, { id: "asc" }],
		take: SCAN_LIMIT,
	});
	const results: Array<{
		id: string;
		status: "STALE" | "MISSING_ORGANIZATION" | "NO_RECIPIENTS" | "NOTIFIED";
		recipients?: number;
	}> = [];
	for (const candidate of candidates) {
		const result = await database.$transaction(
			async (tx) => {
				const transactionDb = tx as unknown as Db;
				const epoch = await tx.salesHandoffActionEpoch.findFirst({
					where: {
						id: candidate.id,
						resolvedAt: null,
						openKey: { not: null },
						escalatedAt: null,
						escalationDueAt: { lte: now },
					},
				});
				if (!epoch) return { id: candidate.id, status: "STALE" as const };
				if (epoch.organizationId == null) {
					logger.error(
						"Sales Handoff escalation skipped without organization",
						{
							actionEpochId: epoch.id,
							salesOrderId: epoch.salesOrderId,
						},
					);
					return { id: epoch.id, status: "MISSING_ORGANIZATION" as const };
				}
				const admins = await dependencies.getAdmins(
					transactionDb,
					epoch.organizationId,
				);
				if (!admins.length) {
					logger.warn("Sales Handoff escalation has no active Super Admin", {
						actionEpochId: epoch.id,
						organizationId: epoch.organizationId,
					});
					return { id: epoch.id, status: "NO_RECIPIENTS" as const };
				}
				const delivered =
					await tx.salesHandoffActionEscalationRecipient.findMany({
						where: {
							actionEpochId: epoch.id,
							recipientUserId: { in: admins.map((admin) => admin.id) },
							notifiedAt: { not: null },
						},
						select: { recipientUserId: true },
					});
				const deliveredIds = new Set(
					delivered.map((recipient) => recipient.recipientUserId),
				);
				const pendingAdmins = admins.filter(
					(admin) => !deliveredIds.has(admin.id),
				);
				const claimed = await tx.salesHandoffActionEpoch.updateMany({
					where: {
						id: epoch.id,
						resolvedAt: null,
						escalatedAt: null,
					},
					data: { escalatedAt: now },
				});
				if (claimed.count !== 1) {
					return { id: epoch.id, status: "STALE" as const };
				}
				if (!pendingAdmins.length) {
					return { id: epoch.id, status: "NOTIFIED" as const, recipients: 0 };
				}
				const authorContact = await dependencies.getContact(
					transactionDb,
					actorUserId,
				);
				if (!authorContact) {
					throw new Error(
						"Configured Sales Handoff notification actor has no contact.",
					);
				}
				const recipientAccounts = (
					await Promise.all(
						pendingAdmins.map((admin) =>
							dependencies.getContact(transactionDb, admin.id),
						),
					)
				).filter((contact): contact is NonNullable<typeof contact> =>
					Boolean(contact),
				);
				if (recipientAccounts.length !== pendingAdmins.length) {
					throw new Error(
						"An active Sales Handoff Super Admin has no notification contact.",
					);
				}
				const representative = await tx.users.findFirst({
					where: { id: epoch.responsibleRepId },
					select: { name: true },
				});
				const activity = await dependencies.createActivity(
					transactionDb,
					{
						type: CHANNEL,
						source: "system",
						subject: "Paid sales need action",
						headline: `#${epoch.orderId} — ${epoch.actionType === "PRODUCTION" ? "Production" : "Material"} has been open for one business day.`,
						tags: {
							type: CHANNEL,
							actionEpochId: epoch.id,
							salesOrderId: epoch.salesOrderId,
							orderId: epoch.orderId,
							actionType: epoch.actionType,
							responsibleRepId: epoch.responsibleRepId,
							responsibleRepName:
								representative?.name || `Sales rep ${epoch.responsibleRepId}`,
							openedAt: epoch.openedAt.toISOString(),
							targetControlUid: epoch.targetControlUid,
						},
					},
					authorContact.id,
					recipientAccounts.map((contact) => contact.id),
				);
				await tx.salesHandoffActionEscalationRecipient.createMany({
					data: pendingAdmins.map((admin) => ({
						actionEpochId: epoch.id,
						recipientUserId: admin.id,
						notificationActivityId: activity.id,
						notifiedAt: now,
					})),
					skipDuplicates: true,
				});
				return {
					id: epoch.id,
					status: "NOTIFIED" as const,
					recipients: pendingAdmins.length,
				};
			},
			{ isolationLevel: "Serializable" },
		);
		results.push(result);
	}
	return { scanned: candidates.length, results };
}

export const salesHandoffEscalationSchedule = schedules.task({
	id: "sales-handoff-escalation-schedule",
	cron: { pattern: "*/15 * * * *", timezone: "America/New_York" },
	maxDuration: 300,
	queue: { concurrencyLimit: 1 },
	run: () => runSalesHandoffEscalationScan(db),
});
