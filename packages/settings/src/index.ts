import type { Db } from "@gnd/db";
import type { SettingsTypes } from "./schema";
export {
	getSalesHandoffTriggerSettings,
	updateSalesHandoffTriggerSettings,
} from "./sales-handoff-settings";
export {
	getGuardedPackingSettings,
	updateGuardedPackingSettings,
} from "./guarded-packing-settings";
export {
	getSalesRequestGenerationDefaults,
	updateSalesRequestGenerationDefault,
} from "./sales-request-generation-defaults";
export type {
	SalesRequestGenerationDefaultUpdate,
	SalesRequestGenerationDefaults,
	UpdateSalesRequestGenerationDefaultInput,
} from "./sales-request-generation-defaults";
export {
	DEFAULT_SALES_REQUEST_AI_SELECTION,
	SALES_REQUEST_AI_PROVIDER_CATALOG,
	SALES_REQUEST_AI_PROVIDERS,
	getSalesRequestAIProviderOption,
	isSalesRequestAIModel,
	salesRequestAISelectionSchema,
} from "./sales-request-ai-catalog";
export type {
	SalesRequestAIModelOption,
	SalesRequestAIProvider,
	SalesRequestAIProviderOption,
	SalesRequestAISelection,
} from "./sales-request-ai-catalog";
export {
	getSalesRequestAISettings,
	updateSalesRequestAISettings,
} from "./sales-request-ai-settings";
export {
	beginSalesRequestCatalogRegeneration,
	completeSalesRequestCatalogRegeneration,
	failSalesRequestCatalogRegeneration,
	getSalesRequestCatalogSettings,
	isSalesRequestCatalogPublicationCurrent,
	salesRequestCatalogPolicySchema,
	updateSalesRequestCatalogPolicy,
} from "./sales-request-catalog-settings";
export type {
	SalesRequestCatalogPolicy,
	SalesRequestCatalogPublication,
	SalesRequestCatalogSettings,
} from "./sales-request-catalog-settings";
export type {
	SalesRequestAISettings,
	SalesRequestAISettingsUpdate,
	UpdateSalesRequestAISettingsInput,
} from "./sales-request-ai-settings";
export {
	SALES_REQUEST_PROVIDER_BENCHMARK_CORPUS_VERSION,
	SALES_REQUEST_PROVIDER_BENCHMARK_POLICY_VERSION,
	getSalesRequestProviderBenchmarkApproval,
	isSalesRequestProviderBenchmarkApprovalCurrent,
	salesRequestProviderBenchmarkDecisionSchema,
	salesRequestProviderBenchmarkApprovalInputSchema,
	salesRequestProviderBenchmarkApprovalSchema,
	updateSalesRequestProviderBenchmarkApproval,
} from "./sales-request-provider-benchmark-settings";
export type {
	SalesRequestProviderBenchmarkApproval,
	SalesRequestProviderBenchmarkApprovalInput,
	SalesRequestProviderBenchmarkIdentity,
	SalesRequestProviderBenchmarkApprovalResult,
	SalesRequestProviderBenchmarkApprovalSource,
	SalesRequestProviderBenchmarkApprovalUpdate,
	SalesRequestProviderBenchmarkApprovalVerifier,
	SalesRequestProviderBenchmarkDecision,
	UpdateSalesRequestProviderBenchmarkApprovalInput,
} from "./sales-request-provider-benchmark-settings";
export {
	DEFAULT_SALES_REQUEST_PILOT_SETTINGS,
	getSalesRequestPilotSettings,
	normalizeSalesRequestPilotSettingsInput,
	salesRequestPilotSettingsInputSchema,
	salesRequestPilotSettingsSchema,
	updateSalesRequestPilotSettings,
} from "./sales-request-pilot-settings";
export {
	getSalesRequestPilotReviewPolicy,
	salesRequestPilotReviewPolicyInputSchema,
	salesRequestPilotReviewPolicySchema,
	salesRequestPilotThresholdPolicySchema,
	updateSalesRequestPilotReviewPolicy,
} from "./sales-request-pilot-review-policy";
export type {
	SalesRequestPilotReviewPolicy,
	SalesRequestPilotReviewPolicySource,
	SalesRequestPilotReviewPolicyVerifier,
	SalesRequestPilotThresholdPolicy,
} from "./sales-request-pilot-review-policy";
export type {
	SalesRequestPilotSettings,
	SalesRequestPilotSettingsInput,
	SalesRequestPilotSettingsResult,
	SalesRequestPilotSettingsSource,
	SalesRequestPilotSettingsUpdate,
	UpdateSalesRequestPilotSettingsInput,
} from "./sales-request-pilot-settings";
export {
	DEFAULT_GUARDED_PACKING_POLICY,
	DEFAULT_SALES_HANDOFF_TRIGGER_POLICY,
	DEFAULT_SPECIAL_ORDER_SETTINGS,
	DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS,
	DEFAULT_SALES_PRINT_SETTINGS,
	GUARDED_PACKING_REVIEW_MODES,
	SPECIAL_ORDER_RELEASE_AUDIENCES,
	SALES_HANDOFF_TRIGGER_MODES,
	guardedPackingPolicyInputSchema,
	guardedPackingPolicyFromEvidenceSnapshot,
	guardedPackingReviewBlocksDelivery,
	guardedPackingPolicySchema,
	guardedPackingReviewModeSchema,
	isSameGuardedPackingPolicy,
	isSameSalesHandoffTrigger,
	normalizeGuardedPackingPolicy,
	normalizeSalesHandoffTriggerInput,
	normalizeSalesHandoffTriggerPolicy,
	normalizeSalesOverviewViewSettings,
	normalizeSpecialOrderSettings,
	normalizeSalesPrintSettings,
	resolveSalesOverviewGeneralVersion,
	reviseGuardedPackingPolicy,
	reviseSalesHandoffTriggerPolicy,
	salesHandoffTriggerInputSchema,
	salesHandoffTriggerModeSchema,
	salesHandoffTriggerPolicySchema,
	salesOverviewGeneralVersionSchema,
	salesOverviewSuperAdminPreviewSchema,
	salesOverviewViewSettingsSchema,
	salesPrintSettingsSchema,
	specialOrderEnforcementModeSchema,
	specialOrderReleaseAudienceSchema,
	specialOrderSettingsSchema,
} from "./schema";
export type {
	GuardedPackingPolicy,
	GuardedPackingPolicyInput,
	SalesHandoffTriggerInput,
	SalesHandoffTriggerPolicy,
	SalesPrintSettings,
	SalesOverviewGeneralVersion,
	SalesOverviewViewSettings,
	SpecialOrderReleaseAudience,
	SpecialOrderSettings,
} from "./schema";
export const SETTINGS_TYPE = [
	"sales-settings",
	"install-price-chart",
	"jobs-settings",
	"unit-invoice-sweeper-settings",
	"task-events-settings",
	//   "allow-custom-jobs",
] as const;

export type SettingType = (typeof SETTINGS_TYPE)[number];

export async function getSettingAction<T extends keyof SettingsTypes>(
	type: T,
	db: Db,
) {
	// const type: PostType = "sales-settings";
	const setting = await db.settings.findFirst({
		where: {
			type,
		},
	});
	if (!setting) {
		const newSetting = await db.settings.create({
			data: {
				type,
				meta: {},
			},
		});
		return newSetting as any as SettingsTypes[T];
	}
	return setting as any as SettingsTypes[T];
}
export async function updateSettingsMeta<T extends keyof SettingsTypes>(
	type: T,
	meta: SettingsTypes[T]["meta"],
	db: Db,
	updateType: "partial" | "full" = "full",
) {
	const settings = await getSettingAction<T>(type, db);
	if (!settings?.id) throw Error("Setting not found");
	const id = settings.id;
	const newMeta =
		updateType === "partial"
			? { ...(settings.meta || {}), ...(meta as any) }
			: meta;
	await db.settings.update({
		where: { id },
		data: {
			meta: newMeta,
		},
	});
}

export {
	getProductionReceivingSettings,
	updateProductionReceivingSettings,
	normalizeProductionReceivingPolicy,
	productionReceivingPolicyInputSchema,
} from "./production-receiving-settings";
