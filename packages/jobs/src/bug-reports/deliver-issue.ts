import {
	buildBugReportDelivery,
	getBugReportGithubConfig,
} from "@gnd/bug-reports";
import type { Database } from "@gnd/db";
import {
	claimDueBugReportDeliveries,
	recordBugReportDeliveryReceipt,
	settleBugReportDelivery,
} from "@gnd/db/queries";
import {
	type GithubRequest,
	createReliabilityGithubIssue,
	discoverGithubDeliveryReceipt,
} from "@gnd/observability/reliability";

type DeliveryStatus =
	| "CREATED"
	| "RETRY_WAIT"
	| "FAILED"
	| "UNCONFIGURED"
	| "UNCERTAIN";

type DeliveryResult = {
	reportId: string;
	deliveryId: string;
	status: DeliveryStatus;
};

const MAX_DELIVERY_BATCH = 20;

export async function deliverDueBugReportIssues(
	db: Database,
	input: {
		env?: Record<string, string | undefined>;
		now: () => Date;
		request?: GithubRequest;
		limit?: number;
	},
): Promise<DeliveryResult[]> {
	const now = input.now();
	const config = getBugReportGithubConfig(input.env ?? process.env);
	const results: DeliveryResult[] = [];
	if (config) {
		const uncertain = await db.bugReportDelivery.findMany({
			where: { state: "UNCERTAIN", provider: "GITHUB" },
			orderBy: { lastAttemptAt: "asc" },
			take: Math.min(input.limit ?? MAX_DELIVERY_BATCH, MAX_DELIVERY_BATCH),
			include: { report: { select: { createdAt: true } } },
		});
		for (const delivery of uncertain) {
			const recovery = await discoverGithubDeliveryReceipt(
				{
					repository: config.repository,
					token: config.token,
					actorId: config.actorId,
					incidentId: delivery.reportId,
					actionKey: delivery.actionKey,
					since: delivery.report.createdAt ?? delivery.createdAt ?? now,
					maxPages: 4,
				},
				input.request,
			);
			if (recovery.status === "found") {
				const issueNumber = Number(recovery.remoteId);
				await recordBugReportDeliveryReceipt(db, {
					deliveryId: delivery.id,
					now: input.now(),
					issueNumber,
					issueKey: `#${issueNumber}`,
					issueUrl: `https://github.com/${config.repository}/issues/${issueNumber}`,
				});
				results.push({
					reportId: delivery.reportId,
					deliveryId: delivery.id,
					status: "CREATED",
				});
			}
		}
	}
	const claims = await claimDueBugReportDeliveries(db, {
		now,
		limit: Math.min(input.limit ?? MAX_DELIVERY_BATCH, MAX_DELIVERY_BATCH),
	});
	if (!claims.length) return results;

	if (!config) {
		for (const claim of claims) {
			await settleBugReportDelivery(db, {
				deliveryId: claim.id,
				leaseId: claim.leaseId,
				now: input.now(),
				outcome: {
					state: "UNCONFIGURED",
					errorCode: "GITHUB_NOT_CONFIGURED",
				},
			});
			results.push({
				reportId: claim.reportId,
				deliveryId: claim.id,
				status: "UNCONFIGURED",
			});
		}
		return results;
	}

	const reports = await db.bugReport.findMany({
		where: {
			id: { in: claims.map((claim) => claim.reportId) },
			deletedAt: null,
		},
		select: {
			id: true,
			description: true,
			captureType: true,
			currentUrl: true,
			durationMs: true,
			createdAt: true,
		},
	});
	const reportById = new Map(reports.map((report) => [report.id, report]));

	for (const claim of claims) {
		const report = reportById.get(claim.reportId);
		let status: DeliveryStatus;
		let createAttempted = false;
		try {
			if (!report) throw new Error("REPORT_MISSING");
			const issue = buildBugReportDelivery({
				id: report.id,
				description: report.description,
				captureType: report.captureType,
				currentUrl: report.currentUrl,
				durationMs: report.durationMs,
				createdAt: report.createdAt ?? input.now(),
				appBaseUrl: config.appBaseUrl,
			});
			createAttempted = true;
			const outcome = await createReliabilityGithubIssue(
				{
					repository: config.repository,
					token: config.token,
					incidentId: report.id,
					actionKey: issue.actionKey,
					title: issue.title,
					evidence: issue.evidence,
					attempt: claim.attempts,
					labels: config.labels,
				},
				input.request,
				input.now,
			);

			if (outcome.status === "SENT") {
				const issueNumber = Number(outcome.remoteId);
				const settled = await settleBugReportDelivery(db, {
					deliveryId: claim.id,
					leaseId: claim.leaseId,
					now: input.now(),
					outcome: {
						state: "CREATED",
						issueNumber,
						issueKey: `#${issueNumber}`,
						issueUrl: `https://github.com/${config.repository}/issues/${issueNumber}`,
					},
				});
				status = settled ? "CREATED" : "UNCERTAIN";
			} else {
				await settleBugReportDelivery(db, {
					deliveryId: claim.id,
					leaseId: claim.leaseId,
					now: input.now(),
					outcome:
						outcome.status === "PENDING"
							? {
									state: "RETRY_WAIT",
									errorCode: outcome.errorCode,
									nextAttemptAt: outcome.retryAt,
								}
							: {
									state: outcome.status,
									errorCode: outcome.errorCode,
								},
				});
				status = outcome.status === "PENDING" ? "RETRY_WAIT" : outcome.status;
			}
		} catch {
			await settleBugReportDelivery(db, {
				deliveryId: claim.id,
				leaseId: claim.leaseId,
				now: input.now(),
				outcome: {
					state: createAttempted ? "UNCERTAIN" : "FAILED",
					errorCode: createAttempted
						? "BUG_REPORT_DELIVERY_UNCERTAIN"
						: "BUG_REPORT_DELIVERY_INVALID",
				},
			});
			status = createAttempted ? "UNCERTAIN" : "FAILED";
		}
		results.push({
			reportId: claim.reportId,
			deliveryId: claim.id,
			status,
		});
	}
	return results;
}
