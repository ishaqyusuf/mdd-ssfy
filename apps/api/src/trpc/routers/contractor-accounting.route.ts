import { createHash, randomUUID } from "node:crypto";
import {
	getContractorLedgerPeriodReport,
	reconcileContractorLedgerPeriod,
	serializeContractorLedgerEntry,
} from "@api/db/queries/contractor-accounting-ledger";
import {
	closeContractorAccountingPeriodSchema,
	createContractorAccountingAlertRuleSchema,
	createContractorAdjustmentSchema,
	createContractorPayoutRunSchema,
	createContractorReportScheduleSchema,
	generateContractorAccountingReportSchema,
	getContractorAccountingProfileSchema,
	getContractorLedgerEntrySchema,
	getContractorPeriodReportSchema,
	getContractorResolutionIssueSchema,
	getContractorStatementReportSchema,
	listContractorAccountingAlertEventsSchema,
	listContractorLedgerEntriesSchema,
	listContractorPayoutRunsSchema,
	listContractorReconciliationIssuesSchema,
	reopenContractorAccountingPeriodSchema,
	resolveContractorResolutionSchema,
	reverseContractorLedgerEntrySchema,
	reviewContractorReconciliationIssueSchema,
	runContractorReconciliationSchema,
	startContractorResolutionSchema,
	updateContractorAccountingAlertEventSchema,
	updateContractorAccountingAlertRuleSchema,
	updateContractorPayoutRunSchema,
	updateContractorTaxProfileSchema,
} from "@api/schemas/contractor-accounting";
import { requireAnyOperationalPermission } from "@api/utils/operational-route-access";
import {
	createDateOnlyReportPeriod,
	formatMoneyCents,
	getContractorLiabilityDeltaCents,
} from "@gnd/contractor-accounting";
import {
	backfillContractorLedgerFromLegacy,
	closeContractorAccountingPeriod,
	createContractorAccountingAlertRule,
	createContractorAccountingReportRun,
	createContractorAccountingReportSchedule,
	createContractorPayoutRun,
	getContractorAccountingFilterOptions,
	getContractorLedgerEntry,
	listContractorAccountingAlertEvents,
	listContractorAccountingAlertRules,
	listContractorAccountingPeriods,
	listContractorAccountingReportRuns,
	listContractorAccountingReportSchedules,
	listContractorLedgerEntries,
	listContractorPayoutRuns,
	listContractorReconciliationIssues,
	listContractorTaxProfiles,
	postContractorLedgerEntry,
	reopenContractorAccountingPeriod,
	reverseContractorLedgerEntry,
	reviewContractorReconciliationIssue,
	updateContractorAccountingAlertEventStatus,
	updateContractorAccountingAlertRule,
	updateContractorPayoutRunStatus,
	upsertContractorTaxProfile,
} from "@gnd/db/queries";
import { tasks } from "@trigger.dev/sdk/v3";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
	getContractorAccountingInsights,
	getContractorAccountingProfile,
	getContractorCloseReadiness,
	getContractorPayables,
	getContractorResolutionIssueDetail,
	getContractorResolutionIssues,
	resolveContractorIssue,
	startContractorIssueResolution,
} from "../../db/queries/contractor-accounting-workspace";
import {
	type TRPCContext,
	createTRPCRouter,
	protectedProcedure,
} from "../init";

async function requireContractorAccountingViewer(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["viewJobPayment", "editJobPayment"],
		"You do not have permission to view contractor accounting.",
	);
}

async function requireContractorAccountingManager(ctx: TRPCContext) {
	return requireAnyOperationalPermission(
		ctx,
		["editJobPayment"],
		"You do not have permission to manage contractor accounting.",
	);
}

async function requireContractorAccountingSuperAdmin(ctx: TRPCContext) {
	if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
	const user = await ctx.db.users.findFirst({
		where: { id: ctx.userId, deletedAt: null, accessRevokedAt: null },
		select: {
			roles: {
				where: { deletedAt: null, role: { deletedAt: null } },
				select: { role: { select: { name: true } } },
			},
		},
	});
	if (
		!user?.roles.some(
			(entry) => entry.role?.name?.toLowerCase() === "super admin",
		)
	) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "Only Super Admin can reopen contractor accounting periods.",
		});
	}
}

function dateAtStartInTimezone(date: string, timezone: string) {
	return new Date(
		createDateOnlyReportPeriod({ from: date, to: date, timezone }).from,
	);
}

function asTrpcError(error: unknown) {
	if (error instanceof TRPCError) return error;
	return new TRPCError({
		code: "BAD_REQUEST",
		message:
			error instanceof Error
				? error.message
				: "Contractor accounting request failed.",
	});
}

export const contractorAccountingRouter = createTRPCRouter({
	summary: protectedProcedure
		.input(getContractorPeriodReportSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorLedgerPeriodReport(ctx, {
				...input,
				includeEntries: false,
			});
		}),
	periodReport: protectedProcedure
		.input(getContractorPeriodReportSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorLedgerPeriodReport(ctx, input);
		}),
	entries: protectedProcedure
		.input(listContractorLedgerEntriesSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			const period = createDateOnlyReportPeriod(input);
			const result = await listContractorLedgerEntries(ctx.db, {
				...input,
				from: new Date(period.from),
				toExclusive: new Date(period.toExclusive),
			});
			return {
				...result,
				data: result.data.map(serializeContractorLedgerEntry),
			};
		}),
	entry: protectedProcedure
		.input(getContractorLedgerEntrySchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			const entry = await getContractorLedgerEntry(ctx.db, input.id);
			if (!entry) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Contractor accounting entry was not found.",
				});
			}
			return serializeContractorLedgerEntry(entry);
		}),
	filterOptions: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return getContractorAccountingFilterOptions(ctx.db);
	}),
	periods: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return listContractorAccountingPeriods(ctx.db);
	}),
	reconciliationIssues: protectedProcedure
		.input(listContractorReconciliationIssuesSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return listContractorReconciliationIssues(ctx.db, input);
		}),
	resolutionIssues: protectedProcedure
		.input(listContractorReconciliationIssuesSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorResolutionIssues(ctx, input);
		}),
	resolutionIssue: protectedProcedure
		.input(getContractorResolutionIssueSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorResolutionIssueDetail(ctx, input.id);
		}),
	payables: protectedProcedure
		.input(getContractorPeriodReportSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorPayables(ctx, input);
		}),
	insights: protectedProcedure
		.input(getContractorPeriodReportSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorAccountingInsights(ctx, input);
		}),
	closeReadiness: protectedProcedure
		.input(getContractorPeriodReportSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorCloseReadiness(ctx, input);
		}),
	contractorProfile: protectedProcedure
		.input(getContractorAccountingProfileSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return getContractorAccountingProfile(ctx, {
				...input,
				includeEntries: false,
			});
		}),
	payoutRuns: protectedProcedure
		.input(listContractorPayoutRunsSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return listContractorPayoutRuns(ctx.db, input);
		}),
	alertRules: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return listContractorAccountingAlertRules(ctx.db);
	}),
	alertEvents: protectedProcedure
		.input(listContractorAccountingAlertEventsSchema)
		.query(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			return listContractorAccountingAlertEvents(ctx.db, input);
		}),
	reportRuns: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return listContractorAccountingReportRuns(ctx.db, { take: 100 });
	}),
	reportSchedules: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return listContractorAccountingReportSchedules(ctx.db);
	}),
	taxProfiles: protectedProcedure.query(async ({ ctx }) => {
		await requireContractorAccountingViewer(ctx);
		return listContractorTaxProfiles(ctx.db);
	}),
	myStatement: protectedProcedure
		.input(getContractorStatementReportSchema)
		.query(async ({ ctx, input }) => {
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return getContractorLedgerPeriodReport(ctx, {
				...input,
				contractorIds: [ctx.userId],
			});
		}),
	createAdjustment: protectedProcedure
		.input(createContractorAdjustmentSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			try {
				const sourceId = randomUUID();
				const liabilityDeltaCents = getContractorLiabilityDeltaCents(
					input.type,
					input.amount,
				);
				return await postContractorLedgerEntry(ctx.db, {
					contractorId: input.contractorId,
					type: input.type,
					amount: input.amount,
					liabilityDelta: formatMoneyCents(liabilityDeltaCents),
					effectiveAt: dateAtStartInTimezone(
						input.effectiveDate,
						input.timezone,
					),
					sourceType: "MANUAL_ADJUSTMENT",
					sourceId,
					sourceKey: `MANUAL_ADJUSTMENT:${sourceId}`,
					description: input.description,
					jobId: input.jobId,
					createdById: ctx.userId,
					evidence: input.evidence,
				});
			} catch (error) {
				throw asTrpcError(error);
			}
		}),
	reverseEntry: protectedProcedure
		.input(reverseContractorLedgerEntrySchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			try {
				return await reverseContractorLedgerEntry(ctx.db, {
					entryId: input.entryId,
					effectiveAt: dateAtStartInTimezone(
						input.effectiveDate,
						input.timezone,
					),
					reason: input.reason,
					actorId: ctx.userId,
				});
			} catch (error) {
				throw asTrpcError(error);
			}
		}),
	closePeriod: protectedProcedure
		.input(closeContractorAccountingPeriodSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			const readiness = await getContractorCloseReadiness(ctx, {
				...input,
				includeEntries: false,
			});
			if (!readiness.ready) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `Period close has ${readiness.blockerCount} blocking readiness check(s).`,
				});
			}
			const report = await getContractorLedgerPeriodReport(ctx, {
				...input,
				includeEntries: false,
			});
			const snapshot = {
				period: report.period,
				summary: report.summary,
				dataQuality: report.dataQuality,
			};
			const snapshotHash = createHash("sha256")
				.update(JSON.stringify(snapshot))
				.digest("hex");
			try {
				return await closeContractorAccountingPeriod(ctx.db, {
					from: new Date(report.period.from),
					toExclusive: new Date(report.period.toExclusive),
					timezone: report.period.timezone,
					closingBalance: formatMoneyCents(report.summary.closingBalanceCents),
					snapshot,
					snapshotHash,
					actorId: ctx.userId,
				});
			} catch (error) {
				throw asTrpcError(error);
			}
		}),
	reopenPeriod: protectedProcedure
		.input(reopenContractorAccountingPeriodSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingSuperAdmin(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			try {
				return await reopenContractorAccountingPeriod(ctx.db, {
					periodId: input.periodId,
					actorId: ctx.userId,
					reason: input.reason,
				});
			} catch (error) {
				throw asTrpcError(error);
			}
		}),
	runReconciliation: protectedProcedure
		.input(runContractorReconciliationSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return reconcileContractorLedgerPeriod(ctx, input, ctx.userId);
		}),
	reviewIssue: protectedProcedure
		.input(reviewContractorReconciliationIssueSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return reviewContractorReconciliationIssue(ctx.db, {
				...input,
				actorId: ctx.userId,
			});
		}),
	startResolution: protectedProcedure
		.input(startContractorResolutionSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			return startContractorIssueResolution(ctx, input);
		}),
	resolveIssue: protectedProcedure
		.input(resolveContractorResolutionSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			return resolveContractorIssue(ctx, input);
		}),
	createPayoutRun: protectedProcedure
		.input(createContractorPayoutRunSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			const payables = await getContractorPayables(ctx, {
				...input,
				contractorIds: [input.contractorId],
				includeEntries: false,
			});
			const payable = payables.data[0];
			if (!payable || payable.readiness !== "READY") {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "This contractor is not ready for payout.",
				});
			}
			if (input.jobIds.some((id) => !payable.jobIds.includes(id))) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: "One or more selected jobs are no longer payable.",
				});
			}
			const snapshot = {
				period: payables.period,
				payable,
				jobIds: [...input.jobIds].sort((left, right) => left - right),
			};
			return createContractorPayoutRun(ctx.db, {
				contractorId: input.contractorId,
				jobIds: input.jobIds,
				filters: input,
				proposedAmount: formatMoneyCents(payable.payableBalanceCents),
				snapshot,
				snapshotHash: createHash("sha256")
					.update(JSON.stringify(snapshot))
					.digest("hex"),
				note: input.note,
				createdById: ctx.userId,
			});
		}),
	updatePayoutRun: protectedProcedure
		.input(updateContractorPayoutRunSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			try {
				return await updateContractorPayoutRunStatus(ctx.db, {
					...input,
					actorId: ctx.userId,
				});
			} catch (error) {
				throw asTrpcError(error);
			}
		}),
	createAlertRule: protectedProcedure
		.input(createContractorAccountingAlertRuleSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return createContractorAccountingAlertRule(ctx.db, {
				...input,
				recipients: input.recipients,
				createdById: ctx.userId,
			});
		}),
	updateAlertRule: protectedProcedure
		.input(updateContractorAccountingAlertRuleSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			return updateContractorAccountingAlertRule(ctx.db, {
				...input,
				recipients: input.recipients,
			});
		}),
	updateAlertEvent: protectedProcedure
		.input(updateContractorAccountingAlertEventSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return updateContractorAccountingAlertEventStatus(ctx.db, {
				...input,
				actorId: ctx.userId,
			});
		}),
	generateReport: protectedProcedure
		.input(generateContractorAccountingReportSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingViewer(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			const run = await createContractorAccountingReportRun(ctx.db, {
				kind: input.kind,
				format: input.format,
				contractorId: input.contractorId,
				filters: input,
				requestedById: ctx.userId,
			});
			const task = await tasks.trigger(
				"generate-contractor-accounting-report",
				{
					runId: run.id,
				},
			);
			return { run, taskId: task.id };
		}),
	createReportSchedule: protectedProcedure
		.input(createContractorReportScheduleSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
			return createContractorAccountingReportSchedule(ctx.db, {
				...input,
				recipients: input.recipients,
				createdById: ctx.userId,
			});
		}),
	updateTaxProfile: protectedProcedure
		.input(updateContractorTaxProfileSchema)
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingManager(ctx);
			return upsertContractorTaxProfile(ctx.db, input);
		}),
	backfillLedger: protectedProcedure
		.input(z.object({ dryRun: z.boolean().default(true) }))
		.mutation(async ({ ctx, input }) => {
			await requireContractorAccountingSuperAdmin(ctx);
			return backfillContractorLedgerFromLegacy(ctx.db, {
				dryRun: input.dryRun,
				requestedById: ctx.userId,
			});
		}),
});
