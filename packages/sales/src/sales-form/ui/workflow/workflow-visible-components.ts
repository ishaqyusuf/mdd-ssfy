import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	isComponentVisibleByRules,
	resolveComponentPriceByDeps,
} from "../../domain";
import { profileAdjustedSalesPrice } from "./workflow-format";
import {
	type WorkflowComponentRecord,
	type WorkflowStepRecord,
	getStepPriceDeps,
	isComponentEnabledForView,
} from "./workflow-records";
import {
	percentageMoney,
	sumMoney,
} from "../../../payment-system/domain/money";

export type ResolveWorkflowVisibleComponentsInput = {
	components: WorkflowComponentRecord[];
	steps: WorkflowStepRecord[];
	activeStep: WorkflowStepRecord | null;
	overrides: Map<string, Partial<WorkflowComponentRecord>>;
	includeCustomComponents: boolean;
	profileCoefficient: number;
	pricingView?: "internal" | "dealer";
	dealerSalesPercentage?: number | null;
};

export function resolveWorkflowVisibleComponents({
	components,
	steps,
	activeStep,
	overrides,
	includeCustomComponents,
	profileCoefficient,
	pricingView = "internal",
	dealerSalesPercentage = 0,
}: ResolveWorkflowVisibleComponentsInput): WorkflowComponentRecord[] {
	const selectedByStepUid = buildSelectedByStepUid(steps);
	const selectedProdUidsByStepUid = buildSelectedProdUidsByStepUid(steps);
	const selectedComponentUids = new Set(
		Object.values(selectedProdUidsByStepUid).flat().map(String),
	);

	return (components || [])
		.filter((component) => !component.isDeleted)
		.filter((component) =>
			isComponentEnabledForView(
				component,
				includeCustomComponents,
				selectedComponentUids,
			),
		)
		.filter((component) =>
			isComponentVisibleByRules(
				component,
				selectedByStepUid,
				selectedProdUidsByStepUid,
			),
		)
		.map((component) => {
			const override = overrides.get(String(component?.uid || ""));
			const price = resolveComponentPriceByDeps(
				{
					...component,
					...(override || {}),
				},
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

			return {
				...component,
				...(override || {}),
				salesPrice,
				basePrice: Number(resolvedBasePrice ?? 0),
			};
		});
}
