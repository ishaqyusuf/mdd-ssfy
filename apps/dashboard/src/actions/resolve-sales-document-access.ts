"use server";

import {
	type ResolveSalesDocumentAccessResult,
	resolveSalesDocumentAccess,
	resolveSalesDocumentHtmlPreviewAccess,
} from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import { assertDealerSaleOfficeAccess } from "@gnd/db/queries";
import {
	type SalesDocumentReadinessPreflight,
	applySalesDocumentReadinessRepair,
	discardSalesDocumentReadinessProposal,
	prepareSalesDocumentReadiness,
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

async function requireSalesDocumentActor() {
	const { authUser } = await import("@/app-deps/(v1)/_actions/utils");
	const actor = await authUser();
	if (!actor?.id)
		throw new Error("You must sign in to access sales documents.");
	return actor;
}

async function requireSalesDocumentScope(
	salesOrderIds: number[],
	options: { requireEdit?: boolean } = {},
) {
	const actor = await requireSalesDocumentActor();
	const canView = Boolean(
		actor.can?.viewOrders ||
			actor.can?.editOrders ||
			actor.can?.viewSales ||
			actor.can?.viewEstimates ||
			actor.can?.editEstimates ||
			actor.can?.viewProduction ||
			actor.can?.editProduction ||
			actor.can?.viewDelivery ||
			actor.can?.editDelivery ||
			actor.can?.viewPickup ||
			actor.can?.editPickup ||
			actor.can?.viewPacking,
	);
	if (!canView || (options.requireEdit && !actor.can?.editOrders)) {
		throw new Error(
			"You do not have permission to access these sales documents.",
		);
	}
	const ids = [...new Set(salesOrderIds)];
	const sales = await db.salesOrders.findMany({
		where: { id: { in: ids }, deletedAt: null },
		select: { id: true, dealerAuthId: true },
	});
	if (sales.length !== ids.length) {
		throw new Error("One or more sales documents are not available.");
	}
	for (const sale of sales) {
		if (sale.dealerAuthId) {
			await assertDealerSaleOfficeAccess(db, actor.id, sale.id);
		}
	}
	return actor;
}

async function getBlockingSalesDocumentReadiness(salesIds: number[]) {
	let blocking: SalesDocumentReadinessPreflight | null = null;
	for (const salesOrderId of [...new Set(salesIds)]) {
		const readiness = await prepareSalesDocumentReadiness(db, {
			salesOrderId,
			stageProposal: true,
		});
		if (!blocking && readiness.status !== "ready") blocking = readiness;
	}
	return blocking;
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
	await requireSalesDocumentScope(input.salesIds);
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
	await requireSalesDocumentScope(input.salesIds);
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
	await requireSalesDocumentScope([input.salesOrderId]);
	return prepareSalesDocumentReadiness(db, {
		salesOrderId: input.salesOrderId,
		stageProposal: true,
	});
}

export async function applySalesDocumentReadinessRepairAction(input: {
	salesOrderId: number;
	proposalId: string;
}): Promise<SalesDocumentReadinessPreflight> {
	const actor = await requireSalesDocumentScope([input.salesOrderId], {
		requireEdit: true,
	});
	return applySalesDocumentReadinessRepair(db, {
		...input,
		actorId: actor.id,
		actorName: actor.name || "Employee",
	});
}

export async function discardSalesDocumentReadinessProposalAction(input: {
	salesOrderId: number;
	proposalId: string;
	disposition: "cancelled" | "open_order";
}) {
	const actor = await requireSalesDocumentScope([input.salesOrderId], {
		requireEdit: input.disposition === "open_order",
	});
	return discardSalesDocumentReadinessProposal(db, {
		...input,
		actorId: actor.id,
	});
}
