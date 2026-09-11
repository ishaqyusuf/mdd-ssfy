"use client";

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

/** Sheet identity is independent of the order-list filters and legacy sales overlay. */
export function useFulfillmentParams() {
	const [params, setParams] = useQueryStates(
		{
			fulfillmentOrderId: parseAsInteger,
			fulfillmentId: parseAsInteger,
			fulfillmentForm: parseAsStringLiteral([
				"create",
				"edit",
				"complete",
			] as const),
			fulfillmentView: parseAsStringLiteral([
				"overview",
				"packing",
				"exceptions",
				"proof",
				"route",
				"activity",
			] as const).withDefault("overview"),
		},
		{ shallow: true },
	);
	return {
		...params,
		openEditFulfillment: (fulfillmentId: number) =>
			setParams(
				{ fulfillmentId, fulfillmentForm: "edit", fulfillmentView: null },
				{ history: "push" },
			),
		openCompleteFulfillment: (fulfillmentId: number) =>
			setParams(
				{ fulfillmentId, fulfillmentForm: "complete", fulfillmentView: null },
				{ history: "push" },
			),
		openCreateFulfillment: (salesId?: number) =>
			setParams(
				{
					...(salesId ? { fulfillmentOrderId: salesId } : {}),
					fulfillmentForm: "create",
					fulfillmentId: null,
					fulfillmentView: null,
				},
				{ history: "push" },
			),
		setFulfillmentView: (
			fulfillmentView:
				| "overview"
				| "packing"
				| "exceptions"
				| "proof"
				| "route"
				| "activity",
		) => setParams({ fulfillmentView }),
		openOrder: (salesId: number) =>
			setParams(
				{
					fulfillmentOrderId: salesId,
					fulfillmentForm: null,
					fulfillmentId: null,
					fulfillmentView: null,
				},
				{ history: "push" },
			),
		openFulfillment: (
			fulfillmentId: number,
			fulfillmentView: "overview" | "packing" = "overview",
		) =>
			setParams(
				{ fulfillmentForm: null, fulfillmentId, fulfillmentView },
				{ history: "push" },
			),
		closeFulfillment: () =>
			setParams({
				fulfillmentForm: null,
				fulfillmentId: null,
				fulfillmentView: null,
			}),
		closeOrder: () =>
			setParams({
				fulfillmentOrderId: null,
				fulfillmentForm: null,
				fulfillmentId: null,
				fulfillmentView: null,
			}),
	};
}
