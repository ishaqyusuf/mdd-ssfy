import { z } from "zod";

const settingsTypeSchema = z.enum([
	"sales-settings",
	"install-price-chart",
	"app-download-apk",
	"jobs-settings",
	"unit-invoice-sweeper-settings",
	"task-events-settings",
]);

const settingsBaseShape = {
	id: z.number().optional(),
	type: settingsTypeSchema,
};

export const settingsSchema = z.object({
	...settingsBaseShape,
	meta: z.record(z.any(), z.any()).default({}),
});
export type SettingsSchema = z.infer<typeof settingsSchema>;

export const salesPrintSettingsSchema = z.object({
	templateId: z.enum(["template-1", "template-2"]).default("template-2"),
	pageBreakMode: z.enum(["header", "section", "fullHeader"]).default("header"),
	showImages: z.boolean().default(true),
	headlineFirstPage: z.boolean().default(true),
});

export type SalesPrintSettings = z.infer<typeof salesPrintSettingsSchema>;

export const DEFAULT_SALES_PRINT_SETTINGS: SalesPrintSettings = {
	templateId: "template-2",
	pageBreakMode: "header",
	showImages: true,
	headlineFirstPage: true,
};

export function normalizeSalesPrintSettings(
	value?: unknown,
): SalesPrintSettings {
	const parsed = salesPrintSettingsSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SALES_PRINT_SETTINGS;
}

export const salesOverviewGeneralVersionSchema = z.enum(["v1", "v2"]);

export const salesOverviewSuperAdminPreviewSchema = z.enum([
	"inherit",
	"v1",
	"v2",
]);

export const salesOverviewViewSettingsSchema = z.object({
	officeDefault: salesOverviewGeneralVersionSchema.default("v1"),
	superAdminPreview: salesOverviewSuperAdminPreviewSchema.default("v2"),
});

export type SalesOverviewGeneralVersion = z.infer<
	typeof salesOverviewGeneralVersionSchema
>;
export type SalesOverviewViewSettings = z.infer<
	typeof salesOverviewViewSettingsSchema
>;

export const DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS: SalesOverviewViewSettings = {
	officeDefault: "v1",
	superAdminPreview: "v2",
};

export function normalizeSalesOverviewViewSettings(
	value?: unknown,
): SalesOverviewViewSettings {
	const parsed = salesOverviewViewSettingsSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS;
}

export function resolveSalesOverviewGeneralVersion(input: {
	isSuperAdmin: boolean;
	settings?: unknown;
}): SalesOverviewGeneralVersion {
	const settings = normalizeSalesOverviewViewSettings(input.settings);
	if (!input.isSuperAdmin || settings.superAdminPreview === "inherit") {
		return settings.officeDefault;
	}
	return settings.superAdminPreview;
}

export const SALES_HANDOFF_TRIGGER_MODES = [
	"FULLY_PAID",
	"ANY_PAYMENT",
	"PAYMENT_PERCENTAGE",
] as const;

export const salesHandoffTriggerModeSchema = z.enum(
	SALES_HANDOFF_TRIGGER_MODES,
);

const salesHandoffTriggerBaseSchema = z.object({
	mode: salesHandoffTriggerModeSchema,
	percentage: z.number().int().min(1).max(100).nullable().default(null),
});

function requireSalesHandoffPercentage(
	value: { mode: string; percentage: number | null },
	ctx: z.RefinementCtx,
) {
	if (value.mode === "PAYMENT_PERCENTAGE" && value.percentage === null) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ["percentage"],
			message: "Enter a whole-number payment percentage from 1 through 100.",
		});
	}
}

export const salesHandoffTriggerInputSchema =
	salesHandoffTriggerBaseSchema.superRefine(requireSalesHandoffPercentage);

export type SalesHandoffTriggerInput = z.infer<
	typeof salesHandoffTriggerInputSchema
>;

export const salesHandoffTriggerPolicySchema = salesHandoffTriggerBaseSchema
	.extend({
		revision: z.number().int().min(0),
		changedAt: z.string().datetime().nullable(),
	})
	.superRefine(requireSalesHandoffPercentage);

export type SalesHandoffTriggerPolicy = z.infer<
	typeof salesHandoffTriggerPolicySchema
>;

export const DEFAULT_SALES_HANDOFF_TRIGGER_POLICY: SalesHandoffTriggerPolicy = {
	mode: "FULLY_PAID",
	percentage: null,
	revision: 0,
	changedAt: null,
};

export function normalizeSalesHandoffTriggerPolicy(
	value?: unknown,
): SalesHandoffTriggerPolicy {
	const parsed = salesHandoffTriggerPolicySchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SALES_HANDOFF_TRIGGER_POLICY;
}

export function normalizeSalesHandoffTriggerInput(
	value: SalesHandoffTriggerInput,
): SalesHandoffTriggerInput {
	return {
		mode: value.mode,
		percentage: value.mode === "PAYMENT_PERCENTAGE" ? value.percentage : null,
	};
}

export function isSameSalesHandoffTrigger(
	current: SalesHandoffTriggerPolicy,
	input: SalesHandoffTriggerInput,
) {
	const normalized = normalizeSalesHandoffTriggerInput(input);
	return (
		current.mode === normalized.mode &&
		current.percentage === normalized.percentage
	);
}

export function reviseSalesHandoffTriggerPolicy(input: {
	current?: unknown;
	next: SalesHandoffTriggerInput;
	changedAt: string;
}): { policy: SalesHandoffTriggerPolicy; changed: boolean } {
	const current = normalizeSalesHandoffTriggerPolicy(input.current);
	if (isSameSalesHandoffTrigger(current, input.next)) {
		return { policy: current, changed: false };
	}

	return {
		policy: {
			...normalizeSalesHandoffTriggerInput(input.next),
			revision: current.revision + 1,
			changedAt: input.changedAt,
		},
		changed: true,
	};
}

export const GUARDED_PACKING_REVIEW_MODES = [
	"BLOCK_DELIVERY_UNTIL_APPROVED",
	"ALLOW_DELIVERY_WHILE_PENDING",
] as const;

export const guardedPackingReviewModeSchema = z.enum(
	GUARDED_PACKING_REVIEW_MODES,
);

const guardedPackingPolicyBaseSchema = z.object({
	enabled: z.boolean(),
	allowAwaitingProductionSubmission: z.boolean(),
	allowPendingMaterialReview: z.boolean(),
	reviewMode: guardedPackingReviewModeSchema,
	notifySalesRep: z.boolean(),
	createProductionEvidenceOnApproval: z.boolean(),
});

export const guardedPackingPolicyInputSchema = guardedPackingPolicyBaseSchema;
export type GuardedPackingPolicyInput = z.infer<
	typeof guardedPackingPolicyInputSchema
>;

export const guardedPackingPolicySchema = guardedPackingPolicyBaseSchema.extend(
	{
		revision: z.number().int().min(0),
		changedAt: z.string().datetime().nullable(),
	},
);
export type GuardedPackingPolicy = z.infer<typeof guardedPackingPolicySchema>;

export const DEFAULT_GUARDED_PACKING_POLICY: GuardedPackingPolicy = {
	enabled: true,
	allowAwaitingProductionSubmission: true,
	allowPendingMaterialReview: true,
	reviewMode: "BLOCK_DELIVERY_UNTIL_APPROVED",
	notifySalesRep: true,
	createProductionEvidenceOnApproval: true,
	revision: 0,
	changedAt: null,
};

export function normalizeGuardedPackingPolicy(
	value?: unknown,
): GuardedPackingPolicy {
	const parsed = guardedPackingPolicySchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_GUARDED_PACKING_POLICY;
}

export function guardedPackingPolicyFromEvidenceSnapshot(
	value?: unknown,
): GuardedPackingPolicy {
	const snapshot =
		value && typeof value === "object" && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	return normalizeGuardedPackingPolicy(snapshot.policy);
}

export function guardedPackingReviewBlocksDelivery(
	value?: unknown,
	effectivePolicy?: unknown,
) {
	return (
		(effectivePolicy
			? normalizeGuardedPackingPolicy(effectivePolicy)
			: guardedPackingPolicyFromEvidenceSnapshot(value)
		).reviewMode === "BLOCK_DELIVERY_UNTIL_APPROVED"
	);
}

export function isSameGuardedPackingPolicy(
	current: GuardedPackingPolicy,
	next: GuardedPackingPolicyInput,
) {
	return (
		current.enabled === next.enabled &&
		current.allowAwaitingProductionSubmission ===
			next.allowAwaitingProductionSubmission &&
		current.allowPendingMaterialReview === next.allowPendingMaterialReview &&
		current.reviewMode === next.reviewMode &&
		current.notifySalesRep === next.notifySalesRep &&
		current.createProductionEvidenceOnApproval ===
			next.createProductionEvidenceOnApproval
	);
}

export function reviseGuardedPackingPolicy(input: {
	current?: unknown;
	next: GuardedPackingPolicyInput;
	changedAt: string;
}): { policy: GuardedPackingPolicy; changed: boolean } {
	const current = normalizeGuardedPackingPolicy(input.current);
	if (isSameGuardedPackingPolicy(current, input.next)) {
		return { policy: current, changed: false };
	}
	return {
		policy: {
			...input.next,
			revision: current.revision + 1,
			changedAt: input.changedAt,
		},
		changed: true,
	};
}

export const specialOrderEnforcementModeSchema = z.enum([
	"WARNING_ONLY",
	"BLOCK_PURCHASING_AND_PRODUCTION",
	"BLOCK_ALL_OPERATIONS",
]);

export const SPECIAL_ORDER_RELEASE_AUDIENCES = [
	"SUPER_ADMIN_ONLY",
	"ALL_STAFF",
] as const;

export const specialOrderReleaseAudienceSchema = z.enum(
	SPECIAL_ORDER_RELEASE_AUDIENCES,
);

export const specialOrderSettingsSchema = z.object({
	releaseAudience:
		specialOrderReleaseAudienceSchema.default("SUPER_ADMIN_ONLY"),
	enforcementMode: specialOrderEnforcementModeSchema.default("WARNING_ONLY"),
	approvalLinkLifetimeDays: z.coerce.number().int().min(1).max(30).default(7),
	activePolicyVersionId: z.string().trim().min(1).nullable().default(null),
});

export type SpecialOrderSettings = z.infer<typeof specialOrderSettingsSchema>;
export type SpecialOrderReleaseAudience = z.infer<
	typeof specialOrderReleaseAudienceSchema
>;

export const DEFAULT_SPECIAL_ORDER_SETTINGS: SpecialOrderSettings = {
	releaseAudience: "SUPER_ADMIN_ONLY",
	enforcementMode: "WARNING_ONLY",
	approvalLinkLifetimeDays: 7,
	activePolicyVersionId: null,
};

export function normalizeSpecialOrderSettings(
	value?: unknown,
): SpecialOrderSettings {
	const parsed = specialOrderSettingsSchema.safeParse(value);
	return parsed.success ? parsed.data : DEFAULT_SPECIAL_ORDER_SETTINGS;
}

export const jobsSettings = settingsSchema.extend({
	meta: z.object({
		allowCustomJobs: z.boolean().default(false),
		showTaskQty: z.boolean().default(false),
	}),
});
const settingsWithoutMetaSchema = z.object(settingsBaseShape);
export const installCostSettings = settingsWithoutMetaSchema.extend({
	meta: z.object({
		list: z
			.array(
				z.object({
					id: z.string(),
					title: z.string(),
					cost: z.number(),
					defaultQty: z.number().default(1),
					contractor: z.boolean().default(false),
					punchout: z.boolean().default(false),
					uid: z.string().optional(),
				}),
			)
			.default([]),
	}),
});
export type InstallCostSettings = z.infer<typeof installCostSettings>;
export const appDownloadSettings = settingsWithoutMetaSchema.extend({
	meta: z.object({
		fileName: z.string().nullable().optional(),
		version: z.string().nullable().optional(),
		downloadUrl: z.string().nullable().optional(),
		publicId: z.string().nullable().optional(),
		assetId: z.string().nullable().optional(),
		uploadedAt: z.string().nullable().optional(),
		uploadedBy: z
			.object({
				id: z.number().nullable().optional(),
				name: z.string().nullable().optional(),
				email: z.string().nullable().optional(),
			})
			.nullable()
			.optional(),
		notes: z.string().nullable().optional(),
		expiresAt: z.string().nullable().optional(),
		reminderSentAt: z.string().nullable().optional(),
		reminderSentForExpiry: z.string().nullable().optional(),
	}),
});
export type AppDownloadSettings = z.infer<typeof appDownloadSettings>;
export type JobsSettings = z.infer<typeof jobsSettings>;
export const unitInvoiceSweeperSettings = settingsSchema.extend({
	meta: z.object({
		lastStartedAt: z.string().nullable().optional(),
		lastCompletedAt: z.string().nullable().optional(),
		running: z.boolean().default(false),
		lastRunSummary: z
			.object({
				homeId: z.number().nullable().optional(),
				reason: z.string().nullable().optional(),
				scannedUnits: z.number().default(0),
				cleanedUnits: z.number().default(0),
				deletedTaskCount: z.number().default(0),
				updatedBuilderTaskCount: z.number().default(0),
				skippedPaidDuplicateGroups: z.number().default(0),
				startedAt: z.string().nullable().optional(),
				completedAt: z.string().nullable().optional(),
			})
			.nullable()
			.optional(),
	}),
});
export type UnitInvoiceSweeperSettings = z.infer<
	typeof unitInvoiceSweeperSettings
>;
export const taskEventsSettings = settingsSchema.extend({
	meta: z.object({
		events: z
			.record(
				z.string(),
				z.object({
					status: z.enum(["active", "inactive"]).default("active"),
					filter: z.record(z.string(), z.any()).default({}),
				}),
			)
			.default({}),
	}),
});
export type TaskEventsSettings = z.infer<typeof taskEventsSettings>;

export type SettingsTypes = {
	// "sales-settings": SettingsSchema;
	"install-price-chart": InstallCostSettings;
	"app-download-apk": AppDownloadSettings;
	"jobs-settings": JobsSettings;
	"unit-invoice-sweeper-settings": UnitInvoiceSweeperSettings;
	"task-events-settings": TaskEventsSettings;
	"sales-settings": SettingsSchema;
};
