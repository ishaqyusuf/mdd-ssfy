import type { Db } from "@gnd/db";
import type { SettingsTypes } from "./schema";
export {
	getSalesHandoffTriggerSettings,
	updateSalesHandoffTriggerSettings,
} from "./sales-handoff-settings";
export {
	DEFAULT_SALES_HANDOFF_TRIGGER_POLICY,
	DEFAULT_SPECIAL_ORDER_SETTINGS,
	DEFAULT_SALES_OVERVIEW_VIEW_SETTINGS,
	DEFAULT_SALES_PRINT_SETTINGS,
	SPECIAL_ORDER_RELEASE_AUDIENCES,
	SALES_HANDOFF_TRIGGER_MODES,
	isSameSalesHandoffTrigger,
	normalizeSalesHandoffTriggerInput,
	normalizeSalesHandoffTriggerPolicy,
	normalizeSalesOverviewViewSettings,
	normalizeSpecialOrderSettings,
	normalizeSalesPrintSettings,
	resolveSalesOverviewGeneralVersion,
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
