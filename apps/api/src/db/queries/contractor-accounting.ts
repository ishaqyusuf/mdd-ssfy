import type { TRPCContext } from "@api/trpc/init";
import {
	type ContractorAccountingEntry,
	type ContractorAccountingEntryType,
	buildContractorPeriodReport,
	createDateOnlyReportPeriod,
} from "@gnd/contractor-accounting";
import type { Prisma } from "@gnd/db";
import z from "zod";

const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD");

export const getContractorPeriodReportSchema = z.object({
	from: dateOnlySchema,
	to: dateOnlySchema,
	timezone: z.string().trim().min(1).default("America/New_York"),
	contractorIds: z.array(z.number().int().positive()).max(100).optional(),
	includeEntries: z.boolean().default(false),
});
export const contractorAccountingPrintTokenSchema =
	getContractorPeriodReportSchema.omit({
		includeEntries: true,
	});

export type GetContractorPeriodReportSchema = z.infer<
	typeof getContractorPeriodReportSchema
>;

const earnedJobStatuses = [
	"Approved",
	"Completed",
	"Paid",
	"Payment Cancelled",
] as const;
const MAX_REPORT_JOBS = 50_000;
const MAX_REPORT_PAYOUTS = 25_000;
const MAX_ADJUSTMENTS_PER_PAYOUT = 100;

type PaymentMeta = {
	cancelledAt?: string | null;
};

function getPaymentMeta(meta: Prisma.JsonValue | null): PaymentMeta {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
	return meta as PaymentMeta;
}

function mapAdjustmentType(
	type: "BONUS" | "EXPENSE" | "DEDUCTION",
): ContractorAccountingEntryType {
	return type;
}

export async function getContractorPeriodReport(
	ctx: TRPCContext,
	input: GetContractorPeriodReportSchema,
) {
	const period = createDateOnlyReportPeriod(input);
	const from = new Date(period.from);
	const toExclusive = new Date(period.toExclusive);
	const contractorWhere = input.contractorIds?.length
		? { userId: { in: input.contractorIds } }
		: {};

	const [jobs, payments] = await Promise.all([
		ctx.db.jobs.findMany({
			where: {
				deletedAt: null,
				...contractorWhere,
				status: {
					in: [...earnedJobStatuses],
				},
				OR: [
					{
						approvedAt: {
							lt: toExclusive,
						},
					},
					{
						approvedAt: null,
						statusDate: {
							lt: toExclusive,
						},
					},
					{
						approvedAt: null,
						statusDate: null,
						createdAt: {
							lt: toExclusive,
						},
					},
				],
			},
			select: {
				id: true,
				userId: true,
				amount: true,
				status: true,
				title: true,
				description: true,
				createdAt: true,
				approvedAt: true,
				statusDate: true,
				user: {
					select: {
						id: true,
						name: true,
					},
				},
				project: {
					select: {
						id: true,
						title: true,
					},
				},
			},
			take: MAX_REPORT_JOBS + 1,
		}),
		ctx.db.jobPayments.findMany({
			where: {
				deletedAt: null,
				...contractorWhere,
				OR: [
					{
						createdAt: {
							lt: toExclusive,
						},
					},
					{ createdAt: null },
				],
			},
			select: {
				id: true,
				amount: true,
				subTotal: true,
				createdAt: true,
				meta: true,
				userId: true,
				user: {
					select: {
						id: true,
						name: true,
					},
				},
				adjustments: {
					where: {
						deletedAt: null,
					},
					select: {
						id: true,
						type: true,
						amount: true,
						description: true,
						createdAt: true,
					},
					take: MAX_ADJUSTMENTS_PER_PAYOUT + 1,
				},
			},
			take: MAX_REPORT_PAYOUTS + 1,
		}),
	]);

	if (jobs.length > MAX_REPORT_JOBS || payments.length > MAX_REPORT_PAYOUTS) {
		throw new Error(
			"Contractor accounting report is too large; use a contractor filter or a narrower end date.",
		);
	}
	if (
		payments.some(
			(payment) => payment.adjustments.length > MAX_ADJUSTMENTS_PER_PAYOUT,
		)
	) {
		throw new Error(
			"Contractor accounting report contains too many payout adjustments.",
		);
	}

	const entries: ContractorAccountingEntry[] = [];
	let legacyJobDateFallbackCount = 0;
	for (const job of jobs) {
		if (
			!earnedJobStatuses.includes(
				job.status as (typeof earnedJobStatuses)[number],
			)
		) {
			continue;
		}
		const effectiveAt = job.approvedAt ?? job.statusDate ?? job.createdAt;
		if (!effectiveAt) continue;
		if (
			!job.approvedAt &&
			effectiveAt.getTime() >= from.getTime() &&
			effectiveAt.getTime() < toExclusive.getTime()
		) {
			legacyJobDateFallbackCount += 1;
		}
		entries.push({
			id: `job:${job.id}:earned`,
			contractorId: job.userId,
			contractorName: job.user?.name || "Unknown contractor",
			type: "JOB_EARNED",
			amount: job.amount,
			effectiveAt,
			description: job.description || job.title || `Job #${job.id}`,
			jobId: job.id,
			projectId: job.project?.id || null,
			projectTitle: job.project?.title || null,
		});
	}

	let missingPayoutDateCount = 0;
	for (const payment of payments) {
		if (!payment.createdAt) {
			missingPayoutDateCount += 1;
			continue;
		}
		const contractorName = payment.user?.name || "Unknown contractor";
		for (const adjustment of payment.adjustments) {
			entries.push({
				id: `payment:${payment.id}:adjustment:${adjustment.id}`,
				contractorId: payment.userId,
				contractorName,
				type: mapAdjustmentType(adjustment.type),
				amount: adjustment.amount,
				effectiveAt: adjustment.createdAt ?? payment.createdAt,
				description: adjustment.description,
				paymentId: payment.id,
			});
		}
		entries.push({
			id: `payment:${payment.id}:payout`,
			contractorId: payment.userId,
			contractorName,
			type: "PAYOUT",
			amount: payment.amount,
			effectiveAt: payment.createdAt,
			description: `Contractor payout #${payment.id}`,
			paymentId: payment.id,
		});

		const cancelledAt = getPaymentMeta(payment.meta).cancelledAt;
		if (cancelledAt) {
			entries.push({
				id: `payment:${payment.id}:reversal`,
				contractorId: payment.userId,
				contractorName,
				type: "PAYOUT_REVERSAL",
				amount: payment.subTotal || payment.amount,
				effectiveAt: cancelledAt,
				description: `Cancelled contractor payout #${payment.id}`,
				paymentId: payment.id,
			});
		}
	}

	const report = buildContractorPeriodReport({
		period,
		entries,
		contractorIds: input.contractorIds,
	});
	const result = {
		...report,
		generatedAt: new Date().toISOString(),
		dataQuality: {
			source: "legacy-jobs-and-payouts" as const,
			legacyJobDateFallbackCount,
			missingContractorNameCount: new Set(
				report.entries
					.filter((entry) => entry.contractorName === "Unknown contractor")
					.map((entry) => entry.contractorId),
			).size,
			missingPayoutDateCount,
			cancelledPayoutCount: new Set(
				report.entries
					.filter((entry) => entry.type === "PAYOUT_REVERSAL")
					.map((entry) => entry.paymentId)
					.filter((paymentId) => paymentId != null),
			).size,
			reconciliationDifferenceCents:
				report.summary.closingBalanceCents -
				report.contractors.reduce(
					(sum, contractor) => sum + contractor.closingBalanceCents,
					0,
				),
		},
	};
	return input.includeEntries ? result : { ...result, entries: [] };
}
