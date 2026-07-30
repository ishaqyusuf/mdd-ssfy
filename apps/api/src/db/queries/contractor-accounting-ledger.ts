import { getContractorPeriodReport } from "@api/db/queries/contractor-accounting";
import type { GetContractorPeriodReportSchema } from "@api/schemas/contractor-accounting";
import type { TRPCContext } from "@api/trpc/init";
import {
	type ContractorAccountingEntry,
	buildContractorPeriodReport,
	createDateOnlyReportPeriod,
	moneyToCents,
	reconcileContractorPeriodReports,
} from "@gnd/contractor-accounting";
import {
	getContractorLedgerEntriesThrough,
	recordContractorReconciliationRun,
} from "@gnd/db/queries";

export async function getContractorLedgerPeriodReport(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema,
) {
	const period = createDateOnlyReportPeriod(input);
	const { entries, contractors } = await getContractorLedgerEntriesThrough(
		ctx.db,
		{
			toExclusive: new Date(period.toExclusive),
			contractorIds: input.contractorIds,
		},
	);
	const exceptionEntryIds = input.exceptionsOnly
		? new Set(
				(
					await ctx.db.contractorReconciliationIssue.findMany({
						where: { status: "OPEN", ledgerEntryId: { not: null } },
						select: { ledgerEntryId: true },
						take: 10_000,
					})
				).flatMap((issue) =>
					issue.ledgerEntryId ? [issue.ledgerEntryId] : [],
				),
			)
		: null;
	const query = input.q?.trim().toLowerCase();
	const reportEntries: ContractorAccountingEntry[] = entries
		.filter((entry) => {
			if (input.entryTypes?.length && !input.entryTypes.includes(entry.type)) {
				return false;
			}
			if (
				input.sourceTypes?.length &&
				!input.sourceTypes.includes(entry.sourceType)
			) {
				return false;
			}
			const amount = entry.amount.toNumber();
			if (input.amountMin != null && amount < input.amountMin) return false;
			if (input.amountMax != null && amount > input.amountMax) return false;
			if (exceptionEntryIds && !exceptionEntryIds.has(entry.id)) return false;
			if (!query) return true;
			const contractorName =
				contractors.get(entry.contractorId)?.name ||
				`Contractor #${entry.contractorId}`;
			return [
				contractorName,
				entry.description,
				entry.sourceId,
				entry.sourceKey,
			].some((value) => value?.toLowerCase().includes(query));
		})
		.map((entry) => ({
			id: entry.id,
			contractorId: entry.contractorId,
			contractorName:
				contractors.get(entry.contractorId)?.name ||
				`Contractor #${entry.contractorId}`,
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
		}));
	const report = buildContractorPeriodReport({
		period,
		entries: reportEntries,
		contractorIds: input.contractorIds,
	});
	const result = {
		...report,
		generatedAt: new Date().toISOString(),
		dataQuality: {
			source: "contractor-ledger" as const,
			legacyJobDateFallbackCount: entries.filter((entry) => {
				if (entry.sourceType !== "JOB") return false;
				if (!entry.meta || typeof entry.meta !== "object") return false;
				return (
					!Array.isArray(entry.meta) &&
					"legacyDateFallback" in entry.meta &&
					entry.meta.legacyDateFallback === true
				);
			}).length,
			missingContractorNameCount: report.contractors.filter((contractor) =>
				contractor.contractorName.startsWith("Contractor #"),
			).length,
			missingPayoutDateCount: 0,
			cancelledPayoutCount: new Set(
				entries
					.filter(
						(entry) => entry.type === "REVERSAL" && entry.paymentId != null,
					)
					.map((entry) => entry.paymentId),
			).size,
			reconciliationDifferenceCents:
				report.summary.closingBalanceCents -
				report.contractors.reduce(
					(total, contractor) => total + contractor.closingBalanceCents,
					0,
				),
		},
	};
	return input.includeEntries ? result : { ...result, entries: [] };
}

export async function reconcileContractorLedgerPeriod(
	ctx: TRPCContext,
	input: Omit<GetContractorPeriodReportSchema, "includeEntries">,
	actorId: number,
) {
	const query = { ...input, includeEntries: true };
	const [legacy, ledger] = await Promise.all([
		getContractorPeriodReport(ctx, query),
		getContractorLedgerPeriodReport(ctx, query),
	]);
	const reconciliation = reconcileContractorPeriodReports(legacy, ledger);
	const period = createDateOnlyReportPeriod(input);
	const run = await recordContractorReconciliationRun(ctx.db, {
		from: new Date(period.from),
		toExclusive: new Date(period.toExclusive),
		timezone: period.timezone,
		requestedById: actorId,
		sourceTotals: legacy.summary,
		ledgerTotals: ledger.summary,
		issues: reconciliation.differences.map((difference) => ({
			code: difference.code,
			contractorId: difference.contractorId,
			message:
				difference.contractorId == null
					? "Legacy and ledger period closing totals do not match."
					: `Legacy and ledger closing totals do not match for contractor #${difference.contractorId}.`,
			expectedAmount: String(difference.expectedCents / 100),
			actualAmount: String(difference.actualCents / 100),
			differenceAmount: String(difference.differenceCents / 100),
			evidence: {
				expectedCents: difference.expectedCents,
				actualCents: difference.actualCents,
				differenceCents: difference.differenceCents,
			},
		})),
	});
	return {
		run,
		matches: reconciliation.matches,
		differences: reconciliation.differences,
		legacySummary: legacy.summary,
		ledgerSummary: ledger.summary,
	};
}

export function serializeContractorLedgerEntry<
	T extends {
		amount: { toString(): string };
		liabilityDelta: { toString(): string };
		balanceAfter?: { toString(): string } | null;
	},
>(entry: T) {
	return {
		...entry,
		amountCents: moneyToCents(entry.amount),
		liabilityDeltaCents: moneyToCents(entry.liabilityDelta),
		balanceAfterCents:
			entry.balanceAfter == null ? null : moneyToCents(entry.balanceAfter),
	};
}
