"use client";

import { useTRPC, useTRPCClient } from "@/trpc/client";
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
	useSalesCustomComponentSearchQuery,
	useSalesSuppliersQuery,
} from "../api";
import { isSalesCatalogCacheEnabled } from "../catalog-rollout";

export function useDashboardSalesFormWorkflowData(): SalesFormWorkflowDataSource {
	const trpc = useTRPC();
	const client = useTRPCClient();
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
	const prefetchStepComponents = useCallback(
		(input: SalesFormWorkflowStepComponentInput) => {
			if (!isSalesCatalogCacheEnabled() || !input.stepId)
				return Promise.resolve();
			return queryClient.prefetchQuery(
				trpc.newSalesForm.getComponentCatalog.queryOptions(
					{
						stepId: input.stepId,
						stepTitle: input.stepTitle || undefined,
						isCustom: false,
					},
					{ staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 },
				),
			);
		},
		[queryClient, trpc],
	);

	return useMemo(
		() => ({
			useStepRouting: () => useNewSalesFormStepRoutingQuery(),
			prefetchStepComponents,
			useRootComponents: (input: SalesFormWorkflowStepComponentInput) => {
				const routing = useNewSalesFormStepRoutingQuery();
				const initialCatalog =
					routing.data && "rootCatalog" in routing.data
						? routing.data.rootCatalog
						: undefined;
				return useSalesStepComponentsQuery(
					{ stepId: input.stepId, stepTitle: input.stepTitle },
					input.enabled !== false && Boolean(input.stepId),
					initialCatalog,
				);
			},
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
			useCustomComponents: (input) =>
				useSalesCustomComponentSearchQuery(
					{
						stepId: input.stepId,
						query: input.query,
						selectedUid: input.selectedUid,
					},
					input.enabled,
				),
			verifyCustomComponent: async ({ stepId, uid }) => {
				const result = await client.newSalesForm.searchCustomComponents.query({
					stepId,
					query: "",
					selectedUid: uid,
				});
				return result.selectedComponent;
			},
			useCustomerProfiles: () => useCustomerProfilesQuery(true),
			useShelfCategories: (input) =>
				useNewSalesFormShelfCategoriesQuery({}, input?.enabled !== false),
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
		[
			client,
			prefetchStepComponents,
			queryClient,
			resolveImageSrc,
			trpc,
			updateShelfProduct,
		],
	);
}
