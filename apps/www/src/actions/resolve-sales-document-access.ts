"use server";

import {
	type ResolveSalesDocumentAccessResult,
	resolveSalesDocumentAccess,
} from "@gnd/api/utils/sales-document-access";
import { db } from "@gnd/db";
import type { PrintMode } from "@gnd/sales/print/types";

export async function resolveSalesDocumentAccessAction(input: {
	salesIds: number[];
	mode: PrintMode;
	dispatchId?: number | null;
	templateId?: string | null;
	forceRegenerate?: boolean;
}): Promise<ResolveSalesDocumentAccessResult> {
	return resolveSalesDocumentAccess({
		db,
		salesIds: input.salesIds,
		mode: input.mode,
		dispatchId: input.dispatchId ?? null,
		templateId: input.templateId ?? null,
		baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
		forceRegenerate: input.forceRegenerate ?? false,
	});
}
