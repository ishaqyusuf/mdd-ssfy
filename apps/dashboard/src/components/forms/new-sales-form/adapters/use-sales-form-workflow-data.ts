"use client";

import { useTRPC } from "@/trpc/client";
import type {
	SalesFormWorkflowDataSource,
	SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { createWorkflowComponentImageResolver } from "@gnd/sales/sales-form";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { useCallback, useMemo } from "react";
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

export function useDashboardSalesFormWorkflowData(): SalesFormWorkflowDataSource {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { mutateAsync: mutateShelfProduct } = useMutation(
		trpc.newSalesForm.updateShelfProduct.mutationOptions(),
	);
	const resolveImageSrc = useMemo(
		() =>
			createWorkflowComponentImageResolver(
				process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
			),
		[],
	);
	const updateShelfProduct = useCallback(
		async (input: { id: number; title: string; unitPrice: number | null }) => {
			const updated = await mutateShelfProduct(input);
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: trpc.newSalesForm.getShelfProducts.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.newSalesForm.getShelfProductIndex.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.newSalesForm.getShelfProductDetails.pathKey(),
				}),
				queryClient.invalidateQueries({
					queryKey: trpc.newSalesForm.searchShelfProducts.pathKey(),
				}),
			]);
			return updated;
		},
		[mutateShelfProduct, queryClient, trpc],
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
			updateShelfProduct,
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
		[queryClient, resolveImageSrc, trpc, updateShelfProduct],
	);
}
