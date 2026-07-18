"use server";

import {
	type ResolveSalesDocumentAccessResult,
	resolveSalesDocumentAccess,
	resolveSalesDocumentHtmlPreviewAccess,
} from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import type { PrintMode } from "@gnd/sales/print/types";
import {
	type SalesPrintSettings,
	getSettingAction,
	normalizeSalesPrintSettings,
} from "@gnd/settings";

async function resolveConfiguredSalesPrintSettings(input: {
	templateId?: string | null;
	printConfig?: Partial<SalesPrintSettings> | null;
}) {
	const setting = await getSettingAction("sales-settings", db);
	const meta = (setting.meta || {}) as Record<string, unknown>;
	const stored = normalizeSalesPrintSettings(meta.print);
	return normalizeSalesPrintSettings({
		...stored,
		...(input.printConfig || {}),
		...(input.templateId ? { templateId: input.templateId } : {}),
	});
}

export async function resolveSalesDocumentAccessAction(input: {
	salesIds: number[];
	mode: PrintMode;
	pricingMode?: "customer" | "internal" | null;
	dispatchId?: number | null;
	templateId?: string | null;
	printConfig?: Partial<SalesPrintSettings> | null;
	baseUrl?: string | null;
	forceRegenerate?: boolean;
}): Promise<ResolveSalesDocumentAccessResult> {
	const printConfig = await resolveConfiguredSalesPrintSettings(input);
	return resolveSalesDocumentAccess({
		db,
		salesIds: input.salesIds,
		mode: input.mode,
		pricingMode: input.pricingMode ?? null,
		dispatchId: input.dispatchId ?? null,
		printConfig,
		baseUrl: input.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? null,
		forceRegenerate: input.forceRegenerate ?? false,
	});
}

export async function resolveSalesDocumentHtmlPreviewAccessAction(input: {
	salesIds: number[];
	mode: PrintMode;
	pricingMode?: "customer" | "internal" | null;
	dispatchId?: number | null;
	templateId?: string | null;
	printConfig?: Partial<SalesPrintSettings> | null;
	baseUrl?: string | null;
}): Promise<ResolveSalesDocumentAccessResult> {
	const printConfig = await resolveConfiguredSalesPrintSettings(input);
	return resolveSalesDocumentHtmlPreviewAccess({
		db,
		salesIds: input.salesIds,
		mode: input.mode,
		pricingMode: input.pricingMode ?? null,
		dispatchId: input.dispatchId ?? null,
		printConfig,
		baseUrl: input.baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? null,
	});
}
