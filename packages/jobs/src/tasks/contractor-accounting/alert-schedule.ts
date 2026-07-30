import { createHash } from "node:crypto";
import {
	type ContractorAccountingEntry,
	buildContractorPayables,
} from "@gnd/contractor-accounting";
import { type Prisma, db } from "@gnd/db";
import {
	getContractorLedgerEntriesThrough,
	recordContractorAccountingAlertEvent,
} from "@gnd/db/queries";
import { getEmailUrl, getRecipient, shouldSkipEmail } from "@gnd/utils/envs";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { nanoid } from "nanoid";
import { Resend } from "resend";

let resend: Resend | null = null;

function getResendClient() {
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
	resend ??= new Resend(apiKey);
	return resend;
}

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#039;");
}

function parseRecipients(value: Prisma.JsonValue) {
	return Array.isArray(value)
		? [
				...new Set(
					value
						.filter((recipient): recipient is string => {
							return typeof recipient === "string";
						})
						.map((recipient) => recipient.trim().toLowerCase())
						.filter(Boolean),
				),
			]
		: [];
}

function parseDelivery(value: Prisma.JsonValue | null) {
	if (!value || Array.isArray(value) || typeof value !== "object") {
		return {} as Record<string, string>;
	}
	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		),
	);
}

async function deliverAlertEmail(input: {
	event: {
		id: string;
		title: string;
		message: string;
		emailDelivery: Prisma.JsonValue | null;
		emailDeliveredAt: Date | null;
	};
	recipients: Prisma.JsonValue;
}) {
	if (shouldSkipEmail() || input.event.emailDeliveredAt) return;
	const recipients = parseRecipients(input.recipients);
	if (!recipients.length) return;
	const delivered = parseDelivery(input.event.emailDelivery);
	const pending = recipients.filter((recipient) => !delivered[recipient]);
	if (!pending.length) {
		await db.contractorAccountingAlertEvent.update({
			where: { id: input.event.id },
			data: { emailDeliveredAt: new Date(), emailDeliveryError: null },
		});
		return;
	}

	await db.contractorAccountingAlertEvent.update({
		where: { id: input.event.id },
		data: { emailDeliveryAttemptedAt: new Date(), emailDeliveryError: null },
	});
	const errors: string[] = [];
	for (const recipient of pending) {
		try {
			const response = await getResendClient().emails.send({
				from: "GND Millwork <noreply@gndprodesk.com>",
				to: getRecipient(recipient),
				subject: input.event.title,
				html: [
					`<p>${escapeHtml(input.event.message)}</p>`,
					`<p><a href="${getEmailUrl()}/contractors/accounting?manageAlerts=true">Open contractor accounting alerts</a></p>`,
				].join(""),
				headers: { "X-Entity-Ref-ID": nanoid() },
			});
			if (response.error) throw new Error(response.error.message);
			delivered[recipient] = new Date().toISOString();
			await db.contractorAccountingAlertEvent.update({
				where: { id: input.event.id },
				data: { emailDelivery: delivered },
			});
		} catch (error) {
			errors.push(
				`${recipient}: ${error instanceof Error ? error.message : "Delivery failed"}`,
			);
		}
	}
	const allDelivered = recipients.every((recipient) => delivered[recipient]);
	await db.contractorAccountingAlertEvent.update({
		where: { id: input.event.id },
		data: {
			emailDelivery: delivered,
			emailDeliveredAt: allDelivered ? new Date() : null,
			emailDeliveryError: errors.length ? errors.join("\n") : null,
		},
	});
	if (errors.length) {
		logger.error("Contractor accounting alert email delivery failed", {
			alertEventId: input.event.id,
			errors,
		});
	}
}

function hash(value: unknown) {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function daysOld(value: string, now: Date) {
	return Math.max(
		0,
		Math.floor(
			(now.getTime() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
		),
	);
}

export const contractorAccountingAlertSchedule = schedules.task({
	id: "contractor-accounting-alert-schedule",
	cron: "15 * * * *",
	maxDuration: 300,
	run: async () => {
		const now = new Date();
		const rules = await db.contractorAccountingAlertRule.findMany({
			where: { enabled: true },
			orderBy: { createdAt: "asc" },
			take: 500,
		});
		if (!rules.length) return { evaluatedAt: now.toISOString(), alerts: 0 };

		const source = await getContractorLedgerEntriesThrough(db, {
			toExclusive: new Date(now.getTime() + 1),
		});
		const contractorIds = [...source.contractors.keys()];
		const [issueCounts, taxProfiles] = await Promise.all([
			db.contractorReconciliationIssue.groupBy({
				by: ["contractorId"],
				where: {
					contractorId: { in: contractorIds },
					status: { in: ["OPEN", "REVIEWED"] },
				},
				_count: { _all: true },
			}),
			db.contractorTaxProfile.findMany({
				where: { contractorId: { in: contractorIds } },
				select: { contractorId: true, w9Status: true },
			}),
		]);
		const issueMap = new Map(
			issueCounts.flatMap((row) =>
				row.contractorId == null
					? []
					: [[row.contractorId, row._count._all] as const],
			),
		);
		const taxMap = new Map(
			taxProfiles.map((row) => [row.contractorId, row.w9Status]),
		);
		const entries: ContractorAccountingEntry[] = source.entries.map(
			(entry) => ({
				id: entry.id,
				contractorId: entry.contractorId,
				contractorName:
					source.contractors.get(entry.contractorId)?.name ||
					`Contractor #${entry.contractorId}`,
				type: entry.type,
				amount: entry.amount,
				liabilityDelta: entry.liabilityDelta,
				effectiveAt: entry.effectiveAt,
				description: entry.description,
				jobId: entry.jobId,
				paymentId: entry.paymentId,
			}),
		);
		const payables = buildContractorPayables({
			entries,
			asOf: now,
			blockersByContractor: new Map(
				contractorIds.map((contractorId) => [
					contractorId,
					{
						openIssueCount: issueMap.get(contractorId) ?? 0,
						w9Status: taxMap.get(contractorId) ?? null,
					},
				]),
			),
		});
		let alerts = 0;
		for (const rule of rules) {
			if (rule.kind === "PERIOD_CLOSE") {
				const latestClosed = await db.contractorAccountingPeriod.findFirst({
					where: { status: "CLOSED" },
					orderBy: { toExclusive: "desc" },
					select: { id: true, toExclusive: true },
				});
				const daysSinceClose = latestClosed
					? daysOld(latestClosed.toExclusive.toISOString(), now)
					: null;
				if (daysSinceClose == null || daysSinceClose >= 45) {
					const evidence = {
						latestClosedPeriodId: latestClosed?.id ?? null,
						latestClosedToExclusive:
							latestClosed?.toExclusive.toISOString() ?? null,
						daysSinceClose,
					};
					const event = await recordContractorAccountingAlertEvent(db, {
						ruleId: rule.id,
						fingerprint: hash({ ruleId: rule.id, evidence }),
						title: "Contractor accounting period close is overdue",
						message:
							"No contractor accounting period has been closed in the last 45 days.",
						evidence,
					});
					await deliverAlertEmail({
						event,
						recipients: rule.recipients,
					});
					alerts += 1;
				}
				await db.contractorAccountingAlertRule.update({
					where: { id: rule.id },
					data: { lastEvaluatedAt: now },
				});
				continue;
			}
			const rows = rule.contractorId
				? payables.data.filter((row) => row.contractorId === rule.contractorId)
				: payables.data;
			for (const row of rows) {
				let title: string | null = null;
				let message: string | null = null;
				let evidence: Prisma.InputJsonObject | null = null;
				if (
					rule.kind === "BALANCE_THRESHOLD" &&
					rule.thresholdAmount &&
					row.payableBalanceCents >= rule.thresholdAmount.toNumber() * 100
				) {
					title = "Contractor balance threshold reached";
					message = `${row.contractorName} has a payable balance above the configured threshold.`;
					evidence = {
						balanceCents: row.payableBalanceCents,
						thresholdCents: rule.thresholdAmount.toNumber() * 100,
					};
				} else if (
					rule.kind === "LIABILITY_AGE" &&
					rule.thresholdDays &&
					row.oldestUnpaidAt &&
					daysOld(row.oldestUnpaidAt, now) >= rule.thresholdDays
				) {
					title = "Contractor liability is aging";
					message = `${row.contractorName} has unpaid liability older than ${rule.thresholdDays} days.`;
					evidence = {
						oldestUnpaidAt: row.oldestUnpaidAt,
						thresholdDays: rule.thresholdDays,
					};
				} else if (
					rule.kind === "RECONCILIATION_STALE" &&
					row.openIssueCount > 0
				) {
					title = "Contractor reconciliation needs attention";
					message = `${row.contractorName} has ${row.openIssueCount} unresolved reconciliation issue(s).`;
					evidence = { openIssueCount: row.openIssueCount };
				} else if (
					rule.kind === "W9_BLOCKER" &&
					row.readiness === "BLOCKED_TAX"
				) {
					title = "Contractor payout blocked by tax profile";
					message = `${row.contractorName} is not payout-ready because the W-9 is incomplete.`;
					evidence = { w9Status: row.w9Status };
				}
				if (!title || !message || !evidence) continue;
				const event = await recordContractorAccountingAlertEvent(db, {
					ruleId: rule.id,
					contractorId: row.contractorId,
					fingerprint: hash({
						ruleId: rule.id,
						contractorId: row.contractorId,
						evidence,
					}),
					title,
					message,
					evidence,
				});
				await deliverAlertEmail({
					event,
					recipients: rule.recipients,
				});
				alerts += 1;
			}
			await db.contractorAccountingAlertRule.update({
				where: { id: rule.id },
				data: { lastEvaluatedAt: now },
			});
		}
		logger.info("Contractor accounting alerts evaluated", {
			ruleCount: rules.length,
			alerts,
		});
		return { evaluatedAt: now.toISOString(), alerts };
	},
});
