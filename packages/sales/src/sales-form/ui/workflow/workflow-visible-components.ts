import {
	percentageMoney,
	sumMoney,
} from "../../../payment-system/domain/money";
import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	isComponentVisibleByRules,
	readSalesFormObjectMetadata,
	resolveComponentPriceByDeps,
} from "../../domain";
import { profileAdjustedSalesPrice } from "./workflow-format";
import {
	type WorkflowComponentRecord,
	type WorkflowStepRecord,
	getStepPriceDeps,
	isComponentEnabledForView,
} from "./workflow-records";

export type ResolveWorkflowVisibleComponentsInput<
	TComponent extends WorkflowComponentRecord = WorkflowComponentRecord,
> = {
	components: TComponent[];
	steps: WorkflowStepRecord[];
	activeStep: WorkflowStepRecord | null;
	overrides: Map<string, Partial<WorkflowComponentRecord>>;
	includeCustomComponents: boolean;
	profileCoefficient: number;
	pricingView?: "internal" | "dealer";
	dealerSalesPercentage?: number | null;
};

export type ResolveWorkflowCatalogComponentsInput<
	TComponent extends WorkflowComponentRecord = WorkflowComponentRecord,
> = Omit<
	ResolveWorkflowVisibleComponentsInput<TComponent>,
	"includeCustomComponents"
>;

export function resolveWorkflowCatalogComponents<
	TComponent extends WorkflowComponentRecord = WorkflowComponentRecord,
>({
	components,
	steps,
	activeStep,
	overrides,
	profileCoefficient,
	pricingView = "internal",
	dealerSalesPercentage = 0,
}: ResolveWorkflowCatalogComponentsInput<TComponent>): TComponent[] {
	const selectedByStepUid = buildSelectedByStepUid(steps);
	const selectedProdUidsByStepUid = buildSelectedProdUidsByStepUid(steps);

	return (components || [])
		.filter((component) => !component.isDeleted)
		.map((component) => {
			const override = overrides.get(String(component?.uid || ""));
			const overridePricing =
				override?.pricing && Object.keys(override.pricing).length > 0
					? override.pricing
					: component?.pricing;
			const overrideSupplierVariants =
				Array.isArray(override?.supplierVariants) &&
				override.supplierVariants.length > 0
					? override.supplierVariants
					: component?.supplierVariants;
			const effectiveComponent = {
				...component,
				...(override || {}),
				pricing: overridePricing,
				supplierVariants: overrideSupplierVariants,
			};
			const price = resolveComponentPriceByDeps(
				effectiveComponent,
				selectedByStepUid,
				{
					priceStepDeps: getStepPriceDeps(activeStep || null),
					selectedProdUidsByStepUid,
				},
			);
			const resolvedBasePrice =
				override?.basePrice == null
					? (price.basePrice ??
						component?.basePrice ??
						price.salesPrice ??
						component?.salesPrice)
					: override?.basePrice;
			const resolvedSalesPrice =
				override?.salesPrice == null
					? (price.salesPrice ?? component?.salesPrice)
					: override?.salesPrice;
			const internalSalesPrice = profileAdjustedSalesPrice(
				resolvedSalesPrice,
				resolvedBasePrice,
				profileCoefficient,
			);
			const salesPrice =
				pricingView === "dealer"
					? sumMoney([
							internalSalesPrice,
							percentageMoney(internalSalesPrice, dealerSalesPercentage),
						])
					: internalSalesPrice;
			const metadata = readSalesFormObjectMetadata(component?._metaData);
			const custom = !isComponentEnabledForView(component, false);
			const visible = isComponentVisibleByRules(
				component,
				selectedByStepUid,
				selectedProdUidsByStepUid,
			);

			return {
				...effectiveComponent,
				salesPrice,
				basePrice: Number(resolvedBasePrice ?? 0),
				_metaData: {
					...metadata,
					custom,
					visible,
				},
			} as TComponent;
		});
}

export function resolveWorkflowVisibleComponents<
	TComponent extends WorkflowComponentRecord = WorkflowComponentRecord,
>({
	components,
	steps,
	activeStep,
	overrides,
	includeCustomComponents,
	profileCoefficient,
	pricingView = "internal",
	dealerSalesPercentage = 0,
}: ResolveWorkflowVisibleComponentsInput<TComponent>): TComponent[] {
	const selectedProdUidsByStepUid = buildSelectedProdUidsByStepUid(steps);
	const selectedComponentUids = new Set(
		Object.values(selectedProdUidsByStepUid).flat().map(String),
	);

	return resolveWorkflowCatalogComponents<TComponent>({
		components,
		steps,
		activeStep,
		overrides,
		profileCoefficient,
		pricingView,
		dealerSalesPercentage,
	})
		.filter((component) =>
			isComponentEnabledForView(
				component,
				includeCustomComponents,
				selectedComponentUids,
			),
		)
		.filter((component) => component._metaData?.visible === true);
}
