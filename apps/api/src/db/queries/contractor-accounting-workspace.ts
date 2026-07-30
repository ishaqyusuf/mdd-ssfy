import type { GetContractorPeriodReportSchema } from "@api/schemas/contractor-accounting";
import type { TRPCContext } from "@api/trpc/init";
import {
	type ContractorAccountingEntry,
	type ContractorIssueResolution,
	applyContractorIssueResolution,
	buildContractorAccountingTrend,
	buildContractorCloseReadiness,
	buildContractorIssueFingerprint,
	buildContractorPayables,
	createDateOnlyReportPeriod,
} from "@gnd/contractor-accounting";
import {
	getContractorLedgerEntriesThrough,
	listContractorReconciliationIssues,
} from "@gnd/db/queries";
import { TRPCError } from "@trpc/server";

const CONTRACTOR_RESOLUTION_EVENT_PREFIX =
	"contractor.accounting.reconciliation.";

function resolutionEventType(issueId: string) {
	return `${CONTRACTOR_RESOLUTION_EVENT_PREFIX}${issueId}`;
}

function asEntry(
	entry: Awaited<
		ReturnType<typeof getContractorLedgerEntriesThrough>
	>["entries"][number],
	contractorName: string,
): ContractorAccountingEntry {
	return {
		id: entry.id,
		contractorId: entry.contractorId,
		contractorName,
		type: entry.type,
		amount: entry.amount,
		liabilityDelta: entry.liabilityDelta,
		effectiveAt: entry.effectiveAt,
		description: entry.description,
		jobId: entry.jobId,
		paymentId: entry.paymentId,
		projectId:
			entry.meta &&
			typeof entry.meta === "object" &&
			!Array.isArray(entry.meta) &&
			"projectId" in entry.meta
				? Number(entry.meta.projectId)
				: null,
	};
}

async function loadEntries(
	ctx: TRPCContext,
	input: Pick<
		GetContractorPeriodReportSchema,
		"from" | "to" | "timezone" | "contractorIds"
	>,
) {
	const period = createDateOnlyReportPeriod(input);
	const result = await getContractorLedgerEntriesThrough(ctx.db, {
		toExclusive: new Date(period.toExclusive),
		contractorIds: input.contractorIds,
	});
	return {
		period,
		entries: result.entries.map((entry) =>
			asEntry(
				entry,
				result.contractors.get(entry.contractorId)?.name ||
					`Contractor #${entry.contractorId}`,
			),
		),
	};
}

function eventData(value: unknown) {
	if (!value || Array.isArray(value) || typeof value !== "object") return {};
	const record = value as Record<string, unknown>;
	return {
		action: typeof record.action === "string" ? record.action : null,
		fingerprint:
			typeof record.fingerprint === "string" ? record.fingerprint : null,
		note: typeof record.note === "string" ? record.note : null,
		resolution:
			typeof record.resolution === "string" ? record.resolution : null,
	};
}

async function loadIssueEvents(ctx: TRPCContext, issueIds: string[]) {
	if (!issueIds.length) return new Map();
	const events = await ctx.db.event.findMany({
		where: {
			deletedAt: null,
			type: { in: issueIds.map(resolutionEventType) },
		},
		orderBy: [{ createdAt: "asc" }, { id: "asc" }],
		select: {
			id: true,
			type: true,
			userId: true,
			createdAt: true,
			data: true,
		},
	});
	const byIssue = new Map<string, Array<(typeof events)[number]>>();
	for (const event of events) {
		const issueId = event.type.slice(CONTRACTOR_RESOLUTION_EVENT_PREFIX.length);
		const current = byIssue.get(issueId) ?? [];
		current.push(event);
		byIssue.set(issueId, current);
	}
	return byIssue;
}

function applyIssueState(
	issue: Awaited<
		ReturnType<typeof listContractorReconciliationIssues>
	>["data"][number],
	events: Array<{
		id: number;
		userId: number | null;
		createdAt: Date | null;
		data: unknown;
	}>,
) {
	return {
		...issue,
		...applyContractorIssueResolution(
			{
				id: issue.id,
				code: issue.code,
				contractorId: issue.contractorId,
				ledgerEntryId: issue.ledgerEntryId,
				expectedAmount: issue.expectedAmount?.toString(),
				actualAmount: issue.actualAmount?.toString(),
				differenceAmount: issue.differenceAmount?.toString(),
				evidence: issue.evidence,
			},
			events.map((event) => ({ ...event, data: eventData(event.data) })),
		),
	};
}

function fingerprintForIssue(issue: {
	id: string;
	code: string;
	contractorId?: number | null;
	ledgerEntryId?: string | null;
	expectedAmount?: { toString(): string } | null;
	actualAmount?: { toString(): string } | null;
	differenceAmount?: { toString(): string } | null;
	evidence?: unknown;
}) {
	return buildContractorIssueFingerprint({
		id: issue.id,
		code: issue.code,
		contractorId: issue.contractorId,
		ledgerEntryId: issue.ledgerEntryId,
		expectedAmount: issue.expectedAmount?.toString(),
		actualAmount: issue.actualAmount?.toString(),
		differenceAmount: issue.differenceAmount?.toString(),
		evidence: issue.evidence,
	});
}

export async function getContractorPayables(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema,
) {
	const { period, entries } = await loadEntries(ctx, input);
	const contractorIds = [
		...new Set(entries.map((entry) => entry.contractorId)),
	];
	const [issues, taxProfiles, payableJobs] = await Promise.all([
		ctx.db.contractorReconciliationIssue.groupBy({
			by: ["contractorId"],
			where: {
				status: { in: ["OPEN", "REVIEWED"] },
				contractorId: { in: contractorIds },
			},
			_count: { _all: true },
		}),
		ctx.db.contractorTaxProfile.findMany({
			where: { contractorId: { in: contractorIds } },
			select: { contractorId: true, w9Status: true },
		}),
		ctx.db.jobs.findMany({
			where: {
				userId: { in: contractorIds },
				deletedAt: null,
				paymentId: null,
				status: { in: ["Approved", "Completed"] },
			},
			select: { id: true, userId: true },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			take: 50_000,
		}),
	]);
	const issueMap = new Map(
		issues.flatMap((row) =>
			row.contractorId == null
				? []
				: [[row.contractorId, row._count._all] as const],
		),
	);
	const taxMap = new Map(
		taxProfiles.map((row) => [row.contractorId, row.w9Status]),
	);
	const payableJobMap = new Map<number, number[]>();
	for (const job of payableJobs) {
		if (job.userId == null) continue;
		const current = payableJobMap.get(job.userId) ?? [];
		current.push(job.id);
		payableJobMap.set(job.userId, current);
	}
	const projected = buildContractorPayables({
		entries,
		asOf: new Date(new Date(period.toExclusive).getTime() - 1),
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
	const query = input.q?.trim().toLowerCase();
	const enriched = projected.data.map((row) => ({
		...row,
		jobIds: payableJobMap.get(row.contractorId) ?? [],
		jobCount: payableJobMap.get(row.contractorId)?.length ?? 0,
	}));
	const data = query
		? enriched.filter((row) => row.contractorName.toLowerCase().includes(query))
		: enriched;
	return {
		period,
		data,
		summary: {
			...projected.summary,
			contractorCount: data.length,
			readyCount: data.filter((row) => row.readiness === "READY").length,
			blockedCount: data.filter((row) => row.readiness.startsWith("BLOCKED"))
				.length,
			totalBalanceCents: data.reduce(
				(total, row) => total + row.balanceCents,
				0,
			),
			totalPayableCents: data.reduce(
				(total, row) => total + row.payableBalanceCents,
				0,
			),
			over90DaysCents: data.reduce(
				(total, row) => total + row.aging.over90DaysCents,
				0,
			),
		},
	};
}

export async function getContractorAccountingInsights(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema,
) {
	const { period, entries } = await loadEntries(ctx, input);
	const trend = buildContractorAccountingTrend({
		entries,
		from: period.from,
		toExclusive: period.toExclusive,
	});
	const payables = await getContractorPayables(ctx, input);
	return {
		period,
		trend,
		aging: payables.data.reduce(
			(total, row) => ({
				currentCents: total.currentCents + row.aging.currentCents,
				days1To30Cents: total.days1To30Cents + row.aging.days1To30Cents,
				days31To60Cents: total.days31To60Cents + row.aging.days31To60Cents,
				days61To90Cents: total.days61To90Cents + row.aging.days61To90Cents,
				over90DaysCents: total.over90DaysCents + row.aging.over90DaysCents,
				totalCents: total.totalCents + row.aging.totalCents,
			}),
			{
				currentCents: 0,
				days1To30Cents: 0,
				days31To60Cents: 0,
				days61To90Cents: 0,
				over90DaysCents: 0,
				totalCents: 0,
			},
		),
		concentration: payables.data.slice(0, 5).map((row) => ({
			contractorId: row.contractorId,
			contractorName: row.contractorName,
			balanceCents: row.payableBalanceCents,
		})),
	};
}

export async function getContractorResolutionIssues(
	ctx: TRPCContext,
	input: Parameters<typeof listContractorReconciliationIssues>[1],
) {
	const result = await listContractorReconciliationIssues(ctx.db, input);
	const events = await loadIssueEvents(
		ctx,
		result.data.map((issue) => issue.id),
	);
	return {
		...result,
		data: result.data.map((issue) =>
			applyIssueState(issue, events.get(issue.id) ?? []),
		),
	};
}

export async function getContractorResolutionIssueDetail(
	ctx: TRPCContext,
	id: string,
) {
	const issue = await ctx.db.contractorReconciliationIssue.findUnique({
		where: { id },
		include: { run: true },
	});
	if (!issue) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Reconciliation issue was not found.",
		});
	}
	const contractor =
		issue.contractorId == null
			? null
			: await ctx.db.users.findFirst({
					where: { id: issue.contractorId },
					select: { id: true, name: true },
				});
	const events = (await loadIssueEvents(ctx, [id])).get(id) ?? [];
	const state = applyIssueState({ ...issue, contractor }, events);
	return {
		...state,
		resolutionHistory: events
			.slice()
			.reverse()
			.map((event) => ({
				id: event.id,
				...eventData(event.data),
				userId: event.userId,
				createdAt: event.createdAt,
			})),
	};
}

export async function startContractorIssueResolution(
	ctx: TRPCContext,
	input: { id: string; note?: string | null },
) {
	const issue = await getContractorResolutionIssueDetail(ctx, input.id);
	if (issue.resolutionStatus === "in_progress") return issue;
	await ctx.db.event.create({
		data: {
			type: resolutionEventType(issue.id),
			userId: ctx.userId,
			data: {
				action: "opened",
				fingerprint: fingerprintForIssue(issue),
				note: input.note?.trim() || null,
				evidence: issue.evidence ?? null,
			},
		},
	});
	return getContractorResolutionIssueDetail(ctx, input.id);
}

export async function resolveContractorIssue(
	ctx: TRPCContext,
	input: {
		id: string;
		note: string;
		resolution: ContractorIssueResolution;
	},
) {
	const issue = await getContractorResolutionIssueDetail(ctx, input.id);
	if (issue.resolutionStatus !== "in_progress") {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Open a resolution session against the current evidence before resolving it.",
		});
	}
	await ctx.db.$transaction([
		ctx.db.event.create({
			data: {
				type: resolutionEventType(issue.id),
				userId: ctx.userId,
				data: {
					action: "resolved",
					fingerprint: fingerprintForIssue(issue),
					note: input.note.trim(),
					resolution: input.resolution,
					evidence: issue.evidence ?? null,
				},
			},
		}),
		ctx.db.contractorReconciliationIssue.update({
			where: { id: issue.id },
			data: {
				status: "RESOLVED",
				reviewedAt: new Date(),
				reviewedById: ctx.userId,
				resolutionNote: input.note.trim(),
			},
		}),
	]);
	return getContractorResolutionIssueDetail(ctx, input.id);
}

export async function getContractorCloseReadiness(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema,
) {
	const period = createDateOnlyReportPeriod(input);
	const [report, run] = await Promise.all([
		import("./contractor-accounting-ledger").then(
			({ getContractorLedgerPeriodReport }) =>
				getContractorLedgerPeriodReport(ctx, {
					...input,
					includeEntries: false,
				}),
		),
		ctx.db.contractorReconciliationRun.findFirst({
			where: {
				from: new Date(period.from),
				toExclusive: new Date(period.toExclusive),
				timezone: period.timezone,
				status: { in: ["MATCHED", "ISSUES_FOUND"] },
			},
			orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
		}),
	]);
	const rawIssues = run
		? await ctx.db.contractorReconciliationIssue.findMany({
				where: { runId: run.id },
				include: { run: true },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: 10_001,
			})
		: [];
	if (rawIssues.length > 10_000) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				"Period has more than 10,000 reconciliation issues; narrow and reconcile the period before close.",
		});
	}
	const events = await loadIssueEvents(
		ctx,
		rawIssues.map((issue) => issue.id),
	);
	const periodIssues = rawIssues.map((issue) =>
		applyIssueState({ ...issue, contractor: null }, events.get(issue.id) ?? []),
	);
	const allIssuesResolved =
		periodIssues.length > 0 &&
		periodIssues.every(
			(issue) =>
				issue.status === "RESOLVED" && issue.resolutionStatus === "resolved",
		);
	return {
		period,
		latestRun: run,
		...buildContractorCloseReadiness({
			hasCompletedReconciliation: Boolean(run),
			reconciliationMatches: run?.status === "MATCHED" || allIssuesResolved,
			openIssueCount: periodIssues.filter(
				(issue) => issue.status !== "RESOLVED",
			).length,
			staleResolutionCount: periodIssues.filter(
				(issue) => issue.resolutionStatus === "stale",
			).length,
			legacyDateFallbackCount: report.dataQuality.legacyJobDateFallbackCount,
			missingContractorNameCount: report.dataQuality.missingContractorNameCount,
			missingPayoutDateCount: report.dataQuality.missingPayoutDateCount,
			reconciliationDifferenceCents:
				report.dataQuality.reconciliationDifferenceCents,
		}),
	};
}

export async function getContractorAccountingProfile(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema & { contractorId: number },
) {
	const scoped = { ...input, contractorIds: [input.contractorId] };
	const [payables, insights, issues, taxProfile, payoutRuns] =
		await Promise.all([
			getContractorPayables(ctx, scoped),
			getContractorAccountingInsights(ctx, scoped),
			getContractorResolutionIssues(ctx, {
				contractorIds: [input.contractorId],
				pageSize: 100,
			}),
			ctx.db.contractorTaxProfile.findUnique({
				where: { contractorId: input.contractorId },
			}),
			ctx.db.contractorPayoutRun.findMany({
				where: { contractorId: input.contractorId },
				orderBy: { createdAt: "desc" },
				take: 25,
			}),
		]);
	const contractor = await ctx.db.users.findFirst({
		where: { id: input.contractorId, deletedAt: null },
		select: { id: true, name: true },
	});
	if (!contractor) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Contractor was not found.",
		});
	}
	return {
		contractor,
		payable: payables.data[0] ?? null,
		insights,
		issues: issues.data,
		taxProfile,
		payoutRuns,
	};
}
