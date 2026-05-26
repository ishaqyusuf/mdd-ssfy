"use client";

import { useTRPC } from "@/trpc/client";
import type {
	SalesFormWorkflowDataSource,
	SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { createWorkflowComponentImageResolver } from "@gnd/sales/sales-form";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useMemo } from "react";
import {
	useCustomerProfilesQuery,
	useNewSalesFormShelfCategoriesQuery,
	useNewSalesFormShelfProductIndexQuery,
	useNewSalesFormShelfProductSearchQuery,
	useNewSalesFormShelfProductsQuery,
	useNewSalesFormStepRoutingQuery,
	useSalesStepComponentsQuery,
	useSalesSuppliersQuery,
} from "../api";

export function useWwwSalesFormWorkflowData(): SalesFormWorkflowDataSource {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const resolveImageSrc = useMemo(
		() =>
			createWorkflowComponentImageResolver(
				process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
			),
		[],
	);

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
			useShelfProductIndex: (input) =>
				useNewSalesFormShelfProductIndexQuery({}, input?.enabled !== false),
			getShelfProductDetails: (input) =>
				queryClient.fetchQuery(
					trpc.newSalesForm.getShelfProductDetails.queryOptions(
						{ ids: input.ids },
						{
							refetchOnWindowFocus: false,
							staleTime: 1000 * 60 * 30,
							gcTime: 1000 * 60 * 60,
						},
					),
				),
			useShelfProductSearch: (input) =>
				useNewSalesFormShelfProductSearchQuery(
					{
						query: input.query || "",
						selectedIds: input.selectedIds || [],
						limit: input.limit || 5,
					},
					input.enabled !== false,
				),
			useDoorSuppliers: (input) =>
				useSalesSuppliersQuery(input?.enabled !== false),
			resolveImageSrc,
		}),
		[queryClient, resolveImageSrc, trpc],
	);
}
