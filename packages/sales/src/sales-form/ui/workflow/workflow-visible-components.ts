import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	isComponentVisibleByRules,
	resolveComponentPriceByDeps,
} from "../../domain";
import {
	getStepPriceDeps,
	isComponentEnabledForView,
	type WorkflowComponentRecord,
	type WorkflowStepRecord,
} from "./workflow-records";
import { profileAdjustedSalesPrice } from "./workflow-format";

export type ResolveWorkflowVisibleComponentsInput = {
	components: WorkflowComponentRecord[];
	steps: WorkflowStepRecord[];
	activeStep: WorkflowStepRecord | null;
	overrides: Map<string, Partial<WorkflowComponentRecord>>;
	includeCustomComponents: boolean;
	profileCoefficient: number;
};

export function resolveWorkflowVisibleComponents({
	components,
	steps,
	activeStep,
	overrides,
	includeCustomComponents,
	profileCoefficient,
}: ResolveWorkflowVisibleComponentsInput): WorkflowComponentRecord[] {
	const selectedByStepUid = buildSelectedByStepUid(steps);
	const selectedProdUidsByStepUid = buildSelectedProdUidsByStepUid(steps);

	return (components || [])
		.filter((component) => !component.isDeleted)
		.filter((component) =>
			isComponentEnabledForView(component, includeCustomComponents),
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

			return {
				...component,
				...(override || {}),
				salesPrice: profileAdjustedSalesPrice(
					resolvedSalesPrice,
					resolvedBasePrice,
					profileCoefficient,
				),
				basePrice: Number(resolvedBasePrice ?? 0),
			};
		});
}

