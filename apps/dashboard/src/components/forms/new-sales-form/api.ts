import { useTRPC, useTRPCClient } from "@/trpc/client";
import type { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { useMemo } from "react";
import { isSalesCatalogCacheEnabled } from "./catalog-rollout";
import { getRoutingStaleTime } from "./routing-query-policy";
import type { SalesRequestGeneratePreviewVariables } from "./request-generation-controller";
import type { SalesRequestGeneratePreviewOutput } from "./request-generation-controller";
import type {
	NewSalesFormBootstrapInput,
	NewSalesFormDeleteLineItemInput,
	NewSalesFormGetInput,
	NewSalesFormRecalculateInput,
	NewSalesFormResolveCustomerInput,
	NewSalesFormSaveDraftInput,
	NewSalesFormSaveFinalInput,
	NewSalesFormShelfCategoriesInput,
	NewSalesFormShelfProductDetailsInput,
	NewSalesFormShelfProductIndexInput,
	NewSalesFormShelfProductSearchInput,
	NewSalesFormShelfProductsInput,
	NewSalesFormStepRoutingInput,
} from "./schema";

export type NewSalesRequestGeneratePreviewInput = Exclude<
	RouterInputs["salesRequest"]["generatePreview"],
	void
>;
export type NewSalesRequestGeneratePreviewOutput =
	SalesRequestGeneratePreviewOutput;
export type NewSalesRequestValidatePreviewInput = Exclude<
	RouterInputs["salesRequest"]["validatePreview"],
	void
>;
export type NewSalesRequestRecordOutcomeInput = Exclude<
	RouterInputs["salesRequest"]["recordOutcome"],
	void
>;
export type SalesRequestInterpretationWarningGuidanceInput = Exclude<
	RouterInputs["salesRequest"]["setInterpretationWarningGuidance"],
	void
>;
export type NewSalesRequestPilotSurface = "order" | "quote";

export function createSalesRequestGeneratePreviewInput(
	input: Pick<SalesRequestGeneratePreviewVariables, "text"> & {
		type: NewSalesRequestPilotSurface;
	},
): NewSalesRequestGeneratePreviewInput {
	return {
		type: input.type,
		text: input.text,
		images: [],
	};
}

export function useSalesRequestGeneratePreviewMutation(
	type: NewSalesRequestPilotSurface,
) {
	const trpcClient = useTRPCClient();
	return useMutation({
		mutationKey: [["salesRequest", "generatePreview", type]],
		mutationFn: ({ text, signal }: SalesRequestGeneratePreviewVariables) =>
			trpcClient.salesRequest.generatePreview.mutate(
				createSalesRequestGeneratePreviewInput({ type, text }),
				signal ? { signal } : undefined,
			),
	});
}

export function useSalesRequestPilotAccessQuery(
	type: NewSalesRequestPilotSurface,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.salesRequest.getPilotAccess.queryOptions(
			{ type },
			{
				enabled,
				refetchOnWindowFocus: false,
				staleTime: 60_000,
			},
		),
	);
}

export function useSalesRequestValidatePreviewMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.salesRequest.validatePreview.mutationOptions());
}

export function useSalesRequestRecordOutcomeMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.salesRequest.recordOutcome.mutationOptions());
}

export function useSalesRequestInterpretationWarningGuidanceMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.salesRequest.setInterpretationWarningGuidance.mutationOptions(),
	);
}

export function useNewSalesFormBootstrapQuery(
	input: NewSalesFormBootstrapInput,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.bootstrap.queryOptions(input, {
			enabled,
			refetchOnWindowFocus: false,
		}),
	);
}

export function useNewSalesFormGetQuery(
	input: NewSalesFormGetInput,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.get.queryOptions(input, {
			enabled,
		}),
	);
}

export function useNewSalesFormStepRoutingQuery(
	input: NewSalesFormStepRoutingInput = {},
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.getStepRouting.queryOptions(input, {
			enabled,
			staleTime: (query) =>
				getRoutingStaleTime(isSalesCatalogCacheEnabled(), query.state.data),
		}),
	);
}

export function useNewSalesFormShelfCategoriesQuery(
	input: NewSalesFormShelfCategoriesInput = {},
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.getShelfCategories.queryOptions(input, {
			enabled,
		}),
	);
}

export function useNewSalesFormShelfProductsQuery(
	input: NewSalesFormShelfProductsInput,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.getShelfProducts.queryOptions(input, {
			enabled: enabled && (input.categoryIds?.length || 0) > 0,
		}),
	);
}

export function useNewSalesFormShelfProductIndexQuery(
	input: NewSalesFormShelfProductIndexInput = {},
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.getShelfProductIndex.queryOptions(input, {
			enabled,
			refetchOnWindowFocus: false,
			staleTime: 1000 * 60 * 30,
			gcTime: 1000 * 60 * 60,
		}),
	);
}

export function useNewSalesFormShelfProductSearchQuery(
	input: NewSalesFormShelfProductSearchInput,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.searchShelfProducts.queryOptions(input, {
			enabled,
			refetchOnWindowFocus: false,
		}),
	);
}

export function useNewSalesFormCustomerPickerQuery(input: {
	query?: string | null;
	type?: "order" | "quote";
	recent?: boolean;
	limit?: number;
}) {
	const trpc = useTRPC();
	const q = input.query?.trim();
	return useQuery(
		trpc.newSalesForm.searchCustomers.queryOptions(
			{
				query: q || "",
				limit: input.limit ?? (input.recent ? 5 : 10),
				recent: input.recent ?? false,
				type: input.type,
			},
			{
				enabled: Boolean((input.recent ?? false) || q),
			},
		),
	);
}

export function useCustomerProfilesQuery(enabled = true) {
	const trpc = useTRPC();
	return useQuery({
		...trpc.customers.getCustomerProfiles.queryOptions(),
		enabled,
	});
}

export function useCustomerTaxProfilesQuery(enabled = true) {
	const trpc = useTRPC();
	return useQuery({
		...trpc.customers.getTaxProfiles.queryOptions(),
		enabled,
	});
}

function mergeComponentsWithUsage(
	components: RouterOutputs["newSalesForm"]["getComponentCatalog"]["components"],
	usage: Array<{ id: number; statistics: number }>,
) {
	const usageById = new Map(usage.map((row) => [row.id, row.statistics]));
	return components
		.map((component) => ({
			...component,
			statistics: usageById.get(component.id) ?? 0,
		}))
		.sort(
			(a, b) =>
				b.statistics - a.statistics ||
				String(a.title || "").localeCompare(String(b.title || "")) ||
				String(a.uid || "").localeCompare(String(b.uid || "")),
		);
}

export function useSalesStepComponentsQuery(
	input: { stepId?: number | null; stepTitle?: string | null },
	enabled = true,
	initialCatalog?: RouterOutputs["newSalesForm"]["getComponentCatalog"],
	initialUsage?: RouterOutputs["newSalesForm"]["getComponentUsageRanks"],
) {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const queryClient = useQueryClient();
	const cacheEnabled = isSalesCatalogCacheEnabled();
	const shouldLoad = enabled && (!!input.stepId || !!input.stepTitle);
	const selector = {
		stepId: input.stepId || undefined,
		stepTitle: input.stepTitle || undefined,
		isCustom: false as const,
	};
	const legacyQuery = useQuery(
		trpc.sales.getStepComponents.queryOptions(
			{
				...selector,
				fresh: true,
			},
			{
				enabled: shouldLoad && !cacheEnabled,
			},
		),
	);
	const catalogQuery = useQuery(
		trpc.newSalesForm.getComponentCatalog.queryOptions(selector, {
			enabled: shouldLoad && cacheEnabled,
			initialData: initialCatalog,
			staleTime: 30 * 60 * 1000,
			gcTime: 60 * 60 * 1000,
		}),
	);
	const usageQuery = useQuery(
		trpc.newSalesForm.getComponentUsageRanks.queryOptions(selector, {
			// tRPC batches queries started together; a cold count must not hold
			// the cached catalog response or its first component render.
			enabled: shouldLoad && cacheEnabled && !!catalogQuery.data,
			initialData: initialUsage,
			staleTime: 5 * 60 * 1000,
			gcTime: 15 * 60 * 1000,
		}),
	);
	const components = useMemo(() => {
		if (!catalogQuery.data?.components) return undefined;
		return mergeComponentsWithUsage(
			catalogQuery.data.components,
			usageQuery.data || [],
		);
	}, [catalogQuery.data?.components, usageQuery.data]);
	if (!cacheEnabled) return legacyQuery;
	return {
		...catalogQuery,
		data: components,
		refetch: async () => {
			const [fresh, freshUsage] = await Promise.all([
				client.newSalesForm.getComponentCatalog.query({
					...selector,
					fresh: true,
				}),
				client.newSalesForm.getComponentUsageRanks.query({
					...selector,
					fresh: true,
				}),
			]);
			queryClient.setQueryData(
				trpc.newSalesForm.getComponentCatalog.queryKey(selector),
				fresh,
			);
			queryClient.setQueryData(
				trpc.newSalesForm.getComponentUsageRanks.queryKey(selector),
				freshUsage,
			);
			return {
				...catalogQuery,
				data: mergeComponentsWithUsage(fresh.components, freshUsage),
			};
		},
	};
}

/** Custom suggestions stay out of the initial catalog and load on typed demand. */
export function useSalesCustomComponentSearchQuery(
	input: { stepId?: number | null; query: string; selectedUid?: string },
	enabled: boolean,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.searchCustomComponents.queryOptions(
			{
				stepId: input.stepId || 0,
				query: input.query,
				selectedUid: input.selectedUid,
			},
			{
				enabled:
					enabled &&
					Boolean(input.stepId) &&
					(input.query.trim().length >= 2 || !!input.selectedUid),
				staleTime: isSalesCatalogCacheEnabled() ? 5 * 60_000 : 60_000,
				gcTime: 15 * 60_000,
				refetchOnWindowFocus: "always",
				refetchOnReconnect: "always",
			},
		),
	);
}

export function useSalesSuppliersQuery(enabled = true) {
	const trpc = useTRPC();
	return useQuery(
		trpc.sales.getSuppliers.queryOptions(
			{},
			{
				enabled,
			},
		),
	);
}

export function useSalesSaveSupplierMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.saveSupplier.mutationOptions());
}

export function useSalesDeleteSupplierMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.deleteSupplier.mutationOptions());
}

export function useSalesUpdateStepMetaMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.updateStepMeta.mutationOptions());
}

export function useSaveWorkflowComponentDetailsMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.saveWorkflowComponentDetails.mutationOptions());
}

export function useCreateWorkflowComponentMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.createWorkflowComponent.mutationOptions());
}

export function useSaveWorkflowComponentVisibilityMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.sales.saveWorkflowComponentVisibility.mutationOptions(),
	);
}

export function useSaveWorkflowComponentSectionOverrideMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.sales.saveWorkflowComponentSectionOverride.mutationOptions(),
	);
}

export function useSaveWorkflowComponentRedirectMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.sales.saveWorkflowComponentRedirect.mutationOptions(),
	);
}

export function useSaveWorkflowComponentPricingMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.saveWorkflowComponentPricing.mutationOptions());
}

export function useArchiveWorkflowComponentsMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.archiveWorkflowComponents.mutationOptions());
}

export function useSetWorkflowComponentDefaultMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.sales.setWorkflowComponentDefault.mutationOptions());
}

export function useUpdateDykeComponentPricingMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.inventories.updateDykeComponentPricing.mutationOptions(),
	);
}

export function useUpsertDykeCustomStepComponentMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.inventories.upsertDykeCustomStepComponent.mutationOptions(),
	);
}

export function useArchiveDykeCustomStepComponentMutation() {
	const trpc = useTRPC();
	return useMutation(
		trpc.inventories.archiveDykeCustomStepComponent.mutationOptions(),
	);
}

export function useNewSalesFormResolveCustomerQuery(
	input: NewSalesFormResolveCustomerInput,
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.newSalesForm.resolveCustomer.queryOptions(input, {
			enabled,
		}),
	);
}

export function useSaveDraftNewSalesFormMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.newSalesForm.saveDraft.mutationOptions());
}

export function useSaveFinalNewSalesFormMutation() {
	const trpc = useTRPC();
	return useMutation(trpc.newSalesForm.saveFinal.mutationOptions());
}

export type NewSalesFormApiInputs = {
	bootstrap: NewSalesFormBootstrapInput;
	get: NewSalesFormGetInput;
	saveDraft: NewSalesFormSaveDraftInput;
	saveFinal: NewSalesFormSaveFinalInput;
	recalculate: NewSalesFormRecalculateInput;
	resolveCustomer: NewSalesFormResolveCustomerInput;
	stepRouting: NewSalesFormStepRoutingInput;
	shelfCategories: NewSalesFormShelfCategoriesInput;
	shelfProductIndex: NewSalesFormShelfProductIndexInput;
	shelfProductDetails: NewSalesFormShelfProductDetailsInput;
	shelfProducts: NewSalesFormShelfProductsInput;
	deleteLineItem: NewSalesFormDeleteLineItemInput;
};
