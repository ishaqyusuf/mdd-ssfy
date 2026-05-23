"use client";

import type {
	SalesFormWorkflowDataSource,
	SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { useMemo } from "react";
import {
	useCustomerProfilesQuery,
	useNewSalesFormShelfCategoriesQuery,
	useNewSalesFormShelfProductsQuery,
	useNewSalesFormStepRoutingQuery,
	useSalesStepComponentsQuery,
	useSalesSuppliersQuery,
} from "../api";

export function useWwwSalesFormWorkflowData(): SalesFormWorkflowDataSource {
	return useMemo(
		() => ({
			useStepRouting: () => useNewSalesFormStepRoutingQuery(),
			useStepComponents: (input: SalesFormWorkflowStepComponentInput) =>
				useSalesStepComponentsQuery(
					{
						stepId: input.stepId || undefined,
						stepTitle: input.stepTitle || undefined,
					},
					input.enabled !== false && Boolean(input.stepId || input.stepTitle),
				),
			useDoorComponents: (input: SalesFormWorkflowStepComponentInput) =>
				useSalesStepComponentsQuery(
					{
						stepId: input.stepId || undefined,
						stepTitle: input.stepTitle || "Door",
					},
					input.enabled !== false && Boolean(input.stepId || input.stepTitle),
				),
			useCustomerProfiles: () => useCustomerProfilesQuery(true),
			useShelfCategories: () => useNewSalesFormShelfCategoriesQuery({}),
			useShelfProducts: (input) =>
				useNewSalesFormShelfProductsQuery(
					{ categoryIds: input.categoryIds },
					input.enabled !== false && input.categoryIds.length > 0,
				),
			useDoorSuppliers: (input) =>
				useSalesSuppliersQuery(input?.enabled !== false),
			resolveImageSrc: resolveWwwComponentImageSrc,
		}),
		[],
	);
}

function resolveWwwComponentImageSrc(src?: string | null) {
	const value = String(src || "").trim();
	if (!value) return null;
	if (
		value.startsWith("http://") ||
		value.startsWith("https://") ||
		value.startsWith("data:") ||
		value.startsWith("blob:")
	) {
		return value;
	}
	return value.startsWith("/") ? value : `/${value}`;
}
