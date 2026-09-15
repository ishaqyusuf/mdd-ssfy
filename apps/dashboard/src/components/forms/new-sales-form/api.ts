import { useTRPC, useTRPCClient } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useMutation, useQuery } from "@gnd/ui/tanstack";
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

export function useSalesStepComponentsQuery(
	input: { stepId?: number | null; stepTitle?: string | null },
	enabled = true,
) {
	const trpc = useTRPC();
	return useQuery(
		trpc.sales.getStepComponents.queryOptions(
			{
				stepId: input.stepId || undefined,
				stepTitle: input.stepTitle || undefined,
				fresh: true,
			},
			{
				enabled: enabled && (!!input.stepId || !!input.stepTitle),
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
	return useMutation(
		trpc.sales.setWorkflowComponentDefault.mutationOptions(),
	);
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
