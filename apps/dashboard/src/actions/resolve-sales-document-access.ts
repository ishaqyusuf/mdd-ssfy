"use server";

import {
	type ResolveSalesDocumentAccessResult,
	resolveSalesDocumentAccess,
	resolveSalesDocumentHtmlPreviewAccess,
} from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import {
	applySalesDocumentReadinessRepair,
	prepareSalesDocumentReadiness,
	type SalesDocumentReadinessPreflight,
} from "@gnd/sales/document-readiness";
import type { PrintMode } from "@gnd/sales/print/types";
import {
	type SalesPrintSettings,
	getSettingAction,
	normalizeSalesPrintSettings,
} from "@gnd/settings";

export type ResolveSalesDocumentAccessActionResult =
	| ResolveSalesDocumentAccessResult
	| {
			kind: "preflight";
			readiness: SalesDocumentReadinessPreflight;
	  };

async function getBlockingSalesDocumentReadiness(salesIds: number[]) {
	for (const salesOrderId of [...new Set(salesIds)]) {
		const readiness = await prepareSalesDocumentReadiness(db, {
			salesOrderId,
			stageProposal: true,
		});
		if (readiness.status !== "ready") return readiness;
	}
	return null;
}

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
}): Promise<ResolveSalesDocumentAccessActionResult> {
	const readiness = await getBlockingSalesDocumentReadiness(input.salesIds);
	if (readiness) return { kind: "preflight", readiness };
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
}): Promise<ResolveSalesDocumentAccessActionResult> {
	const readiness = await getBlockingSalesDocumentReadiness(input.salesIds);
	if (readiness) return { kind: "preflight", readiness };
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

export async function preflightSalesDocumentAction(input: {
	salesOrderId: number;
}): Promise<SalesDocumentReadinessPreflight> {
	return prepareSalesDocumentReadiness(db, {
		salesOrderId: input.salesOrderId,
		stageProposal: true,
	});
}

export async function applySalesDocumentReadinessRepairAction(input: {
	salesOrderId: number;
	proposalId: string;
}): Promise<SalesDocumentReadinessPreflight> {
	const { authUser } = await import("@/app-deps/(v1)/_actions/utils");
	const actor = await authUser();
	if (!actor?.id || !actor.can?.editOrders) {
		throw new Error("You do not have permission to repair sales documents.");
	}
	return applySalesDocumentReadinessRepair(db, {
		...input,
		actorId: actor.id,
		actorName: actor.name || "Employee",
	});
}
