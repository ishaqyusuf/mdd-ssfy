import { z } from "zod";

export const contractorLedgerEntryTypeSchema = z.enum([
	"OPENING_BALANCE",
	"JOB_EARNED",
	"BONUS",
	"EXPENSE",
	"DEDUCTION",
	"PAYOUT",
	"REVERSAL",
]);

export const contractorLedgerSourceTypeSchema = z.enum([
	"JOB",
	"PAYMENT",
	"PAYMENT_ADJUSTMENT",
	"MANUAL_ADJUSTMENT",
	"OPENING_BALANCE",
	"MIGRATION",
]);

export const contractorAccountingReportKindSchema = z.enum([
	"CONSOLIDATED",
	"CONTRACTOR_STATEMENT",
	"AGING",
	"RECONCILIATION",
	"ADJUSTMENT_REGISTER",
	"TAX_READINESS",
]);

export const contractorAccountingReportFormatSchema = z.enum([
	"PDF",
	"XLSX",
	"CSV",
]);

const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD")
	.refine((value) => {
		const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
		if (!match) return false;
		const year = Number(match[1]);
		const month = Number(match[2]);
		const day = Number(match[3]);
		const date = new Date(Date.UTC(year, month - 1, day));
		return (
			date.getUTCFullYear() === year &&
			date.getUTCMonth() === month - 1 &&
			date.getUTCDate() === day
		);
	}, "Date must be a valid calendar date");

const timezoneSchema = z
	.string()
	.trim()
	.min(1)
	.refine((timezone) => {
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
			return true;
		} catch {
			return false;
		}
	}, "Timezone must be a valid IANA timezone")
	.default("America/New_York");

const contractorAccountingBasePeriodSchema = z.object({
	from: dateOnlySchema,
	to: dateOnlySchema,
	timezone: timezoneSchema,
});

const contractorAccountingPeriodSchema =
	contractorAccountingBasePeriodSchema.extend({
		contractorIds: z.array(z.number().int().positive()).max(100).optional(),
	});

function validatePeriodOrder(
	value: { from: string; to: string },
	ctx: z.RefinementCtx,
) {
	if (value.to < value.from) {
		ctx.addIssue({
			code: "custom",
			path: ["to"],
			message: "Report period end must be on or after its start",
		});
	}
}

const contractorAccountingFilterFields = {
	q: z.string().trim().max(191).optional(),
	entryTypes: z.array(contractorLedgerEntryTypeSchema).max(20).optional(),
	sourceTypes: z.array(contractorLedgerSourceTypeSchema).max(20).optional(),
	amountMin: z.coerce.number().nonnegative().optional(),
	amountMax: z.coerce.number().nonnegative().optional(),
	exceptionsOnly: z.boolean().optional(),
};

function validateFilterBounds(
	value: { amountMin?: number; amountMax?: number },
	ctx: z.RefinementCtx,
) {
	if (
		value.amountMin != null &&
		value.amountMax != null &&
		value.amountMax < value.amountMin
	) {
		ctx.addIssue({
			code: "custom",
			path: ["amountMax"],
			message: "Maximum amount must be at least the minimum amount",
		});
	}
}

export const getContractorPeriodReportSchema = contractorAccountingPeriodSchema
	.extend({
		includeEntries: z.boolean().default(false),
		...contractorAccountingFilterFields,
	})
	.superRefine((value, ctx) => {
		validatePeriodOrder(value, ctx);
		validateFilterBounds(value, ctx);
	});

export const getContractorStatementReportSchema =
	contractorAccountingBasePeriodSchema
		.extend({
			includeEntries: z.boolean().default(true),
			...contractorAccountingFilterFields,
		})
		.superRefine((value, ctx) => {
			validatePeriodOrder(value, ctx);
			validateFilterBounds(value, ctx);
		});

export const contractorAccountingPrintTokenSchema =
	contractorAccountingPeriodSchema.superRefine(validatePeriodOrder);

export const listContractorLedgerEntriesSchema =
	contractorAccountingPeriodSchema
		.extend({
			q: z.string().trim().max(191).optional(),
			entryTypes: z.array(contractorLedgerEntryTypeSchema).max(20).optional(),
			sourceTypes: z.array(contractorLedgerSourceTypeSchema).max(20).optional(),
			amountMin: z.coerce.number().nonnegative().optional(),
			amountMax: z.coerce.number().nonnegative().optional(),
			exceptionsOnly: z.boolean().optional(),
			cursor: z.string().min(1).optional(),
			pageSize: z.number().int().min(1).max(100).default(50),
			sortDirection: z.enum(["asc", "desc"]).default("desc"),
		})
		.superRefine((value, ctx) => {
			validatePeriodOrder(value, ctx);
			if (
				value.amountMin != null &&
				value.amountMax != null &&
				value.amountMax < value.amountMin
			) {
				ctx.addIssue({
					code: "custom",
					path: ["amountMax"],
					message: "Maximum amount must be at least the minimum amount",
				});
			}
		});

export const getContractorLedgerEntrySchema = z.object({
	id: z.string().min(1),
});

const positiveMoneySchema = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d{1,2})?$/, "Amount must have at most two decimals")
	.refine((value) => Number(value) > 0, "Amount must be greater than zero");

export const createContractorAdjustmentSchema = z.object({
	contractorId: z.number().int().positive(),
	type: z.enum(["BONUS", "EXPENSE", "DEDUCTION"]),
	amount: positiveMoneySchema,
	effectiveDate: dateOnlySchema,
	timezone: timezoneSchema,
	description: z.string().trim().min(3).max(2000),
	jobId: z.number().int().positive().optional(),
	evidence: z
		.array(
			z.object({
				name: z.string().trim().min(1).max(191),
				url: z.string().url(),
			}),
		)
		.max(10)
		.optional(),
});

export const reverseContractorLedgerEntrySchema = z.object({
	entryId: z.string().min(1),
	effectiveDate: dateOnlySchema,
	timezone: timezoneSchema,
	reason: z.string().trim().min(3).max(2000),
});

export const closeContractorAccountingPeriodSchema =
	contractorAccountingBasePeriodSchema.superRefine(validatePeriodOrder);

export const reopenContractorAccountingPeriodSchema = z.object({
	periodId: z.string().min(1),
	reason: z.string().trim().min(3).max(2000),
});

export const listContractorReconciliationIssuesSchema = z.object({
	statuses: z
		.array(z.enum(["OPEN", "REVIEWED", "RESOLVED"]))
		.max(3)
		.optional(),
	codes: z
		.array(
			z.enum([
				"SUMMARY_MISMATCH",
				"CONTRACTOR_MISMATCH",
				"MISSING_SOURCE",
				"DUPLICATE_SOURCE",
				"LEGACY_DATE_FALLBACK",
				"MISSING_EFFECTIVE_DATE",
			]),
		)
		.max(10)
		.optional(),
	contractorIds: z.array(z.number().int().positive()).max(100).optional(),
	cursor: z.string().min(1).optional(),
	pageSize: z.number().int().min(1).max(100).default(50),
});

export const reviewContractorReconciliationIssueSchema = z.object({
	id: z.string().min(1),
	status: z.enum(["REVIEWED", "RESOLVED"]),
	note: z.string().trim().min(3).max(2000),
});

export const runContractorReconciliationSchema =
	contractorAccountingPeriodSchema.superRefine(validatePeriodOrder);

export const generateContractorAccountingReportSchema =
	contractorAccountingPeriodSchema
		.extend({
			kind: contractorAccountingReportKindSchema,
			format: contractorAccountingReportFormatSchema,
			contractorId: z.number().int().positive().optional(),
			q: z.string().trim().max(191).optional(),
			entryTypes: z.array(contractorLedgerEntryTypeSchema).max(20).optional(),
			sourceTypes: z.array(contractorLedgerSourceTypeSchema).max(20).optional(),
			amountMin: z.coerce.number().nonnegative().optional(),
			amountMax: z.coerce.number().nonnegative().optional(),
			exceptionsOnly: z.boolean().optional(),
		})
		.superRefine((value, ctx) => {
			validatePeriodOrder(value, ctx);
			if (value.kind === "CONTRACTOR_STATEMENT" && value.contractorId == null) {
				ctx.addIssue({
					code: "custom",
					path: ["contractorId"],
					message: "Contractor statements require a contractor",
				});
			}
			if (
				value.format === "PDF" &&
				!["CONSOLIDATED", "CONTRACTOR_STATEMENT"].includes(value.kind)
			) {
				ctx.addIssue({
					code: "custom",
					path: ["format"],
					message:
						"PDF is available for consolidated reports and contractor statements",
				});
			}
			if (
				value.amountMin != null &&
				value.amountMax != null &&
				value.amountMax < value.amountMin
			) {
				ctx.addIssue({
					code: "custom",
					path: ["amountMax"],
					message: "Maximum amount must be at least the minimum amount",
				});
			}
		});

export const createContractorReportScheduleSchema = z
	.object({
		name: z.string().trim().min(3).max(191),
		kind: contractorAccountingReportKindSchema,
		format: contractorAccountingReportFormatSchema,
		cron: z
			.string()
			.trim()
			.refine(
				(value) =>
					value.split(/\s+/).length === 5 &&
					/^[\d*/?,A-Za-z-]+(?:\s+[\d*/?,A-Za-z-]+){4}$/.test(value),
				"Schedule must be a five-part cron expression",
			),
		timezone: timezoneSchema,
		filters: contractorAccountingPeriodSchema.extend({
			q: z.string().trim().max(191).optional(),
			entryTypes: z.array(contractorLedgerEntryTypeSchema).max(20).optional(),
			sourceTypes: z.array(contractorLedgerSourceTypeSchema).max(20).optional(),
			amountMin: z.coerce.number().nonnegative().optional(),
			amountMax: z.coerce.number().nonnegative().optional(),
			exceptionsOnly: z.boolean().optional(),
		}),
		recipients: z.array(z.string().email()).min(1).max(50),
	})
	.superRefine((value, ctx) => {
		validatePeriodOrder(value.filters, ctx);
		if (
			value.filters.amountMin != null &&
			value.filters.amountMax != null &&
			value.filters.amountMax < value.filters.amountMin
		) {
			ctx.addIssue({
				code: "custom",
				path: ["filters", "amountMax"],
				message: "Maximum amount must be at least the minimum amount",
			});
		}
		if (
			value.kind === "CONTRACTOR_STATEMENT" &&
			value.filters.contractorIds?.length !== 1
		) {
			ctx.addIssue({
				code: "custom",
				path: ["filters", "contractorIds"],
				message: "Scheduled contractor statements require one contractor",
			});
		}
	});

export const updateContractorTaxProfileSchema = z.object({
	contractorId: z.number().int().positive(),
	legalName: z.string().trim().max(191).nullable().optional(),
	taxClassification: z.string().trim().max(64).nullable().optional(),
	w9Status: z.enum([
		"NOT_REQUESTED",
		"REQUESTED",
		"RECEIVED",
		"VERIFIED",
		"EXPIRED",
	]),
	tinLastFour: z
		.string()
		.regex(/^\d{4}$/)
		.nullable()
		.optional(),
	documentId: z.string().trim().max(191).nullable().optional(),
	notes: z.string().trim().max(2000).nullable().optional(),
});

export const getContractorPayablesSchema = getContractorPeriodReportSchema;

export const getContractorAccountingProfileSchema =
	contractorAccountingBasePeriodSchema
		.extend({
			contractorId: z.number().int().positive(),
		})
		.superRefine(validatePeriodOrder);

export const getContractorResolutionIssueSchema = z.object({
	id: z.string().min(1),
});

export const startContractorResolutionSchema = z.object({
	id: z.string().min(1),
	note: z.string().trim().max(2000).optional(),
});

export const resolveContractorResolutionSchema = z.object({
	id: z.string().min(1),
	note: z.string().trim().min(3).max(2000),
	resolution: z.enum([
		"verified",
		"corrected_source",
		"accepted_legacy",
		"duplicate_record",
	]),
});

export const createContractorPayoutRunSchema =
	contractorAccountingBasePeriodSchema
		.extend({
			contractorId: z.number().int().positive(),
			jobIds: z.array(z.number().int().positive()).min(1).max(500),
			note: z.string().trim().max(2000).optional(),
		})
		.superRefine(validatePeriodOrder);

export const listContractorPayoutRunsSchema = z.object({
	statuses: z
		.array(z.enum(["DRAFT", "READY", "HANDED_OFF", "COMPLETED", "CANCELLED"]))
		.max(5)
		.optional(),
	contractorIds: z.array(z.number().int().positive()).max(100).optional(),
});

export const updateContractorPayoutRunSchema = z
	.object({
		id: z.string().min(1),
		status: z.enum(["READY", "HANDED_OFF", "COMPLETED", "CANCELLED"]),
		reason: z.string().trim().min(3).max(2000).optional(),
		paymentId: z.number().int().positive().optional(),
	})
	.superRefine((value, ctx) => {
		if (value.status === "CANCELLED" && !value.reason) {
			ctx.addIssue({
				code: "custom",
				path: ["reason"],
				message: "Cancellation reason is required",
			});
		}
		if (value.status === "COMPLETED" && value.paymentId == null) {
			ctx.addIssue({
				code: "custom",
				path: ["paymentId"],
				message: "Completed payout runs require a payment ID",
			});
		}
	});

export const contractorAccountingAlertKindSchema = z.enum([
	"BALANCE_THRESHOLD",
	"LIABILITY_AGE",
	"RECONCILIATION_STALE",
	"W9_BLOCKER",
	"PERIOD_CLOSE",
]);

export const createContractorAccountingAlertRuleSchema = z
	.object({
		name: z.string().trim().min(3).max(191),
		kind: contractorAccountingAlertKindSchema,
		contractorId: z.number().int().positive().optional(),
		thresholdAmount: positiveMoneySchema.optional(),
		thresholdDays: z.number().int().min(1).max(3650).optional(),
		timezone: timezoneSchema,
		recipients: z.array(z.string().email()).min(1).max(50),
	})
	.superRefine((value, ctx) => {
		if (value.kind === "BALANCE_THRESHOLD" && !value.thresholdAmount) {
			ctx.addIssue({
				code: "custom",
				path: ["thresholdAmount"],
				message: "Balance alerts require a threshold amount",
			});
		}
		if (value.kind === "LIABILITY_AGE" && value.thresholdDays == null) {
			ctx.addIssue({
				code: "custom",
				path: ["thresholdDays"],
				message: "Liability age alerts require a day threshold",
			});
		}
	});

export const updateContractorAccountingAlertRuleSchema = z.object({
	id: z.string().min(1),
	enabled: z.boolean().optional(),
	name: z.string().trim().min(3).max(191).optional(),
	thresholdAmount: positiveMoneySchema.nullable().optional(),
	thresholdDays: z.number().int().min(1).max(3650).nullable().optional(),
	recipients: z.array(z.string().email()).min(1).max(50).optional(),
});

export const listContractorAccountingAlertEventsSchema = z.object({
	statuses: z
		.array(z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]))
		.max(3)
		.optional(),
	contractorIds: z.array(z.number().int().positive()).max(100).optional(),
});

export const updateContractorAccountingAlertEventSchema = z.object({
	id: z.string().min(1),
	status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
});

export type GetContractorPeriodReportSchema = z.infer<
	typeof getContractorPeriodReportSchema
>;
