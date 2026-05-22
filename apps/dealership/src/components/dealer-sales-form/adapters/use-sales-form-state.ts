"use client";

import {
	createEmptySalesFormLineItem,
	createInitialSalesFormState,
	hydrateSalesFormState,
	setSalesFormMeta,
	setSalesFormTaxRate,
	type SalesFormLineItemUiRecord,
} from "@gnd/sales/sales-form";
import { useCallback, useMemo, useState } from "react";
import type { DealerSalesFormRecord, DealerSalesFormState } from "../types";

type DealerQuoteSource = {
	id?: number | null;
	orderId?: string | null;
	slug?: string | null;
	status?: string | null;
	type?: string | null;
	customerId?: number | null;
	customerProfileId?: number | null;
	taxRate?: number | null;
	lineItems?: unknown;
};

function createDealerLineItem(index = 0): SalesFormLineItemUiRecord {
	const line = createEmptySalesFormLineItem(index);
	return {
		id: line.id ?? null,
		uid: `dealer-line-${index + 1}-${Date.now().toString(36)}`,
		title: "",
		description: "",
		qty: 1,
		unitPrice: 0,
		lineTotal: 0,
		meta: {},
		formSteps: [],
		shelfItems: [],
		housePackageTool: null,
	};
}

function normalizeDealerLineItems(value: unknown): SalesFormLineItemUiRecord[] {
	if (!Array.isArray(value) || !value.length) return [createDealerLineItem(0)];

	return value.map((line, index) => {
		const record =
			line && typeof line === "object" && !Array.isArray(line)
				? (line as Record<string, unknown>)
				: {};
		const qty = Number(record.qty || 0);
		const unitPrice = Number(record.unitPrice || 0);
		const lineTotal = Number(record.lineTotal ?? qty * unitPrice);

		return {
			...createEmptySalesFormLineItem(index),
			uid: String(record.uid || `dealer-line-${index + 1}`),
			title: typeof record.title === "string" ? record.title : "",
			description:
				typeof record.description === "string" ? record.description : "",
			qty,
			unitPrice,
			lineTotal,
			meta:
				record.meta &&
				typeof record.meta === "object" &&
				!Array.isArray(record.meta)
					? (record.meta as Record<string, unknown>)
					: {},
			formSteps: Array.isArray(record.formSteps) ? record.formSteps : [],
			shelfItems: Array.isArray(record.shelfItems) ? record.shelfItems : [],
			housePackageTool:
				record.housePackageTool &&
				typeof record.housePackageTool === "object" &&
				!Array.isArray(record.housePackageTool)
					? record.housePackageTool
					: null,
		};
	});
}

function createDealerSalesFormRecord(
	source?: DealerQuoteSource | null,
): DealerSalesFormRecord {
	const taxRate = Number(source?.taxRate || 0);

	return {
		id: source?.id || null,
		type: "quote",
		salesId: source?.id || null,
		orderId: source?.orderId || null,
		slug: source?.slug || null,
		status: source?.status || "Draft",
		version: String(source?.id || "new"),
		updatedAt: null,
		form: {
			customerId: source?.customerId || null,
			customerProfileId: source?.customerProfileId || null,
			paymentMethod: null,
		},
		lineItems: normalizeDealerLineItems(source?.lineItems),
		extraCosts: [],
		summary: {
			taxRate,
			subTotal: 0,
			grandTotal: 0,
		},
	};
}

export function useDealerSalesFormState() {
	const [state, setState] = useState<DealerSalesFormState>(() => ({
		...(createInitialSalesFormState() as DealerSalesFormState),
		record: createDealerSalesFormRecord(),
	}));

	const hydrateQuote = useCallback((source?: DealerQuoteSource | null) => {
		const record = createDealerSalesFormRecord(source);
		setState(
			(current) =>
				hydrateSalesFormState(
					current as any,
					record as any,
				) as DealerSalesFormState,
		);
	}, []);

	const reset = useCallback(() => {
		hydrateQuote(null);
	}, [hydrateQuote]);

	const setCustomer = useCallback(
		(customerId: number | null, customerProfileId?: number | null) => {
			setState(
				(current) =>
					setSalesFormMeta(current as any, {
						customerId,
						customerProfileId:
							customerProfileId ??
							current.record?.form.customerProfileId ??
							null,
					}) as DealerSalesFormState,
			);
		},
		[],
	);

	const setCustomerProfile = useCallback((customerProfileId: number | null) => {
		setState(
			(current) =>
				setSalesFormMeta(current as any, {
					customerProfileId,
				}) as DealerSalesFormState,
		);
	}, []);

	const setTaxRate = useCallback((taxRate: number) => {
		setState(
			(current) =>
				setSalesFormTaxRate(current as any, taxRate) as DealerSalesFormState,
		);
	}, []);

	return useMemo(
		() => ({
			state,
			record: state.record,
			hydrateQuote,
			reset,
			setState,
			setCustomer,
			setCustomerProfile,
			setTaxRate,
		}),
		[hydrateQuote, reset, setCustomer, setCustomerProfile, setTaxRate, state],
	);
}

export { createDealerLineItem };
