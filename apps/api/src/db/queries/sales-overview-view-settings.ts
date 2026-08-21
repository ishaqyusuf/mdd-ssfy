import type { Database } from "@gnd/db";
import {
	type SalesOverviewViewSettings,
	normalizeSalesOverviewViewSettings,
} from "@gnd/settings";

const SALES_SETTINGS_TYPE = "sales-settings";

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export async function getSalesOverviewViewSettings(db: Database) {
	const setting = await db.settings.findFirst({
		where: {
			type: SALES_SETTINGS_TYPE,
			deletedAt: null,
		},
		select: {
			meta: true,
		},
	});
	const meta = asRecord(setting?.meta);
	return normalizeSalesOverviewViewSettings(meta.salesOverviewView);
}

export async function updateSalesOverviewViewSettings(
	db: Database,
	input: SalesOverviewViewSettings,
) {
	const setting = await db.settings.findFirst({
		where: {
			type: SALES_SETTINGS_TYPE,
			deletedAt: null,
		},
		select: {
			id: true,
			meta: true,
		},
	});
	const settings = normalizeSalesOverviewViewSettings(input);
	const meta = {
		...asRecord(setting?.meta),
		salesOverviewView: settings,
	};

	if (setting) {
		await db.settings.update({
			where: { id: setting.id },
			data: { meta },
		});
	} else {
		await db.settings.create({
			data: {
				type: SALES_SETTINGS_TYPE,
				meta,
			},
		});
	}

	return settings;
}
