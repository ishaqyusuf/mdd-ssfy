import { createHash, randomUUID } from "node:crypto";
import type { Database, TransactionClient } from "../index";

export type BugReportDeliveryState =
	| "PENDING"
	| "PROCESSING"
	| "CREATED"
	| "RETRY_WAIT"
	| "FAILED"
	| "UNCONFIGURED"
	| "UNCERTAIN";

export type BugReportDeliveryOutcome =
	| {
			state: "CREATED";
			issueNumber: number;
			issueKey: string;
			issueUrl: string;
	  }
	| {
			state: "RETRY_WAIT" | "FAILED" | "UNCONFIGURED" | "UNCERTAIN";
			errorCode: string;
			nextAttemptAt?: Date;
	  };

type BugReportDeliveryDb = Pick<Database, "$transaction">;

const MAX_ATTEMPTS = 5;
const MAX_CLAIMS = 20;

function validateClock(now: Date) {
	if (!Number.isFinite(now.getTime()))
		throw new Error("Invalid bug report delivery clock");
}

function validateErrorCode(code: string) {
	if (!/^[A-Z0-9_]{1,100}$/.test(code))
		throw new Error("Invalid bug report delivery error code");
}

function validateReceipt(issue: {
	issueNumber: number;
	issueKey: string;
	issueUrl: string;
}) {
	if (!Number.isSafeInteger(issue.issueNumber) || issue.issueNumber < 1)
		throw new Error("Invalid bug report issue number");
	if (
		!/^(?:#[1-9]\d{0,18}|[A-Za-z0-9][A-Za-z0-9_.:/-]{0,190})$/.test(
			issue.issueKey,
		)
	)
		throw new Error("Invalid bug report issue key");
	try {
		const parsed = new URL(issue.issueUrl);
		if (parsed.protocol !== "https:" || !parsed.hostname)
			throw new Error("Invalid bug report issue URL");
	} catch {
		throw new Error("Invalid bug report issue URL");
	}
}

export function bugReportDeliveryActionKey(reportId: string) {
	if (!/^[A-Za-z0-9_-]{1,80}$/.test(reportId))
		throw new Error("Invalid bug report ID");
	return createHash("sha256")
		.update(`bug-report:${reportId}:github:v1`)
		.digest("hex");
}

export async function createBugReportDelivery(
	tx: TransactionClient,
	input: {
		reportId: string;
		provider: string;
		repository: string;
		state?: "PENDING" | "UNCONFIGURED";
		now: Date;
	},
) {
	validateClock(input.now);
	if (!/^[A-Z0-9_-]{1,50}$/.test(input.provider))
		throw new Error("Invalid bug report delivery provider");
	if (!/^[A-Za-z0-9_.-]{1,80}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository))
		throw new Error("Invalid bug report delivery repository");

	const existing = await tx.bugReportDelivery.findUnique({
		where: { reportId: input.reportId },
		select: { id: true, reportId: true, actionKey: true },
	});
	if (existing) return existing;

	return tx.bugReportDelivery.create({
		data: {
			reportId: input.reportId,
			provider: input.provider,
			repository: input.repository,
			actionKey: bugReportDeliveryActionKey(input.reportId),
			state: input.state ?? "PENDING",
			nextAttemptAt: input.state === "UNCONFIGURED" ? null : input.now,
			createdAt: input.now,
			updatedAt: input.now,
		},
		select: { id: true, reportId: true, actionKey: true },
	});
}

export async function claimDueBugReportDeliveries(
	db: BugReportDeliveryDb,
	input: {
		now: Date;
		limit?: number;
		leaseMs?: number;
	},
) {
	validateClock(input.now);
	const limit = input.limit ?? MAX_CLAIMS;
	const leaseMs = input.leaseMs ?? 60_000;
	if (!Number.isInteger(limit) || limit < 1 || limit > MAX_CLAIMS)
		throw new Error("Invalid bug report delivery claim limit");
	if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000)
		throw new Error("Invalid bug report delivery lease duration");

	return db.$transaction(
		async (tx) => {
			await tx.bugReportDelivery.updateMany({
				where: {
					state: "PROCESSING",
					leaseExpiresAt: { lte: input.now },
				},
				data: {
					state: "UNCERTAIN",
					lastErrorCode: "LEASE_EXPIRED",
					nextAttemptAt: input.now,
					leaseId: null,
					leaseExpiresAt: null,
					updatedAt: input.now,
				},
			});

			const candidates = await tx.bugReportDelivery.findMany({
				where: {
					state: { in: ["PENDING", "RETRY_WAIT"] },
					nextAttemptAt: { lte: input.now },
					attempts: { lt: MAX_ATTEMPTS },
				},
				orderBy: [{ nextAttemptAt: "asc" }, { id: "asc" }],
				take: limit,
				select: {
					id: true,
					reportId: true,
					attempts: true,
					actionKey: true,
					provider: true,
					repository: true,
				},
			});

			const claims: Array<{
				id: string;
				reportId: string;
				actionKey: string;
				attempts: number;
				provider: string;
				repository: string;
				leaseId: string;
				leaseExpiresAt: Date;
			}> = [];
			for (const candidate of candidates) {
				const leaseId = randomUUID();
				const leaseExpiresAt = new Date(input.now.getTime() + leaseMs);
				const changed = await tx.bugReportDelivery.updateMany({
					where: {
						id: candidate.id,
						state: { in: ["PENDING", "RETRY_WAIT"] },
						nextAttemptAt: { lte: input.now },
					},
					data: {
						state: "PROCESSING",
						attempts: candidate.attempts + 1,
						leaseId,
						leaseExpiresAt,
						firstAttemptAt: candidate.attempts === 0 ? input.now : undefined,
						lastAttemptAt: input.now,
						nextAttemptAt: null,
						updatedAt: input.now,
					},
				});
				if (changed.count === 1)
					claims.push({
						...candidate,
						attempts: candidate.attempts + 1,
						leaseId,
						leaseExpiresAt,
					});
			}
			return claims;
		},
		{ timeout: 10_000 },
	);
}

export async function settleBugReportDelivery(
	db: BugReportDeliveryDb,
	input: {
		deliveryId: string;
		leaseId: string;
		now: Date;
		outcome: BugReportDeliveryOutcome;
	},
) {
	validateClock(input.now);
	const outcome = input.outcome;
	if (outcome.state === "CREATED") validateReceipt(outcome);
	else validateErrorCode(outcome.errorCode);
	if (outcome.state === "RETRY_WAIT") {
		if (!outcome.nextAttemptAt)
			throw new Error("Bug report delivery retry requires a retry time");
		validateClock(outcome.nextAttemptAt);
		if (outcome.nextAttemptAt <= input.now)
			throw new Error("Bug report delivery retry must be in the future");
	}

	return db.$transaction(
		async (tx) => {
			const current = await tx.bugReportDelivery.findUnique({
				where: { id: input.deliveryId },
				select: { attempts: true, state: true },
			});
			if (!current) return false;
			const exhausted =
				outcome.state === "RETRY_WAIT" && current.attempts >= MAX_ATTEMPTS;
			const changed = await tx.bugReportDelivery.updateMany({
				where: {
					id: input.deliveryId,
					state: "PROCESSING",
					leaseId: input.leaseId,
					leaseExpiresAt: { gt: input.now },
				},
				data: {
					state: exhausted ? "FAILED" : outcome.state,
					leaseId: null,
					leaseExpiresAt: null,
					lastErrorCode:
						exhausted || outcome.state !== "CREATED"
							? exhausted
								? "RETRY_EXHAUSTED"
								: outcome.errorCode
							: null,
					nextAttemptAt:
						!exhausted && outcome.state === "RETRY_WAIT"
							? outcome.nextAttemptAt
							: null,
					...(outcome.state === "CREATED"
						? {
								remoteIssueNumber: outcome.issueNumber,
								remoteIssueKey: outcome.issueKey,
								remoteIssueUrl: outcome.issueUrl,
								scanCursor: null,
								scanCompletedAt: input.now,
								sentAt: input.now,
							}
						: {}),
					updatedAt: input.now,
				},
			});
			if (changed.count !== 1 || exhausted || outcome.state !== "CREATED")
				return changed.count === 1;

			const delivery = await tx.bugReportDelivery.findUnique({
				where: { id: input.deliveryId },
				select: { reportId: true },
			});
			if (!delivery) return false;
			await tx.bugReport.update({
				where: { id: delivery.reportId },
				data: {
					externalIssueProvider: "GITHUB",
					externalIssueKey: outcome.issueKey,
					externalIssueUrl: outcome.issueUrl,
					externalIssueStatus: "CREATED",
					externalIssueError: null,
					externalIssueCreatedAt: input.now,
				},
			});
			return true;
		},
		{ timeout: 10_000 },
	);
}

export async function recordBugReportDeliveryReceipt(
	db: BugReportDeliveryDb,
	input: {
		deliveryId: string;
		now: Date;
		issueNumber: number;
		issueKey: string;
		issueUrl: string;
	},
) {
	validateClock(input.now);
	validateReceipt(input);
	return db.$transaction(
		async (tx) => {
			const delivery = await tx.bugReportDelivery.findUnique({
				where: { id: input.deliveryId },
				select: { reportId: true },
			});
			if (!delivery) return false;
			const changed = await tx.bugReportDelivery.updateMany({
				where: {
					id: input.deliveryId,
					state: "UNCERTAIN",
				},
				data: {
					state: "CREATED",
					remoteIssueNumber: input.issueNumber,
					remoteIssueKey: input.issueKey,
					remoteIssueUrl: input.issueUrl,
					lastErrorCode: null,
					leaseId: null,
					leaseExpiresAt: null,
					nextAttemptAt: null,
					scanCursor: null,
					scanCompletedAt: input.now,
					sentAt: input.now,
					updatedAt: input.now,
				},
			});
			if (changed.count !== 1) return false;
			await tx.bugReport.update({
				where: { id: delivery.reportId },
				data: {
					externalIssueProvider: "GITHUB",
					externalIssueKey: input.issueKey,
					externalIssueUrl: input.issueUrl,
					externalIssueStatus: "CREATED",
					externalIssueError: null,
					externalIssueCreatedAt: input.now,
				},
			});
			return true;
		},
		{ timeout: 10_000 },
	);
}

export async function requeueBugReportDelivery(
	db: BugReportDeliveryDb,
	input: { deliveryId: string; now: Date },
) {
	validateClock(input.now);
	return db.$transaction(async (tx) => {
		const changed = await tx.bugReportDelivery.updateMany({
			where: {
				id: input.deliveryId,
				state: { in: ["FAILED", "UNCONFIGURED"] },
				attempts: { lt: MAX_ATTEMPTS },
			},
			data: {
				state: "RETRY_WAIT",
				nextAttemptAt: input.now,
				leaseId: null,
				leaseExpiresAt: null,
				updatedAt: input.now,
			},
		});
		return changed.count === 1;
	});
}
