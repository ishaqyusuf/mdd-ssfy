import { createHash } from "node:crypto";
import {
	type ContractorAccountingEntry,
	type ContractorPeriodReport,
	buildContractorAging,
	buildContractorPeriodReport,
	createDateOnlyReportPeriod,
	formatMoneyCents,
	getContractorAdjustmentCents,
} from "@gnd/contractor-accounting";
import { type Prisma, db } from "@gnd/db";
import {
	getContractorLedgerEntriesThrough,
	listContractorTaxProfiles,
	updateContractorAccountingReportRun,
} from "@gnd/db/queries";
import { renderContractorAccountingPdfBuffer } from "@gnd/pdf";
import { getRecipient, shouldSkipEmail } from "@gnd/utils/envs";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import xlsx from "node-xlsx";
import { Resend } from "resend";
import { z } from "zod";
import {
	type TaskName,
	generateContractorAccountingReportSchemaTask,
} from "../../schema";

const reportFiltersSchema = z.object({
	from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	timezone: z.string().min(1),
	q: z.string().trim().optional().nullable(),
	contractorId: z.number().int().positive().optional().nullable(),
	contractorIds: z.array(z.number().int().positive()).optional().nullable(),
	entryTypes: z.array(z.string()).optional().nullable(),
	sourceTypes: z.array(z.string()).optional().nullable(),
	amountMin: z.number().nonnegative().optional().nullable(),
	amountMax: z.number().nonnegative().optional().nullable(),
	exceptionsOnly: z.boolean().optional().nullable(),
});

type ExportCell = string | number | boolean | Date | null;
type ExportSheet = { name: string; rows: ExportCell[][] };

function money(cents: number) {
	return Number(formatMoneyCents(cents));
}

function entryMatchesFilters(
	entry: {
		type: string;
		sourceType: string;
		amount: Prisma.Decimal;
		description: string | null;
		sourceId: string;
		sourceKey: string;
		contractorId: number;
	},
	contractorName: string,
	filters: z.infer<typeof reportFiltersSchema>,
) {
	if (filters.entryTypes?.length && !filters.entryTypes.includes(entry.type)) {
		return false;
	}
	if (
		filters.sourceTypes?.length &&
		!filters.sourceTypes.includes(entry.sourceType)
	) {
		return false;
	}
	const amount = entry.amount.toNumber();
	if (filters.amountMin != null && amount < filters.amountMin) return false;
	if (filters.amountMax != null && amount > filters.amountMax) return false;
	const q = filters.q?.toLowerCase();
	if (
		q &&
		![contractorName, entry.description, entry.sourceId, entry.sourceKey].some(
			(value) => value?.toLowerCase().includes(q),
		)
	) {
		return false;
	}
	return true;
}

export async function loadContractorAccountingReportForArtifact(
	filters: z.infer<typeof reportFiltersSchema>,
): Promise<ContractorPeriodReport> {
	const period = createDateOnlyReportPeriod(filters);
	const contractorIds = [
		...new Set([
			...(filters.contractorIds ?? []),
			...(filters.contractorId ? [filters.contractorId] : []),
		]),
	];
	const source = await getContractorLedgerEntriesThrough(db, {
		toExclusive: new Date(period.toExclusive),
		contractorIds: contractorIds.length ? contractorIds : undefined,
	});
	const entries: ContractorAccountingEntry[] = source.entries
		.filter((entry) => {
			const contractorName =
				source.contractors.get(entry.contractorId)?.name ||
				`Contractor #${entry.contractorId}`;
			return entryMatchesFilters(entry, contractorName, filters);
		})
		.map((entry) => ({
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
		}));
	return buildContractorPeriodReport({
		period,
		entries,
		contractorIds: contractorIds.length ? contractorIds : undefined,
	});
}

export function consolidatedSheets(
	report: ContractorPeriodReport,
): ExportSheet[] {
	return [
		{
			name: "Summary",
			rows: [
				["Metric", "Amount"],
				["Opening balance", money(report.summary.openingBalanceCents)],
				["Earned", money(report.summary.earnedCents)],
				["Bonuses", money(report.summary.bonusCents)],
				["Expenses", money(report.summary.expenseCents)],
				["Deductions", money(report.summary.deductionCents)],
				["Payouts", money(report.summary.payoutCents)],
				["Reversals", money(report.summary.reversalCents)],
				["Closing balance", money(report.summary.closingBalanceCents)],
			],
		},
		{
			name: "Contractors",
			rows: [
				[
					"Contractor",
					"Opening",
					"Earned",
					"Adjustments",
					"Paid",
					"Reversals",
					"Closing",
				],
				...report.contractors.map((contractor) => [
					contractor.contractorName,
					money(contractor.openingBalanceCents),
					money(contractor.earnedCents),
					money(getContractorAdjustmentCents(contractor)),
					money(contractor.payoutCents),
					money(contractor.reversalCents),
					money(contractor.closingBalanceCents),
				]),
			],
		},
		{
			name: "Ledger",
			rows: ledgerRows(report),
		},
	];
}

export function ledgerRows(report: ContractorPeriodReport): ExportCell[][] {
	return [
		[
			"Effective date",
			"Contractor",
			"Type",
			"Description",
			"Amount",
			"Balance effect",
			"Job",
			"Payment",
		],
		...report.entries.map((entry) => [
			new Date(entry.effectiveAt).toISOString(),
			entry.contractorName,
			entry.type,
			entry.description || "",
			money(entry.amountCents),
			money(entry.signedAmountCents),
			entry.jobId ?? "",
			entry.paymentId ?? "",
		]),
	];
}

export function agingSheets(report: ContractorPeriodReport): ExportSheet[] {
	const asOf = new Date(new Date(report.period.toExclusive).getTime() - 1);
	return [
		{
			name: "Aging",
			rows: [
				[
					"Contractor",
					"Current",
					"1–30 days",
					"31–60 days",
					"61–90 days",
					"Over 90 days",
					"Total",
				],
				...report.contractors.map((contractor) => {
					const aging = buildContractorAging(
						report.entries.filter(
							(entry) => entry.contractorId === contractor.contractorId,
						),
						asOf,
					);
					return [
						contractor.contractorName,
						money(aging.currentCents),
						money(aging.days1To30Cents),
						money(aging.days31To60Cents),
						money(aging.days61To90Cents),
						money(aging.over90DaysCents),
						money(aging.totalCents),
					];
				}),
			],
		},
	];
}

async function reconciliationSheets(
	report: ContractorPeriodReport,
): Promise<ExportSheet[]> {
	const issues = await db.contractorReconciliationIssue.findMany({
		where: {
			run: {
				from: { lt: new Date(report.period.toExclusive) },
				toExclusive: { gt: new Date(report.period.from) },
			},
		},
		include: {
			run: { select: { from: true, toExclusive: true, status: true } },
		},
		orderBy: { createdAt: "desc" },
		take: 10_000,
	});
	return [
		{
			name: "Reconciliation",
			rows: [
				[
					"Status",
					"Code",
					"Contractor ID",
					"Message",
					"Expected",
					"Actual",
					"Difference",
					"Period start",
					"Period end",
				],
				...issues.map((issue) => [
					issue.status,
					issue.code,
					issue.contractorId ?? "",
					issue.message,
					issue.expectedAmount?.toNumber() ?? "",
					issue.actualAmount?.toNumber() ?? "",
					issue.differenceAmount?.toNumber() ?? "",
					issue.run.from.toISOString(),
					issue.run.toExclusive.toISOString(),
				]),
			],
		},
	];
}

async function taxReadinessSheets(
	report: ContractorPeriodReport,
): Promise<ExportSheet[]> {
	const profiles = await listContractorTaxProfiles(db);
	const profileByContractor = new Map(
		profiles.map((profile) => [profile.contractorId, profile]),
	);
	return [
		{
			name: "Tax readiness",
			rows: [
				[
					"Contractor",
					"Legal name",
					"Classification",
					"W-9 status",
					"TIN last four",
					"Paid in period",
					"Needs review",
				],
				...report.contractors.map((contractor) => {
					const profile = profileByContractor.get(contractor.contractorId);
					const paidCents = contractor.payoutCents - contractor.reversalCents;
					return [
						contractor.contractorName,
						profile?.legalName || "",
						profile?.taxClassification || "",
						profile?.w9Status || "NOT_REQUESTED",
						profile?.tinLastFour || "",
						money(paidCents),
						!profile || profile.w9Status !== "VERIFIED" ? "Yes" : "No",
					];
				}),
			],
		},
	];
}

export async function sheetsForKind(
	kind: string,
	report: ContractorPeriodReport,
): Promise<ExportSheet[]> {
	switch (kind) {
		case "CONTRACTOR_STATEMENT":
			return [
				{
					name: "Statement",
					rows: consolidatedSheets(report)[0]?.rows ?? [],
				},
				{ name: "Ledger", rows: ledgerRows(report) },
			];
		case "AGING":
			return agingSheets(report);
		case "RECONCILIATION":
			return reconciliationSheets(report);
		case "ADJUSTMENT_REGISTER":
			return [
				{
					name: "Adjustments",
					rows: ledgerRows({
						...report,
						entries: report.entries.filter((entry) =>
							["BONUS", "EXPENSE", "DEDUCTION", "REVERSAL"].includes(
								entry.type,
							),
						),
					}),
				},
			];
		case "TAX_READINESS":
			return taxReadinessSheets(report);
		default:
			return consolidatedSheets(report);
	}
}

function csvCell(value: ExportCell) {
	const text =
		value instanceof Date
			? value.toISOString()
			: value == null
				? ""
				: String(value);
	return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(sheet: ExportSheet) {
	return Buffer.from(
		sheet.rows.map((row) => row.map(csvCell).join(",")).join("\n"),
		"utf8",
	);
}

export function buildXlsx(sheets: ExportSheet[]) {
	return xlsx.build(
		sheets.map((sheet) => ({
			name: sheet.name.slice(0, 31),
			data: sheet.rows,
			options: {},
		})),
	);
}

function reportFileStem(
	kind: string,
	filters: z.infer<typeof reportFiltersSchema>,
) {
	return `contractor-${kind.toLowerCase().replaceAll("_", "-")}-${filters.from}-to-${filters.to}`;
}

async function deliverScheduledReport(input: {
	schedule: { name: string; recipients: Prisma.JsonValue } | null;
	url: string;
	kind: string;
	from: string;
	to: string;
}) {
	if (!input.schedule || shouldSkipEmail()) return { sent: 0 };
	const recipients = Array.isArray(input.schedule.recipients)
		? input.schedule.recipients.filter(
				(value): value is string => typeof value === "string",
			)
		: [];
	if (!recipients.length) return { sent: 0 };
	const apiKey = process.env.RESEND_API_KEY;
	if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
	const resend = new Resend(apiKey);
	let sent = 0;
	for (const recipient of recipients) {
		const response = await resend.emails.send({
			from: "GND Millwork <noreply@gndprodesk.com>",
			to: getRecipient(recipient),
			subject: `${input.schedule.name} — ${input.from} to ${input.to}`,
			html: [
				"<p>Your scheduled contractor accounting report is ready.</p>",
				`<p><strong>${input.kind.replaceAll("_", " ")}</strong><br />${input.from} through ${input.to}</p>`,
				`<p><a href="${input.url}">Download the report</a></p>`,
			].join(""),
			headers: { "X-Entity-Ref-ID": nanoid() },
		});
		if (response.error) {
			throw new Error(
				`Scheduled contractor report email failed for ${recipient}.`,
			);
		}
		sent += 1;
	}
	return { sent };
}

export const generateContractorAccountingReport = schemaTask({
	id: "generate-contractor-accounting-report" as TaskName,
	schema: generateContractorAccountingReportSchemaTask,
	maxDuration: 300,
	queue: { concurrencyLimit: 2 },
	run: async ({ runId }) => {
		const run = await db.contractorAccountingReportRun.findUnique({
			where: { id: runId },
			include: {
				schedule: { select: { name: true, recipients: true } },
			},
		});
		if (!run)
			throw new Error("Contractor accounting report run was not found.");
		try {
			await updateContractorAccountingReportRun(db, {
				id: run.id,
				status: "RUNNING",
			});
			const filters = reportFiltersSchema.parse(run.filters);
			const report = await loadContractorAccountingReportForArtifact(filters);
			const sheets = await sheetsForKind(run.kind, report);
			const fileStem = reportFileStem(run.kind, filters);
			let buffer: Buffer;
			let extension: string;
			let contentType: string;
			if (run.format === "PDF") {
				buffer = Buffer.from(
					await renderContractorAccountingPdfBuffer(report, {
						baseUrl: process.env.NEXT_PUBLIC_APP_URL,
					}),
				);
				extension = "pdf";
				contentType = "application/pdf";
			} else if (run.format === "CSV") {
				buffer = buildCsv(sheets[0] ?? { name: "Report", rows: [] });
				extension = "csv";
				contentType = "text/csv; charset=utf-8";
			} else {
				buffer = buildXlsx(sheets);
				extension = "xlsx";
				contentType =
					"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			}
			const contentHash = createHash("sha256").update(buffer).digest("hex");
			const artifact = await put(`${fileStem}.${extension}`, buffer, {
				access: "public",
				addRandomSuffix: true,
				contentType,
			});
			const delivery = await deliverScheduledReport({
				schedule: run.schedule,
				url: artifact.url,
				kind: run.kind,
				from: filters.from,
				to: filters.to,
			});
			await updateContractorAccountingReportRun(db, {
				id: run.id,
				status: "COMPLETED",
				outputUrl: artifact.url,
				contentHash,
				totals: report.summary,
			});
			return {
				runId: run.id,
				url: artifact.url,
				contentHash,
				rowCount: sheets.reduce(
					(total, sheet) => total + Math.max(sheet.rows.length - 1, 0),
					0,
				),
				deliveredTo: delivery.sent,
			};
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Report generation failed.";
			logger.error("Contractor accounting report generation failed", {
				runId,
				error: message,
			});
			await updateContractorAccountingReportRun(db, {
				id: run.id,
				status: "FAILED",
				error: message,
			});
			throw error;
		}
	},
});
